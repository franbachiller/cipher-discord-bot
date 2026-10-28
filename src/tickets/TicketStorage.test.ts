import * as fs from 'fs/promises';
import * as path from 'path';
import { TicketStorage } from './TicketStorage';
import { TicketInfo, TicketCategory, TicketStatistics } from './types';
import { Logger } from '../utils/Logger';
import { LogLevel } from '../managers/ConfigManager';

describe('TicketStorage', () => {
  let storage: TicketStorage;
  let logger: Logger;
  const testTicketsFile = 'test-tickets.json';
  const testStatsFile = 'test-stats.json';

  beforeEach(() => {
    logger = new Logger('logs/test.log', LogLevel.DEBUG);
    storage = new TicketStorage(testTicketsFile, testStatsFile, logger);
  });

  afterEach(async () => {
    // Limpiar archivos de test
    try {
      await fs.unlink(testTicketsFile);
    } catch (error) {
      // Ignorar si no existe
    }
    try {
      await fs.unlink(testStatsFile);
    } catch (error) {
      // Ignorar si no existe
    }
  });

  describe('saveTicket', () => {
    it('should save a ticket to storage', async () => {
      const ticket: TicketInfo = {
        id: 'ticket-123',
        userId: 'user-456',
        username: 'testuser',
        guildId: 'guild-789',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      await storage.saveTicket(ticket);

      const retrieved = await storage.getTicket('ticket-123');
      expect(retrieved).toEqual(ticket);
    });
  });

  describe('getTicket', () => {
    it('should return null for non-existent ticket', async () => {
      const result = await storage.getTicket('non-existent');
      expect(result).toBeNull();
    });

    it('should retrieve a saved ticket', async () => {
      const ticket: TicketInfo = {
        id: 'ticket-456',
        userId: 'user-789',
        username: 'anotheruser',
        guildId: 'guild-123',
        category: TicketCategory.SALES,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 2,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      await storage.saveTicket(ticket);
      const retrieved = await storage.getTicket('ticket-456');
      
      expect(retrieved).toEqual(ticket);
    });
  });

  describe('getUserTickets', () => {
    it('should return empty array for user with no tickets', async () => {
      const tickets = await storage.getUserTickets('user-999');
      expect(tickets).toEqual([]);
    });

    it('should return all open tickets for a user', async () => {
      const ticket1: TicketInfo = {
        id: 'ticket-1',
        userId: 'user-123',
        username: 'testuser',
        guildId: 'guild-789',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      const ticket2: TicketInfo = {
        id: 'ticket-2',
        userId: 'user-123',
        username: 'testuser',
        guildId: 'guild-789',
        category: TicketCategory.SALES,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 2,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      await storage.saveTicket(ticket1);
      await storage.saveTicket(ticket2);

      const tickets = await storage.getUserTickets('user-123');
      expect(tickets).toHaveLength(2);
      expect(tickets).toContainEqual(ticket1);
      expect(tickets).toContainEqual(ticket2);
    });

    it('should not return closed tickets', async () => {
      const openTicket: TicketInfo = {
        id: 'ticket-open',
        userId: 'user-456',
        username: 'testuser',
        guildId: 'guild-789',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      const closedTicket: TicketInfo = {
        id: 'ticket-closed',
        userId: 'user-456',
        username: 'testuser',
        guildId: 'guild-789',
        category: TicketCategory.SALES,
        createdAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        closedBy: 'staff-123',
        closeReason: 'Resolved',
        ticketNumber: 2,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      await storage.saveTicket(openTicket);
      await storage.saveTicket(closedTicket);

      const tickets = await storage.getUserTickets('user-456');
      expect(tickets).toHaveLength(1);
      expect(tickets[0].id).toBe('ticket-open');
    });
  });

  describe('deleteTicket', () => {
    it('should delete a ticket from storage', async () => {
      const ticket: TicketInfo = {
        id: 'ticket-delete',
        userId: 'user-789',
        username: 'testuser',
        guildId: 'guild-123',
        category: TicketCategory.REPORTS,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      await storage.saveTicket(ticket);
      await storage.deleteTicket('ticket-delete');

      const retrieved = await storage.getTicket('ticket-delete');
      expect(retrieved).toBeNull();
    });
  });

  describe('getAllOpenTickets', () => {
    it('should return empty array when no tickets exist', async () => {
      const tickets = await storage.getAllOpenTickets();
      expect(tickets).toEqual([]);
    });

    it('should return all open tickets', async () => {
      const ticket1: TicketInfo = {
        id: 'ticket-1',
        userId: 'user-1',
        username: 'user1',
        guildId: 'guild-789',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      const ticket2: TicketInfo = {
        id: 'ticket-2',
        userId: 'user-2',
        username: 'user2',
        guildId: 'guild-789',
        category: TicketCategory.SALES,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      await storage.saveTicket(ticket1);
      await storage.saveTicket(ticket2);

      const tickets = await storage.getAllOpenTickets();
      expect(tickets).toHaveLength(2);
    });
  });

  describe('updateStatistics', () => {
    it('should update statistics', async () => {
      const partialStats: Partial<TicketStatistics> = {
        totalCreated: 10,
        totalClosed: 5,
        currentlyOpen: 5
      };

      await storage.updateStatistics(partialStats);

      const stats = await storage.getStatistics();
      expect(stats.totalCreated).toBe(10);
      expect(stats.totalClosed).toBe(5);
      expect(stats.currentlyOpen).toBe(5);
    });

    it('should preserve existing statistics when updating', async () => {
      await storage.updateStatistics({
        totalCreated: 10,
        totalClosed: 5
      });

      await storage.updateStatistics({
        currentlyOpen: 3
      });

      const stats = await storage.getStatistics();
      expect(stats.totalCreated).toBe(10);
      expect(stats.totalClosed).toBe(5);
      expect(stats.currentlyOpen).toBe(3);
    });
  });

  describe('getStatistics', () => {
    it('should return initial statistics when file does not exist', async () => {
      const stats = await storage.getStatistics();
      
      expect(stats.totalCreated).toBe(0);
      expect(stats.totalClosed).toBe(0);
      expect(stats.currentlyOpen).toBe(0);
      expect(stats.closedToday).toBe(0);
      expect(stats.averageResolutionTime).toBe(0);
      expect(stats.byCategory).toBeDefined();
    });

    it('should return saved statistics', async () => {
      const newStats: Partial<TicketStatistics> = {
        totalCreated: 100,
        totalClosed: 80,
        currentlyOpen: 20,
        closedToday: 5,
        averageResolutionTime: 45
      };

      await storage.updateStatistics(newStats);
      const stats = await storage.getStatistics();

      expect(stats.totalCreated).toBe(100);
      expect(stats.totalClosed).toBe(80);
      expect(stats.currentlyOpen).toBe(20);
      expect(stats.closedToday).toBe(5);
      expect(stats.averageResolutionTime).toBe(45);
    });
  });
});
