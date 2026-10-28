import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { ServerManager } from '../managers/ServerManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para actualizar la descripción del servidor
 */
export function setServerDescriptionCommand(
  serverManager: ServerManager,
  logger: Logger
): Command {
  return {
    name: 'setserverdescription',
    description: 'Actualiza la descripción del servidor',
    usage: '!setserverdescription <descripción>',
    category: 'Servidor',
    requiredPermissions: [PermissionFlagsBits.ManageGuild],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, guild } = context;

      const description = args.join(' ');

      try {
        await serverManager.setServerDescription(guild, description);

        return {
          success: true,
          message: `✅ Descripción del servidor actualizada`
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
          message: `Error al actualizar la descripción: ${errorMessage}`
        };
      }
    }
  };
}
