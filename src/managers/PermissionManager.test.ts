import { PermissionManager, PermissionOverwrite } from './PermissionManager';
import { Logger } from '../utils/Logger';
import {
  GuildChannel,
  Role,
  GuildMember,
  PermissionsBitField,
  PermissionFlagsBits
} from 'discord.js';

// Mock del Logger
jest.mock('../utils/Logger');

describe('PermissionManager', () => {
  let permissionManager: PermissionManager;
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
      }
    };

    permissionManager = new PermissionManager(mockLogger);
  });

  describe('setChannelPermissions', () => {
    it('should set permissions for a role in a channel', async () => {
      const mockChannel = {
        id: 'channel-id',
        guild: mockGuild,
        permissionOverwrites: {
          edit: jest.fn().mockResolvedValue(undefined)
        }
      } as any;

      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const permissions: PermissionOverwrite = {
        allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.MentionEveryone]
      };

      await permissionManager.setChannelPermissions(mockChannel, mockRole, permissions);

      expect(mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
        'role-id',
        expect.objectContaining({
          SendMessages: true,
          ViewChannel: true,
          MentionEveryone: false
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Channel permissions set successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          channelId: 'channel-id',
          roleId: 'role-id'
        })
      );
    });

    it('should handle empty permission arrays', async () => {
      const mockChannel = {
        id: 'channel-id',
        guild: mockGuild,
        permissionOverwrites: {
          edit: jest.fn().mockResolvedValue(undefined)
        }
      } as any;

      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const permissions: PermissionOverwrite = {
        allow: [],
        deny: []
      };

      await permissionManager.setChannelPermissions(mockChannel, mockRole, permissions);

      expect(mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
        'role-id',
        expect.objectContaining({})
      );
    });

    it('should throw error when bot lacks MANAGE_CHANNELS permission', async () => {
      mockHasPermission.mockReturnValue(false);

      const mockChannel = {
        id: 'channel-id',
        guild: mockGuild,
        permissionOverwrites: {
          edit: jest.fn()
        }
      } as any;

      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const permissions: PermissionOverwrite = {
        allow: [PermissionFlagsBits.SendMessages],
        deny: []
      };

      await expect(
        permissionManager.setChannelPermissions(mockChannel, mockRole, permissions)
      ).rejects.toThrow('MISSING_PERMISSIONS');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission error setting channel permissions',
        expect.objectContaining({
          guildId: 'test-guild-id',
          channelId: 'channel-id',
          roleId: 'role-id'
        })
      );
    });
  });

  describe('hasPermission', () => {
    it('should return true when member has the permission', () => {
      const mockMemberHas = jest.fn().mockReturnValue(true);
      
      const mockMember = {
        id: 'member-id',
        guild: mockGuild,
        permissions: {
          has: mockMemberHas
        }
      } as any;

      const result = permissionManager.hasPermission(
        mockMember,
        PermissionFlagsBits.Administrator
      );

      expect(result).toBe(true);
      expect(mockMemberHas).toHaveBeenCalledWith(PermissionFlagsBits.Administrator);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Permission check',
        expect.objectContaining({
          guildId: 'test-guild-id',
          memberId: 'member-id',
          hasPermission: true
        })
      );
    });

    it('should return false when member does not have the permission', () => {
      const mockMemberHas = jest.fn().mockReturnValue(false);
      
      const mockMember = {
        id: 'member-id',
        guild: mockGuild,
        permissions: {
          has: mockMemberHas
        }
      } as any;

      const result = permissionManager.hasPermission(
        mockMember,
        PermissionFlagsBits.ManageChannels
      );

      expect(result).toBe(false);
      expect(mockMemberHas).toHaveBeenCalledWith(PermissionFlagsBits.ManageChannels);
    });

    it('should return false and log error when permission check fails', () => {
      const mockMember = {
        id: 'member-id',
        guild: mockGuild,
        permissions: {
          has: jest.fn().mockImplementation(() => {
            throw new Error('Permission check failed');
          })
        }
      } as any;

      const result = permissionManager.hasPermission(
        mockMember,
        PermissionFlagsBits.SendMessages
      );

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error checking permission',
        expect.objectContaining({
          memberId: 'member-id'
        })
      );
    });
  });

  describe('getChannelPermissions', () => {
    it('should return channel permissions for a role', () => {
      const allowBits = PermissionFlagsBits.SendMessages | PermissionFlagsBits.ViewChannel;
      const denyBits = PermissionFlagsBits.MentionEveryone;

      const mockOverwrites = {
        allow: {
          bitfield: allowBits
        },
        deny: {
          bitfield: denyBits
        }
      };

      const mockChannel = {
        id: 'channel-id',
        guild: mockGuild,
        permissionOverwrites: {
          cache: new Map([['role-id', mockOverwrites]])
        }
      } as any;

      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const result = permissionManager.getChannelPermissions(mockChannel, mockRole);

      expect(result.allow).toContain(PermissionFlagsBits.SendMessages);
      expect(result.allow).toContain(PermissionFlagsBits.ViewChannel);
      expect(result.deny).toContain(PermissionFlagsBits.MentionEveryone);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Channel permissions retrieved',
        expect.objectContaining({
          channelId: 'channel-id',
          roleId: 'role-id'
        })
      );
    });

    it('should return empty arrays when no overwrites exist', () => {
      const mockChannel = {
        id: 'channel-id',
        guild: mockGuild,
        permissionOverwrites: {
          cache: new Map()
        }
      } as any;

      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const result = permissionManager.getChannelPermissions(mockChannel, mockRole);

      expect(result.allow).toEqual([]);
      expect(result.deny).toEqual([]);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No permission overwrites found for role in channel',
        expect.objectContaining({
          channelId: 'channel-id',
          roleId: 'role-id'
        })
      );
    });

    it('should return empty arrays and log error when retrieval fails', () => {
      const mockChannel = {
        id: 'channel-id',
        guild: mockGuild,
        permissionOverwrites: {
          cache: {
            get: jest.fn().mockImplementation(() => {
              throw new Error('Failed to get overwrites');
            })
          }
        }
      } as any;

      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const result = permissionManager.getChannelPermissions(mockChannel, mockRole);

      expect(result.allow).toEqual([]);
      expect(result.deny).toEqual([]);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting channel permissions',
        expect.objectContaining({
          channelId: 'channel-id',
          roleId: 'role-id'
        })
      );
    });
  });
});
