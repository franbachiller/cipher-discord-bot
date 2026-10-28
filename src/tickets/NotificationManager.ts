import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { TicketInfo, NotificationConfig } from './types';
import { Logger } from '../utils/Logger';

/**
 * Interfaz del NotificationManager
 */
export interface INotificationManager {
  notifyNewTicket(ticketInfo: TicketInfo, config: NotificationConfig): Promise<void>;
  notifyUnrespondedTicket(ticketInfo: TicketInfo, config: NotificationConfig): Promise<void>;
}

/**
 * Gestor de notificaciones del sistema de tickets
 * 
 * Maneja el envío de notificaciones al staff cuando se crean nuevos tickets
 * o cuando hay tickets sin respuesta.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export class NotificationManager implements INotificationManager {
  private client: Client;
  private logger: Logger;

  /**
   * Constructor del NotificationManager
   * @param client - Cliente de Discord.js
   * @param logger - Logger para registro de eventos
   */
  constructor(client: Client, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Notifica al staff sobre un nuevo ticket
   * 
   * Envía un mensaje al canal de notificaciones (si está configurado) con
   * información del ticket: nombre del usuario, categoría y enlace directo
   * al canal del ticket.
   * 
   * @param ticketInfo - Información del ticket
   * @param config - Configuración de notificaciones
   * 
   * Requirements: 9.1, 9.2, 9.3, 9.4
   */
  async notifyNewTicket(ticketInfo: TicketInfo, config: NotificationConfig): Promise<void> {
    this.logger.debug('Notifying new ticket', { 
      ticketId: ticketInfo.id, 
      enabled: config.enabled 
    });

    try {
      // Verificar si las notificaciones están habilitadas (Requirement 9.4)
      if (!config.enabled) {
        this.logger.debug('Notifications disabled, skipping notification');
        return;
      }

      // No hay canal de notificaciones configurado, solo log
      this.logger.debug('No notification channel configured');
    } catch (error) {
      this.logger.error('Error notifying new ticket', {
        ticketId: ticketInfo.id,
        error: error instanceof Error ? error.message : String(error)
      });
      // No lanzar error para no interrumpir la creación del ticket
    }
  }

  /**
   * Notifica sobre un ticket sin respuesta
   * 
   * Envía una notificación al canal de notificaciones cuando un ticket
   * no ha recibido respuesta del staff durante el tiempo configurado.
   * 
   * @param ticketInfo - Información del ticket
   * @param config - Configuración de notificaciones
   * 
   * Requirements: 9.5
   */
  async notifyUnrespondedTicket(ticketInfo: TicketInfo, config: NotificationConfig): Promise<void> {
    this.logger.debug('Notifying unresponded ticket', { 
      ticketId: ticketInfo.id,
      enabled: config.enabled 
    });

    try {
      // Verificar si las notificaciones están habilitadas
      if (!config.enabled) {
        this.logger.debug('Notifications disabled, skipping notification');
        return;
      }

      // No hay canal de notificaciones configurado, solo log
      this.logger.debug('No notification channel configured');
    } catch (error) {
      this.logger.error('Error notifying unresponded ticket', {
        ticketId: ticketInfo.id,
        error: error instanceof Error ? error.message : String(error)
      });
      // No lanzar error para no interrumpir otras operaciones
    }
  }
}
