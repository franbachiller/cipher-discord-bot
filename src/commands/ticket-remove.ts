import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { TicketManager } from '../tickets/TicketManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para remover un usuario de un ticket
 * 
 * Requirements: 10.3, 10.6
 */
export function ticketRemoveCommand(
  ticketManager: TicketManager,
  logger: Logger
): Command {
  return {
    name: 'ticket-remove',
    description: 'Remueve un usuario de un ticket',
    usage: '!ticket-remove <@usuario>',
    category: 'Tickets',
    requiredPermissions: [PermissionFlagsBits.Administrator],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, message } = context;

      // Validar argumentos
      if (args.length < 1) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!ticket-remove <@usuario>`\n' +
                   'Ejemplo: `!ticket-remove @Usuario`\n' +
                   'Este comando debe ejecutarse dentro de un canal de ticket.'
        };
      }

      // Extraer el usuario mencionado
      const userMention = args[0];
      const userId = userMention.replace(/[<@!>]/g, '');

      // Verificar que el usuario existe
      try {
        const user = await message.guild!.members.fetch(userId);
        if (!user) {
          return {
            success: false,
            message: `El usuario ${userMention} no es válido o no está en el servidor`
          };
        }
      } catch (error) {
        return {
          success: false,
          message: `No se pudo encontrar el usuario ${userMention}`
        };
      }

      // El comando debe ejecutarse en un canal de ticket
      const ticketId = message.channel.id;

      try {
        await ticketManager.removeUserFromTicket(ticketId, userId);

        logger.info('Usuario removido de ticket mediante comando', {
          ticketId,
          userId,
          removedBy: message.author.id
        });

        return {
          success: true,
          message: `✅ Usuario ${userMention} removido del ticket exitosamente`,
          data: {
            ticketId,
            userId
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        logger.error('Error al remover usuario de ticket mediante comando', {
          ticketId,
          userId,
          removedBy: message.author.id,
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
          message: `Error al remover usuario del ticket: ${errorMessage}`
        };
      }
    }
  };
}
