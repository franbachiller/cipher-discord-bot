/**
 * Punto de entrada del módulo de tickets
 * Exporta todos los tipos, clases y utilidades del sistema de tickets
 */

export * from './types';
export { TicketPanelManager, ITicketPanelManager } from './TicketPanelManager';
export { TicketStorage, ITicketStorage } from './TicketStorage';
export { TranscriptGenerator } from './TranscriptGenerator';
export { LogManager, ILogManager } from './LogManager';
export { NotificationManager, INotificationManager } from './NotificationManager';
export { TicketManager, ITicketManager } from './TicketManager';
