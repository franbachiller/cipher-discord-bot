import { ServerManager } from './ServerManager';
import { Logger } from '../utils/Logger';
import {
  Guild,
  CategoryChannel,
  PermissionsBitField,
  ChannelType
} from 'discord.js';

// Mock del Logger
jest.mock('../utils/Logger');

describe('ServerManager', () => {
  let serverManager: ServerManager;
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
      setName: jest.fn().mockResolvedValue(undefined),
      edit: jest.fn().mockResolvedValue(undefined),
      channels: {
        create: jest.fn()
      }
    };

    serverManager = new ServerManager(mockLogger);
  });

  describe('setServerName', () => {
    it('should update server name with valid name', async () => {
      const newName = 'My Awesome Server';

      await serverManager.setServerName(mockGuild, newName);

      expect(mockGuild.setName).toHaveBeenCalledWith(newName);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Server name updated successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          newName: 'My Awesome Server'
        })
      );
    });

    it('should throw error when server name is empty', async () => {
      await expect(
        serverManager.setServerName(mockGuild, '')
      ).rejects.toThrow('El nombre del servidor no puede estar vacío');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error setting server name',
        expect.any(Object)
      );
    });

    it('should throw error when server name exceeds 100 characters', async () => {
      const longName = 'a'.repeat(101);

      await expect(
        serverManager.setServerName(mockGuild, longName)
      ).rejects.toThrow('El nombre del servidor no puede exceder 100 caracteres');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error setting server name',
        expect.any(Object)
      );
    });

    it('should throw error when bot lacks MANAGE_GUILD permission', async () => {
      mockHasPermission.mockReturnValue(false);

      await expect(
        serverManager.setServerName(mockGuild, 'New Name')
      ).rejects.toThrow('MISSING_PERMISSIONS');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission error setting server name',
        expect.objectContaining({
          guildId: 'test-guild-id'
        })
      );
    });
  });

  describe('setServerDescription', () => {
    it('should update server description with valid description', async () => {
      const newDescription = 'This is a test server for our community';

      await serverManager.setServerDescription(mockGuild, newDescription);

      expect(mockGuild.edit).toHaveBeenCalledWith({ description: newDescription });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Server description updated successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          newDescription: 'This is a test server for our community'
        })
      );
    });

    it('should allow empty string as description', async () => {
      await serverManager.setServerDescription(mockGuild, '');

      expect(mockGuild.edit).toHaveBeenCalledWith({ description: '' });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw error when description is null', async () => {
      await expect(
        serverManager.setServerDescription(mockGuild, null as any)
      ).rejects.toThrow('La descripción del servidor no puede ser nula');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error setting server description',
        expect.any(Object)
      );
    });

    it('should throw error when description exceeds 1024 characters', async () => {
      const longDescription = 'a'.repeat(1025);

      await expect(
        serverManager.setServerDescription(mockGuild, longDescription)
      ).rejects.toThrow('La descripción del servidor no puede exceder 1024 caracteres');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error setting server description',
        expect.any(Object)
      );
    });

    it('should throw error when bot lacks MANAGE_GUILD permission', async () => {
      mockHasPermission.mockReturnValue(false);

      await expect(
        serverManager.setServerDescription(mockGuild, 'New Description')
      ).rejects.toThrow('MISSING_PERMISSIONS');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission error setting server description',
        expect.objectContaining({
          guildId: 'test-guild-id'
        })
      );
    });
  });

  describe('createCategory', () => {
    it('should create a category with valid name', async () => {
      const categoryName = 'General';

      const mockCategory = {
        id: 'category-id',
        name: 'General',
        type: ChannelType.GuildCategory,
        guild: mockGuild
      } as CategoryChannel;

      mockGuild.channels.create.mockResolvedValue(mockCategory);

      const result = await serverManager.createCategory(mockGuild, categoryName);

      expect(result).toBe(mockCategory);
      expect(mockGuild.channels.create).toHaveBeenCalledWith({
        name: 'General',
        type: ChannelType.GuildCategory
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Category created successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          categoryId: 'category-id',
          categoryName: 'General'
        })
      );
    });

    it('should throw error when category name is empty', async () => {
      await expect(
        serverManager.createCategory(mockGuild, '')
      ).rejects.toThrow('El nombre de la categoría no puede estar vacío');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error creating category',
        expect.any(Object)
      );
    });

    it('should throw error when category name exceeds 100 characters', async () => {
      const longName = 'a'.repeat(101);

      await expect(
        serverManager.createCategory(mockGuild, longName)
      ).rejects.toThrow('El nombre de la categoría no puede exceder 100 caracteres');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error creating category',
        expect.any(Object)
      );
    });

    it('should throw error when bot lacks MANAGE_CHANNELS permission', async () => {
      mockHasPermission.mockReturnValue(false);

      await expect(
        serverManager.createCategory(mockGuild, 'Test Category')
      ).rejects.toThrow('MISSING_PERMISSIONS');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission error creating category',
        expect.objectContaining({
          guildId: 'test-guild-id'
        })
      );
    });
  });
});
