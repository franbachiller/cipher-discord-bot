import {
  Guild,
  Role,
  GuildMember,
  PermissionsBitField,
  ColorResolvable,
  RoleCreateOptions
} from 'discord.js';
import { Logger } from '../utils/Logger';

/**
 * Opciones para la creación y actualización de roles
 */
export interface RoleOptions {
  /** Nombre del rol */
  name: string;
  
  /** Color del rol en formato hexadecimal (ej: "#FF0000") o nombre de color */
  color?: ColorResolvable;
  
  /** Permisos del rol */
  permissions?: bigint[];
  
  /** Si el rol debe mostrarse separado en la lista de miembros */
  hoist?: boolean;
  
  /** Si el rol puede ser mencionado por cualquier usuario */
  mentionable?: boolean;
}

/**
 * Gestor de operaciones relacionadas con roles
 */
export class RoleManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Crea un nuevo rol en el servidor
   * @param guild - Servidor donde crear el rol
   * @param options - Opciones del rol
   * @returns Rol creado
   * @throws Error si falta el permiso MANAGE_ROLES o los parámetros son inválidos
   */
  async createRole(guild: Guild, options: RoleOptions): Promise<Role> {
    try {
      // Validar parámetros
      if (!options.name || options.name.trim().length === 0) {
        const error = new Error('El nombre del rol no puede estar vacío');
        this.logger.error('Validation error creating role', { options, error });
        throw error;
      }

      if (options.name.length > 100) {
        const error = new Error('El nombre del rol no puede exceder 100 caracteres');
        this.logger.error('Validation error creating role', { options, error });
        throw error;
      }

      // Verificar permisos del bot
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar roles');
        this.logger.error('Permission error creating role', { 
          guildId: guild.id, 
          options,
          error 
        });
        throw error;
      }

      // Preparar opciones de creación
      const createOptions: RoleCreateOptions = {
        name: options.name,
        color: options.color,
        hoist: options.hoist,
        mentionable: options.mentionable
      };

      // Si se especifican permisos, combinarlos
      if (options.permissions && options.permissions.length > 0) {
        createOptions.permissions = options.permissions;
      }

      // Crear el rol
      const role = await guild.roles.create(createOptions);

      this.logger.info('Role created successfully', {
        guildId: guild.id,
        roleId: role.id,
        roleName: options.name
      });

      return role;
    } catch (error) {
      this.logger.error('Error creating role', {
        guildId: guild.id,
        options,
        error
      });
      throw error;
    }
  }

  /**
   * Asigna un rol a un miembro del servidor
   * @param member - Miembro al que asignar el rol
   * @param role - Rol a asignar
   * @throws Error si falta el permiso MANAGE_ROLES
   */
  async assignRole(member: GuildMember, role: Role): Promise<void> {
    try {
      // Verificar permisos del bot
      const guild = member.guild;
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar roles');
        this.logger.error('Permission error assigning role', { 
          guildId: guild.id,
          memberId: member.id,
          roleId: role.id,
          error 
        });
        throw error;
      }

      // Asignar el rol
      await member.roles.add(role);

      this.logger.info('Role assigned successfully', {
        guildId: guild.id,
        memberId: member.id,
        roleId: role.id
      });
    } catch (error) {
      this.logger.error('Error assigning role', {
        memberId: member.id,
        roleId: role.id,
        error
      });
      throw error;
    }
  }

  /**
   * Remueve un rol de un miembro del servidor
   * @param member - Miembro del que remover el rol
   * @param role - Rol a remover
   * @throws Error si falta el permiso MANAGE_ROLES
   */
  async removeRole(member: GuildMember, role: Role): Promise<void> {
    try {
      // Verificar permisos del bot
      const guild = member.guild;
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar roles');
        this.logger.error('Permission error removing role', { 
          guildId: guild.id,
          memberId: member.id,
          roleId: role.id,
          error 
        });
        throw error;
      }

      // Remover el rol
      await member.roles.remove(role);

      this.logger.info('Role removed successfully', {
        guildId: guild.id,
        memberId: member.id,
        roleId: role.id
      });
    } catch (error) {
      this.logger.error('Error removing role', {
        memberId: member.id,
        roleId: role.id,
        error
      });
      throw error;
    }
  }

  /**
   * Actualiza las propiedades de un rol existente
   * @param role - Rol a actualizar
   * @param options - Nuevas opciones del rol
   * @returns Rol actualizado
   * @throws Error si falta el permiso MANAGE_ROLES o los parámetros son inválidos
   */
  async updateRole(role: Role, options: RoleOptions): Promise<Role> {
    try {
      // Validar parámetros
      if (options.name && options.name.trim().length === 0) {
        const error = new Error('El nombre del rol no puede estar vacío');
        this.logger.error('Validation error updating role', { roleId: role.id, options, error });
        throw error;
      }

      if (options.name && options.name.length > 100) {
        const error = new Error('El nombre del rol no puede exceder 100 caracteres');
        this.logger.error('Validation error updating role', { roleId: role.id, options, error });
        throw error;
      }

      // Verificar permisos del bot
      const guild = role.guild;
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar roles');
        this.logger.error('Permission error updating role', { 
          guildId: guild.id,
          roleId: role.id,
          options,
          error 
        });
        throw error;
      }

      // Preparar opciones de actualización
      const updateOptions: any = {};
      
      if (options.name !== undefined) {
        updateOptions.name = options.name;
      }
      if (options.color !== undefined) {
        updateOptions.color = options.color;
      }
      if (options.hoist !== undefined) {
        updateOptions.hoist = options.hoist;
      }
      if (options.mentionable !== undefined) {
        updateOptions.mentionable = options.mentionable;
      }
      if (options.permissions !== undefined && options.permissions.length > 0) {
        updateOptions.permissions = options.permissions;
      }

      // Actualizar el rol
      const updatedRole = await role.edit(updateOptions);

      this.logger.info('Role updated successfully', {
        guildId: guild.id,
        roleId: role.id,
        updates: updateOptions
      });

      return updatedRole;
    } catch (error) {
      this.logger.error('Error updating role', {
        roleId: role.id,
        options,
        error
      });
      throw error;
    }
  }
}
