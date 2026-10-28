import { Command, CommandContext, CommandResult } from './types';
import { Message, Guild, User, PermissionFlagsBits } from 'discord.js';

describe('Command Types', () => {
  describe('CommandContext', () => {
    it('should have required properties', () => {
      const mockMessage = {} as Message;
      const mockGuild = {} as Guild;
      const mockUser = {} as User;
      
      const context: CommandContext = {
        message: mockMessage,
        args: ['arg1', 'arg2'],
        guild: mockGuild,
        author: mockUser,
      };
      
      expect(context.message).toBe(mockMessage);
      expect(context.args).toEqual(['arg1', 'arg2']);
      expect(context.guild).toBe(mockGuild);
      expect(context.author).toBe(mockUser);
    });
  });

  describe('CommandResult', () => {
    it('should support success result without data', () => {
      const result: CommandResult = {
        success: true,
        message: 'Command executed successfully',
      };
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Command executed successfully');
      expect(result.data).toBeUndefined();
    });

    it('should support success result with data', () => {
      const result: CommandResult = {
        success: true,
        message: 'Channel created',
        data: { channelId: '123', channelName: 'general' },
      };
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Channel created');
      expect(result.data).toEqual({ channelId: '123', channelName: 'general' });
    });

    it('should support error result', () => {
      const result: CommandResult = {
        success: false,
        message: 'Insufficient permissions',
      };
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient permissions');
    });
  });

  describe('Command', () => {
    it('should have all required properties', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        success: true,
        message: 'Test command executed',
      });

      const command: Command = {
        name: 'test',
        description: 'A test command',
        usage: '!test <arg>',
        category: 'testing',
        requiredPermissions: [PermissionFlagsBits.Administrator],
        execute: mockExecute,
      };
      
      expect(command.name).toBe('test');
      expect(command.description).toBe('A test command');
      expect(command.usage).toBe('!test <arg>');
      expect(command.category).toBe('testing');
      expect(command.requiredPermissions).toEqual([PermissionFlagsBits.Administrator]);
      expect(command.execute).toBe(mockExecute);
    });

    it('should execute and return CommandResult', async () => {
      const mockContext = {
        message: {} as Message,
        args: ['test'],
        guild: {} as Guild,
        author: {} as User,
      };

      const command: Command = {
        name: 'test',
        description: 'Test command',
        usage: '!test',
        category: 'test',
        requiredPermissions: [],
        execute: async (context: CommandContext): Promise<CommandResult> => {
          return {
            success: true,
            message: `Executed with args: ${context.args.join(', ')}`,
            data: { argsCount: context.args.length },
          };
        },
      };

      const result = await command.execute(mockContext);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Executed with args: test');
      expect(result.data).toEqual({ argsCount: 1 });
    });

    it('should support multiple permission requirements', () => {
      const command: Command = {
        name: 'admin',
        description: 'Admin command',
        usage: '!admin',
        category: 'admin',
        requiredPermissions: [
          PermissionFlagsBits.Administrator,
          PermissionFlagsBits.ManageGuild,
        ],
        execute: async () => ({ success: true, message: 'OK' }),
      };
      
      expect(command.requiredPermissions).toHaveLength(2);
      expect(command.requiredPermissions).toContain(PermissionFlagsBits.Administrator);
      expect(command.requiredPermissions).toContain(PermissionFlagsBits.ManageGuild);
    });

    it('should support commands with no permission requirements', () => {
      const command: Command = {
        name: 'help',
        description: 'Help command',
        usage: '!help',
        category: 'general',
        requiredPermissions: [],
        execute: async () => ({ success: true, message: 'Help text' }),
      };
      
      expect(command.requiredPermissions).toEqual([]);
    });
  });
});
