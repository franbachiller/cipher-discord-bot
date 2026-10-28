import { CommandManager } from './CommandManager';
import { Command, CommandContext, CommandResult } from './types';
import { Logger } from '../utils/Logger';
import { LogLevel } from '../managers/ConfigManager';
import { 
  Message, 
  Guild, 
  User, 
  GuildMember, 
  PermissionsBitField,
  TextChannel
} from 'discord.js';

// Mock del Logger
jest.mock('../utils/Logger');

describe('CommandManager', () => {
  let commandManager: CommandManager;
  let mockLogger: jest.Mocked<Logger>;
  const prefix = '!';

  beforeEach(() => {
    // Crear mock del logger
    mockLogger = new Logger('test.log', LogLevel.DEBUG) as jest.Mocked<Logger>;
    mockLogger.debug = jest.fn();
    mockLogger.info = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.logCommand = jest.fn();

    // Crear instancia del CommandManager
    commandManager = new CommandManager(prefix, mockLogger);
  });

  describe('registerCommand', () => {
    it('should register a command successfully', () => {
      const command: Command = {
        name: 'test',
        description: 'Test command',
        usage: '!test',
        category: 'testing',
        requiredPermissions: [],
        execute: jest.fn()
      };

      commandManager.registerCommand(command);

      const commands = commandManager.listCommands();
      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('test');
    });

    it('should warn when overwriting an existing command', () => {
      const command1: Command = {
        name: 'test',
        description: 'Test command 1',
        usage: '!test',
        category: 'testing',
        requiredPermissions: [],
        execute: jest.fn()
      };

      const command2: Command = {
        name: 'test',
        description: 'Test command 2',
        usage: '!test',
        category: 'testing',
        requiredPermissions: [],
        execute: jest.fn()
      };

      commandManager.registerCommand(command1);
      commandManager.registerCommand(command2);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('already registered')
      );
    });
  });

  describe('handleMessage', () => {
    let mockMessage: any;
    let mockGuild: any;
    let mockUser: any;
    let mockMember: any;
    let mockChannel: any;

    beforeEach(() => {
      mockUser = {
        id: '123456789',
        username: 'testuser',
        discriminator: '0001',
        bot: false
      };

      mockGuild = {
        id: '987654321',
        name: 'Test Guild'
      };

      mockMember = {
        permissions: new PermissionsBitField(['ManageChannels', 'SendMessages'])
      };

      mockChannel = {
        id: 'channel123',
        send: jest.fn()
      };

      mockMessage = {
        author: mockUser,
        guild: mockGuild,
        member: mockMember,
        channel: mockChannel,
        content: '',
        reply: jest.fn()
      };
    });

    it('should ignore messages from bots', async () => {
      mockMessage.author = { ...mockUser, bot: true };
      mockMessage.content = '!test';

      await commandManager.handleMessage(mockMessage as Message);

      expect(mockMessage.reply).not.toHaveBeenCalled();
    });

    it('should ignore messages without prefix', async () => {
      mockMessage.content = 'hello world';

      await commandManager.handleMessage(mockMessage as Message);

      expect(mockMessage.reply).not.toHaveBeenCalled();
    });

    it('should reply error for messages not in a guild', async () => {
      const messageWithoutGuild = { ...mockMessage, guild: null };
      messageWithoutGuild.content = '!test';

      await commandManager.handleMessage(messageWithoutGuild as Message);

      expect(messageWithoutGuild.reply).toHaveBeenCalledWith(
        expect.stringContaining('solo pueden ejecutarse en servidores')
      );
    });

    it('should reply error for unknown commands', async () => {
      mockMessage.content = '!unknowncommand';

      await commandManager.handleMessage(mockMessage as Message);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('Comando desconocido')
      );
    });

    it('should execute a valid command successfully', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        success: true,
        message: 'Command executed successfully'
      } as CommandResult);

      const command: Command = {
        name: 'test',
        description: 'Test command',
        usage: '!test',
        category: 'testing',
        requiredPermissions: [],
        execute: mockExecute
      };

      commandManager.registerCommand(command);
      mockMessage.content = '!test arg1 arg2';

      await commandManager.handleMessage(mockMessage as Message);

      expect(mockExecute).toHaveBeenCalled();
      expect(mockMessage.reply).toHaveBeenCalledWith('Command executed successfully');
      expect(mockLogger.logCommand).toHaveBeenCalled();
    });

    it('should deny execution when user lacks required permissions', async () => {
      const command: Command = {
        name: 'admin',
        description: 'Admin command',
        usage: '!admin',
        category: 'admin',
        requiredPermissions: ['Administrator'],
        execute: jest.fn()
      };

      commandManager.registerCommand(command);
      mockMessage.content = '!admin';

      await commandManager.handleMessage(mockMessage as Message);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('No tienes permisos suficientes')
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Permission denied',
        expect.any(Object)
      );
    });

    it('should handle command execution errors gracefully', async () => {
      const mockExecute = jest.fn().mockRejectedValue(new Error('Test error'));

      const command: Command = {
        name: 'error',
        description: 'Error command',
        usage: '!error',
        category: 'testing',
        requiredPermissions: [],
        execute: mockExecute
      };

      commandManager.registerCommand(command);
      mockMessage.content = '!error';

      await commandManager.handleMessage(mockMessage as Message);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('Error al ejecutar el comando')
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should parse command arguments correctly', async () => {
      let capturedContext: CommandContext | undefined;

      const mockExecute = jest.fn().mockImplementation((context: CommandContext) => {
        capturedContext = context;
        return Promise.resolve({
          success: true,
          message: 'OK'
        } as CommandResult);
      });

      const command: Command = {
        name: 'test',
        description: 'Test command',
        usage: '!test <arg1> <arg2>',
        category: 'testing',
        requiredPermissions: [],
        execute: mockExecute
      };

      commandManager.registerCommand(command);
      mockMessage.content = '!test arg1 arg2 arg3';

      await commandManager.handleMessage(mockMessage as Message);

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.args).toEqual(['arg1', 'arg2', 'arg3']);
    });
  });

  describe('getHelp', () => {
    beforeEach(() => {
      // Registrar algunos comandos de prueba
      const commands: Command[] = [
        {
          name: 'createchannel',
          description: 'Crea un canal',
          usage: '!createchannel <nombre> <tipo>',
          category: 'channels',
          requiredPermissions: ['ManageChannels'],
          execute: jest.fn()
        },
        {
          name: 'createrole',
          description: 'Crea un rol',
          usage: '!createrole <nombre>',
          category: 'roles',
          requiredPermissions: ['ManageRoles'],
          execute: jest.fn()
        },
        {
          name: 'help',
          description: 'Muestra ayuda',
          usage: '!help [comando]',
          category: 'general',
          requiredPermissions: [],
          execute: jest.fn()
        }
      ];

      commands.forEach(cmd => commandManager.registerCommand(cmd));
    });

    it('should return general help when no command name is provided', () => {
      const help = commandManager.getHelp();

      expect(help).toContain('Comandos Disponibles');
      expect(help).toContain('channels');
      expect(help).toContain('roles');
      expect(help).toContain('general');
      expect(help).toContain('createchannel');
      expect(help).toContain('createrole');
      expect(help).toContain('help');
    });

    it('should return specific help for a valid command', () => {
      const help = commandManager.getHelp('createchannel');

      expect(help).toContain('createchannel');
      expect(help).toContain('Crea un canal');
      expect(help).toContain('!createchannel <nombre> <tipo>');
      expect(help).toContain('channels');
      expect(help).toContain('ManageChannels');
    });

    it('should return error message for unknown command', () => {
      const help = commandManager.getHelp('unknowncommand');

      expect(help).toContain('Comando no encontrado');
      expect(help).toContain('unknowncommand');
    });

    it('should include command syntax and parameter descriptions', () => {
      const help = commandManager.getHelp('createchannel');

      expect(help).toContain('Uso:');
      expect(help).toContain('!createchannel <nombre> <tipo>');
    });

    it('should categorize commands by functionality', () => {
      const help = commandManager.getHelp();

      // Verificar que las categorías están presentes
      expect(help).toContain('channels');
      expect(help).toContain('roles');
      expect(help).toContain('general');

      // Verificar que los comandos están bajo sus categorías
      const channelsIndex = help.indexOf('channels');
      const rolesIndex = help.indexOf('roles');
      const createChannelIndex = help.indexOf('createchannel');
      const createRoleIndex = help.indexOf('createrole');

      expect(createChannelIndex).toBeGreaterThan(channelsIndex);
      expect(createRoleIndex).toBeGreaterThan(rolesIndex);
    });
  });

  describe('listCommands', () => {
    it('should return empty array when no commands are registered', () => {
      const commands = commandManager.listCommands();
      expect(commands).toEqual([]);
    });

    it('should return all registered commands', () => {
      const command1: Command = {
        name: 'test1',
        description: 'Test command 1',
        usage: '!test1',
        category: 'testing',
        requiredPermissions: [],
        execute: jest.fn()
      };

      const command2: Command = {
        name: 'test2',
        description: 'Test command 2',
        usage: '!test2',
        category: 'testing',
        requiredPermissions: [],
        execute: jest.fn()
      };

      commandManager.registerCommand(command1);
      commandManager.registerCommand(command2);

      const commands = commandManager.listCommands();
      expect(commands).toHaveLength(2);
      expect(commands.map(c => c.name)).toContain('test1');
      expect(commands.map(c => c.name)).toContain('test2');
    });
  });
});
