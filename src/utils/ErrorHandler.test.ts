import { ErrorHandler } from './ErrorHandler';
import { Logger } from './Logger';
import { BotError, ErrorCategory, CommonErrors } from './BotError';
import { LogLevel } from '../managers/ConfigManager';

// Mock del Logger
jest.mock('./Logger');

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = new Logger('test.log', LogLevel.DEBUG) as jest.Mocked<Logger>;
    errorHandler = new ErrorHandler(mockLogger);
  });

  describe('handleError', () => {
    it('should handle BotError and log with context', () => {
      const botError = new BotError(
        'Technical message',
        'TEST_ERROR',
        'User message',
        ErrorCategory.VALIDATION,
        { key: 'value' }
      );

      const context = {
        user: { id: '123', username: 'testuser' },
        command: 'test'
      };

      const response = errorHandler.handleError(botError, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Technical message',
        expect.objectContaining({
          code: 'TEST_ERROR',
          category: ErrorCategory.VALIDATION,
          context
        })
      );

      expect(response).toEqual({
        success: false,
        message: 'User message',
        errorCode: 'TEST_ERROR',
        details: { key: 'value' }
      });
    });

    it('should handle generic Error and convert to internal error', () => {
      const genericError = new Error('Something went wrong');
      const context = { command: 'test' };

      const response = errorHandler.handleError(genericError, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Something went wrong',
        expect.objectContaining({
          code: 'INTERNAL_ERROR',
          category: ErrorCategory.API,
          context
        })
      );

      expect(response).toEqual({
        success: false,
        message: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
        errorCode: 'INTERNAL_ERROR',
        details: expect.objectContaining({
          originalError: 'Something went wrong'
        })
      });
    });

    it('should handle error without context', () => {
      const botError = CommonErrors.missingParameter('test');

      const response = errorHandler.handleError(botError);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(response.success).toBe(false);
    });
  });

  describe('handleDiscordError', () => {
    it('should handle Discord API error with message and code', () => {
      const discordError = {
        message: 'Missing Access',
        code: 50001
      };

      const context = { guildId: '123' };

      const response = errorHandler.handleDiscordError(discordError, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Discord API error: Missing Access',
        expect.objectContaining({
          code: 'DISCORD_API_50001',
          category: ErrorCategory.API,
          context
        })
      );

      expect(response).toEqual({
        success: false,
        message: 'Ocurrió un error al comunicarse con Discord. Por favor intenta de nuevo.',
        errorCode: 'DISCORD_API_50001',
        details: {
          apiError: 'Missing Access',
          apiCode: 50001
        }
      });
    });
  });

  describe('handlePermissionError', () => {
    it('should handle permission error with required and actual permissions', () => {
      const required = ['MANAGE_CHANNELS'];
      const actual = ['SEND_MESSAGES'];
      const context = {
        user: { id: '123', username: 'testuser' },
        command: 'createchannel'
      };

      const response = errorHandler.handlePermissionError(required, actual, context);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User lacks required permissions: MANAGE_CHANNELS',
        expect.objectContaining({
          code: 'INSUFFICIENT_PERMISSIONS',
          category: ErrorCategory.PERMISSION,
          context
        })
      );

      expect(response).toEqual({
        success: false,
        message: 'No tienes permisos suficientes para ejecutar este comando.',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        details: { required, actual }
      });
    });

    it('should handle permission error without actual permissions', () => {
      const required = ['MANAGE_CHANNELS'];

      const response = errorHandler.handlePermissionError(required);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(response.errorCode).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('handleValidationError', () => {
    it('should handle validation error', () => {
      const parameter = 'channelName';
      const value = '';
      const reason = 'no puede estar vacío';
      const context = { command: 'createchannel' };

      const response = errorHandler.handleValidationError(
        parameter,
        value,
        reason,
        context
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid parameter channelName: no puede estar vacío',
        expect.objectContaining({
          code: 'INVALID_PARAMETER',
          category: ErrorCategory.VALIDATION,
          context
        })
      );

      expect(response).toEqual({
        success: false,
        message: 'El parámetro channelName es inválido: no puede estar vacío',
        errorCode: 'INVALID_PARAMETER',
        details: { parameter, value, reason }
      });
    });
  });

  describe('handleMissingParameter', () => {
    it('should handle missing parameter error', () => {
      const parameter = 'channelName';
      const context = { command: 'createchannel' };

      const response = errorHandler.handleMissingParameter(parameter, context);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Missing required parameter: channelName',
        expect.objectContaining({
          code: 'MISSING_PARAMETER',
          category: ErrorCategory.VALIDATION,
          context
        })
      );

      expect(response).toEqual({
        success: false,
        message: 'Falta el parámetro requerido: channelName',
        errorCode: 'MISSING_PARAMETER',
        details: { parameter }
      });
    });
  });

  describe('handleNotFoundError', () => {
    it('should handle not found error', () => {
      const resource = 'Canal';
      const identifier = 'general';
      const context = { guildId: '123' };

      const response = errorHandler.handleNotFoundError(resource, identifier, context);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Canal not found: general',
        expect.objectContaining({
          code: 'NOT_FOUND',
          category: ErrorCategory.VALIDATION,
          context
        })
      );

      expect(response).toEqual({
        success: false,
        message: 'No se encontró Canal: general',
        errorCode: 'NOT_FOUND',
        details: { resource, identifier }
      });
    });
  });
});
