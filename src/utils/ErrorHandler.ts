import { Logger } from './Logger';
import { BotError, CommonErrors, ErrorResponse } from './BotError';

/**
 * Contexto de error para logging
 */
export interface ErrorContext {
  user?: {
    id: string;
    username: string;
  };
  command?: string;
  args?: string[];
  guildId?: string;
  channelId?: string;
  [key: string]: any;
}

/**
 * Manejador centralizado de errores
 * Proporciona funciones de utilidad para manejar errores de forma consistente
 * con logging automático y formato de respuesta
 * 
 * @example
 * ```typescript
 * const errorHandler = new ErrorHandler(logger);
 * 
 * try {
 *   await channelManager.createTextChannel(guild, name);
 * } catch (error) {
 *   return errorHandler.handleError(error, {
 *     user: { id: '123', username: 'usuario' },
 *     command: 'createchannel',
 *     args: ['general', 'text']
 *   });
 * }
 * ```
 */
export class ErrorHandler {
  constructor(private logger: Logger) {}

  /**
   * Maneja un error de forma centralizada
   * Registra el error con contexto completo y retorna una respuesta formateada
   * 
   * @param error Error a manejar (puede ser BotError o Error genérico)
   * @param context Contexto adicional para logging
   * @returns Respuesta de error formateada
   */
  handleError(error: Error | BotError, context?: ErrorContext): ErrorResponse {
    // Si es un BotError, usar su información estructurada
    if (error instanceof BotError) {
      this.logger.error(error.message, {
        ...error.toLogObject(),
        context
      });
      return error.toResponse();
    }

    // Si es un error genérico, convertirlo a BotError interno
    const botError = CommonErrors.internalError(error);
    this.logger.error(botError.message, {
      ...botError.toLogObject(),
      context
    });
    return botError.toResponse();
  }

  /**
   * Maneja un error de Discord API
   * Convierte errores de Discord en BotErrors con mensajes apropiados
   * 
   * @param error Error de Discord API
   * @param context Contexto adicional para logging
   * @returns Respuesta de error formateada
   */
  handleDiscordError(error: any, context?: ErrorContext): ErrorResponse {
    const botError = CommonErrors.discordApiError(error);
    this.logger.error(botError.message, {
      ...botError.toLogObject(),
      context
    });
    return botError.toResponse();
  }

  /**
   * Registra y retorna un error de permisos insuficientes
   * 
   * @param required Permisos requeridos
   * @param actual Permisos actuales (opcional)
   * @param context Contexto adicional para logging
   * @returns Respuesta de error formateada
   */
  handlePermissionError(
    required: string[],
    actual?: string[],
    context?: ErrorContext
  ): ErrorResponse {
    const error = CommonErrors.insufficientPermissions(required, actual);
    this.logger.warn(error.message, {
      ...error.toLogObject(),
      context
    });
    return error.toResponse();
  }

  /**
   * Registra y retorna un error de validación
   * 
   * @param parameter Nombre del parámetro inválido
   * @param value Valor inválido
   * @param reason Razón de la invalidez
   * @param context Contexto adicional para logging
   * @returns Respuesta de error formateada
   */
  handleValidationError(
    parameter: string,
    value: any,
    reason: string,
    context?: ErrorContext
  ): ErrorResponse {
    const error = CommonErrors.invalidParameter(parameter, value, reason);
    this.logger.warn(error.message, {
      ...error.toLogObject(),
      context
    });
    return error.toResponse();
  }

  /**
   * Registra y retorna un error de parámetro faltante
   * 
   * @param parameter Nombre del parámetro faltante
   * @param context Contexto adicional para logging
   * @returns Respuesta de error formateada
   */
  handleMissingParameter(
    parameter: string,
    context?: ErrorContext
  ): ErrorResponse {
    const error = CommonErrors.missingParameter(parameter);
    this.logger.warn(error.message, {
      ...error.toLogObject(),
      context
    });
    return error.toResponse();
  }

  /**
   * Registra y retorna un error de recurso no encontrado
   * 
   * @param resource Tipo de recurso
   * @param identifier Identificador del recurso
   * @param context Contexto adicional para logging
   * @returns Respuesta de error formateada
   */
  handleNotFoundError(
    resource: string,
    identifier: string,
    context?: ErrorContext
  ): ErrorResponse {
    const error = CommonErrors.notFound(resource, identifier);
    this.logger.warn(error.message, {
      ...error.toLogObject(),
      context
    });
    return error.toResponse();
  }
}
