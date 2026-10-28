import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { TicketManager } from '../tickets/TicketManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para cerrar un ticket mediante comando
 * 
 * Requirements: 10.4, 10.6
 */
export function ticketCloseCommand(
  ticketManager: TicketManager,
  logger: Logger
): Command {
  return {
    name: 'ticket-close',
    description: 'Cierra un ticket mediante comando',
    usage: '!ticket-close [razón]',
    category: 'Tickets',
    requiredPermissions: [PermissionFlagsBits.ManageChannels], // Staff permission
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, message } = context;

      // El comando debe ejecutarse en un canal de ticket
      const ticketId = message.channel.id;
      
      // Razón del cierre (opcional)
      const reason = args.length > 0 ? args.join(' ') : 'Cerrado por staff mediante comando';

      try {
        // Enviar mensaje de confirmación antes de cerrar
        await message.reply(
          '🔒 Cerrando ticket...\n' +
          `Razón: ${reason}\n` +
          'El canal será eliminado en unos segundos.'
        );

        // Cerrar el ticket
        await ticketManager.closeTicket(ticketId, message.author.id, reason);

        logger.info('Ticket cerrado mediante comando', {
          ticketId,
          closedBy: message.author.id,
          reason
        });

        // El canal será eliminado, así que no necesitamos retornar un mensaje
        return {
          success: true,
          message: '', // El mensaje ya fue enviado arriba
          data: {
            ticketId,
            closedBy: message.author.id,
            reason
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        logger.error('Error al cerrar ticket mediante comando', {
          ticketId,
          closedBy: message.author.id,
          reason,
          error: errorMessage
        });

        // Proporcionar mensaje de error más específico
        if (errorMessage.includes('no encontrado')) {
          return {
            success: false,
            message: 'Este canal no es un ticket válido. Asegúrate de ejecutar el comando dentro de un canal de ticket.'
          };
        }

        return {
          success: false,
          message: `Error al cerrar el ticket: ${errorMessage}`
        };
      }
    }
  };
}
