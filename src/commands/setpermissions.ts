import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { PermissionManager } from '../managers/PermissionManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para establecer permisos de canal
 */
export function setPermissionsCommand(
  permissionManager: PermissionManager,
  logger: Logger
): Command {
  return {
    name: 'setpermissions',
    description: 'Establece permisos de un rol en un canal',
    usage: '!setpermissions <#canal> <nombre_rol> <allow|deny> <permisos...>',
    category: 'Permisos',
    requiredPermissions: [PermissionFlagsBits.ManageChannels],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, guild, message } = context;

      // Validar argumentos
      if (args.length < 4) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!setpermissions <#canal> <nombre_rol> <allow|deny> <permisos...>`\n' +
                   'Ejemplo: `!setpermissions #general Moderador allow SEND_MESSAGES VIEW_CHANNEL`'
        };
      }

      // Obtener el canal mencionado
      const mentionedChannel = message.mentions.channels.first();
      if (!mentionedChannel) {
        return {
          success: false,
          message: 'Debes mencionar un canal válido. Ejemplo: `!setpermissions #general Moderador allow SEND_MESSAGES`'
        };
      }

      // Obtener el nombre del rol
      const roleName = args[1];

      // Buscar el rol por nombre
      const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!role) {
        return {
          success: false,
          message: `No se encontró el rol **${roleName}** en este servidor`
        };
      }

      // Obtener el tipo de permiso (allow o deny)
      const permType = args[2].toLowerCase();
      if (permType !== 'allow' && permType !== 'deny') {
        return {
          success: false,
          message: 'El tipo de permiso debe ser `allow` o `deny`'
        };
      }

      // Parsear permisos
      const permissionNames = args.slice(3);
      const permMap: Record<string, bigint> = {
        'SEND_MESSAGES': PermissionFlagsBits.SendMessages,
        'VIEW_CHANNEL': PermissionFlagsBits.ViewChannel,
        'MANAGE_CHANNELS': PermissionFlagsBits.ManageChannels,
        'MANAGE_MESSAGES': PermissionFlagsBits.ManageMessages,
        'READ_MESSAGE_HISTORY': PermissionFlagsBits.ReadMessageHistory,
        'ADD_REACTIONS': PermissionFlagsBits.AddReactions,
        'ATTACH_FILES': PermissionFlagsBits.AttachFiles,
        'EMBED_LINKS': PermissionFlagsBits.EmbedLinks,
        'CONNECT': PermissionFlagsBits.Connect,
        'SPEAK': PermissionFlagsBits.Speak
      };

      const permissions: bigint[] = [];
      const invalidPerms: string[] = [];

      for (const permName of permissionNames) {
        const perm = permMap[permName.toUpperCase()];
        if (perm) {
          permissions.push(perm);
        } else {
          invalidPerms.push(permName);
        }
      }

      if (permissions.length === 0) {
        return {
          success: false,
          message: 'No se especificaron permisos válidos. Permisos disponibles: ' + Object.keys(permMap).join(', ')
        };
      }

      try {
        const permOverwrite = permType === 'allow' 
          ? { allow: permissions, deny: [] }
          : { allow: [], deny: permissions };

        await permissionManager.setChannelPermissions(
          mentionedChannel as any,
          role,
          permOverwrite
        );

        let message = `✅ Permisos establecidos para **${role.name}** en ${mentionedChannel}\n`;
        message += `Tipo: **${permType}**\n`;
        message += `Permisos: ${permissionNames.filter(p => !invalidPerms.includes(p)).join(', ')}`;

        if (invalidPerms.length > 0) {
          message += `\n⚠️ Permisos inválidos ignorados: ${invalidPerms.join(', ')}`;
        }

        return {
          success: true,
          message,
          data: {
            channelId: mentionedChannel.id,
            roleId: role.id,
            permType,
            permissions: permissions.length
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        if (errorMessage.includes('MISSING_PERMISSIONS')) {
          return {
            success: false,
            message: 'No tengo permisos suficientes para gestionar permisos de canales en este servidor'
          };
        }

        return {
          success: false,
          message: `Error al establecer permisos: ${errorMessage}`
        };
      }
    }
  };
}
