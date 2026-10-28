import {
  GuildChannel,
  Role,
  GuildMember,
  PermissionsBitField,
  PermissionFlagsBits
} from 'discord.js';
import { Logger } from '../utils/Logger';

/**
 * Sobrescritura de permisos para un canal
 */
export interface PermissionOverwrite {
  /** Permisos permitidos */
  allow: bigint[];
  
  /** Permisos denegados */
  deny: bigint[];
}

/**
 * Gestor de operaciones relacionadas con permisos
 */
export class PermissionManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Establece permisos para un rol en un canal específico
   * @param channel - Canal donde establecer los permisos
   * @param role - Rol al que aplicar los permisos
   * @param permissions - Permisos a establecer (allow y deny)
   * @throws Error si falta el permiso MANAGE_CHANNELS o MANAGE_ROLES
   */
  async setChannelPermissions(
    channel: GuildChannel,
    role: Role,
    permissions: PermissionOverwrite
  ): Promise<void> {
    try {
      // Verificar permisos del bot
      const guild = channel.guild;
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar canales');
        this.logger.error('Permission error setting channel permissions', { 
          guildId: guild.id,
          channelId: channel.id,
          roleId: role.id,
          error 
        });
        throw error;
      }

      // Convertir arrays de permisos a objeto PermissionOverwriteOptions
      const overwriteOptions: Record<string, boolean | null> = {};

      // Procesar permisos permitidos
      for (const perm of permissions.allow) {
        const permName = this.getPermissionName(perm);
        if (permName) {
          overwriteOptions[permName] = true;
        }
      }

      // Procesar permisos denegados
      for (const perm of permissions.deny) {
        const permName = this.getPermissionName(perm);
        if (permName) {
          overwriteOptions[permName] = false;
        }
      }

      // Establecer permisos
      await channel.permissionOverwrites.edit(role.id, overwriteOptions);

      this.logger.info('Channel permissions set successfully', {
        guildId: guild.id,
        channelId: channel.id,
        roleId: role.id,
        permissions: overwriteOptions
      });
    } catch (error) {
      this.logger.error('Error setting channel permissions', {
        channelId: channel.id,
        roleId: role.id,
        error
      });
      throw error;
    }
  }

  /**
   * Obtiene el nombre de un permiso a partir de su valor bigint
   * @param permission - Valor bigint del permiso
   * @returns Nombre del permiso o null si no se encuentra
   */
  private getPermissionName(permission: bigint): string | null {
    for (const [name, value] of Object.entries(PermissionFlagsBits)) {
      if (value === permission) {
        return name;
      }
    }
    return null;
  }

  /**
   * Verifica si un miembro tiene un permiso específico
   * @param member - Miembro a verificar
   * @param permission - Permiso a verificar
   * @returns true si el miembro tiene el permiso, false en caso contrario
   */
  hasPermission(member: GuildMember, permission: bigint): boolean {
    try {
      const hasPermission = member.permissions.has(permission);
      
      this.logger.debug('Permission check', {
        guildId: member.guild.id,
        memberId: member.id,
        permission: permission.toString(),
        hasPermission
      });

      return hasPermission;
    } catch (error) {
      this.logger.error('Error checking permission', {
        memberId: member.id,
        permission: permission.toString(),
        error
      });
      return false;
    }
  }

  /**
   * Obtiene los permisos de un rol en un canal específico
   * @param channel - Canal del que obtener los permisos
   * @param role - Rol del que obtener los permisos
   * @returns Permisos del rol en el canal (allow y deny)
   */
  getChannelPermissions(channel: GuildChannel, role: Role): PermissionOverwrite {
    try {
      const overwrites = channel.permissionOverwrites.cache.get(role.id);
      
      if (!overwrites) {
        this.logger.debug('No permission overwrites found for role in channel', {
          channelId: channel.id,
          roleId: role.id
        });
        
        return {
          allow: [],
          deny: []
        };
      }

      // Convertir PermissionsBitField a array de bigints
      const allowBits = overwrites.allow.bitfield;
      const denyBits = overwrites.deny.bitfield;

      // Extraer permisos individuales
      const allowPerms: bigint[] = [];
      const denyPerms: bigint[] = [];

      // Iterar sobre todos los permisos posibles
      for (const [, value] of Object.entries(PermissionFlagsBits)) {
        if (typeof value === 'bigint') {
          if ((allowBits & value) === value) {
            allowPerms.push(value);
          }
          if ((denyBits & value) === value) {
            denyPerms.push(value);
          }
        }
      }

      this.logger.debug('Channel permissions retrieved', {
        channelId: channel.id,
        roleId: role.id,
        allowCount: allowPerms.length,
        denyCount: denyPerms.length
      });

      return {
        allow: allowPerms,
        deny: denyPerms
      };
    } catch (error) {
      this.logger.error('Error getting channel permissions', {
        channelId: channel.id,
        roleId: role.id,
        error
      });
      
      return {
        allow: [],
        deny: []
      };
    }
  }
}
