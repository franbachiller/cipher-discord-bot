import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { TicketManager } from '../tickets/TicketManager';
import { TicketCategory } from '../tickets/types';
import { Logger } from '../utils/Logger';

/**
 * Formatea minutos a un formato legible
 */
function formatMinutes(minutes: number): string {
  if (minutes === 0) {
    return 'No hay datos suficientes';
  }

  if (minutes < 60) {
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return `${hours} hora${hours !== 1 ? 's' : ''} ${remainingMinutes} minuto${remainingMinutes !== 1 ? 's' : ''}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return `${days} día${days !== 1 ? 's' : ''} ${remainingHours} hora${remainingHours !== 1 ? 's' : ''}`;
}

/**
 * Obtiene el nombre de visualización de una categoría
 */
function getCategoryDisplayName(category: TicketCategory): string {
  const displayNames: Record<TicketCategory, string> = {
    [TicketCategory.TECHNICAL_SUPPORT]: 'Soporte Técnico',
    [TicketCategory.SALES]: 'Ventas',
    [TicketCategory.REPORTS]: 'Reportes',
    [TicketCategory.OTHER]: 'Otros'
  };

  return displayNames[category] || category;
}

/**
 * Comando para mostrar estadísticas de tickets
 * 
 * Requirements: 10.5, 10.6
 */
export function ticketStatsCommand(
  ticketManager: TicketManager,
  logger: Logger
): Command {
  return {
    name: 'ticket-stats',
    description: 'Muestra estadísticas del sistema de tickets',
    usage: '!ticket-stats',
    category: 'Tickets',
    requiredPermissions: [PermissionFlagsBits.Administrator],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { message, guild } = context;

      try {
        // Obtener estadísticas del sistema
        const stats = await ticketManager.getStatistics(guild.id);

        // Crear embed con las estadísticas
        const embed = new EmbedBuilder()
          .setTitle('📊 Estadísticas del Sistema de Tickets')
          .setColor(0x5865F2)
          .setTimestamp()
          .setFooter({ text: `Solicitado por ${message.author.username}` });

        // Estadísticas generales
        embed.addFields(
          {
            name: '📈 Estadísticas Generales',
            value: [
              `**Total Creados:** ${stats.totalCreated}`,
              `**Total Cerrados:** ${stats.totalClosed}`,
              `**Actualmente Abiertos:** ${stats.currentlyOpen}`,
              `**Cerrados Hoy:** ${stats.closedToday}`
            ].join('\n'),
            inline: false
          }
        );

        // Tiempo promedio de resolución
        const avgTimeFormatted = formatMinutes(stats.averageResolutionTime);
        embed.addFields(
          {
            name: '⏱️ Tiempo Promedio de Resolución',
            value: avgTimeFormatted,
            inline: false
          }
        );

        // Estadísticas por categoría
        const categoryStats: string[] = [];
        for (const [category, count] of Object.entries(stats.byCategory)) {
          const categoryName = getCategoryDisplayName(category as TicketCategory);
          categoryStats.push(`**${categoryName}:** ${count}`);
        }

        if (categoryStats.length > 0) {
          embed.addFields(
            {
              name: '📂 Tickets por Categoría',
              value: categoryStats.join('\n'),
              inline: false
            }
          );
        }

        // Última actualización
        const lastUpdated = new Date(stats.lastUpdated).toLocaleString('es-ES', {
          dateStyle: 'short',
          timeStyle: 'short'
        });
        embed.addFields(
          {
            name: '🕐 Última Actualización',
            value: lastUpdated,
            inline: false
          }
        );

        // Enviar el embed
        if (message.channel.isTextBased() && 'send' in message.channel) {
          await (message.channel as any).send({ embeds: [embed] });
        }

        logger.info('Estadísticas de tickets consultadas mediante comando', {
          userId: message.author.id,
          guildId: guild.id
        });

        return {
          success: true,
          message: '', // El mensaje ya fue enviado como embed
          data: stats
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        logger.error('Error al obtener estadísticas mediante comando', {
          userId: message.author.id,
          guildId: guild.id,
          error: errorMessage
        });

        return {
          success: false,
          message: `Error al obtener las estadísticas: ${errorMessage}`
        };
      }
    }
  };
}

// Export helper functions for testing
export { formatMinutes, getCategoryDisplayName };
