import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { ChannelManager } from '../managers/ChannelManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para crear canales de texto y voz
 */
export function createChannelCommand(
  channelManager: ChannelManager,
  logger: Logger
): Command {
  return {
    name: 'createchannel',
    description: 'Crea un nuevo canal de texto o voz en el servidor',
    usage: '!createchannel <nombre> <tipo>',
    category: 'Canales',
    requiredPermissions: [PermissionFlagsBits.ManageChannels],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, guild } = context;

      // Validar argumentos
      if (args.length < 2) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!createchannel <nombre> <tipo>`\nTipo puede ser: `text` o `voice`'
        };
      }

      const channelName = args[0];
      const channelType = args[1].toLowerCase();

      // Validar tipo de canal
      if (channelType !== 'text' && channelType !== 'voice') {
        return {
          success: false,
          message: 'Tipo de canal inválido. Debe ser `text` o `voice`'
        };
      }

      try {
        let channel;
        
        if (channelType === 'text') {
          channel = await channelManager.createTextChannel(guild, channelName);
        } else {
          channel = await channelManager.createVoiceChannel(guild, channelName);
        }

        return {
          success: true,
          message: `✅ Canal ${channelType === 'text' ? 'de texto' : 'de voz'} **${channel.name}** creado exitosamente`,
          data: {
            channelId: channel.id,
            channelName: channel.name,
            channelType
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        if (errorMessage.includes('MISSING_PERMISSIONS')) {
          return {
            success: false,
            message: 'No tengo permisos suficientes para crear canales en este servidor'
          };
        }

        return {
          success: false,
          message: `Error al crear el canal: ${errorMessage}`
        };
      }
    }
  };
}
