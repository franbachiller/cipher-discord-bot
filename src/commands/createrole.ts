import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { RoleManager } from '../managers/RoleManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para crear roles
 */
export function createRoleCommand(
  roleManager: RoleManager,
  logger: Logger
): Command {
  return {
    name: 'createrole',
    description: 'Crea un nuevo rol en el servidor',
    usage: '!createrole <nombre> [color] [permisos]',
    category: 'Roles',
    requiredPermissions: [PermissionFlagsBits.ManageRoles],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, guild } = context;

      // Validar argumentos
      if (args.length < 1) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!createrole <nombre> [color] [permisos]`\nEjemplo: `!createrole Moderador #FF0000`'
        };
      }

      const roleName = args[0];
      const color = args[1]; // Opcional
      
      // Parsear permisos si se proporcionan (args[2] en adelante)
      const permissions: bigint[] = [];
      if (args.length > 2) {
        for (let i = 2; i < args.length; i++) {
          const permName = args[i].toUpperCase();
          // Mapear nombres de permisos comunes
          const permMap: Record<string, bigint> = {
            'SEND_MESSAGES': PermissionFlagsBits.SendMessages,
            'MANAGE_CHANNELS': PermissionFlagsBits.ManageChannels,
            'KICK_MEMBERS': PermissionFlagsBits.KickMembers,
            'BAN_MEMBERS': PermissionFlagsBits.BanMembers,
            'MANAGE_ROLES': PermissionFlagsBits.ManageRoles,
            'MANAGE_GUILD': PermissionFlagsBits.ManageGuild,
            'VIEW_CHANNEL': PermissionFlagsBits.ViewChannel,
            'ADMINISTRATOR': PermissionFlagsBits.Administrator
          };
          
          if (permMap[permName]) {
            permissions.push(permMap[permName]);
          }
        }
      }

      try {
        const role = await roleManager.createRole(guild, {
          name: roleName,
          color: color as any,
          permissions: permissions.length > 0 ? permissions : undefined
        });

        let message = `✅ Rol **${role.name}** creado exitosamente`;
        if (color) {
          message += ` con color ${color}`;
        }
        if (permissions.length > 0) {
          message += ` y ${permissions.length} permiso(s)`;
        }

        return {
          success: true,
          message,
          data: {
            roleId: role.id,
            roleName: role.name,
            color: role.color
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        if (errorMessage.includes('MISSING_PERMISSIONS')) {
          return {
            success: false,
            message: 'No tengo permisos suficientes para crear roles en este servidor'
          };
        }

        return {
          success: false,
          message: `Error al crear el rol: ${errorMessage}`
        };
      }
    }
  };
}
