import { Message, PermissionsBitField } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { Logger } from '../utils/Logger';

/**
 * Interfaz del gestor de comandos
 */
export interface ICommandManager {
  /**
   * Registra un nuevo comando
   * @param command Comando a registrar
   */
  registerCommand(command: Command): void;

  /**
   * Procesa un mensaje y ejecuta el comando si es válido
   * @param message Mensaje de Discord a procesar
   */
  handleMessage(message: Message): Promise<void>;

  /**
   * Obtiene información de ayuda
   * @param commandName Nombre del comando específico (opcional)
   * @returns Mensaje de ayuda formateado
   */
  getHelp(commandName?: string): string;

  /**
   * Lista todos los comandos disponibles
   * @returns Array de comandos registrados
   */
  listCommands(): Command[];
}

/**
 * Gestor de comandos del bot
 * Responsable de registrar, parsear y ejecutar comandos
 */
export class CommandManager implements ICommandManager {
  private commands: Map<string, Command>;
  private prefix: string;
  private logger: Logger;

  /**
   * Constructor del CommandManager
   * @param prefix Prefijo de comandos (ej: "!")
   * @param logger Sistema de logging
   */
  constructor(prefix: string, logger: Logger) {
    this.commands = new Map();
    this.prefix = prefix;
    this.logger = logger;
  }

  /**
   * Registra un nuevo comando
   * @param command Comando a registrar
   */
  registerCommand(command: Command): void {
    if (this.commands.has(command.name)) {
      this.logger.warn(`Command ${command.name} is already registered, overwriting`);
    }

    this.commands.set(command.name, command);
    this.logger.debug(`Command registered: ${command.name}`);
  }

  /**
   * Procesa un mensaje y ejecuta el comando si es válido
   * @param message Mensaje de Discord a procesar
   */
  async handleMessage(message: Message): Promise<void> {
    // Ignorar mensajes de bots
    if (message.author.bot) {
      return;
    }

    // Verificar que el mensaje comience con el prefijo
    if (!message.content.startsWith(this.prefix)) {
      return;
    }

    // Verificar que el mensaje sea de un servidor (guild)
    if (!message.guild) {
      await message.reply('Los comandos solo pueden ejecutarse en servidores.');
      return;
    }

    // Parsear el comando y argumentos
    const args = message.content.slice(this.prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) {
      return;
    }

    // Buscar el comando
    const command = this.commands.get(commandName);

    if (!command) {
      await message.reply(`Comando desconocido: \`${commandName}\`. Usa \`${this.prefix}help\` para ver los comandos disponibles.`);
      return;
    }

    // Validar permisos
    const member = message.member;
    if (!member) {
      await message.reply('No se pudo verificar tus permisos.');
      return;
    }

    const hasPermissions = this.checkPermissions(member.permissions, command.requiredPermissions);
    
    if (!hasPermissions) {
      const permissionNames = command.requiredPermissions
        .map(p => typeof p === 'string' ? p : 'UNKNOWN')
        .join(', ');
      
      await message.reply(`No tienes permisos suficientes para ejecutar este comando. Permisos requeridos: ${permissionNames}`);
      
      this.logger.warn('Permission denied', {
        user: `${message.author.username}#${message.author.discriminator}`,
        userId: message.author.id,
        command: commandName,
        requiredPermissions: permissionNames
      });
      
      return;
    }

    // Crear contexto del comando
    const context: CommandContext = {
      message,
      args,
      guild: message.guild,
      author: message.author
    };

    // Registrar ejecución del comando
    this.logger.logCommand(
      {
        id: message.author.id,
        username: message.author.username,
        discriminator: message.author.discriminator
      },
      commandName,
      args
    );

    // Ejecutar el comando
    try {
      const result: CommandResult = await command.execute(context);

      if (result.success) {
        await message.reply(result.message);
        this.logger.info('Command executed successfully', {
          command: commandName,
          user: message.author.id
        });
      } else {
        await message.reply(`❌ ${result.message}`);
        this.logger.warn('Command execution failed', {
          command: commandName,
          user: message.author.id,
          error: result.message
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await message.reply(`❌ Error al ejecutar el comando: ${errorMessage}`);
      
      this.logger.error('Command execution error', {
        command: commandName,
        user: message.author.id,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Verifica si un conjunto de permisos incluye los permisos requeridos
   * @param userPermissions Permisos del usuario
   * @param requiredPermissions Permisos requeridos
   * @returns true si el usuario tiene todos los permisos requeridos
   */
  private checkPermissions(
    userPermissions: Readonly<PermissionsBitField>,
    requiredPermissions: readonly any[]
  ): boolean {
    // Si no se requieren permisos, permitir ejecución
    if (requiredPermissions.length === 0) {
      return true;
    }

    // Verificar cada permiso requerido
    return requiredPermissions.every(permission => {
      return userPermissions.has(permission);
    });
  }

  /**
   * Obtiene información de ayuda
   * @param commandName Nombre del comando específico (opcional)
   * @returns Mensaje de ayuda formateado
   */
  getHelp(commandName?: string): string {
    // Ayuda para un comando específico
    if (commandName) {
      const command = this.commands.get(commandName.toLowerCase());
      
      if (!command) {
        return `Comando no encontrado: \`${commandName}\`. Usa \`${this.prefix}help\` para ver todos los comandos disponibles.`;
      }

      const permissionNames = command.requiredPermissions
        .map(p => typeof p === 'string' ? p : 'UNKNOWN')
        .join(', ');

      return [
        `**${command.name}**`,
        `Descripción: ${command.description}`,
        `Uso: \`${command.usage}\``,
        `Categoría: ${command.category}`,
        `Permisos requeridos: ${permissionNames || 'Ninguno'}`
      ].join('\n');
    }

    // Ayuda general - agrupar comandos por categoría
    const categories = new Map<string, Command[]>();

    for (const command of this.commands.values()) {
      const categoryCommands = categories.get(command.category) || [];
      categoryCommands.push(command);
      categories.set(command.category, categoryCommands);
    }

    const helpLines: string[] = [
      '**Comandos Disponibles**',
      `Usa \`${this.prefix}help <comando>\` para obtener información detallada sobre un comando específico.`,
      ''
    ];

    // Ordenar categorías alfabéticamente
    const sortedCategories = Array.from(categories.entries()).sort((a, b) => 
      a[0].localeCompare(b[0])
    );

    for (const [category, commands] of sortedCategories) {
      helpLines.push(`**${category}**`);
      
      // Ordenar comandos alfabéticamente dentro de cada categoría
      const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));
      
      for (const command of sortedCommands) {
        helpLines.push(`  \`${this.prefix}${command.name}\` - ${command.description}`);
      }
      
      helpLines.push('');
    }

    return helpLines.join('\n');
  }

  /**
   * Lista todos los comandos disponibles
   * @returns Array de comandos registrados
   */
  listCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}
