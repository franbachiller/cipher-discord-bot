import { ConfigManager, Config, LogLevel, ValidationResult } from './ConfigManager';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock del módulo fs/promises
jest.mock('fs/promises');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    configManager = new ConfigManager();
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('debe validar una configuración válida', () => {
      const validConfig = {
        token: 'test-token-123',
        prefix: '!',
        logLevel: 'info',
        logFile: 'bot.log'
      };

      const result = configManager.validate(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe rechazar configuración que no es un objeto', () => {
      const result = configManager.validate(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La configuración debe ser un objeto');
    });

    it('debe rechazar configuración sin token', () => {
      const invalidConfig = {
        prefix: '!',
        logLevel: 'info',
        logFile: 'bot.log'
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El campo "token" es requerido');
    });

    it('debe rechazar token vacío', () => {
      const invalidConfig = {
        token: '   ',
        prefix: '!',
        logLevel: 'info',
        logFile: 'bot.log'
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El campo "token" no puede estar vacío');
    });

    it('debe rechazar token que no es string', () => {
      const invalidConfig = {
        token: 123,
        prefix: '!',
        logLevel: 'info',
        logFile: 'bot.log'
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El campo "token" debe ser una cadena de texto');
    });

    it('debe rechazar configuración sin prefix', () => {
      const invalidConfig = {
        token: 'test-token',
        logLevel: 'info',
        logFile: 'bot.log'
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El campo "prefix" es requerido');
    });

    it('debe rechazar prefix vacío', () => {
      const invalidConfig = {
        token: 'test-token',
        prefix: '',
        logLevel: 'info',
        logFile: 'bot.log'
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El campo "prefix" no puede estar vacío');
    });

    it('debe rechazar configuración sin logLevel', () => {
      const invalidConfig = {
        token: 'test-token',
        prefix: '!',
        logFile: 'bot.log'
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El campo "logLevel" es requerido');
    });

    it('debe rechazar logLevel inválido', () => {
      const invalidConfig = {
        token: 'test-token',
        prefix: '!',
        logLevel: 'invalid-level',
        logFile: 'bot.log'
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('debe ser uno de'))).toBe(true);
    });

    it('debe aceptar todos los niveles de log válidos', () => {
      const validLevels = ['debug', 'info', 'warn', 'error'];

      validLevels.forEach(level => {
        const config = {
          token: 'test-token',
          prefix: '!',
          logLevel: level,
          logFile: 'bot.log'
        };

        const result = configManager.validate(config);
        expect(result.valid).toBe(true);
      });
    });

    it('debe rechazar configuración sin logFile', () => {
      const invalidConfig = {
        token: 'test-token',
        prefix: '!',
        logLevel: 'info'
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El campo "logFile" es requerido');
    });

    it('debe rechazar logFile vacío', () => {
      const invalidConfig = {
        token: 'test-token',
        prefix: '!',
        logLevel: 'info',
        logFile: '  '
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('El campo "logFile" no puede estar vacío');
    });

    it('debe retornar múltiples errores cuando hay varios campos inválidos', () => {
      const invalidConfig = {
        token: '',
        logLevel: 'invalid'
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('load', () => {
    it('debe cargar una configuración válida desde archivo', async () => {
      const validConfig = {
        token: 'test-token-123',
        prefix: '!',
        logLevel: 'info',
        logFile: 'bot.log'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(validConfig));

      const config = await configManager.load('config.json');

      expect(config).toEqual(validConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        'utf-8'
      );
    });

    it('debe lanzar error si el archivo no existe', async () => {
      const error: NodeJS.ErrnoException = new Error('File not found');
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      await expect(configManager.load('nonexistent.json'))
        .rejects
        .toThrow('Archivo de configuración no encontrado');
    });

    it('debe lanzar error si el archivo no es JSON válido', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json }');

      await expect(configManager.load('config.json'))
        .rejects
        .toThrow('no es un JSON válido');
    });

    it('debe lanzar error si la configuración es inválida', async () => {
      const invalidConfig = {
        token: 'test-token'
        // Faltan campos requeridos
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      await expect(configManager.load('config.json'))
        .rejects
        .toThrow('Configuración inválida');
    });

    it('debe guardar la configuración después de cargarla', async () => {
      const validConfig = {
        token: 'test-token-123',
        prefix: '!',
        logLevel: 'info',
        logFile: 'bot.log'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(validConfig));

      await configManager.load('config.json');
      const storedConfig = configManager.getConfig();

      expect(storedConfig).toEqual(validConfig);
    });
  });

  describe('getConfig', () => {
    it('debe retornar null si no se ha cargado configuración', () => {
      const config = configManager.getConfig();
      expect(config).toBeNull();
    });

    it('debe retornar la configuración después de cargarla', async () => {
      const validConfig = {
        token: 'test-token-123',
        prefix: '!',
        logLevel: 'info',
        logFile: 'bot.log'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(validConfig));

      await configManager.load('config.json');
      const config = configManager.getConfig();

      expect(config).toEqual(validConfig);
    });
  });
});
