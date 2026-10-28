import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger, User } from './Logger';
import { LogLevel } from '../managers/ConfigManager';

// Mock del módulo fs/promises
jest.mock('fs/promises');

describe('Logger', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const testLogFile = 'test-logs/bot.log';
  let consoleSpies: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    // Limpiar mocks
    jest.clearAllMocks();
    
    // Mock de fs.mkdir y fs.appendFile
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
    
    // Espiar métodos de consola
    consoleSpies = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };
  });

  afterEach(() => {
    // Restaurar espías
    Object.values(consoleSpies).forEach(spy => spy.mockRestore());
  });

  describe('log()', () => {
    it('should write log entry to file with timestamp', async () => {
      const logger = new Logger(testLogFile, LogLevel.DEBUG);
      
      logger.log(LogLevel.INFO, 'Test message');
      
      // Esperar a que se complete la escritura asíncrona
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verificar que se llamó appendFile
      expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
      
      // Obtener el contenido escrito
      const callArgs = mockFs.appendFile.mock.calls[0];
      const writtenContent = callArgs[1] as string;
      
      // Verificar que contiene los campos esperados
      expect(writtenContent).toContain('"level":"info"');
      expect(writtenContent).toContain('"message":"Test message"');
      expect(writtenContent).toContain('"timestamp"');
      
      // Verificar que el path termina con el archivo esperado
      expect(callArgs[0]).toMatch(/test-logs[\\\/]bot\.log$/);
      expect(callArgs[2]).toBe('utf-8');
    });

    it('should include metadata in log entry', async () => {
      const logger = new Logger(testLogFile, LogLevel.DEBUG);
      const metadata = { userId: '123', action: 'test' };
      
      logger.log(LogLevel.INFO, 'Test with metadata', metadata);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"metadata":{"userId":"123","action":"test"}'),
        'utf-8'
      );
    });

    it('should respect minimum log level', async () => {
      const logger = new Logger(testLogFile, LogLevel.WARN);
      
      logger.log(LogLevel.DEBUG, 'Debug message');
      logger.log(LogLevel.INFO, 'Info message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // No debería escribir mensajes por debajo del nivel WARN
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should log messages at or above minimum level', async () => {
      const logger = new Logger(testLogFile, LogLevel.WARN);
      
      logger.log(LogLevel.WARN, 'Warning message');
      logger.log(LogLevel.ERROR, 'Error message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledTimes(2);
    });

    it('should create directory if it does not exist', async () => {
      const logger = new Logger('logs/subfolder/bot.log', LogLevel.INFO);
      
      logger.log(LogLevel.INFO, 'Test message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true }
      );
    });
  });

  describe('debug()', () => {
    it('should log message with DEBUG level', async () => {
      const logger = new Logger(testLogFile, LogLevel.DEBUG);
      
      logger.debug('Debug message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"level":"debug"'),
        'utf-8'
      );
    });

    it('should accept metadata', async () => {
      const logger = new Logger(testLogFile, LogLevel.DEBUG);
      
      logger.debug('Debug with metadata', { key: 'value' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"metadata":{"key":"value"}'),
        'utf-8'
      );
    });
  });

  describe('info()', () => {
    it('should log message with INFO level', async () => {
      const logger = new Logger(testLogFile, LogLevel.INFO);
      
      logger.info('Info message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"level":"info"'),
        'utf-8'
      );
    });
  });

  describe('warn()', () => {
    it('should log message with WARN level', async () => {
      const logger = new Logger(testLogFile, LogLevel.WARN);
      
      logger.warn('Warning message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"level":"warn"'),
        'utf-8'
      );
    });
  });

  describe('error()', () => {
    it('should log message with ERROR level', async () => {
      const logger = new Logger(testLogFile, LogLevel.ERROR);
      
      logger.error('Error message');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"level":"error"'),
        'utf-8'
      );
    });

    it('should log error with stack trace in metadata', async () => {
      const logger = new Logger(testLogFile, LogLevel.ERROR);
      const error = new Error('Test error');
      
      logger.error('Error occurred', { error: error.message, stack: error.stack });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"error":"Test error"'),
        'utf-8'
      );
    });
  });

  describe('logCommand()', () => {
    it('should log command execution with user information', async () => {
      const logger = new Logger(testLogFile, LogLevel.INFO);
      const user: User = {
        id: '123456789',
        username: 'testuser',
        discriminator: '1234'
      };
      
      logger.logCommand(user, 'createchannel', ['general', 'text']);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"message":"Command executed"'),
        'utf-8'
      );
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"user":"testuser#1234"'),
        'utf-8'
      );
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"userId":"123456789"'),
        'utf-8'
      );
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"command":"createchannel"'),
        'utf-8'
      );
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"args":["general","text"]'),
        'utf-8'
      );
    });

    it('should use INFO level for command logging', async () => {
      const logger = new Logger(testLogFile, LogLevel.INFO);
      const user: User = {
        id: '123',
        username: 'user',
        discriminator: '0001'
      };
      
      logger.logCommand(user, 'help', []);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"level":"info"'),
        'utf-8'
      );
    });
  });

  describe('console output', () => {
    it('should write to console.debug for DEBUG level', () => {
      const logger = new Logger(testLogFile, LogLevel.DEBUG);
      
      logger.debug('Debug message');
      
      expect(consoleSpies.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG')
      );
      expect(consoleSpies.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });

    it('should write to console.info for INFO level', () => {
      const logger = new Logger(testLogFile, LogLevel.INFO);
      
      logger.info('Info message');
      
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO')
      );
    });

    it('should write to console.warn for WARN level', () => {
      const logger = new Logger(testLogFile, LogLevel.WARN);
      
      logger.warn('Warning message');
      
      expect(consoleSpies.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN')
      );
    });

    it('should write to console.error for ERROR level', () => {
      const logger = new Logger(testLogFile, LogLevel.ERROR);
      
      logger.error('Error message');
      
      expect(consoleSpies.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR')
      );
    });
  });

  describe('error handling', () => {
    it('should handle file write errors gracefully', async () => {
      mockFs.appendFile.mockRejectedValue(new Error('Write failed'));
      const logger = new Logger(testLogFile, LogLevel.INFO);
      
      // No debería lanzar error
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Debería haber intentado escribir
      expect(mockFs.appendFile).toHaveBeenCalled();
    });

    it('should handle mkdir errors gracefully', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Mkdir failed'));
      const logger = new Logger(testLogFile, LogLevel.INFO);
      
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  });
});
