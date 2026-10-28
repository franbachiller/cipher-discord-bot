/**
 * Punto de entrada principal del bot de Discord
 * 
 * Este archivo inicializa todos los componentes del bot:
 * - Carga la configuración
 * - Inicializa el sistema de logging
 * - Crea el cliente del bot
 * - Registra todos los comandos
 * - Inicia el bot con manejo de errores
 * 
 * Requisitos: 1.1, 1.2, 1.3, 10.1, 10.2, 10.3
 */

import { Message } from 'discord.js';
import { BotClient } from './client/BotClient';
import { ConfigManager, LogLevel } from './managers/ConfigManager';
import { ChannelManager } from './managers/ChannelManager';
import { RoleManager } from './managers/RoleManager';
import { PermissionManager } from './managers/PermissionManager';
import { ServerManager } from './managers/ServerManager';
import { CommandManager } from './commands/CommandManager';
import { Logger } from './utils/Logger';
import { ErrorHandler } from './utils/ErrorHandler';

// Importar comandos
import { createChannelCommand } from './commands/createchannel';
import { createRoleCommand } from './commands/createrole';
import { assignRoleCommand } from './commands/assignrole';
import { removeRoleCommand } from './commands/removerole';
import { setPermissionsCommand } from './commands/setpermissions';
import { helpCommand } from './commands/help';
import { setServerNameCommand } from './commands/setservername';
import { setServerDescriptionCommand } from './commands/setserverdescription';
import { createCategoryCommand } from './commands/createcategory';
import { moveChannelCommand } from './commands/movechannel';
import { sendEmbedCommand } from './commands/sendembed';

// Importar comandos de tickets
import { ticketPanelCommand } from './commands/ticket-panel';
import { ticketAddCommand } from './commands/ticket-add';
import { ticketRemoveCommand } from './commands/ticket-remove';
import { ticketCloseCommand } from './commands/ticket-close';
import { ticketStatsCommand } from './commands/ticket-stats';

// Importar inicializador del sistema de tickets
import { TicketSystemInitializer } from './tickets/TicketSystemInitializer';

/**
 * Función principal de inicialización del bot
 */
async function main(): Promise<void> {
  let logger: Logger | null = null;
  let botClient: BotClient | null = null;

  try {
    // 1. Cargar configuración
    console.log('Cargando configuración...');
    const configManager = new ConfigManager();
    const config = await configManager.load('config.json');
    console.log('✓ Configuración cargada exitosamente');

    // 2. Inicializar Logger con configuración
    console.log('Inicializando sistema de logging...');
    logger = new Logger(config.logFile, config.logLevel);
    logger.info('Bot iniciando...', { 
      logLevel: config.logLevel,
      prefix: config.prefix 
    });
    console.log('✓ Sistema de logging inicializado');

    // 3. Inicializar ErrorHandler
    const errorHandler = new ErrorHandler(logger);

    // 4. Crear instancia de BotClient
    console.log('Creando cliente del bot...');
    botClient = new BotClient(config, logger);
    console.log('✓ Cliente del bot creado');

    // 5. Inicializar managers
    console.log('Inicializando managers...');
    const channelManager = new ChannelManager(logger);
    const roleManager = new RoleManager(logger);
    const permissionManager = new PermissionManager(logger);
    const serverManager = new ServerManager(logger);
    console.log('✓ Managers inicializados');

    // 6. Crear CommandManager
    console.log('Inicializando gestor de comandos...');
    const commandManager = new CommandManager(config.prefix, logger);
    console.log('✓ Gestor de comandos inicializado');

    // 7. Registrar todos los comandos
    console.log('Registrando comandos...');
    
    commandManager.registerCommand(createChannelCommand(channelManager, logger));
    commandManager.registerCommand(createRoleCommand(roleManager, logger));
    commandManager.registerCommand(assignRoleCommand(roleManager, logger));
    commandManager.registerCommand(removeRoleCommand(roleManager, logger));
    commandManager.registerCommand(setPermissionsCommand(permissionManager, logger));
    commandManager.registerCommand(setServerNameCommand(serverManager, logger));
    commandManager.registerCommand(setServerDescriptionCommand(serverManager, logger));
    commandManager.registerCommand(createCategoryCommand(serverManager, logger));
    commandManager.registerCommand(moveChannelCommand(channelManager, logger));
    commandManager.registerCommand(sendEmbedCommand(logger));
    commandManager.registerCommand(helpCommand(commandManager, logger));

    // 8. Inicializar sistema de tickets (si está configurado)
    let ticketSystem: TicketSystemInitializer | null = null;
    
    if (config.tickets) {
      console.log('Inicializando sistema de tickets...');
      
      try {
        ticketSystem = new TicketSystemInitializer(
          botClient.getClient(),
          logger,
          channelManager,
          permissionManager,
          config.tickets
        );
        
        await ticketSystem.initialize();
        
        // Registrar comandos de tickets
        const ticketManager = ticketSystem.getTicketManager();
        const ticketPanelManager = ticketSystem.getTicketPanelManager();
        
        commandManager.registerCommand(ticketPanelCommand(ticketPanelManager, logger));
        commandManager.registerCommand(ticketAddCommand(ticketManager, logger));
        commandManager.registerCommand(ticketRemoveCommand(ticketManager, logger));
        commandManager.registerCommand(ticketCloseCommand(ticketManager, logger));
        commandManager.registerCommand(ticketStatsCommand(ticketManager, logger));
        
        console.log('✓ Sistema de tickets inicializado');
        logger.info('Sistema de tickets inicializado exitosamente');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('✗ Error al inicializar sistema de tickets:', errorMessage);
        logger.error('Error al inicializar sistema de tickets', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
        // Continuar sin sistema de tickets
      }
    } else {
      console.log('⚠ Sistema de tickets no configurado, omitiendo inicialización');
      logger.info('Sistema de tickets no configurado en config.json');
    }

    const registeredCommands = commandManager.listCommands();
    console.log(`✓ ${registeredCommands.length} comandos registrados`);
    logger.info('Comandos registrados', { 
      count: registeredCommands.length,
      commands: registeredCommands.map(cmd => cmd.name)
    });

    // 9. Conectar CommandManager con eventos de mensajes
    console.log('Conectando manejador de comandos...');
    botClient.on('messageCreate', async (message: Message) => {
      try {
        await commandManager.handleMessage(message);
      } catch (error) {
        logger?.error('Error al procesar mensaje', {
          error: error instanceof Error ? error.message : 'Error desconocido',
          messageId: message.id,
          authorId: message.author.id
        });
      }
    });
    console.log('✓ Manejador de comandos conectado');

    // 10. Registrar eventos importantes del bot
    botClient.on('ready', () => {
      const client = botClient!.getClient();
      logger?.info('Bot conectado exitosamente', {
        botTag: client.user?.tag,
        botId: client.user?.id,
        guilds: client.guilds.cache.size
      });
      console.log(`✓ Bot conectado como ${client.user?.tag}`);
      console.log(`✓ Activo en ${client.guilds.cache.size} servidor(es)`);
    });

    botClient.on('disconnect', () => {
      logger?.warn('Bot desconectado de Discord');
      console.log('⚠ Bot desconectado');
    });

    botClient.on('reconnecting', () => {
      logger?.info('Intentando reconectar...');
      console.log('⟳ Reconectando...');
    });

    botClient.on('error', (error: Error) => {
      logger?.error('Error del cliente Discord', {
        error: error.message,
        stack: error.stack
      });
      console.error('✗ Error del cliente:', error.message);
    });

    // 10. Iniciar bot con manejo de errores de startup
    console.log('Iniciando bot...');
    await botClient.start();

    // 11. Manejar señales de terminación para limpiar recursos
    const cleanup = async () => {
      console.log('\n⚠ Cerrando bot...');
      
      // Detener sistema de tickets si está activo
      if (ticketSystem) {
        try {
          await ticketSystem.stop();
          console.log('✓ Sistema de tickets detenido');
        } catch (error) {
          console.error('Error al detener sistema de tickets:', error);
        }
      }
      
      // Detener bot
      if (botClient) {
        try {
          await botClient.stop();
          console.log('✓ Bot detenido');
        } catch (error) {
          console.error('Error al detener bot:', error);
        }
      }
      
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
  } catch (error) {
    // Manejo de errores de startup
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (logger) {
      logger.error('Error fatal al iniciar el bot', {
        error: errorMessage,
        stack: errorStack
      });
    } else {
      console.error('✗ Error fatal al iniciar el bot:', errorMessage);
      if (errorStack) {
        console.error(errorStack);
      }
    }

    // Cerrar el bot si se inició
    if (botClient) {
      try {
        await botClient.stop();
      } catch (stopError) {
        console.error('Error al detener el bot:', stopError);
      }
    }

    // Terminar con código de error
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('✗ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('✗ Excepción no capturada:', error);
  process.exit(1);
});

// Ejecutar función principal
main();
