import * as fs from 'fs/promises';
import * as path from 'path';
import { TicketInfo, TicketStatistics, TicketCategory } from './types';
import { Logger } from '../utils/Logger';

/**
 * Interfaz para el almacenamiento de tickets
 */
export interface ITicketStorage {
  saveTicket(ticket: TicketInfo): Promise<void>;
  getTicket(ticketId: string): Promise<TicketInfo | null>;
  getUserTickets(userId: string): Promise<TicketInfo[]>;
  deleteTicket(ticketId: string): Promise<void>;
  getAllOpenTickets(): Promise<TicketInfo[]>;
  updateStatistics(stats: Partial<TicketStatistics>): Promise<void>;
  getStatistics(): Promise<TicketStatistics>;
}

/**
 * Estructura del archivo de tickets
 */
interface TicketsData {
  tickets: Record<string, TicketInfo>;
}

/**
 * Gestor de persistencia de datos de tickets
 * 
 * Responsable de almacenar y recuperar información de tickets usando archivos JSON.
 * Implementa caché en memoria para tickets abiertos para mejor rendimiento.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.6
 */
export class TicketStorage implements ITicketStorage {
  private ticketsFilePath: string;
  private statsFilePath: string;
  private logger: Logger;
  
  /** Caché en memoria para tickets abiertos */
  private ticketsCache: Map<string, TicketInfo>;
  
  /** Indica si el caché está inicializado */
  private cacheInitialized: boolean = false;

  /**
   * Constructor de TicketStorage
   * @param ticketsFilePath Ruta del archivo de tickets (por defecto: tickets.json)
   * @param statsFilePath Ruta del archivo de estadísticas (por defecto: stats.json)
   * @param logger Instancia del logger para registro de eventos
   */
  constructor(
    ticketsFilePath: string = 'tickets.json',
    statsFilePath: string = 'stats.json',
    logger: Logger
  ) {
    this.ticketsFilePath = path.resolve(ticketsFilePath);
    this.statsFilePath = path.resolve(statsFilePath);
    this.logger = logger;
    this.ticketsCache = new Map();
  }

  /**
   * Inicializa el caché cargando tickets desde el archivo
   * @private
   */
  private async initializeCache(): Promise<void> {
    if (this.cacheInitialized) {
      return;
    }

    try {
      const data = await this.readTicketsFile();
      this.ticketsCache.clear();
      
      for (const [id, ticket] of Object.entries(data.tickets)) {
        this.ticketsCache.set(id, ticket);
      }
      
      this.cacheInitialized = true;
      this.logger.debug('Ticket cache initialized', { 
        ticketCount: this.ticketsCache.size 
      });
    } catch (error) {
      this.logger.error('Failed to initialize ticket cache', { error });
      // Inicializar con caché vacío
      this.ticketsCache.clear();
      this.cacheInitialized = true;
    }
  }

  /**
   * Lee el archivo de tickets
   * @private
   */
  private async readTicketsFile(): Promise<TicketsData> {
    try {
      const content = await fs.readFile(this.ticketsFilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      // Si el archivo no existe, retornar estructura vacía
      if (error.code === 'ENOENT') {
        return { tickets: {} };
      }
      throw error;
    }
  }

  /**
   * Escribe el archivo de tickets
   * @private
   */
  private async writeTicketsFile(data: TicketsData): Promise<void> {
    try {
      const dir = path.dirname(this.ticketsFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        this.ticketsFilePath, 
        JSON.stringify(data, null, 2), 
        'utf-8'
      );
    } catch (error) {
      this.logger.error('Failed to write tickets file', { error });
      throw error;
    }
  }

  /**
   * Lee el archivo de estadísticas
   * @private
   */
  private async readStatsFile(): Promise<TicketStatistics> {
    try {
      const content = await fs.readFile(this.statsFilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      // Si el archivo no existe, retornar estadísticas iniciales
      if (error.code === 'ENOENT') {
        return this.getInitialStatistics();
      }
      throw error;
    }
  }

  /**
   * Escribe el archivo de estadísticas
   * @private
   */
  private async writeStatsFile(stats: TicketStatistics): Promise<void> {
    try {
      const dir = path.dirname(this.statsFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        this.statsFilePath, 
        JSON.stringify(stats, null, 2), 
        'utf-8'
      );
    } catch (error) {
      this.logger.error('Failed to write stats file', { error });
      throw error;
    }
  }

  /**
   * Obtiene las estadísticas iniciales
   * @private
   */
  private getInitialStatistics(): TicketStatistics {
    return {
      totalCreated: 0,
      totalClosed: 0,
      currentlyOpen: 0,
      closedToday: 0,
      averageResolutionTime: 0,
      byCategory: {
        [TicketCategory.TECHNICAL_SUPPORT]: 0,
        [TicketCategory.SALES]: 0,
        [TicketCategory.REPORTS]: 0,
        [TicketCategory.OTHER]: 0
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Guarda un ticket en el almacenamiento
   * @param ticket Información del ticket
   * Requirements: 12.1, 12.4
   */
  async saveTicket(ticket: TicketInfo): Promise<void> {
    try {
      await this.initializeCache();
      
      // Actualizar caché
      this.ticketsCache.set(ticket.id, ticket);
      
      // Leer archivo actual
      const data = await this.readTicketsFile();
      
      // Actualizar datos
      data.tickets[ticket.id] = ticket;
      
      // Escribir archivo
      await this.writeTicketsFile(data);
      
      this.logger.debug('Ticket saved', { ticketId: ticket.id });
    } catch (error) {
      this.logger.error('Failed to save ticket', { ticketId: ticket.id, error });
      throw error;
    }
  }

  /**
   * Obtiene un ticket por su ID
   * @param ticketId ID del ticket
   * @returns Información del ticket o null si no existe
   * Requirements: 12.2
   */
  async getTicket(ticketId: string): Promise<TicketInfo | null> {
    try {
      await this.initializeCache();
      
      // Buscar en caché primero
      const cachedTicket = this.ticketsCache.get(ticketId);
      if (cachedTicket) {
        return cachedTicket;
      }
      
      // Si no está en caché, buscar en archivo
      const data = await this.readTicketsFile();
      return data.tickets[ticketId] || null;
    } catch (error) {
      this.logger.error('Failed to get ticket', { ticketId, error });
      throw error;
    }
  }

  /**
   * Obtiene todos los tickets abiertos de un usuario
   * @param userId ID del usuario
   * @returns Array de tickets abiertos
   * Requirements: 12.2
   */
  async getUserTickets(userId: string): Promise<TicketInfo[]> {
    try {
      await this.initializeCache();
      
      // Filtrar tickets del usuario desde el caché
      const userTickets: TicketInfo[] = [];
      
      for (const ticket of this.ticketsCache.values()) {
        if (ticket.userId === userId && ticket.closedAt === null) {
          userTickets.push(ticket);
        }
      }
      
      return userTickets;
    } catch (error) {
      this.logger.error('Failed to get user tickets', { userId, error });
      throw error;
    }
  }

  /**
   * Elimina un ticket del almacenamiento
   * @param ticketId ID del ticket
   * Requirements: 12.5
   */
  async deleteTicket(ticketId: string): Promise<void> {
    try {
      await this.initializeCache();
      
      // Eliminar del caché
      this.ticketsCache.delete(ticketId);
      
      // Leer archivo actual
      const data = await this.readTicketsFile();
      
      // Eliminar del archivo
      delete data.tickets[ticketId];
      
      // Escribir archivo
      await this.writeTicketsFile(data);
      
      this.logger.debug('Ticket deleted', { ticketId });
    } catch (error) {
      this.logger.error('Failed to delete ticket', { ticketId, error });
      throw error;
    }
  }

  /**
   * Obtiene todos los tickets abiertos
   * @returns Array de todos los tickets abiertos
   * Requirements: 12.3
   */
  async getAllOpenTickets(): Promise<TicketInfo[]> {
    try {
      await this.initializeCache();
      
      // Retornar todos los tickets del caché (solo contiene tickets abiertos)
      return Array.from(this.ticketsCache.values());
    } catch (error) {
      this.logger.error('Failed to get all open tickets', { error });
      throw error;
    }
  }

  /**
   * Actualiza las estadísticas del sistema
   * @param stats Estadísticas a actualizar (parciales)
   * Requirements: 12.6
   */
  async updateStatistics(stats: Partial<TicketStatistics>): Promise<void> {
    try {
      // Leer estadísticas actuales
      const currentStats = await this.readStatsFile();
      
      // Actualizar con los nuevos valores
      const updatedStats: TicketStatistics = {
        ...currentStats,
        ...stats,
        lastUpdated: new Date().toISOString()
      };
      
      // Escribir estadísticas actualizadas
      await this.writeStatsFile(updatedStats);
      
      this.logger.debug('Statistics updated', { stats });
    } catch (error) {
      this.logger.error('Failed to update statistics', { error });
      throw error;
    }
  }

  /**
   * Obtiene las estadísticas del sistema
   * @returns Estadísticas actuales
   * Requirements: 12.6
   */
  async getStatistics(): Promise<TicketStatistics> {
    try {
      return await this.readStatsFile();
    } catch (error) {
      this.logger.error('Failed to get statistics', { error });
      throw error;
    }
  }
}
