import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { ServerManager } from '../managers/ServerManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para actualizar el nombre del servidor
 */
export function setServerNameCommand(
  serverManager: ServerManager,
  logger: Logger
): Command {
  return {
    name: 'setservername',
    description: 'Actualiza el nombre del servidor',
    usage: '!setservername <nombre>',
    category: 'Servidor',
    requiredPermissions: [PermissionFlagsBits.ManageGuild],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, guild } = context;

      if (args.length === 0) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!setservername <nombre>`'
        };
      }

      const newName = args.join(' ');

      try {
        await serverManager.setServerName(guild, newName);

        return {
          success: true,
          message: `✅ Nombre del servidor actualizado a: **${newName}**`
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        if (errorMessage.includes('MISSING_PERMISSIONS')) {
          return {
            success: false,
            message: 'No tengo permisos suficientes para gestionar el servidor'
          };
        }

        return {
          success: false,
          message: `Error al actualizar el nombre: ${errorMessage}`
        };
      }
    }
  };
}
