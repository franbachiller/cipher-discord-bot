import { BotError, ErrorCategory, CommonErrors } from './BotError';

describe('BotError', () => {
  describe('Constructor', () => {
    it('should create a BotError with all properties', () => {
      const error = new BotError(
        'Technical message',
        'TEST_ERROR',
        'User friendly message',
        ErrorCategory.VALIDATION,
        { key: 'value' }
      );

      expect(error.name).toBe('BotError');
      expect(error.message).toBe('Technical message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.userMessage).toBe('User friendly message');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.details).toEqual({ key: 'value' });
      expect(error.stack).toBeDefined();
    });

    it('should create a BotError without details', () => {
      const error = new BotError(
        'Technical message',
        'TEST_ERROR',
        'User friendly message',
        ErrorCategory.PERMISSION
      );

      expect(error.details).toBeUndefined();
    });
  });

  describe('toResponse', () => {
    it('should convert error to response format', () => {
      const error = new BotError(
        'Technical message',
        'TEST_ERROR',
        'User friendly message',
        ErrorCategory.VALIDATION,
        { param: 'test' }
      );

      const response = error.toResponse();

      expect(response).toEqual({
        success: false,
        message: 'User friendly message',
        errorCode: 'TEST_ERROR',
        details: { param: 'test' }
      });
    });

    it('should convert error without details to response format', () => {
      const error = new BotError(
        'Technical message',
        'TEST_ERROR',
        'User friendly message',
        ErrorCategory.PERMISSION
      );

      const response = error.toResponse();

      expect(response).toEqual({
        success: false,
        message: 'User friendly message',
        errorCode: 'TEST_ERROR',
        details: undefined
      });
    });
  });

  describe('toLogObject', () => {
    it('should convert error to log object format', () => {
      const error = new BotError(
        'Technical message',
        'TEST_ERROR',
        'User friendly message',
        ErrorCategory.API,
        { key: 'value' }
      );

      const logObject = error.toLogObject();

      expect(logObject.name).toBe('BotError');
      expect(logObject.message).toBe('Technical message');
      expect(logObject.code).toBe('TEST_ERROR');
      expect(logObject.category).toBe(ErrorCategory.API);
      expect(logObject.userMessage).toBe('User friendly message');
      expect(logObject.details).toEqual({ key: 'value' });
      expect(logObject.stack).toBeDefined();
    });
  });
});

describe('CommonErrors', () => {
  describe('insufficientPermissions', () => {
    it('should create permission error with required and actual permissions', () => {
      const error = CommonErrors.insufficientPermissions(
        ['MANAGE_CHANNELS'],
        ['SEND_MESSAGES']
      );

      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(error.category).toBe(ErrorCategory.PERMISSION);
      expect(error.userMessage).toBe('No tienes permisos suficientes para ejecutar este comando.');
      expect(error.details).toEqual({
        required: ['MANAGE_CHANNELS'],
        actual: ['SEND_MESSAGES']
      });
    });

    it('should create permission error without actual permissions', () => {
      const error = CommonErrors.insufficientPermissions(['MANAGE_CHANNELS']);

      expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(error.details.required).toEqual(['MANAGE_CHANNELS']);
      expect(error.details.actual).toBeUndefined();
    });
  });

  describe('missingParameter', () => {
    it('should create missing parameter error', () => {
      const error = CommonErrors.missingParameter('channelName');

      expect(error.code).toBe('MISSING_PARAMETER');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.userMessage).toBe('Falta el parámetro requerido: channelName');
      expect(error.details).toEqual({ parameter: 'channelName' });
    });
  });

  describe('invalidParameter', () => {
    it('should create invalid parameter error', () => {
      const error = CommonErrors.invalidParameter(
        'channelName',
        '',
        'no puede estar vacío'
      );

      expect(error.code).toBe('INVALID_PARAMETER');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.userMessage).toBe('El parámetro channelName es inválido: no puede estar vacío');
      expect(error.details).toEqual({
        parameter: 'channelName',
        value: '',
        reason: 'no puede estar vacío'
      });
    });
  });

  describe('authenticationFailed', () => {
    it('should create authentication error', () => {
      const error = CommonErrors.authenticationFailed('Invalid token');

      expect(error.code).toBe('AUTHENTICATION_FAILED');
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(error.userMessage).toBe('Error de autenticación con Discord. Verifica el token del bot.');
      expect(error.details).toEqual({ reason: 'Invalid token' });
    });
  });

  describe('invalidConfiguration', () => {
    it('should create configuration error', () => {
      const error = CommonErrors.invalidConfiguration('token', 'cannot be empty');

      expect(error.code).toBe('INVALID_CONFIGURATION');
      expect(error.category).toBe(ErrorCategory.CONFIGURATION);
      expect(error.userMessage).toBe('Configuración inválida: token - cannot be empty');
      expect(error.details).toEqual({
        field: 'token',
        reason: 'cannot be empty'
      });
    });
  });

  describe('discordApiError', () => {
    it('should create Discord API error with message and code', () => {
      const apiError = {
        message: 'Missing Access',
        code: 50001
      };

      const error = CommonErrors.discordApiError(apiError);

      expect(error.code).toBe('DISCORD_API_50001');
      expect(error.category).toBe(ErrorCategory.API);
      expect(error.userMessage).toBe('Ocurrió un error al comunicarse con Discord. Por favor intenta de nuevo.');
      expect(error.details).toEqual({
        apiError: 'Missing Access',
        apiCode: 50001
      });
    });

    it('should create Discord API error with unknown error', () => {
      const apiError = {};

      const error = CommonErrors.discordApiError(apiError);

      expect(error.code).toBe('DISCORD_API_UNKNOWN_API_ERROR');
      expect(error.message).toContain('Unknown Discord API error');
    });
  });

  describe('networkError', () => {
    it('should create network error', () => {
      const error = CommonErrors.networkError('Connection timeout');

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.userMessage).toBe('Error de conexión. Por favor verifica tu conexión a internet.');
      expect(error.details).toEqual({ reason: 'Connection timeout' });
    });
  });

  describe('notFound', () => {
    it('should create not found error', () => {
      const error = CommonErrors.notFound('Canal', 'general');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.userMessage).toBe('No se encontró Canal: general');
      expect(error.details).toEqual({
        resource: 'Canal',
        identifier: 'general'
      });
    });
  });

  describe('internalError', () => {
    it('should create internal error with original error', () => {
      const originalError = new Error('Something went wrong');
      const error = CommonErrors.internalError(originalError);

      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.category).toBe(ErrorCategory.API);
      expect(error.userMessage).toBe('Ocurrió un error inesperado. Por favor intenta de nuevo.');
      expect(error.details.originalError).toBe('Something went wrong');
      expect(error.details.stack).toBeDefined();
    });

    it('should create internal error without original error', () => {
      const error = CommonErrors.internalError();

      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Internal error');
    });
  });
});

describe('ErrorCategory', () => {
  it('should have all expected categories', () => {
    expect(ErrorCategory.AUTHENTICATION).toBe('AUTHENTICATION');
    expect(ErrorCategory.PERMISSION).toBe('PERMISSION');
    expect(ErrorCategory.VALIDATION).toBe('VALIDATION');
    expect(ErrorCategory.API).toBe('API');
    expect(ErrorCategory.CONFIGURATION).toBe('CONFIGURATION');
    expect(ErrorCategory.NETWORK).toBe('NETWORK');
  });
});
