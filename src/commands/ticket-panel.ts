import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { TicketPanelManager } from '../tickets/TicketPanelManager';
import { PanelConfig } from '../tickets/types';
import { Logger } from '../utils/Logger';

/**
 * Comando para crear un panel de tickets
 * 
 * Requirements: 7.1, 10.1, 10.6
 */
export function ticketPanelCommand(
  panelManager: TicketPanelManager,
  logger: Logger
): Command {
  return {
    name: 'ticket-panel',
    description: 'Crea un panel de tickets en el canal especificado',
    usage: '!ticket-panel <#canal> [título] [descripción]',
    category: 'Tickets',
    requiredPermissions: [PermissionFlagsBits.Administrator],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, message } = context;

      // Validar argumentos
      if (args.length < 1) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!ticket-panel <#canal> [título] [descripción]`\n' +
                   'Ejemplo: `!ticket-panel #tickets "Sistema de Tickets" "Haz clic para crear un ticket"`'
        };
      }

      // Extraer el canal mencionado
      const channelMention = args[0];
      const channelId = channelMention.replace(/[<#>]/g, '');

      // Verificar que el canal existe
      try {
        const channel = await message.guild!.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          return {
            success: false,
            message: `El canal ${channelMention} no es válido o no es un canal de texto`
          };
        }
      } catch (error) {
        return {
          success: false,
          message: `No se pudo encontrar el canal ${channelMention}`
        };
      }

      // Configuración del panel (usar valores predeterminados o proporcionados)
      const title = args[1] || '🎫 Sistema de Tickets';
      const description = args.slice(2).join(' ') || 
        '¿Necesitas ayuda? Crea un ticket haciendo clic en el botón de abajo.\n\n' +
        'Nuestro equipo de soporte te responderá lo antes posible.';

      const config: PanelConfig = {
        title,
        description,
        color: '5865F2', // Discord Blurple
        buttonText: 'Crear Ticket',
        buttonEmoji: '🎫'
      };

      try {
        const panelId = await panelManager.createPanel(channelId, config);

        logger.info('Panel de tickets creado mediante comando', {
          channelId,
          panelId,
          userId: message.author.id
        });

        return {
          success: true,
          message: `✅ Panel de tickets creado exitosamente en ${channelMention}\n` +
                   `ID del panel: \`${panelId}\``,
          data: {
            panelId,
            channelId
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        logger.error('Error al crear panel mediante comando', {
          channelId,
          userId: message.author.id,
          error: errorMessage
        });

        return {
          success: false,
          message: `Error al crear el panel de tickets: ${errorMessage}`
        };
      }
    }
  };
}
