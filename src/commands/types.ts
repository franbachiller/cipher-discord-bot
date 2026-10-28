import { Message, Guild, User, PermissionResolvable } from 'discord.js';

/**
 * Contexto de ejecución de un comando
 */
export interface CommandContext {
  /** Mensaje original que disparó el comando */
  message: Message;
  
  /** Argumentos del comando parseados */
  args: string[];
  
  /** Guild (servidor) donde se ejecutó el comando */
  guild: Guild;
  
  /** Usuario que ejecutó el comando */
  author: User;
}

/**
 * Resultado de la ejecución de un comando
 */
export interface CommandResult {
  /** Indica si el comando se ejecutó exitosamente */
  success: boolean;
  
  /** Mensaje descriptivo del resultado */
  message: string;
  
  /** Datos adicionales opcionales del resultado */
  data?: any;
}

/**
 * Definición de un comando del bot
 */
export interface Command {
  /** Nombre del comando (sin prefijo) */
  name: string;
  
  /** Descripción del comando */
  description: string;
  
  /** Sintaxis de uso del comando */
  usage: string;
  
  /** Categoría del comando para organización */
  category: string;
  
  /** Permisos requeridos para ejecutar el comando */
  requiredPermissions: PermissionResolvable[];
  
  /** Función que ejecuta la lógica del comando */
  execute(context: CommandContext): Promise<CommandResult>;
}
