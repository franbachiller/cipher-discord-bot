import * as fs from 'fs/promises';
import * as path from 'path';
import { LogLevel } from '../managers/ConfigManager';

/**
 * Interfaz de usuario de Discord para logging
 */
export interface User {
  id: string;
  username: string;
  discriminator: string;
}

/**
 * Estructura de una entrada de log
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: any;
}

/**
 * Sistema de registro de actividad del bot
 * Responsable de registrar eventos, comandos y errores con persistencia a archivo
 * 
 * @example
 * ```typescript
 * // Crear una instancia del logger
 * const logger = new Logger('logs/bot.log', LogLevel.INFO);
 * 
 * // Registrar mensajes de diferentes niveles
 * logger.debug('Mensaje de depuración');
 * logger.info('Bot iniciado correctamente');
 * logger.warn('Advertencia: límite de tasa alcanzado');
 * logger.error('Error al conectar con Discord', { error: err.message });
 * 
 * // Registrar ejecución de comandos
 * const user = { id: '123', username: 'usuario', discriminator: '0001' };
 * logger.logCommand(user, 'createchannel', ['general', 'text']);
 * ```
 */
export class Logger {
  private logFilePath: string;
  private minLogLevel: LogLevel;

  /**
   * Orden de severidad de los niveles de log
   */
  private readonly logLevelOrder: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3
  };

  /**
   * Constructor del Logger
   * @param logFilePath Ruta del archivo donde se escribirán los logs
   * @param minLogLevel Nivel mínimo de log a registrar
   */
  constructor(logFilePath: string, minLogLevel: LogLevel = LogLevel.INFO) {
    this.logFilePath = path.resolve(logFilePath);
    this.minLogLevel = minLogLevel;
  }

  /**
   * Registra un mensaje con nivel específico
   * @param level Nivel de log
   * @param message Mensaje a registrar
   * @param metadata Información adicional opcional
   */
  log(level: LogLevel, message: string, metadata?: any): void {
    // Verificar si el nivel de log cumple con el mínimo configurado
    if (this.logLevelOrder[level] < this.logLevelOrder[this.minLogLevel]) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };

    // Escribir a archivo de forma asíncrona (sin bloquear)
    this.writeToFile(logEntry).catch(error => {
      // Si falla la escritura, intentar escribir a stderr
      console.error('Error al escribir log:', error);
    });

    // También escribir a consola para desarrollo
    this.writeToConsole(logEntry);
  }

  /**
   * Registra un mensaje de nivel DEBUG
   * @param message Mensaje a registrar
   * @param metadata Información adicional opcional
   */
  debug(message: string, metadata?: any): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Registra un mensaje de nivel INFO
   * @param message Mensaje a registrar
   * @param metadata Información adicional opcional
   */
  info(message: string, metadata?: any): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Registra un mensaje de nivel WARN
   * @param message Mensaje a registrar
   * @param metadata Información adicional opcional
   */
  warn(message: string, metadata?: any): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Registra un mensaje de nivel ERROR
   * @param message Mensaje a registrar
   * @param metadata Información adicional opcional
   */
  error(message: string, metadata?: any): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  /**
   * Registra la ejecución de un comando
   * @param user Usuario que ejecutó el comando
   * @param command Nombre del comando
   * @param args Argumentos del comando
   */
  logCommand(user: User, command: string, args: string[]): void {
    this.info('Command executed', {
      user: `${user.username}#${user.discriminator}`,
      userId: user.id,
      command,
      args
    });
  }

  /**
   * Escribe una entrada de log al archivo
   * @param entry Entrada de log a escribir
   */
  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      // Formatear la entrada como JSON con nueva línea
      const logLine = JSON.stringify(entry) + '\n';
      
      // Asegurar que el directorio existe
      const dir = path.dirname(this.logFilePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Escribir al archivo (append mode)
      await fs.appendFile(this.logFilePath, logLine, 'utf-8');
    } catch (error) {
      // Si falla, no podemos hacer mucho más que reportar a stderr
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Escribe una entrada de log a la consola
   * @param entry Entrada de log a escribir
   */
  private writeToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const message = entry.message;
    const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    
    const logMessage = `[${timestamp}] ${level} ${message}${metadata}`;
    
    // Usar el método de consola apropiado según el nivel
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }
}
