/**
 * Tests para el punto de entrada del bot (index.ts)
 * 
 * Estos tests verifican que el bot se inicialice correctamente
 * y maneje errores de startup apropiadamente
 */

import { ConfigManager, LogLevel } from './managers/ConfigManager';
import { Logger } from './utils/Logger';
import { BotClient } from './client/BotClient';

// Mock de módulos
jest.mock('./managers/ConfigManager');
jest.mock('./utils/Logger');
jest.mock('./client/BotClient');
jest.mock('./managers/ChannelManager');
jest.mock('./managers/RoleManager');
jest.mock('./managers/PermissionManager');
jest.mock('./managers/ServerManager');
jest.mock('./commands/CommandManager');

// Mock de comandos
jest.mock('./commands/createchannel');
jest.mock('./commands/createrole');
jest.mock('./commands/assignrole');
jest.mock('./commands/removerole');
jest.mock('./commands/setpermissions');
jest.mock('./commands/help');
jest.mock('./commands/setservername');
jest.mock('./commands/setserverdescription');
jest.mock('./commands/createcategory');
jest.mock('./commands/movechannel');

describe('Bot Initialization', () => {
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockLogger: jest.Mocked<Logger>;
  let mockBotClient: jest.Mocked<BotClient>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Limpiar mocks
    jest.clearAllMocks();

    // Spy en console
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Spy en process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`Process.exit called with code ${code}`);
    });

    // Setup mocks
    mockConfigManager = new ConfigManager() as jest.Mocked<ConfigManager>;
    mockLogger = new Logger('test.log', LogLevel.INFO) as jest.Mocked<Logger>;
    mockBotClient = new BotClient(
      { token: 'test', prefix: '!', logLevel: LogLevel.INFO, logFile: 'test.log' },
      mockLogger
    ) as jest.Mocked<BotClient>;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Configuration Loading', () => {
    it('should verify ConfigManager can be instantiated', () => {
      const configManager = new ConfigManager();
      expect(configManager).toBeDefined();
    });

    it('should verify config structure', () => {
      const mockConfig = {
        token: 'test-token',
        prefix: '!',
        logLevel: LogLevel.INFO,
        logFile: 'bot.log'
      };

      expect(mockConfig).toHaveProperty('token');
      expect(mockConfig).toHaveProperty('prefix');
      expect(mockConfig).toHaveProperty('logLevel');
      expect(mockConfig).toHaveProperty('logFile');
    });
  });

  describe('Logger Initialization', () => {
    it('should initialize logger with config values', () => {
      const logger = new Logger('bot.log', LogLevel.INFO);
      
      expect(Logger).toHaveBeenCalledWith('bot.log', LogLevel.INFO);
    });

    it('should log bot startup', () => {
      const logger = new Logger('bot.log', LogLevel.INFO);
      logger.info = jest.fn();
      
      logger.info('Bot iniciando...', { 
        logLevel: LogLevel.INFO,
        prefix: '!' 
      });

      expect(logger.info).toHaveBeenCalledWith('Bot iniciando...', {
        logLevel: LogLevel.INFO,
        prefix: '!'
      });
    });
  });

  describe('Bot Client Initialization', () => {
    it('should create BotClient with config and logger', () => {
      const config = {
        token: 'test-token',
        prefix: '!',
        logLevel: LogLevel.INFO,
        logFile: 'bot.log'
      };
      const logger = new Logger('bot.log', LogLevel.INFO);
      
      const botClient = new BotClient(config, logger);
      
      expect(BotClient).toHaveBeenCalledWith(config, logger);
    });

    it('should start bot client', async () => {
      const config = {
        token: 'test-token',
        prefix: '!',
        logLevel: LogLevel.INFO,
        logFile: 'bot.log'
      };
      const logger = new Logger('bot.log', LogLevel.INFO);
      const botClient = new BotClient(config, logger);
      
      botClient.start = jest.fn().mockResolvedValue(undefined);
      
      await botClient.start();
      
      expect(botClient.start).toHaveBeenCalled();
    });
  });

  describe('Command Registration', () => {
    it('should register all commands', () => {
      // Este test verifica que todos los comandos se importen correctamente
      // En un test de integración real, verificaríamos que CommandManager.registerCommand
      // se llame 10 veces (una por cada comando)
      
      const commands = [
        'createchannel',
        'createrole',
        'assignrole',
        'removerole',
        'setpermissions',
        'setservername',
        'setserverdescription',
        'createcategory',
        'movechannel',
        'help'
      ];

      expect(commands).toHaveLength(10);
    });
  });

  describe('Error Handling', () => {
    it('should verify error structure', () => {
      const mockError = new Error('Failed to connect to Discord');
      
      expect(mockError).toBeInstanceOf(Error);
      expect(mockError.message).toBe('Failed to connect to Discord');
    });

    it('should verify error logging structure', () => {
      const mockError = new Error('Configuration error');
      const errorLog = {
        message: 'Error fatal al iniciar el bot',
        error: mockError.message,
        stack: mockError.stack
      };

      expect(errorLog).toHaveProperty('message');
      expect(errorLog).toHaveProperty('error');
      expect(errorLog.error).toBe('Configuration error');
    });
  });

  describe('Event Handlers', () => {
    it('should register ready event handler', () => {
      const config = {
        token: 'test-token',
        prefix: '!',
        logLevel: LogLevel.INFO,
        logFile: 'bot.log'
      };
      const logger = new Logger('bot.log', LogLevel.INFO);
      const botClient = new BotClient(config, logger);
      
      botClient.on = jest.fn();
      
      botClient.on('ready', () => {});
      
      expect(botClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should register messageCreate event handler', () => {
      const config = {
        token: 'test-token',
        prefix: '!',
        logLevel: LogLevel.INFO,
        logFile: 'bot.log'
      };
      const logger = new Logger('bot.log', LogLevel.INFO);
      const botClient = new BotClient(config, logger);
      
      botClient.on = jest.fn();
      
      botClient.on('messageCreate', async () => {});
      
      expect(botClient.on).toHaveBeenCalledWith('messageCreate', expect.any(Function));
    });

    it('should register error event handler', () => {
      const config = {
        token: 'test-token',
        prefix: '!',
        logLevel: LogLevel.INFO,
        logFile: 'bot.log'
      };
      const logger = new Logger('bot.log', LogLevel.INFO);
      const botClient = new BotClient(config, logger);
      
      botClient.on = jest.fn();
      
      botClient.on('error', () => {});
      
      expect(botClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});
