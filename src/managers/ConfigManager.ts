import * as fs from 'fs/promises';
import * as path from 'path';
import { TicketConfig } from '../tickets/types';

/**
 * Niveles de log disponibles
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Interfaz de configuración del bot
 */
export interface Config {
  token: string;
  prefix: string;
  logLevel: LogLevel;
  logFile: string;
  tickets?: TicketConfig;
}

/**
 * Resultado de validación de configuración
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Gestor de configuración del bot
 * Responsable de cargar y validar la configuración desde archivo JSON
 */
export class ConfigManager {
  private config: Config | null = null;

  /**
   * Carga la configuración desde un archivo JSON
   * @param configPath Ruta al archivo de configuración
   * @returns Configuración cargada
   * @throws Error si el archivo no existe o no es JSON válido
   */
  async load(configPath: string): Promise<Config> {
    try {
      // Leer el archivo de configuración
      const absolutePath = path.resolve(configPath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      
      // Parsear JSON
      const parsedConfig = JSON.parse(fileContent);
      
      // Validar la configuración
      const validationResult = this.validate(parsedConfig);
      
      if (!validationResult.valid) {
        throw new Error(
          `Configuración inválida:\n${validationResult.errors.join('\n')}`
        );
      }
      
      // Guardar configuración válida
      this.config = parsedConfig as Config;
      return this.config;
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`El archivo de configuración no es un JSON válido: ${error.message}`);
      }
      
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Archivo de configuración no encontrado: ${configPath}`);
      }
      
      throw error;
    }
  }

  /**
   * Valida que la configuración tenga todos los campos requeridos
   * @param config Objeto de configuración a validar
   * @returns Resultado de validación con lista de errores
   */
  validate(config: any): ValidationResult {
    const errors: string[] = [];

    // Validar que config sea un objeto
    if (!config || typeof config !== 'object') {
      return {
        valid: false,
        errors: ['La configuración debe ser un objeto']
      };
    }

    // Validar campo token
    if (!config.token) {
      errors.push('El campo "token" es requerido');
    } else if (typeof config.token !== 'string') {
      errors.push('El campo "token" debe ser una cadena de texto');
    } else if (config.token.trim().length === 0) {
      errors.push('El campo "token" no puede estar vacío');
    }

    // Validar campo prefix
    if (config.prefix === undefined || config.prefix === null) {
      errors.push('El campo "prefix" es requerido');
    } else if (typeof config.prefix !== 'string') {
      errors.push('El campo "prefix" debe ser una cadena de texto');
    } else if (config.prefix.trim().length === 0) {
      errors.push('El campo "prefix" no puede estar vacío');
    }

    // Validar campo logLevel
    if (!config.logLevel) {
      errors.push('El campo "logLevel" es requerido');
    } else if (typeof config.logLevel !== 'string') {
      errors.push('El campo "logLevel" debe ser una cadena de texto');
    } else {
      const validLogLevels = Object.values(LogLevel);
      if (!validLogLevels.includes(config.logLevel as LogLevel)) {
        errors.push(
          `El campo "logLevel" debe ser uno de: ${validLogLevels.join(', ')}`
        );
      }
    }

    // Validar campo logFile
    if (!config.logFile) {
      errors.push('El campo "logFile" es requerido');
    } else if (typeof config.logFile !== 'string') {
      errors.push('El campo "logFile" debe ser una cadena de texto');
    } else if (config.logFile.trim().length === 0) {
      errors.push('El campo "logFile" no puede estar vacío');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtiene la configuración actual cargada
   * @returns Configuración actual o null si no se ha cargado
   */
  getConfig(): Config | null {
    return this.config;
  }
}
