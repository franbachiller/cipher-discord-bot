import { ChannelManager, ChannelOptions } from './ChannelManager';
import { Logger } from '../utils/Logger';
import {
  Guild,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  GuildChannel,
  ChannelType,
  GuildMember,
  PermissionsBitField
} from 'discord.js';

// Mock del Logger
jest.mock('../utils/Logger');

describe('ChannelManager', () => {
  let channelManager: ChannelManager;
  let mockLogger: jest.Mocked<Logger>;
  let mockGuild: any;
  let mockBotMember: any;
  let mockHasPermission: jest.Mock;

  beforeEach(() => {
    // Crear mock del logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      logCommand: jest.fn()
    } as any;

    // Crear mock de la función has
    mockHasPermission = jest.fn().mockReturnValue(true);

    // Crear mock del bot member con permisos
    mockBotMember = {
      permissions: {
        has: mockHasPermission
      }
    };

    // Crear mock del guild
    mockGuild = {
      id: 'test-guild-id',
      members: {
        me: mockBotMember
      },
      channels: {
        create: jest.fn()
      }
    };

    channelManager = new ChannelManager(mockLogger);
  });

  describe('createTextChannel', () => {
    it('should create a text channel with valid parameters', async () => {
      const channelName = 'general';
      const mockChannel = {
        id: 'test-channel-id',
        name: channelName,
        type: ChannelType.GuildText
      } as TextChannel;

      mockGuild.channels.create.mockResolvedValue(mockChannel);

      const result = await channelManager.createTextChannel(mockGuild, channelName);

      expect(result).toBe(mockChannel);
      expect(mockGuild.channels.create).toHaveBeenCalledWith({
        name: channelName,
        type: ChannelType.GuildText,
        parent: undefined,
        position: undefined,
        topic: undefined,
        nsfw: undefined
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Text channel created successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          channelId: 'test-channel-id',
          channelName
        })
      );
    });

    it('should create a text channel with options', async () => {
      const channelName = 'announcements';
      const mockCategory = { id: 'category-id' } as CategoryChannel;
      const options: ChannelOptions = {
        category: mockCategory,
        position: 1,
        topic: 'Important announcements',
        nsfw: false
      };

      const mockChannel = {
        id: 'test-channel-id',
        name: channelName,
        type: ChannelType.GuildText
      } as TextChannel;

      mockGuild.channels.create.mockResolvedValue(mockChannel);

      const result = await channelManager.createTextChannel(mockGuild, channelName, options);

      expect(result).toBe(mockChannel);
      expect(mockGuild.channels.create).toHaveBeenCalledWith({
        name: channelName,
        type: ChannelType.GuildText,
        parent: 'category-id',
        position: 1,
        topic: 'Important announcements',
        nsfw: false
      });
    });

    it('should throw error when channel name is empty', async () => {
      await expect(
        channelManager.createTextChannel(mockGuild, '')
      ).rejects.toThrow('El nombre del canal no puede estar vacío');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error creating text channel',
        expect.any(Object)
      );
    });

    it('should throw error when channel name exceeds 100 characters', async () => {
      const longName = 'a'.repeat(101);

      await expect(
        channelManager.createTextChannel(mockGuild, longName)
      ).rejects.toThrow('El nombre del canal no puede exceder 100 caracteres');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error creating text channel',
        expect.any(Object)
      );
    });

    it('should throw error when bot lacks MANAGE_CHANNELS permission', async () => {
      mockHasPermission.mockReturnValue(false);

      await expect(
        channelManager.createTextChannel(mockGuild, 'test-channel')
      ).rejects.toThrow('MISSING_PERMISSIONS');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission error creating text channel',
        expect.objectContaining({
          guildId: 'test-guild-id',
          name: 'test-channel'
        })
      );
    });
  });

  describe('createVoiceChannel', () => {
    it('should create a voice channel with valid parameters', async () => {
      const channelName = 'voice-chat';
      const mockChannel = {
        id: 'test-voice-channel-id',
        name: channelName,
        type: ChannelType.GuildVoice
      } as VoiceChannel;

      mockGuild.channels.create.mockResolvedValue(mockChannel);

      const result = await channelManager.createVoiceChannel(mockGuild, channelName);

      expect(result).toBe(mockChannel);
      expect(mockGuild.channels.create).toHaveBeenCalledWith({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: undefined,
        position: undefined,
        nsfw: undefined
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Voice channel created successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          channelId: 'test-voice-channel-id',
          channelName
        })
      );
    });

    it('should throw error when voice channel name is empty', async () => {
      await expect(
        channelManager.createVoiceChannel(mockGuild, '   ')
      ).rejects.toThrow('El nombre del canal no puede estar vacío');
    });

    it('should throw error when bot lacks MANAGE_CHANNELS permission for voice', async () => {
      mockHasPermission.mockReturnValue(false);

      await expect(
        channelManager.createVoiceChannel(mockGuild, 'voice-channel')
      ).rejects.toThrow('MISSING_PERMISSIONS');
    });
  });

  describe('moveToCategory', () => {
    it('should move a channel to a category', async () => {
      const mockChannel = {
        id: 'channel-id',
        guild: mockGuild,
        setParent: jest.fn().mockResolvedValue(undefined)
      } as any;

      const mockCategory = {
        id: 'category-id'
      } as CategoryChannel;

      await channelManager.moveToCategory(mockChannel, mockCategory);

      expect(mockChannel.setParent).toHaveBeenCalledWith('category-id');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Channel moved to category successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          channelId: 'channel-id',
          categoryId: 'category-id'
        })
      );
    });

    it('should throw error when bot lacks MANAGE_CHANNELS permission', async () => {
      mockHasPermission.mockReturnValue(false);

      const mockChannel = {
        id: 'channel-id',
        guild: mockGuild,
        setParent: jest.fn()
      } as any;

      const mockCategory = {
        id: 'category-id'
      } as CategoryChannel;

      await expect(
        channelManager.moveToCategory(mockChannel, mockCategory)
      ).rejects.toThrow('MISSING_PERMISSIONS');
    });
  });

  describe('deleteChannel', () => {
    it('should delete a channel successfully', async () => {
      const mockChannel = {
        id: 'channel-to-delete',
        guild: mockGuild,
        delete: jest.fn().mockResolvedValue(undefined)
      } as any;

      await channelManager.deleteChannel(mockChannel);

      expect(mockChannel.delete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Channel deleted successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          channelId: 'channel-to-delete'
        })
      );
    });

    it('should throw error when bot lacks MANAGE_CHANNELS permission', async () => {
      mockHasPermission.mockReturnValue(false);

      const mockChannel = {
        id: 'channel-id',
        guild: mockGuild,
        delete: jest.fn()
      } as any;

      await expect(
        channelManager.deleteChannel(mockChannel)
      ).rejects.toThrow('MISSING_PERMISSIONS');
    });
  });
});
