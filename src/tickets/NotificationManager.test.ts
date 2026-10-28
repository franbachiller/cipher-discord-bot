import { Client } from 'discord.js';
import { NotificationManager } from './NotificationManager';
import { TicketInfo, TicketCategory, NotificationConfig } from './types';
import { Logger } from '../utils/Logger';

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;
  let mockClient: jest.Mocked<Client>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Mock Client
    mockClient = {
      channels: {
        fetch: jest.fn() as any
      }
    } as any;

    // Mock Logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    notificationManager = new NotificationManager(mockClient, mockLogger);
  });

  describe('notifyNewTicket', () => {
    const ticketInfo: TicketInfo = {
      id: 'channel-123',
      userId: 'user-123',
      username: 'testuser',
      guildId: 'guild-123',
      category: TicketCategory.TECHNICAL_SUPPORT,
      createdAt: '2024-01-01T00:00:00.000Z',
      closedAt: null,
      closedBy: null,
      closeReason: null,
      ticketNumber: 1,
      additionalUsers: [],
      lastActivity: '2024-01-01T00:00:00.000Z',
      closedByInactivity: false
    };

    it('should skip notification when notifications are disabled', async () => {
      const config: NotificationConfig = {
        enabled: false
      };

      await notificationManager.notifyNewTicket(ticketInfo, config);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications disabled, skipping notification'
      );
    });

    it('should log when notifications are enabled but no channel configured', async () => {
      const config: NotificationConfig = {
        enabled: true
      };

      await notificationManager.notifyNewTicket(ticketInfo, config);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No notification channel configured'
      );
    });

    it('should not throw error when notification fails', async () => {
      const config: NotificationConfig = {
        enabled: true
      };

      await expect(
        notificationManager.notifyNewTicket(ticketInfo, config)
      ).resolves.not.toThrow();
    });
  });

  describe('notifyUnrespondedTicket', () => {
    const ticketInfo: TicketInfo = {
      id: 'channel-123',
      userId: 'user-123',
      username: 'testuser',
      guildId: 'guild-123',
      category: TicketCategory.TECHNICAL_SUPPORT,
      createdAt: '2024-01-01T00:00:00.000Z',
      closedAt: null,
      closedBy: null,
      closeReason: null,
      ticketNumber: 1,
      additionalUsers: [],
      lastActivity: '2024-01-01T00:00:00.000Z',
      closedByInactivity: false
    };

    it('should skip notification when notifications are disabled', async () => {
      const config: NotificationConfig = {
        enabled: false
      };

      await notificationManager.notifyUnrespondedTicket(ticketInfo, config);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications disabled, skipping notification'
      );
    });

    it('should log when notifications are enabled but no channel configured', async () => {
      const config: NotificationConfig = {
        enabled: true,
        unrespondedTime: 60
      };

      await notificationManager.notifyUnrespondedTicket(ticketInfo, config);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No notification channel configured'
      );
    });

    it('should not throw error when notification fails', async () => {
      const config: NotificationConfig = {
        enabled: true,
        unrespondedTime: 60
      };

      await expect(
        notificationManager.notifyUnrespondedTicket(ticketInfo, config)
      ).resolves.not.toThrow();
    });
  });
});
