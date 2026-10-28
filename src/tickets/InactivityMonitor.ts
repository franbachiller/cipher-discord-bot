import { Client, TextChannel } from 'discord.js';
import { ITicketManager } from './TicketManager';
import { ITicketStorage } from './TicketStorage';
import { TicketInfo, AutoCloseConfig } from './types';
import { Logger } from '../utils/Logger';

/**
 * Monitor de inactividad para el sistema de tickets
 * 
 * Monitorea los tickets abiertos y cierra automáticamente aquellos que
 * han estado inactivos durante el tiempo configurado.
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */
export class InactivityMonitor {
  private client: Client;
  private ticketManager: ITicketManager;
  private ticketStorage: ITicketStorage;
  private logger: Logger;
  private config: AutoCloseConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private warnedTickets: Set<string> = new Set();

  /**
   * Constructor del InactivityMonitor
   * @param client - Cliente de Discord.js
   * @param ticketManager - Gestor de tickets
   * @param ticketStorage - Almacenamiento de tickets
   * @param logger - Sistema de logging
   * @param config - Configuración de cierre automático
   */
  constructor(
    client: Client,
    ticketManager: ITicketManager,
    ticketStorage: ITicketStorage,
    logger: Logger,
    config: AutoCloseConfig
  ) {
    this.client = client;
    this.ticketManager = ticketManager;
    this.ticketStorage = ticketStorage;
    this.logger = logger;
    this.config = config;
  }

  /**
   * Inicia el monitoreo de inactividad
   * 
   * Ejecuta checkInactivity cada 5 minutos si el cierre automático
   * está habilitado en la configuración.
   * 
   * Requirements: 14.1, 14.6
   */
  start(): void {
    if (!this.config.enabled) {
      this.logger.info('Inactivity monitor disabled by configuration');
      return;
    }

    // Ejecutar cada 5 minutos (300000 ms)
    const intervalMs = 5 * 60 * 1000;

    this.intervalId = setInterval(() => {
      this.checkInactivity().catch(error => {
        this.logger.error('Error in inactivity check', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, intervalMs);

    this.logger.info('Inactivity monitor started', {
      intervalMinutes: 5,
      inactivityTimeMinutes: this.config.inactivityTime,
      graceTimeMinutes: this.config.graceTime
    });

    // Ejecutar una verificación inmediata al iniciar
    this.checkInactivity().catch(error => {
      this.logger.error('Error in initial inactivity check', {
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }

  /**
   * Detiene el monitoreo de inactividad
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info('Inactivity monitor stopped');
    }
  }

  /**
   * Verifica la inactividad de todos los tickets abiertos
   * 
   * Obtiene todos los tickets abiertos, verifica el timestamp del último
   * mensaje y toma acciones según el tiempo de inactividad:
   * - Si alcanza el tiempo de inactividad: envía advertencia
   * - Si alcanza el tiempo de gracia después de advertencia: cierra el ticket
   * 
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
   */
  async checkInactivity(): Promise<void> {
    this.logger.debug('Checking ticket inactivity');

    try {
      // Obtener todos los tickets abiertos (Requirement 14.1)
      const openTickets = await this.ticketStorage.getAllOpenTickets();

      if (openTickets.length === 0) {
        this.logger.debug('No open tickets to check');
        return;
      }

      this.logger.debug('Checking inactivity for tickets', { count: openTickets.length });

      const now = Date.now();

      for (const ticket of openTickets) {
        try {
          await this.checkTicketInactivity(ticket, now);
        } catch (error) {
          this.logger.error('Error checking ticket inactivity', {
            ticketId: ticket.id,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continuar con el siguiente ticket
        }
      }

      this.logger.debug('Inactivity check completed');
    } catch (error) {
      this.logger.error('Error in checkInactivity', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Verifica la inactividad de un ticket específico
   * 
   * @param ticket - Información del ticket
   * @param now - Timestamp actual en milisegundos
   * @private
   * 
   * Requirements: 14.2, 14.3, 14.4, 14.5
   */
  private async checkTicketInactivity(ticket: TicketInfo, now: number): Promise<void> {
    // Verificar timestamp del último mensaje (Requirement 14.2)
    const lastActivityTime = new Date(ticket.lastActivity).getTime();
    const inactiveMinutes = Math.floor((now - lastActivityTime) / 60000);

    this.logger.debug('Checking ticket', {
      ticketId: ticket.id,
      inactiveMinutes,
      inactivityThreshold: this.config.inactivityTime,
      isWarned: this.warnedTickets.has(ticket.id)
    });

    // Verificar si el ticket ya fue advertido
    const wasWarned = this.warnedTickets.has(ticket.id);

    if (wasWarned) {
      // Ticket ya fue advertido, verificar si pasó el tiempo de gracia (Requirement 14.4)
      const totalInactivityThreshold = this.config.inactivityTime + this.config.graceTime;

      if (inactiveMinutes >= totalInactivityThreshold) {
        // Cerrar automáticamente el ticket (Requirement 14.4, 14.5)
        await this.autoCloseTicket(ticket);
      }
    } else {
      // Ticket no ha sido advertido, verificar si alcanzó el tiempo de inactividad (Requirement 14.3)
      if (inactiveMinutes >= this.config.inactivityTime) {
        // Enviar advertencia de inactividad (Requirement 14.3)
        await this.sendInactivityWarning(ticket);
      }
    }
  }

  /**
   * Envía una advertencia de inactividad al canal del ticket
   * 
   * Envía un mensaje indicando que el ticket se cerrará pronto si no hay
   * actividad y marca el ticket como advertido.
   * 
   * @param ticket - Información del ticket
   * @private
   * 
   * Requirements: 14.3
   */
  private async sendInactivityWarning(ticket: TicketInfo): Promise<void> {
    this.logger.info('Sending inactivity warning', {
      ticketId: ticket.id,
      userId: ticket.userId
    });

    try {
      // Obtener el canal del ticket
      const channel = await this.client.channels.fetch(ticket.id);

      if (!channel || !channel.isTextBased()) {
        this.logger.warn('Ticket channel not found or not text-based', {
          ticketId: ticket.id
        });
        return;
      }

      const textChannel = channel as TextChannel;

      // Enviar mensaje de advertencia
      const warningMessage = 
        `⚠️ **Advertencia de Inactividad**\n\n` +
        `Este ticket ha estado inactivo durante **${this.config.inactivityTime} minutos**.\n` +
        `If there is no activity in the next **${this.config.graceTime} minutes**, ` +
        `the ticket will be closed automatically.\n\n` +
        `*If you still need help, please send a message in this channel.*`;

      await textChannel.send(warningMessage);

      // Marcar ticket como advertido
      this.warnedTickets.add(ticket.id);

      this.logger.info('Inactivity warning sent', {
        ticketId: ticket.id,
        graceTimeMinutes: this.config.graceTime
      });
    } catch (error) {
      this.logger.error('Error sending inactivity warning', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Cierra automáticamente un ticket por inactividad
   * 
   * Llama a TicketManager.closeTicket con la razón "Inactividad" y
   * marca el ticket como cerrado por inactividad.
   * 
   * @param ticket - Información del ticket
   * @private
   * 
   * Requirements: 14.4, 14.5
   */
  private async autoCloseTicket(ticket: TicketInfo): Promise<void> {
    this.logger.info('Auto-closing ticket due to inactivity', {
      ticketId: ticket.id,
      userId: ticket.userId
    });

    try {
      // Actualizar el ticket para marcar que fue cerrado por inactividad
      ticket.closedByInactivity = true;
      await this.ticketStorage.saveTicket(ticket);

      // Cerrar el ticket usando TicketManager (Requirement 14.4)
      await this.ticketManager.closeTicket(
        ticket.id,
        this.client.user!.id, // El bot cierra el ticket
        'Automatically closed due to inactivity' // Razón del cierre (Requirement 14.5)
      );

      // Remover de la lista de tickets advertidos
      this.warnedTickets.delete(ticket.id);

      this.logger.info('Ticket auto-closed successfully', {
        ticketId: ticket.id,
        userId: ticket.userId
      });
    } catch (error) {
      this.logger.error('Error auto-closing ticket', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Actualiza la actividad de un ticket
   * 
   * Debe ser llamado cuando hay un nuevo mensaje en un canal de ticket
   * para actualizar el timestamp de última actividad y remover la advertencia
   * si el ticket estaba advertido.
   * 
   * @param ticketId - ID del ticket
   */
  async updateTicketActivity(ticketId: string): Promise<void> {
    try {
      // Obtener el ticket
      const ticket = await this.ticketStorage.getTicket(ticketId);

      if (!ticket) {
        return; // No es un ticket o ya fue cerrado
      }

      // Actualizar timestamp de última actividad
      ticket.lastActivity = new Date().toISOString();
      await this.ticketStorage.saveTicket(ticket);

      // Si el ticket estaba advertido, remover la advertencia
      if (this.warnedTickets.has(ticketId)) {
        this.warnedTickets.delete(ticketId);
        this.logger.debug('Ticket activity updated, warning removed', { ticketId });
      }
    } catch (error) {
      this.logger.error('Error updating ticket activity', {
        ticketId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Obtiene la configuración actual del monitor
   * @returns Configuración de cierre automático
   */
  getConfig(): AutoCloseConfig {
    return { ...this.config };
  }

  /**
   * Verifica si el monitor está activo
   * @returns true si el monitor está ejecutándose
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

