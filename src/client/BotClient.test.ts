import { BotClient } from './BotClient';
import { Config, LogLevel } from '../managers/ConfigManager';
import { Logger } from '../utils/Logger';
import { Events } from 'discord.js';

// Mock de discord.js
jest.mock('discord.js', () => {
  const EventEmitter = require('events');
  
  class MockClient extends EventEmitter {
    user: any = null;
    login = jest.fn();
    destroy = jest.fn();
    
    isReady(): boolean {
      return false;
    }
  }

  return {
    Client: MockClient,
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
      GuildMembers: 8
    },
    Events: {
      ClientReady: 'ready',
      ShardDisconnect: 'shardDisconnect',
      ShardReconnecting: 'shardReconnecting',
      ShardResume: 'shardResume',
      Error: 'error',
      Warn: 'warn'
    }
  };
});

describe('BotClient', () => {
  let config: Config;
  let logger: Logger;
  let botClient: BotClient;

  beforeEach(() => {
    // Configuración de prueba
    config = {
      token: 'test-token-123',
      prefix: '!',
      logLevel: LogLevel.INFO,
      logFile: 'test.log'
    };

    // Logger mock
    logger = new Logger('test.log', LogLevel.DEBUG);
    jest.spyOn(logger, 'info').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
    jest.spyOn(logger, 'debug').mockImplementation();

    // Crear instancia del bot
    botClient = new BotClient(config, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a BotClient instance', () => {
      expect(botClient).toBeInstanceOf(BotClient);
    });

    it('should create a Discord client', () => {
      const client = botClient.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('start()', () => {
    it('should authenticate successfully with valid token', async () => {
      const client = botClient.getClient() as any;
      
      // Mock login exitoso
      client.login.mockResolvedValue('test-token-123');

      // Simular evento ClientReady después de un pequeño delay
      setTimeout(() => {
        client.user = { tag: 'TestBot#1234', id: '123456789' };
        client.isReady = jest.fn().mockReturnValue(true);
        client.emit('ready');
      }, 10);

      await botClient.start();

      expect(client.login).toHaveBeenCalledWith('test-token-123');
      expect(logger.info).toHaveBeenCalledWith('Starting bot...');
      expect(logger.info).toHaveBeenCalledWith('Bot connected successfully', {
        username: 'TestBot#1234',
        userId: '123456789'
      });
      expect(logger.info).toHaveBeenCalledWith('Bot started successfully');
    });

    it('should log error and throw when authentication fails', async () => {
      const client = botClient.getClient() as any;
      const authError = new Error('Invalid token');
      
      // Mock login fallido
      client.login.mockRejectedValue(authError);

      // Simular evento de error
      setTimeout(() => {
        client.emit('error', authError);
      }, 10);

      await expect(botClient.start()).rejects.toThrow('Bot authentication failed: Invalid token');

      expect(logger.error).toHaveBeenCalledWith('Failed to start bot', {
        error: 'Invalid token',
        stack: expect.any(String)
      });
    });

    it('should timeout if connection takes too long', async () => {
      const client = botClient.getClient() as any;
      
      // Mock login que nunca resuelve el evento ClientReady
      client.login.mockResolvedValue('test-token-123');

      // No emitir ningún evento para simular timeout

      await expect(botClient.start()).rejects.toThrow('Connection timeout');

      expect(logger.error).toHaveBeenCalledWith('Failed to start bot', expect.any(Object));
    }, 35000); // Timeout mayor que el del método (30s)
  });

  describe('stop()', () => {
    it('should disconnect cleanly', async () => {
      const client = botClient.getClient() as any;

      await botClient.stop();

      expect(client.destroy).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Stopping bot...');
      expect(logger.info).toHaveBeenCalledWith('Bot stopped successfully');
    });

    it('should log error if stop fails', async () => {
      const client = botClient.getClient() as any;
      const stopError = new Error('Destroy failed');
      
      client.destroy.mockImplementation(() => {
        throw stopError;
      });

      await expect(botClient.stop()).rejects.toThrow('Failed to stop bot');

      expect(logger.error).toHaveBeenCalledWith('Error stopping bot', {
        error: 'Destroy failed',
        stack: expect.any(String)
      });
    });
  });

  describe('Connection event logging', () => {
    it('should log when bot connects', () => {
      const client = botClient.getClient() as any;
      
      client.user = { tag: 'TestBot#1234', id: '123456789' };
      client.emit('ready');

      expect(logger.info).toHaveBeenCalledWith('Bot connected successfully', {
        username: 'TestBot#1234',
        userId: '123456789'
      });
    });

    it('should log when bot disconnects', () => {
      const client = botClient.getClient() as any;
      
      const disconnectEvent = { code: 1000, reason: 'Normal closure' };
      client.emit('shardDisconnect', disconnectEvent);

      expect(logger.warn).toHaveBeenCalledWith('Bot disconnected', {
        code: 1000,
        reason: 'Normal closure'
      });
    });

    it('should log when bot reconnects', () => {
      const client = botClient.getClient() as any;
      
      client.emit('shardReconnecting');

      expect(logger.info).toHaveBeenCalledWith('Bot reconnecting...');
    });

    it('should log when bot resumes connection', () => {
      const client = botClient.getClient() as any;
      
      client.emit('shardResume');

      expect(logger.info).toHaveBeenCalledWith('Bot reconnected successfully');
    });

    it('should log client errors', () => {
      const client = botClient.getClient() as any;
      const error = new Error('Connection error');
      
      client.emit('error', error);

      expect(logger.error).toHaveBeenCalledWith('Discord client error', {
        error: 'Connection error',
        stack: expect.any(String)
      });
    });

    it('should log client warnings', () => {
      const client = botClient.getClient() as any;
      
      client.emit('warn', 'Rate limit warning');

      expect(logger.warn).toHaveBeenCalledWith('Discord client warning', {
        warning: 'Rate limit warning'
      });
    });
  });

  describe('getClient()', () => {
    it('should return the Discord client instance', () => {
      const client = botClient.getClient();
      
      expect(client).toBeDefined();
    });
  });

  describe('on()', () => {
    it('should register event handlers', () => {
      const handler = jest.fn();
      
      botClient.on('testEvent', handler);
      
      const client = botClient.getClient() as any;
      client.emit('testEvent', 'test-data');

      expect(handler).toHaveBeenCalledWith('test-data');
    });
  });

  describe('isReady()', () => {
    it('should return false when not connected', () => {
      expect(botClient.isReady()).toBe(false);
    });

    it('should return true when connected and ready', () => {
      const client = botClient.getClient() as any;
      
      client.user = { tag: 'TestBot#1234', id: '123456789' };
      client.isReady = jest.fn().mockReturnValue(true);
      client.emit('ready');

      expect(botClient.isReady()).toBe(true);
    });
  });
});
