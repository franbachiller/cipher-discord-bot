import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { ServerManager } from '../managers/ServerManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para crear categorías
 */
export function createCategoryCommand(
  serverManager: ServerManager,
  logger: Logger
): Command {
  return {
    name: 'createcategory',
    description: 'Crea una nueva categoría en el servidor',
    usage: '!createcategory <nombre>',
    category: 'Canales',
    requiredPermissions: [PermissionFlagsBits.ManageChannels],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, guild } = context;

      if (args.length === 0) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!createcategory <nombre>`'
        };
      }

      const categoryName = args.join(' ');

      try {
        const category = await serverManager.createCategory(guild, categoryName);

        return {
          success: true,
          message: `✅ Categoría **${category.name}** creada exitosamente`,
          data: {
            categoryId: category.id,
            categoryName: category.name
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        if (errorMessage.includes('MISSING_PERMISSIONS')) {
          return {
            success: false,
            message: 'No tengo permisos suficientes para gestionar canales'
          };
        }

        return {
          success: false,
          message: `Error al crear la categoría: ${errorMessage}`
        };
      }
    }
  };
}
