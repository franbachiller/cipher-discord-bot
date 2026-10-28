import { Client } from 'discord.js';
import { Logger } from '../utils/Logger';
import { ChannelManager } from '../managers/ChannelManager';
import { PermissionManager } from '../managers/PermissionManager';
import { TicketManager } from './TicketManager';
import { TicketStorage } from './TicketStorage';
import { TranscriptGenerator } from './TranscriptGenerator';
import { LogManager } from './LogManager';
import { NotificationManager } from './NotificationManager';
import { TicketPanelManager } from './TicketPanelManager';
import { InactivityMonitor } from './InactivityMonitor';
import { InteractionHandlers } from './InteractionHandlers';
import { TicketConfig } from './types';

/**
 * Inicializador del sistema de tickets
 * 
 * Responsable de crear todas las instancias de managers, inyectar dependencias
 * correctamente, iniciar el monitor de inactividad y cargar paneles persistidos.
 * 
 * Requirements: 7.6, 10.1, 10.2, 10.3, 10.4, 10.5, 14.1, 14.2
 */
export class TicketSystemInitializer {
  private client: Client;
  private logger: Logger;
  private channelManager: ChannelManager;
  private permissionManager: PermissionManager;
  private config: TicketConfig;

  // Managers del sistema de tickets
  private ticketStorage!: TicketStorage;
  private transcriptGenerator!: TranscriptGenerator;
  private logManager!: LogManager;
  private notificationManager!: NotificationManager;
  private ticketPanelManager!: TicketPanelManager;
  private ticketManager!: TicketManager;
  private inactivityMonitor!: InactivityMonitor;
  private interactionHandlers!: InteractionHandlers;

  /**
   * Constructor del inicializador
   * @param client - Cliente de Discord.js
   * @param logger - Sistema de logging
   * @param channelManager - Gestor de canales
   * @param permissionManager - Gestor de permisos
   * @param config - Configuración del sistema de tickets
   */
  constructor(
    client: Client,
    logger: Logger,
    channelManager: ChannelManager,
    permissionManager: PermissionManager,
    config: TicketConfig
  ) {
    this.client = client;
    this.logger = logger;
    this.channelManager = channelManager;
    this.permissionManager = permissionManager;
    this.config = config;
  }

  /**
   * Inicializa el sistema de tickets completo
   * 
   * Crea todas las instancias necesarias, inyecta dependencias,
   * registra manejadores de eventos y carga datos persistidos.
   * 
   * Requirements: 7.6, 14.1
   */
  async initialize(): Promise<void> {
    this.logger.info('Inicializando sistema de tickets...');

    try {
      // 1. Crear instancias de managers básicos
      this.createManagers();

      // 2. Cargar datos persistidos
      await this.loadPersistedData();

      // 3. Registrar manejadores de eventos
      this.registerEventHandlers();

      // 4. Iniciar monitor de inactividad
      this.startInactivityMonitor();

      this.logger.info('Sistema de tickets inicializado exitosamente', {
        autoCloseEnabled: this.config.autoClose?.enabled || false,
        maxTicketsPerUser: this.config.maxTicketsPerUser,
        categoriesCount: Object.keys(this.config.categories).length
      });
    } catch (error) {
      this.logger.error('Error al inicializar sistema de tickets', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`No se pudo inicializar el sistema de tickets: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Crea todas las instancias de managers con inyección de dependencias
   * @private
   */
  private createManagers(): void {
    this.logger.debug('Creando managers del sistema de tickets...');

    // TicketStorage - Persistencia de datos
    this.ticketStorage = new TicketStorage('data/tickets.json', 'data/stats.json', this.logger);

    // TranscriptGenerator - Generación de transcripts
    this.transcriptGenerator = new TranscriptGenerator(this.client, this.logger);

    // LogManager - Registro de eventos
    this.logManager = new LogManager(this.client, this.logger);

    // NotificationManager - Gestión de notificaciones
    this.notificationManager = new NotificationManager(this.client, this.logger);

    // TicketPanelManager - Gestión de paneles
    this.ticketPanelManager = new TicketPanelManager(this.client, this.logger);

    // TicketManager - Gestor principal (con todas las dependencias)
    this.ticketManager = new TicketManager(
      this.client,
      this.ticketStorage,
      this.transcriptGenerator,
      this.logManager,
      this.notificationManager,
      this.channelManager,
      this.permissionManager,
      this.logger,
      this.config
    );

    // InactivityMonitor - Monitor de inactividad
    if (this.config.autoClose?.enabled) {
      this.inactivityMonitor = new InactivityMonitor(
        this.client,
        this.ticketManager,
        this.ticketStorage,
        this.logger,
        this.config.autoClose
      );
    }

    // InteractionHandlers - Manejadores de interacciones
    this.interactionHandlers = new InteractionHandlers(
      this.client,
      this.ticketManager,
      this.logger
    );

    this.logger.debug('Managers del sistema de tickets creados exitosamente');
  }

  /**
   * Carga datos persistidos (paneles y tickets)
   * @private
   * 
   * Requirements: 7.6
   */
  private async loadPersistedData(): Promise<void> {
    this.logger.debug('Cargando datos persistidos...');

    try {
      // Cargar paneles de tickets
      await this.ticketPanelManager.loadPanels();
      
      const panels = this.ticketPanelManager.getAllPanels();
      this.logger.info('Paneles de tickets cargados', { count: panels.length });

      // Cargar tickets abiertos
      const openTickets = await this.ticketStorage.getAllOpenTickets();
      this.logger.info('Tickets abiertos cargados', { count: openTickets.length });

    } catch (error) {
      this.logger.error('Error al cargar datos persistidos', {
        error: error instanceof Error ? error.message : String(error)
      });
      // No lanzar error, continuar con datos vacíos
    }
  }

  /**
   * Registra manejadores de eventos del sistema de tickets
   * @private
   * 
   * Requirements: 14.2
   */
  private registerEventHandlers(): void {
    this.logger.debug('Registrando manejadores de eventos...');

    // Registrar manejadores de interacciones (botones, menús, modales)
    this.interactionHandlers.registerHandlers();

    // Registrar listener para actualizar lastActivity en tickets
    this.client.on('messageCreate', async (message) => {
      // Ignorar mensajes de bots
      if (message.author.bot) {
        return;
      }

      // Verificar si el mensaje es en un canal de ticket
      const channelId = message.channel.id;
      
      try {
        const ticket = await this.ticketStorage.getTicket(channelId);
        
        if (ticket) {
          // Actualizar timestamp de última actividad
          ticket.lastActivity = new Date().toISOString();
          await this.ticketStorage.saveTicket(ticket);

          // Si el monitor de inactividad está activo, notificarle
          if (this.inactivityMonitor && this.inactivityMonitor.isRunning()) {
            await this.inactivityMonitor.updateTicketActivity(channelId);
          }
        }
      } catch (error) {
        // Error silencioso, no interrumpir el flujo de mensajes
        this.logger.debug('Error al actualizar actividad de ticket', {
          channelId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    this.logger.debug('Manejadores de eventos registrados exitosamente');
  }

  /**
   * Inicia el monitor de inactividad si está habilitado
   * @private
   * 
   * Requirements: 14.1
   */
  private startInactivityMonitor(): void {
    if (this.config.autoClose?.enabled && this.inactivityMonitor) {
      this.logger.debug('Iniciando monitor de inactividad...');
      this.inactivityMonitor.start();
      this.logger.info('Monitor de inactividad iniciado');
    } else {
      this.logger.info('Monitor de inactividad deshabilitado por configuración');
    }
  }

  /**
   * Detiene el sistema de tickets
   * 
   * Detiene el monitor de inactividad y limpia recursos.
   */
  async stop(): Promise<void> {
    this.logger.info('Deteniendo sistema de tickets...');

    try {
      // Detener monitor de inactividad
      if (this.inactivityMonitor && this.inactivityMonitor.isRunning()) {
        this.inactivityMonitor.stop();
        this.logger.debug('Monitor de inactividad detenido');
      }

      this.logger.info('Sistema de tickets detenido exitosamente');
    } catch (error) {
      this.logger.error('Error al detener sistema de tickets', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Obtiene el TicketManager para uso en comandos
   * @returns Instancia del TicketManager
   */
  getTicketManager(): TicketManager {
    return this.ticketManager;
  }

  /**
   * Obtiene el TicketPanelManager para uso en comandos
   * @returns Instancia del TicketPanelManager
   */
  getTicketPanelManager(): TicketPanelManager {
    return this.ticketPanelManager;
  }

  /**
   * Obtiene el TicketStorage para uso en comandos
   * @returns Instancia del TicketStorage
   */
  getTicketStorage(): TicketStorage {
    return this.ticketStorage;
  }
}
