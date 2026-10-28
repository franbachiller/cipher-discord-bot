import { TextChannel, Message, Collection, Client } from 'discord.js';
import { TicketInfo } from './types';
import { Logger } from '../utils/Logger';
import { LogLevel } from '../managers/ConfigManager';

/**
 * Generador de transcripts para tickets
 * 
 * Responsable de generar transcripts completos de canales de tickets,
 * incluyendo metadatos, mensajes formateados y adjuntos.
 * 
 * @example
 * ```typescript
 * const generator = new TranscriptGenerator(client, logger);
 * const transcript = await generator.generateTranscript(channelId, ticketInfo);
 * ```
 */
export class TranscriptGenerator {
  private client: Client;
  private logger: Logger;

  /**
   * Constructor del TranscriptGenerator
   * @param client Cliente de Discord.js
   * @param logger Instancia del logger para registro de eventos
   */
  constructor(client: Client, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Genera un transcript completo de un canal de ticket
   * 
   * Recupera todos los mensajes del canal y los formatea en un transcript
   * legible que incluye metadatos del ticket y todos los mensajes con
   * timestamps, autores, contenido y adjuntos.
   * 
   * @param channelId ID del canal del ticket
   * @param ticketInfo Información del ticket
   * @returns Transcript formateado como string
   * @throws Error si el canal no existe o no se pueden recuperar los mensajes
   */
  async generateTranscript(channelId: string, ticketInfo: TicketInfo): Promise<string> {
    this.logger.debug('Generando transcript', { channelId, ticketId: ticketInfo.id });

    try {
      // Obtener el canal
      const channel = await this.getChannel(channelId);
      
      // Recuperar todos los mensajes del canal
      const messages = await this.fetchAllMessages(channel);
      
      // Generar el transcript
      const transcript = this.buildTranscript(messages, ticketInfo);
      
      this.logger.info('Transcript generado exitosamente', {
        channelId,
        ticketId: ticketInfo.id,
        messageCount: messages.size
      });
      
      return transcript;
    } catch (error) {
      this.logger.error('Error al generar transcript', {
        channelId,
        ticketId: ticketInfo.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Formatea un mensaje individual para el transcript
   * 
   * Convierte un mensaje de Discord en una línea formateada que incluye
   * timestamp, autor, contenido y URLs de adjuntos.
   * 
   * @param message Mensaje de Discord a formatear
   * @returns Mensaje formateado como string
   */
  formatMessage(message: Message): string {
    // Formatear timestamp como HH:MM:SS
    const timestamp = this.formatTimestamp(message.createdAt);
    
    // Obtener el nombre del autor
    const author = message.author.username;
    
    // Obtener el contenido del mensaje
    const content = message.content || '[Sin contenido]';
    
    // Formatear mensaje base
    let formattedMessage = `[${timestamp}] ${author}: ${content}`;
    
    // Añadir URLs de adjuntos si existen
    if (message.attachments.size > 0) {
      const attachmentUrls = Array.from(message.attachments.values())
        .map(attachment => attachment.url)
        .join('\n  ');
      formattedMessage += `\n  Adjuntos:\n  ${attachmentUrls}`;
    }
    
    return formattedMessage;
  }

  /**
   * Obtiene el canal de Discord
   * @param channelId ID del canal
   * @returns Canal de texto
   * @throws Error si el canal no existe o no es un canal de texto
   */
  private async getChannel(channelId: string): Promise<TextChannel> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel) {
        throw new Error(`Canal con ID ${channelId} no encontrado`);
      }
      
      if (!channel.isTextBased()) {
        throw new Error(`Canal con ID ${channelId} no es un canal de texto`);
      }
      
      return channel as TextChannel;
    } catch (error) {
      this.logger.error('Error al obtener canal', {
        channelId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Recupera todos los mensajes de un canal
   * 
   * Utiliza paginación para recuperar todos los mensajes del canal,
   * ya que Discord limita las consultas a 100 mensajes por vez.
   * 
   * @param channel Canal del que recuperar mensajes
   * @returns Colección de mensajes ordenados cronológicamente
   */
  private async fetchAllMessages(channel: TextChannel): Promise<Collection<string, Message>> {
    const allMessages = new Collection<string, Message>();
    let lastMessageId: string | undefined;

    // Recuperar mensajes en lotes de 100 (límite de Discord)
    while (true) {
      const options: { limit: number; before?: string } = { limit: 100 };
      if (lastMessageId) {
        options.before = lastMessageId;
      }

      const messages = await channel.messages.fetch(options);
      
      if (messages.size === 0) {
        break;
      }

      // Añadir mensajes a la colección
      messages.forEach(message => allMessages.set(message.id, message));
      
      // Actualizar el ID del último mensaje para la siguiente iteración
      lastMessageId = messages.last()?.id;
    }

    // Ordenar mensajes cronológicamente (más antiguos primero)
    return new Collection(
      Array.from(allMessages.entries()).sort((a, b) => 
        a[1].createdTimestamp - b[1].createdTimestamp
      )
    );
  }

  /**
   * Construye el transcript completo con metadatos y mensajes
   * @param messages Colección de mensajes
   * @param ticketInfo Información del ticket
   * @returns Transcript completo formateado
   */
  private buildTranscript(messages: Collection<string, Message>, ticketInfo: TicketInfo): string {
    const lines: string[] = [];
    
    // Añadir encabezado
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('                    TRANSCRIPT DE TICKET');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    
    // Añadir metadatos
    lines.push('INFORMACIÓN DEL TICKET:');
    lines.push(`  Usuario: ${ticketInfo.username} (ID: ${ticketInfo.userId})`);
    lines.push(`  Categoría: ${ticketInfo.category}`);
    lines.push(`  Fecha de creación: ${this.formatDate(ticketInfo.createdAt)}`);
    
    if (ticketInfo.closedAt) {
      lines.push(`  Fecha de cierre: ${this.formatDate(ticketInfo.closedAt)}`);
    }
    
    if (ticketInfo.closedBy) {
      lines.push(`  Cerrado por: ${ticketInfo.closedBy}`);
    }
    
    if (ticketInfo.closeReason) {
      lines.push(`  Razón de cierre: ${ticketInfo.closeReason}`);
    }
    
    lines.push(`  Número de ticket: #${ticketInfo.ticketNumber}`);
    lines.push(`  Total de mensajes: ${messages.size}`);
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('                         MENSAJES');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    
    // Añadir mensajes formateados
    messages.forEach(message => {
      lines.push(this.formatMessage(message));
      lines.push(''); // Línea en blanco entre mensajes
    });
    
    // Añadir pie de página
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('                    FIN DEL TRANSCRIPT');
    lines.push('═══════════════════════════════════════════════════════════');
    
    return lines.join('\n');
  }

  /**
   * Formatea un timestamp como HH:MM:SS
   * @param date Fecha a formatear
   * @returns Timestamp formateado
   */
  private formatTimestamp(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Formatea una fecha ISO 8601 como string legible
   * @param isoDate Fecha en formato ISO 8601
   * @returns Fecha formateada
   */
  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC'
    });
  }
}
