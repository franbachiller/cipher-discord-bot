import { PermissionFlagsBits } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { TicketManager } from '../tickets/TicketManager';
import { Logger } from '../utils/Logger';

/**
 * Comando para añadir un usuario a un ticket existente
 * 
 * Requirements: 10.2, 10.6
 */
export function ticketAddCommand(
  ticketManager: TicketManager,
  logger: Logger
): Command {
  return {
    name: 'ticket-add',
    description: 'Añade un usuario a un ticket existente',
    usage: '!ticket-add <@usuario>',
    category: 'Tickets',
    requiredPermissions: [PermissionFlagsBits.Administrator],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, message } = context;

      // Validar argumentos
      if (args.length < 1) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!ticket-add <@usuario>`\n' +
                   'Ejemplo: `!ticket-add @Usuario`\n' +
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
        await ticketManager.addUserToTicket(ticketId, userId);

        logger.info('Usuario añadido a ticket mediante comando', {
          ticketId,
          userId,
          addedBy: message.author.id
        });

        return {
          success: true,
          message: `✅ Usuario ${userMention} añadido al ticket exitosamente`,
          data: {
            ticketId,
            userId
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        logger.error('Error al añadir usuario a ticket mediante comando', {
          ticketId,
          userId,
          addedBy: message.author.id,
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
          message: `Error al añadir usuario al ticket: ${errorMessage}`
        };
      }
    }
  };
}
