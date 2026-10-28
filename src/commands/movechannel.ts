import { PermissionFlagsBits, ChannelType, GuildChannel, CategoryChannel } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { ChannelManager } from '../managers/ChannelManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para mover canales a categorías
 */
export function moveChannelCommand(
  channelManager: ChannelManager,
  logger: Logger
): Command {
  return {
    name: 'movechannel',
    description: 'Mueve un canal a una categoría específica',
    usage: '!movechannel <canal> <categoría>',
    category: 'Canales',
    requiredPermissions: [PermissionFlagsBits.ManageChannels],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, guild } = context;

      // Validar argumentos
      if (args.length < 2) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!movechannel <canal> <categoría>`'
        };
      }

      const channelName = args[0];
      const categoryName = args.slice(1).join(' ');

      try {
        // Buscar el canal por nombre
        const foundChannel = guild.channels.cache.find(
          ch => ch.name.toLowerCase() === channelName.toLowerCase() &&
                (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildVoice)
        );

        if (!foundChannel) {
          return {
            success: false,
            message: `No se encontró el canal **${channelName}**`
          };
        }

        // Buscar la categoría por nombre
        const foundCategory = guild.channels.cache.find(
          ch => ch.name.toLowerCase() === categoryName.toLowerCase() &&
                ch.type === ChannelType.GuildCategory
        );

        if (!foundCategory) {
          return {
            success: false,
            message: `No se encontró la categoría **${categoryName}**`
          };
        }

        // Verificar que el canal no sea una categoría
        if (foundChannel.type === ChannelType.GuildCategory) {
          return {
            success: false,
            message: 'No se puede mover una categoría a otra categoría'
          };
        }

        // Type assertion segura después de las validaciones
        const channel = foundChannel as GuildChannel;
        const category = foundCategory as CategoryChannel;
        
        // Mover el canal a la categoría
        await channelManager.moveToCategory(channel, category);

        return {
          success: true,
          message: `✅ Canal **${channel.name}** movido a la categoría **${category.name}** exitosamente`,
          data: {
            channelId: channel.id,
            channelName: channel.name,
            categoryId: category.id,
            categoryName: category.name
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        if (errorMessage.includes('MISSING_PERMISSIONS')) {
          return {
            success: false,
            message: 'No tengo permisos suficientes para gestionar canales en este servidor'
          };
        }

        return {
          success: false,
          message: `Error al mover el canal: ${errorMessage}`
        };
      }
    }
  };
}
