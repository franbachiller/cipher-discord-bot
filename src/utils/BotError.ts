/**
 * Categorías de errores del bot
 * Cada categoría representa un tipo específico de fallo
 */
export enum ErrorCategory {
  /** Errores de autenticación con Discord API */
  AUTHENTICATION = 'AUTHENTICATION',
  /** Errores de permisos insuficientes */
  PERMISSION = 'PERMISSION',
  /** Errores de validación de parámetros */
  VALIDATION = 'VALIDATION',
  /** Errores retornados por la API de Discord */
  API = 'API',
  /** Errores de configuración inválida o faltante */
  CONFIGURATION = 'CONFIGURATION',
  /** Errores de conectividad de red */
  NETWORK = 'NETWORK'
}

/**
 * Clase de error personalizada para el bot de Discord
 * Proporciona información estructurada sobre errores con mensajes amigables para usuarios
 * 
 * @example
 * ```typescript
 * // Crear un error de permisos
 * throw new BotError(
 *   'User lacks MANAGE_CHANNELS permission',
 *   'INSUFFICIENT_PERMISSIONS',
 *   'No tienes permisos suficientes para crear canales.',
 *   ErrorCategory.PERMISSION,
 *   { required: ['MANAGE_CHANNELS'], actual: ['SEND_MESSAGES'] }
 * );
 * 
 * // Crear un error de validación
 * throw new BotError(
 *   'Invalid channel name: empty string',
 *   'INVALID_CHANNEL_NAME',
 *   'El nombre del canal no puede estar vacío.',
 *   ErrorCategory.VALIDATION,
 *   { parameter: 'name', value: '' }
 * );
 * ```
 */
export class BotError extends Error {
  /**
   * Código de error único para identificar el tipo de error
   */
  public readonly code: string;

  /**
   * Mensaje amigable para mostrar al usuario
   */
  public readonly userMessage: string;

  /**
   * Categoría del error
   */
  public readonly category: ErrorCategory;

  /**
   * Detalles adicionales sobre el error (opcional)
   */
  public readonly details?: any;

  /**
   * Constructor de BotError
   * @param message Mensaje técnico del error (para logs)
   * @param code Código único del error
   * @param userMessage Mensaje amigable para el usuario
   * @param category Categoría del error
   * @param details Detalles adicionales opcionales
   */
  constructor(
    message: string,
    code: string,
    userMessage: string,
    category: ErrorCategory,
    details?: any
  ) {
    super(message);
    this.name = 'BotError';
    this.code = code;
    this.userMessage = userMessage;
    this.category = category;
    this.details = details;

    // Mantener el stack trace correcto
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convierte el error a un formato de respuesta consistente
   * @returns Objeto con formato de respuesta de error
   */
  toResponse(): ErrorResponse {
    return {
      success: false,
      message: this.userMessage,
      errorCode: this.code,
      details: this.details
    };
  }

  /**
   * Convierte el error a un objeto para logging
   * @returns Objeto con información completa del error
   */
  toLogObject(): ErrorLogObject {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      userMessage: this.userMessage,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Formato de respuesta de error consistente
 */
export interface ErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  details?: any;
}

/**
 * Objeto de error para logging
 */
export interface ErrorLogObject {
  name: string;
  message: string;
  code: string;
  category: ErrorCategory;
  userMessage: string;
  details?: any;
  stack?: string;
}

/**
 * Errores predefinidos comunes
 * Facilita la creación de errores frecuentes con mensajes consistentes
 */
export class CommonErrors {
  /**
   * Error de permisos insuficientes
   * @param required Permisos requeridos
   * @param actual Permisos actuales del usuario
   * @returns BotError configurado
   */
  static insufficientPermissions(required: string[], actual?: string[]): BotError {
    return new BotError(
      `User lacks required permissions: ${required.join(', ')}`,
      'INSUFFICIENT_PERMISSIONS',
      'No tienes permisos suficientes para ejecutar este comando.',
      ErrorCategory.PERMISSION,
      { required, actual }
    );
  }

  /**
   * Error de parámetro faltante
   * @param parameter Nombre del parámetro faltante
   * @returns BotError configurado
   */
  static missingParameter(parameter: string): BotError {
    return new BotError(
      `Missing required parameter: ${parameter}`,
      'MISSING_PARAMETER',
      `Falta el parámetro requerido: ${parameter}`,
      ErrorCategory.VALIDATION,
      { parameter }
    );
  }

  /**
   * Error de parámetro inválido
   * @param parameter Nombre del parámetro
   * @param value Valor inválido
   * @param reason Razón de la invalidez
   * @returns BotError configurado
   */
  static invalidParameter(parameter: string, value: any, reason: string): BotError {
    return new BotError(
      `Invalid parameter ${parameter}: ${reason}`,
      'INVALID_PARAMETER',
      `El parámetro ${parameter} es inválido: ${reason}`,
      ErrorCategory.VALIDATION,
      { parameter, value, reason }
    );
  }

  /**
   * Error de autenticación fallida
   * @param reason Razón del fallo
   * @returns BotError configurado
   */
  static authenticationFailed(reason: string): BotError {
    return new BotError(
      `Authentication failed: ${reason}`,
      'AUTHENTICATION_FAILED',
      'Error de autenticación con Discord. Verifica el token del bot.',
      ErrorCategory.AUTHENTICATION,
      { reason }
    );
  }

  /**
   * Error de configuración inválida
   * @param field Campo de configuración inválido
   * @param reason Razón de la invalidez
   * @returns BotError configurado
   */
  static invalidConfiguration(field: string, reason: string): BotError {
    return new BotError(
      `Invalid configuration field ${field}: ${reason}`,
      'INVALID_CONFIGURATION',
      `Configuración inválida: ${field} - ${reason}`,
      ErrorCategory.CONFIGURATION,
      { field, reason }
    );
  }

  /**
   * Error de API de Discord
   * @param apiError Error retornado por Discord
   * @returns BotError configurado
   */
  static discordApiError(apiError: any): BotError {
    const message = apiError.message || 'Unknown Discord API error';
    const code = apiError.code || 'UNKNOWN_API_ERROR';
    
    return new BotError(
      `Discord API error: ${message}`,
      `DISCORD_API_${code}`,
      'Ocurrió un error al comunicarse con Discord. Por favor intenta de nuevo.',
      ErrorCategory.API,
      { apiError: apiError.message, apiCode: code }
    );
  }

  /**
   * Error de red
   * @param reason Razón del fallo de red
   * @returns BotError configurado
   */
  static networkError(reason: string): BotError {
    return new BotError(
      `Network error: ${reason}`,
      'NETWORK_ERROR',
      'Error de conexión. Por favor verifica tu conexión a internet.',
      ErrorCategory.NETWORK,
      { reason }
    );
  }

  /**
   * Error de recurso no encontrado
   * @param resource Tipo de recurso
   * @param identifier Identificador del recurso
   * @returns BotError configurado
   */
  static notFound(resource: string, identifier: string): BotError {
    return new BotError(
      `${resource} not found: ${identifier}`,
      'NOT_FOUND',
      `No se encontró ${resource}: ${identifier}`,
      ErrorCategory.VALIDATION,
      { resource, identifier }
    );
  }

  /**
   * Error interno inesperado
   * @param originalError Error original
   * @returns BotError configurado
   */
  static internalError(originalError?: Error): BotError {
    return new BotError(
      originalError?.message || 'Internal error',
      'INTERNAL_ERROR',
      'Ocurrió un error inesperado. Por favor intenta de nuevo.',
      ErrorCategory.API,
      { originalError: originalError?.message, stack: originalError?.stack }
    );
  }
}
