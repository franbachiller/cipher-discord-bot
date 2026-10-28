import { RoleManager, RoleOptions } from './RoleManager';
import { Logger } from '../utils/Logger';
import {
  Guild,
  Role,
  GuildMember,
  PermissionsBitField
} from 'discord.js';

// Mock del Logger
jest.mock('../utils/Logger');

describe('RoleManager', () => {
  let roleManager: RoleManager;
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
      roles: {
        create: jest.fn()
      }
    };

    roleManager = new RoleManager(mockLogger);
  });

  describe('createRole', () => {
    it('should create a role with valid name', async () => {
      const options: RoleOptions = {
        name: 'Moderator'
      };

      const mockRole = {
        id: 'test-role-id',
        name: 'Moderator',
        guild: mockGuild
      } as Role;

      mockGuild.roles.create.mockResolvedValue(mockRole);

      const result = await roleManager.createRole(mockGuild, options);

      expect(result).toBe(mockRole);
      expect(mockGuild.roles.create).toHaveBeenCalledWith({
        name: 'Moderator',
        color: undefined,
        hoist: undefined,
        mentionable: undefined
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Role created successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          roleId: 'test-role-id',
          roleName: 'Moderator'
        })
      );
    });

    it('should create a role with color and permissions', async () => {
      const options: RoleOptions = {
        name: 'Admin',
        color: '#FF0000',
        permissions: [PermissionsBitField.Flags.Administrator],
        hoist: true,
        mentionable: true
      };

      const mockRole = {
        id: 'admin-role-id',
        name: 'Admin',
        guild: mockGuild
      } as Role;

      mockGuild.roles.create.mockResolvedValue(mockRole);

      const result = await roleManager.createRole(mockGuild, options);

      expect(result).toBe(mockRole);
      expect(mockGuild.roles.create).toHaveBeenCalledWith({
        name: 'Admin',
        color: '#FF0000',
        permissions: [PermissionsBitField.Flags.Administrator],
        hoist: true,
        mentionable: true
      });
    });

    it('should throw error when role name is empty', async () => {
      const options: RoleOptions = {
        name: ''
      };

      await expect(
        roleManager.createRole(mockGuild, options)
      ).rejects.toThrow('El nombre del rol no puede estar vacío');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error creating role',
        expect.any(Object)
      );
    });

    it('should throw error when role name exceeds 100 characters', async () => {
      const options: RoleOptions = {
        name: 'a'.repeat(101)
      };

      await expect(
        roleManager.createRole(mockGuild, options)
      ).rejects.toThrow('El nombre del rol no puede exceder 100 caracteres');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error creating role',
        expect.any(Object)
      );
    });

    it('should throw error when bot lacks MANAGE_ROLES permission', async () => {
      mockHasPermission.mockReturnValue(false);

      const options: RoleOptions = {
        name: 'Test Role'
      };

      await expect(
        roleManager.createRole(mockGuild, options)
      ).rejects.toThrow('MISSING_PERMISSIONS');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission error creating role',
        expect.objectContaining({
          guildId: 'test-guild-id'
        })
      );
    });
  });

  describe('assignRole', () => {
    it('should assign a role to a member', async () => {
      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const mockMember = {
        id: 'member-id',
        guild: mockGuild,
        roles: {
          add: jest.fn().mockResolvedValue(undefined)
        }
      } as any;

      await roleManager.assignRole(mockMember, mockRole);

      expect(mockMember.roles.add).toHaveBeenCalledWith(mockRole);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Role assigned successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          memberId: 'member-id',
          roleId: 'role-id'
        })
      );
    });

    it('should throw error when bot lacks MANAGE_ROLES permission', async () => {
      mockHasPermission.mockReturnValue(false);

      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const mockMember = {
        id: 'member-id',
        guild: mockGuild,
        roles: {
          add: jest.fn()
        }
      } as any;

      await expect(
        roleManager.assignRole(mockMember, mockRole)
      ).rejects.toThrow('MISSING_PERMISSIONS');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission error assigning role',
        expect.objectContaining({
          guildId: 'test-guild-id',
          memberId: 'member-id',
          roleId: 'role-id'
        })
      );
    });
  });

  describe('removeRole', () => {
    it('should remove a role from a member', async () => {
      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const mockMember = {
        id: 'member-id',
        guild: mockGuild,
        roles: {
          remove: jest.fn().mockResolvedValue(undefined)
        }
      } as any;

      await roleManager.removeRole(mockMember, mockRole);

      expect(mockMember.roles.remove).toHaveBeenCalledWith(mockRole);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Role removed successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          memberId: 'member-id',
          roleId: 'role-id'
        })
      );
    });

    it('should throw error when bot lacks MANAGE_ROLES permission', async () => {
      mockHasPermission.mockReturnValue(false);

      const mockRole = {
        id: 'role-id',
        guild: mockGuild
      } as Role;

      const mockMember = {
        id: 'member-id',
        guild: mockGuild,
        roles: {
          remove: jest.fn()
        }
      } as any;

      await expect(
        roleManager.removeRole(mockMember, mockRole)
      ).rejects.toThrow('MISSING_PERMISSIONS');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission error removing role',
        expect.objectContaining({
          guildId: 'test-guild-id',
          memberId: 'member-id',
          roleId: 'role-id'
        })
      );
    });
  });

  describe('updateRole', () => {
    it('should update role properties', async () => {
      const mockRole = {
        id: 'role-id',
        guild: mockGuild,
        edit: jest.fn().mockResolvedValue({
          id: 'role-id',
          name: 'Updated Role',
          guild: mockGuild
        })
      } as any;

      const options: RoleOptions = {
        name: 'Updated Role',
        color: '#00FF00',
        hoist: false
      };

      const result = await roleManager.updateRole(mockRole, options);

      expect(mockRole.edit).toHaveBeenCalledWith({
        name: 'Updated Role',
        color: '#00FF00',
        hoist: false
      });
      expect(result.name).toBe('Updated Role');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Role updated successfully',
        expect.objectContaining({
          guildId: 'test-guild-id',
          roleId: 'role-id'
        })
      );
    });

    it('should throw error when updated name is empty', async () => {
      const mockRole = {
        id: 'role-id',
        guild: mockGuild,
        edit: jest.fn()
      } as any;

      const options: RoleOptions = {
        name: '   '
      };

      await expect(
        roleManager.updateRole(mockRole, options)
      ).rejects.toThrow('El nombre del rol no puede estar vacío');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation error updating role',
        expect.any(Object)
      );
    });

    it('should throw error when bot lacks MANAGE_ROLES permission', async () => {
      mockHasPermission.mockReturnValue(false);

      const mockRole = {
        id: 'role-id',
        guild: mockGuild,
        edit: jest.fn()
      } as any;

      const options: RoleOptions = {
        name: 'New Name'
      };

      await expect(
        roleManager.updateRole(mockRole, options)
      ).rejects.toThrow('MISSING_PERMISSIONS');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Permission error updating role',
        expect.objectContaining({
          guildId: 'test-guild-id',
          roleId: 'role-id'
        })
      );
    });
  });
});
