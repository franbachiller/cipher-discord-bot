import { Client, EmbedBuilder, TextChannel, AttachmentBuilder } from 'discord.js';
import { TicketInfo } from './types';
import { Logger } from '../utils/Logger';

/**
 * Interfaz del LogManager
 */
export interface ILogManager {
  /**
   * Registra la creación de un ticket
   * @param ticketInfo - Información del ticket creado
   * @param logChannelId - ID del canal de logs
   */
  logTicketCreation(ticketInfo: TicketInfo, logChannelId: string): Promise<void>;
  
  /**
   * Registra el cierre de un ticket
   * @param ticketInfo - Información del ticket cerrado
   * @param closedBy - Usuario que cerró el ticket
   * @param transcript - Transcript del ticket
   * @param logChannelId - ID del canal de logs
   */
  logTicketClosure(
    ticketInfo: TicketInfo,
    closedBy: string,
    transcript: string,
    logChannelId: string
  ): Promise<void>;
  
  /**
   * Registra un error del sistema
   * @param error - Error ocurrido
   * @param context - Contexto del error
   * @param logChannelId - ID del canal de logs
   */
  logError(error: Error, context: string, logChannelId: string): Promise<void>;
}

/**
 * Gestor de logs del sistema de tickets
 * Responsable de registrar eventos en el canal de logs con embeds formateados
 */
export class LogManager implements ILogManager {
  private client: Client;
  private logger: Logger;

  /**
   * Constructor del LogManager
   * @param client - Cliente de Discord.js
   * @param logger - Logger para logging interno
   */
  constructor(client: Client, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Registra la creación de un ticket
   * @param ticketInfo - Información del ticket creado
   * @param logChannelId - ID del canal de logs
   */
  async logTicketCreation(ticketInfo: TicketInfo, logChannelId: string): Promise<void> {
    try {
      const logChannel = await this.getLogChannel(logChannelId);
      if (!logChannel) {
        this.logger.warn('Canal de logs no encontrado', { logChannelId });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket Creado')
        .setColor(0x00FF00) // Verde
        .addFields(
          { name: 'Usuario', value: `<@${ticketInfo.userId}> (${ticketInfo.username})`, inline: true },
          { name: 'ID Usuario', value: ticketInfo.userId, inline: true },
          { name: 'Categoría', value: ticketInfo.category, inline: true },
          { name: 'Canal', value: `<#${ticketInfo.id}>`, inline: true },
          { name: 'ID Canal', value: ticketInfo.id, inline: true },
          { name: 'Número de Ticket', value: `#${ticketInfo.ticketNumber}`, inline: true }
        )
        .setTimestamp(new Date(ticketInfo.createdAt))
        .setFooter({ text: `Ticket ID: ${ticketInfo.id}` });

      await logChannel.send({ embeds: [embed] });
      
      this.logger.info('Ticket creation logged', {
        ticketId: ticketInfo.id,
        userId: ticketInfo.userId,
        category: ticketInfo.category
      });
    } catch (error) {
      this.logger.error('Error al registrar creación de ticket', {
        error: error instanceof Error ? error.message : String(error),
        ticketId: ticketInfo.id
      });
    }
  }

  /**
   * Registra el cierre de un ticket
   * @param ticketInfo - Información del ticket cerrado
   * @param closedBy - Usuario que cerró el ticket
   * @param transcript - Transcript del ticket
   * @param logChannelId - ID del canal de logs
   */
  async logTicketClosure(
    ticketInfo: TicketInfo,
    closedBy: string,
    transcript: string,
    logChannelId: string
  ): Promise<void> {
    try {
      const logChannel = await this.getLogChannel(logChannelId);
      if (!logChannel) {
        this.logger.warn('Canal de logs no encontrado', { logChannelId });
        return;
      }

      // Calcular duración del ticket
      const createdAt = new Date(ticketInfo.createdAt);
      const closedAt = ticketInfo.closedAt ? new Date(ticketInfo.closedAt) : new Date();
      const durationMs = closedAt.getTime() - createdAt.getTime();
      const durationMinutes = Math.floor(durationMs / 60000);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const durationText = hours > 0 
        ? `${hours}h ${minutes}m` 
        : `${minutes}m`;

      // Crear embed de cierre
      const embed = new EmbedBuilder()
        .setTitle('🔒 Ticket Cerrado')
        .setColor(0xFF0000) // Rojo
        .addFields(
          { name: 'Usuario', value: `<@${ticketInfo.userId}> (${ticketInfo.username})`, inline: true },
          { name: 'ID Usuario', value: ticketInfo.userId, inline: true },
          { name: 'Categoría', value: ticketInfo.category, inline: true },
          { name: 'Cerrado por', value: `<@${closedBy}>`, inline: true },
          { name: 'Duración', value: durationText, inline: true },
          { name: 'Número de Ticket', value: `#${ticketInfo.ticketNumber}`, inline: true }
        )
        .setTimestamp(closedAt)
        .setFooter({ text: `Ticket ID: ${ticketInfo.id}` });

      // Añadir razón de cierre si existe
      if (ticketInfo.closeReason) {
        embed.addFields({ name: 'Razón', value: ticketInfo.closeReason, inline: false });
      }

      // Añadir indicador de cierre por inactividad
      if (ticketInfo.closedByInactivity) {
        embed.addFields({ name: 'Tipo de Cierre', value: '⏰ Cerrado por inactividad', inline: false });
      }

      // Crear archivo de transcript
      const transcriptBuffer = Buffer.from(transcript, 'utf-8');
      const transcriptAttachment = new AttachmentBuilder(transcriptBuffer, {
        name: `ticket-${ticketInfo.id}-transcript.txt`
      });

      await logChannel.send({ 
        embeds: [embed],
        files: [transcriptAttachment]
      });
      
      this.logger.info('Ticket closure logged', {
        ticketId: ticketInfo.id,
        userId: ticketInfo.userId,
        closedBy,
        duration: durationText
      });
    } catch (error) {
      this.logger.error('Error al registrar cierre de ticket', {
        error: error instanceof Error ? error.message : String(error),
        ticketId: ticketInfo.id
      });
    }
  }

  /**
   * Registra un error del sistema
   * @param error - Error ocurrido
   * @param context - Contexto del error
   * @param logChannelId - ID del canal de logs
   */
  async logError(error: Error, context: string, logChannelId: string): Promise<void> {
    try {
      const logChannel = await this.getLogChannel(logChannelId);
      if (!logChannel) {
        this.logger.warn('Canal de logs no encontrado', { logChannelId });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Error del Sistema de Tickets')
        .setColor(0xFF0000) // Rojo
        .addFields(
          { name: 'Contexto', value: context, inline: false },
          { name: 'Error', value: error.message, inline: false }
        )
        .setTimestamp(new Date());

      // Añadir stack trace si está disponible (truncado para caber en un field)
      if (error.stack) {
        // Discord field values tienen un límite de 1024 caracteres
        // Reservamos 6 caracteres para los ``` de código
        const maxStackLength = 1024 - 6;
        const stackTrace = error.stack.length > maxStackLength 
          ? error.stack.substring(0, maxStackLength - 3) + '...'
          : error.stack;
        embed.addFields({ name: 'Stack Trace', value: `\`\`\`${stackTrace}\`\`\``, inline: false });
      }

      await logChannel.send({ embeds: [embed] });
      
      this.logger.error('System error logged to Discord', {
        context,
        error: error.message
      });
    } catch (logError) {
      // Si falla el logging a Discord, al menos registrar en el logger interno
      this.logger.error('Error al registrar error en Discord', {
        originalError: error.message,
        logError: logError instanceof Error ? logError.message : String(logError),
        context
      });
    }
  }

  /**
   * Obtiene el canal de logs
   * @param logChannelId - ID del canal de logs
   * @returns Canal de logs o null si no se encuentra
   */
  private async getLogChannel(logChannelId: string): Promise<TextChannel | null> {
    try {
      const channel = await this.client.channels.fetch(logChannelId);
      
      if (!channel || !channel.isTextBased()) {
        this.logger.warn('Canal de logs no es un canal de texto', { logChannelId });
        return null;
      }

      return channel as TextChannel;
    } catch (error) {
      this.logger.error('Error al obtener canal de logs', {
        error: error instanceof Error ? error.message : String(error),
        logChannelId
      });
      return null;
    }
  }
}
