/**
 * Tipos e interfaces para el Sistema de Tickets
 * 
 * Este archivo define todas las estructuras de datos utilizadas
 * en el sistema de tickets de CIPHER BOT.
 */

/**
 * Categorías de tickets disponibles
 */
export enum TicketCategory {
  TECHNICAL_SUPPORT = 'soporte-tecnico',
  SALES = 'ventas',
  REPORTS = 'reportes',
  OTHER = 'otros'
}

/**
 * Información completa de un ticket
 */
export interface TicketInfo {
  /** ID único del ticket (ID del canal) */
  id: string;
  
  /** ID del usuario que creó el ticket */
  userId: string;
  
  /** Nombre de usuario del creador */
  username: string;
  
  /** ID del servidor */
  guildId: string;
  
  /** Categoría del ticket */
  category: TicketCategory;
  
  /** Timestamp de creación (ISO 8601) */
  createdAt: string;
  
  /** Timestamp de cierre (ISO 8601), null si está abierto */
  closedAt: string | null;
  
  /** ID del usuario que cerró el ticket, null si está abierto */
  closedBy: string | null;
  
  /** Razón del cierre, null si está abierto */
  closeReason: string | null;
  
  /** Número secuencial del ticket para el usuario */
  ticketNumber: number;
  
  /** IDs de usuarios adicionales con acceso al ticket */
  additionalUsers: string[];
  
  /** Timestamp del último mensaje en el ticket */
  lastActivity: string;
  
  /** Indica si el ticket fue cerrado por inactividad */
  closedByInactivity: boolean;
}

/**
 * Configuración de una categoría de tickets
 */
export interface CategoryConfig {
  /** Nombre de la categoría */
  name: string;
  
  /** ID de la categoría de Discord donde crear los canales */
  discordCategoryId: string;
  
  /** IDs de roles de staff a mencionar */
  staffRoles: string[];
  
  /** Emoji para el botón de selección */
  emoji: string;
  
  /** Descripción de la categoría */
  description: string;
}

/**
 * Estadísticas del sistema de tickets
 */
export interface TicketStatistics {
  /** Total de tickets creados desde el inicio */
  totalCreated: number;
  
  /** Total de tickets cerrados desde el inicio */
  totalClosed: number;
  
  /** Tickets actualmente abiertos */
  currentlyOpen: number;
  
  /** Tickets cerrados hoy */
  closedToday: number;
  
  /** Tiempo promedio de resolución en minutos */
  averageResolutionTime: number;
  
  /** Tickets por categoría */
  byCategory: Record<TicketCategory, number>;
  
  /** Timestamp de la última actualización */
  lastUpdated: string;
}

/**
 * Configuración de cierre automático
 */
export interface AutoCloseConfig {
  /** Indica si el cierre automático está habilitado */
  enabled: boolean;
  
  /** Tiempo de inactividad en minutos antes de advertir */
  inactivityTime: number;
  
  /** Tiempo de gracia en minutos después de la advertencia */
  graceTime: number;
}

/**
 * Configuración de notificaciones
 */
export interface NotificationConfig {
  /** Indica si las notificaciones están habilitadas */
  enabled: boolean;
  
  /** Tiempo en minutos para notificar tickets sin respuesta */
  unrespondedTime?: number;
}

/**
 * Configuración completa del sistema de tickets
 */
export interface TicketConfig {
  /** Límite de tickets abiertos por usuario */
  maxTicketsPerUser: number;
  
  /** IDs de roles considerados como staff */
  staffRoles: string[];
  
  /** Configuración de categorías */
  categories: Record<TicketCategory, CategoryConfig>;
  
  /** ID del canal de logs */
  logChannelId: string;
  
  /** ID del canal de notificaciones (opcional) */
  notificationChannelId?: string;
  
  /** ID del canal de transcripts (opcional) */
  transcriptChannelId?: string;
  
  /** Tiempo de espera antes de cerrar el canal (segundos) */
  closeDelay: number;
  
  /** Mensaje de bienvenida personalizado */
  welcomeMessage?: string;
  
  /** Mensaje de despedida personalizado */
  goodbyeMessage?: string;
  
  /** Configuración de cierre automático */
  autoClose?: AutoCloseConfig;
  
  /** Configuración de notificaciones */
  notifications?: NotificationConfig;
}

/**
 * Configuración de un panel de tickets
 */
export interface PanelConfig {
  /** Título del embed del panel */
  title: string;
  
  /** Descripción del embed */
  description: string;
  
  /** Color del embed (hexadecimal) */
  color: string;
  
  /** Texto del botón de crear ticket */
  buttonText: string;
  
  /** Emoji del botón */
  buttonEmoji: string;
  
  /** URL de imagen para el embed (opcional) */
  imageUrl?: string;
  
  /** URL de thumbnail para el embed (opcional) */
  thumbnailUrl?: string;
}

/**
 * Información de un panel persistido
 */
export interface PanelInfo {
  /** ID del mensaje del panel */
  messageId: string;
  
  /** ID del canal donde está el panel */
  channelId: string;
  
  /** ID del servidor */
  guildId: string;
  
  /** Configuración del panel */
  config: PanelConfig;
}
