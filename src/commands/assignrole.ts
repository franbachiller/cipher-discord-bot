import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { RoleManager } from '../managers/RoleManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para asignar roles a usuarios
 */
export function assignRoleCommand(
  roleManager: RoleManager,
  logger: Logger
): Command {
  return {
    name: 'assignrole',
    description: 'Asigna un rol a un usuario',
    usage: '!assignrole <@usuario> <nombre_rol>',
    category: 'Roles',
    requiredPermissions: [PermissionFlagsBits.ManageRoles],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, guild, message } = context;

      // Validar argumentos
      if (args.length < 2) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!assignrole <@usuario> <nombre_rol>`\nEjemplo: `!assignrole @Usuario Moderador`'
        };
      }

      // Obtener el usuario mencionado
      const mentionedUser = message.mentions.users.first();
      if (!mentionedUser) {
        return {
          success: false,
          message: 'Debes mencionar a un usuario válido. Ejemplo: `!assignrole @Usuario Moderador`'
        };
      }

      // Obtener el miembro del servidor
      const member = await guild.members.fetch(mentionedUser.id);
      if (!member) {
        return {
          success: false,
          message: 'No se pudo encontrar al usuario en este servidor'
        };
      }

      // El nombre del rol es todo después de la mención
      const roleName = args.slice(1).join(' ');

      // Buscar el rol por nombre
      const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!role) {
        return {
          success: false,
          message: `No se encontró el rol **${roleName}** en este servidor`
        };
      }

      try {
        await roleManager.assignRole(member, role);

        return {
          success: true,
          message: `✅ Rol **${role.name}** asignado a **${member.user.username}** exitosamente`,
          data: {
            userId: member.id,
            roleId: role.id,
            roleName: role.name
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        if (errorMessage.includes('MISSING_PERMISSIONS')) {
          return {
            success: false,
            message: 'No tengo permisos suficientes para asignar roles en este servidor'
          };
        }

        return {
          success: false,
          message: `Error al asignar el rol: ${errorMessage}`
        };
      }
    }
  };
}
