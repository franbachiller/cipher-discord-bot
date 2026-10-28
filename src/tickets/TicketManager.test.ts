import { Client, Guild, TextChannel, User, GuildMember, CategoryChannel, Role, Collection } from 'discord.js';
import { TicketManager } from './TicketManager';
import { TicketStorage, ITicketStorage } from './TicketStorage';
import { TranscriptGenerator } from './TranscriptGenerator';
import { LogManager, ILogManager } from './LogManager';
import { NotificationManager, INotificationManager } from './NotificationManager';
import { ChannelManager } from '../managers/ChannelManager';
import { PermissionManager } from '../managers/PermissionManager';
import { Logger } from '../utils/Logger';
import { TicketCategory, TicketConfig, TicketInfo, TicketStatistics } from './types';

// Mocks
jest.mock('./TicketStorage');
jest.mock('./TranscriptGenerator');
jest.mock('./LogManager');
jest.mock('./NotificationManager');
jest.mock('../managers/ChannelManager');
jest.mock('../managers/PermissionManager');
jest.mock('../utils/Logger');

describe('TicketManager', () => {
  let ticketManager: TicketManager;
  let mockClient: jest.Mocked<Client>;
  let mockTicketStorage: jest.Mocked<ITicketStorage>;
  let mockTranscriptGenerator: jest.Mocked<TranscriptGenerator>;
  let mockLogManager: jest.Mocked<ILogManager>;
  let mockNotificationManager: jest.Mocked<INotificationManager>;
  let mockChannelManager: jest.Mocked<ChannelManager>;
  let mockPermissionManager: jest.Mocked<PermissionManager>;
  let mockLogger: jest.Mocked<Logger>;
  let mockConfig: TicketConfig;

  // Mock objects
  let mockGuild: jest.Mocked<Guild>;
  let mockUser: jest.Mocked<User>;
  let mockMember: jest.Mocked<GuildMember>;
  let mockChannel: jest.Mocked<TextChannel>;
  let mockCategory: jest.Mocked<CategoryChannel>;
  let mockEveryoneRole: jest.Mocked<Role>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock config
    mockConfig = {
      maxTicketsPerUser: 3,
      staffRoles: ['staff-role-id-1', 'staff-role-id-2'],
      categories: {
        [TicketCategory.TECHNICAL_SUPPORT]: {
          name: 'Soporte Técnico',
          discordCategoryId: 'category-id-1',
          staffRoles: ['staff-role-id-1'],
          emoji: '🔧',
          description: 'Soporte técnico'
        },
        [TicketCategory.SALES]: {
          name: 'Ventas',
          discordCategoryId: 'category-id-2',
          staffRoles: ['staff-role-id-2'],
          emoji: '💰',
          description: 'Consultas de ventas'
        },
        [TicketCategory.REPORTS]: {
          name: 'Reportes',
          discordCategoryId: 'category-id-3',
          staffRoles: ['staff-role-id-1'],
          emoji: '📝',
          description: 'Reportes'
        },
        [TicketCategory.OTHER]: {
          name: 'Otros',
          discordCategoryId: 'category-id-4',
          staffRoles: [],
          emoji: '❓',
          description: 'Otros'
        }
      },
      logChannelId: 'log-channel-id',
      closeDelay: 5
    };

    // Create mock instances
    mockTicketStorage = {
      saveTicket: jest.fn(),
      getTicket: jest.fn(),
      getUserTickets: jest.fn(),
      deleteTicket: jest.fn(),
      getAllOpenTickets: jest.fn(),
      updateStatistics: jest.fn(),
      getStatistics: jest.fn()
    } as any;

    mockTranscriptGenerator = {
      generateTranscript: jest.fn(),
      formatMessage: jest.fn()
    } as any;

    mockLogManager = {
      logTicketCreation: jest.fn(),
      logTicketClosure: jest.fn(),
      logError: jest.fn()
    } as any;

    mockNotificationManager = {
      notifyNewTicket: jest.fn(),
      notifyUnrespondedTicket: jest.fn()
    } as any;

    mockChannelManager = {
      createTextChannel: jest.fn(),
      createVoiceChannel: jest.fn(),
      moveToCategory: jest.fn(),
      deleteChannel: jest.fn()
    } as any;

    mockPermissionManager = {
      setChannelPermissions: jest.fn(),
      hasPermission: jest.fn(),
      getChannelPermissions: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as any;

    // Create mock Discord objects
    mockEveryoneRole = {
      id: 'everyone-role-id',
      name: '@everyone'
    } as any;

    mockGuild = {
      id: 'guild-id-123',
      members: {
        fetch: jest.fn(),
        me: {
          id: 'bot-id-123'
        }
      },
      channels: {
        fetch: jest.fn()
      },
      roles: {
        fetch: jest.fn(),
        everyone: mockEveryoneRole
      }
    } as any;

    mockUser = {
      id: 'user-id-123',
      username: 'TestUser'
    } as any;

    mockMember = {
      id: 'user-id-123',
      user: mockUser,
      guild: mockGuild
    } as any;

    mockCategory = {
      id: 'category-id-1',
      type: 4, // CategoryChannel
      name: 'Tickets'
    } as any;

    mockChannel = {
      id: 'channel-id-123',
      name: 'ticket-testuser-1',
      guild: mockGuild,
      send: jest.fn(),
      permissionOverwrites: {
        edit: jest.fn()
      }
    } as any;

    mockClient = {
      guilds: {
        fetch: jest.fn()
      },
      channels: {
        fetch: jest.fn()
      }
    } as any;

    // Setup default mock behaviors
    (mockClient.guilds.fetch as jest.Mock).mockResolvedValue(mockGuild);
    (mockGuild.members.fetch as jest.Mock).mockResolvedValue(mockMember);
    (mockGuild.channels.fetch as jest.Mock).mockResolvedValue(mockCategory);
    (mockChannelManager.createTextChannel as jest.Mock).mockResolvedValue(mockChannel);
    (mockTicketStorage.getUserTickets as jest.Mock).mockResolvedValue([]);
    (mockTicketStorage.getStatistics as jest.Mock).mockResolvedValue({
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
    });

    // Create TicketManager instance
    ticketManager = new TicketManager(
      mockClient,
      mockTicketStorage,
      mockTranscriptGenerator,
      mockLogManager,
      mockNotificationManager,
      mockChannelManager,
      mockPermissionManager,
      mockLogger,
      mockConfig
    );
  });

  describe('createTicket', () => {
    it('should create a ticket successfully', async () => {
      // Act
      const result = await ticketManager.createTicket(
        'user-id-123',
        'guild-id-123',
        TicketCategory.TECHNICAL_SUPPORT
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe('user-id-123');
      expect(result.username).toBe('TestUser');
      expect(result.category).toBe(TicketCategory.TECHNICAL_SUPPORT);
      expect(result.ticketNumber).toBe(1);
      expect(result.closedAt).toBeNull();
      expect(mockChannelManager.createTextChannel).toHaveBeenCalled();
      expect(mockTicketStorage.saveTicket).toHaveBeenCalled();
      expect(mockLogManager.logTicketCreation).toHaveBeenCalled();
    });

    it('should throw error when user reaches ticket limit', async () => {
      // Arrange
      const existingTickets: TicketInfo[] = [
        {
          id: 'ticket-1',
          userId: 'user-id-123',
          username: 'TestUser',
          guildId: 'guild-id-123',
          category: TicketCategory.TECHNICAL_SUPPORT,
          createdAt: new Date().toISOString(),
          closedAt: null,
          closedBy: null,
          closeReason: null,
          ticketNumber: 1,
          additionalUsers: [],
          lastActivity: new Date().toISOString(),
          closedByInactivity: false
        },
        {
          id: 'ticket-2',
          userId: 'user-id-123',
          username: 'TestUser',
          guildId: 'guild-id-123',
          category: TicketCategory.SALES,
          createdAt: new Date().toISOString(),
          closedAt: null,
          closedBy: null,
          closeReason: null,
          ticketNumber: 2,
          additionalUsers: [],
          lastActivity: new Date().toISOString(),
          closedByInactivity: false
        },
        {
          id: 'ticket-3',
          userId: 'user-id-123',
          username: 'TestUser',
          guildId: 'guild-id-123',
          category: TicketCategory.REPORTS,
          createdAt: new Date().toISOString(),
          closedAt: null,
          closedBy: null,
          closeReason: null,
          ticketNumber: 3,
          additionalUsers: [],
          lastActivity: new Date().toISOString(),
          closedByInactivity: false
        }
      ];
      (mockTicketStorage.getUserTickets as jest.Mock).mockResolvedValue(existingTickets);

      // Act & Assert
      await expect(
        ticketManager.createTicket('user-id-123', 'guild-id-123', TicketCategory.OTHER)
      ).rejects.toThrow('You have reached the limit');
    });

    it('should format channel name correctly', async () => {
      // Act
      await ticketManager.createTicket(
        'user-id-123',
        'guild-id-123',
        TicketCategory.TECHNICAL_SUPPORT
      );

      // Assert
      expect(mockChannelManager.createTextChannel).toHaveBeenCalledWith(
        mockGuild,
        'ticket-testuser-1',
        expect.any(Object)
      );
    });

    it('should configure channel permissions correctly', async () => {
      // Act
      await ticketManager.createTicket(
        'user-id-123',
        'guild-id-123',
        TicketCategory.TECHNICAL_SUPPORT
      );

      // Assert
      // Verify @everyone permissions were denied
      expect(mockPermissionManager.setChannelPermissions).toHaveBeenCalledWith(
        mockChannel,
        mockEveryoneRole,
        expect.objectContaining({
          deny: expect.arrayContaining([expect.any(BigInt)])
        })
      );

      // Verify user permissions were granted
      expect(mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
        'user-id-123',
        expect.objectContaining({
          ViewChannel: true,
          SendMessages: true
        })
      );
    });

    it('should send welcome message with close button', async () => {
      // Act
      await ticketManager.createTicket(
        'user-id-123',
        'guild-id-123',
        TicketCategory.TECHNICAL_SUPPORT
      );

      // Assert
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Ticket #1')
              })
            })
          ]),
          components: expect.arrayContaining([
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({
                  data: expect.objectContaining({
                    label: 'Close Ticket'
                  })
                })
              ])
            })
          ])
        })
      );
    });

    it('should update statistics on ticket creation', async () => {
      // Act
      await ticketManager.createTicket(
        'user-id-123',
        'guild-id-123',
        TicketCategory.TECHNICAL_SUPPORT
      );

      // Assert
      expect(mockTicketStorage.updateStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCreated: 1,
          currentlyOpen: 1
        })
      );
    });

    it('should call notifyNewTicket when notifications are enabled', async () => {
      // Arrange
      const configWithNotifications = {
        ...mockConfig,
        notifications: {
          enabled: true
        }
      };
      ticketManager = new TicketManager(
        mockClient,
        mockTicketStorage,
        mockTranscriptGenerator,
        mockLogManager,
        mockNotificationManager,
        mockChannelManager,
        mockPermissionManager,
        mockLogger,
        configWithNotifications
      );

      // Act
      await ticketManager.createTicket(
        'user-id-123',
        'guild-id-123',
        TicketCategory.TECHNICAL_SUPPORT
      );

      // Assert
      expect(mockNotificationManager.notifyNewTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-123',
          category: TicketCategory.TECHNICAL_SUPPORT
        }),
        { enabled: true }
      );
    });

    it('should not call notifyNewTicket when notifications are disabled', async () => {
      // Arrange
      const configWithoutNotifications = {
        ...mockConfig,
        notifications: {
          enabled: false
        }
      };
      ticketManager = new TicketManager(
        mockClient,
        mockTicketStorage,
        mockTranscriptGenerator,
        mockLogManager,
        mockNotificationManager,
        mockChannelManager,
        mockPermissionManager,
        mockLogger,
        configWithoutNotifications
      );

      // Act
      await ticketManager.createTicket(
        'user-id-123',
        'guild-id-123',
        TicketCategory.TECHNICAL_SUPPORT
      );

      // Assert
      expect(mockNotificationManager.notifyNewTicket).not.toHaveBeenCalled();
    });

    it('should increment ticket number for subsequent tickets', async () => {
      // Arrange
      const existingTicket: TicketInfo = {
        id: 'ticket-1',
        userId: 'user-id-123',
        username: 'TestUser',
        guildId: 'guild-id-123',
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
      (mockTicketStorage.getUserTickets as jest.Mock).mockResolvedValue([existingTicket]);

      // Act
      const result = await ticketManager.createTicket(
        'user-id-123',
        'guild-id-123',
        TicketCategory.SALES
      );

      // Assert
      expect(result.ticketNumber).toBe(2);
    });

    it('should sanitize username in channel name', async () => {
      // Arrange
      const userWithSpecialChars = {
        id: 'user-id-456',
        username: 'Test@User#123!'
      } as any;
      const memberWithSpecialChars = {
        id: 'user-id-456',
        user: userWithSpecialChars,
        guild: mockGuild
      } as any;
      (mockGuild.members.fetch as jest.Mock).mockResolvedValue(memberWithSpecialChars);

      // Act
      await ticketManager.createTicket(
        'user-id-456',
        'guild-id-123',
        TicketCategory.TECHNICAL_SUPPORT
      );

      // Assert
      expect(mockChannelManager.createTextChannel).toHaveBeenCalledWith(
        mockGuild,
        'ticket-test-user-123-1',
        expect.any(Object)
      );
    });
  });

  describe('getUserOpenTickets', () => {
    it('should return user open tickets', async () => {
      // Arrange
      const tickets: TicketInfo[] = [
        {
          id: 'ticket-1',
          userId: 'user-id-123',
          username: 'TestUser',
          guildId: 'guild-id-123',
          category: TicketCategory.TECHNICAL_SUPPORT,
          createdAt: new Date().toISOString(),
          closedAt: null,
          closedBy: null,
          closeReason: null,
          ticketNumber: 1,
          additionalUsers: [],
          lastActivity: new Date().toISOString(),
          closedByInactivity: false
        }
      ];
      (mockTicketStorage.getUserTickets as jest.Mock).mockResolvedValue(tickets);

      // Act
      const result = await ticketManager.getUserOpenTickets('user-id-123');

      // Assert
      expect(result).toEqual(tickets);
      expect(mockTicketStorage.getUserTickets).toHaveBeenCalledWith('user-id-123');
    });
  });

  describe('closeTicket', () => {
    let mockTicketInfo: TicketInfo;

    beforeEach(() => {
      mockTicketInfo = {
        id: 'ticket-channel-id',
        userId: 'user-id-123',
        username: 'TestUser',
        guildId: 'guild-id-123',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: '2024-01-15T10:00:00Z',
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: '2024-01-15T10:30:00Z',
        closedByInactivity: false
      };

      // Mock channel
      mockChannel = {
        id: 'ticket-channel-id',
        isTextBased: jest.fn().mockReturnValue(true),
        send: jest.fn().mockResolvedValue(undefined),
        guild: mockGuild
      } as any;

      // Initialize mockClient.channels if not exists
      if (!mockClient.channels) {
        mockClient.channels = {
          fetch: jest.fn()
        } as any;
      }

      // Setup default mocks
      (mockTicketStorage.getTicket as jest.Mock).mockResolvedValue(mockTicketInfo);
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockChannel);
      (mockTranscriptGenerator.generateTranscript as jest.Mock).mockResolvedValue('Mock transcript content');
      (mockLogManager.logTicketClosure as jest.Mock).mockResolvedValue(undefined);
      (mockTicketStorage.deleteTicket as jest.Mock).mockResolvedValue(undefined);
      (mockTicketStorage.getStatistics as jest.Mock).mockResolvedValue({
        totalCreated: 10,
        totalClosed: 5,
        currentlyOpen: 5,
        closedToday: 2,
        averageResolutionTime: 30,
        byCategory: {
          [TicketCategory.TECHNICAL_SUPPORT]: 5,
          [TicketCategory.SALES]: 3,
          [TicketCategory.REPORTS]: 1,
          [TicketCategory.OTHER]: 1
        },
        lastUpdated: new Date().toISOString()
      });
      (mockTicketStorage.updateStatistics as jest.Mock).mockResolvedValue(undefined);
      (mockChannelManager.deleteChannel as jest.Mock).mockResolvedValue(undefined);
    });

    it('should close ticket successfully with all steps', async () => {
      // Arrange
      jest.useFakeTimers();

      // Act
      const closePromise = ticketManager.closeTicket('ticket-channel-id', 'staff-id-123', 'Issue resolved');
      
      // Run all pending timers
      await jest.runAllTimersAsync();
      
      const transcript = await closePromise;

      // Assert
      expect(transcript).toBe('Mock transcript content');
      
      // Verify ticket was retrieved
      expect(mockTicketStorage.getTicket).toHaveBeenCalledWith('ticket-channel-id');
      
      // Verify channel was fetched
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('ticket-channel-id');
      
      // Verify transcript was generated
      expect(mockTranscriptGenerator.generateTranscript).toHaveBeenCalledWith(
        'ticket-channel-id',
        expect.objectContaining({
          id: 'ticket-channel-id',
          closedBy: 'staff-id-123',
          closeReason: 'Issue resolved',
          closedAt: expect.any(String)
        })
      );
      
      // Verify closure was logged
      expect(mockLogManager.logTicketClosure).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ticket-channel-id',
          closedBy: 'staff-id-123',
          closeReason: 'Issue resolved'
        }),
        'staff-id-123',
        'Mock transcript content',
        'log-channel-id'
      );
      
      // Verify goodbye message was sent
      expect(mockChannel.send).toHaveBeenCalledWith(expect.stringContaining('Ticket Closed'));
      
      // Verify ticket was deleted from storage
      expect(mockTicketStorage.deleteTicket).toHaveBeenCalledWith('ticket-channel-id');
      
      // Verify statistics were updated
      expect(mockTicketStorage.updateStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          totalClosed: 6,
          currentlyOpen: 4
        })
      );
      
      // Verify channel was deleted
      expect(mockChannelManager.deleteChannel).toHaveBeenCalledWith(mockChannel);

      jest.useRealTimers();
    });

    it('should close ticket without reason', async () => {
      // Arrange
      jest.useFakeTimers();

      // Act
      const closePromise = ticketManager.closeTicket('ticket-channel-id', 'staff-id-123');
      await jest.runAllTimersAsync();
      await closePromise;

      // Assert
      expect(mockTranscriptGenerator.generateTranscript).toHaveBeenCalledWith(
        'ticket-channel-id',
        expect.objectContaining({
          closeReason: null
        })
      );

      jest.useRealTimers();
    });

    it('should throw error if ticket not found', async () => {
      // Arrange
      (mockTicketStorage.getTicket as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        ticketManager.closeTicket('non-existent-ticket', 'staff-id-123')
      ).rejects.toThrow('Ticket con ID non-existent-ticket no encontrado');
    });

    it('should throw error if channel not found', async () => {
      // Arrange
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        ticketManager.closeTicket('ticket-channel-id', 'staff-id-123')
      ).rejects.toThrow('Canal del ticket ticket-channel-id no encontrado');
    });

    it('should throw error if channel is not text-based', async () => {
      // Arrange
      const mockVoiceChannel = {
        id: 'ticket-channel-id',
        isTextBased: jest.fn().mockReturnValue(false)
      } as any;
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockVoiceChannel);

      // Act & Assert
      await expect(
        ticketManager.closeTicket('ticket-channel-id', 'staff-id-123')
      ).rejects.toThrow('Canal del ticket ticket-channel-id no encontrado o no es un canal de texto');
    });

    it('should use custom goodbye message if configured', async () => {
      // Arrange
      jest.useFakeTimers();
      const customConfig = {
        ...mockConfig,
        goodbyeMessage: 'Custom goodbye message'
      };
      ticketManager = new TicketManager(
        mockClient,
        mockTicketStorage,
        mockTranscriptGenerator,
        mockLogManager,
        mockNotificationManager,
        mockChannelManager,
        mockPermissionManager,
        mockLogger,
        customConfig
      );

      // Act
      const closePromise = ticketManager.closeTicket('ticket-channel-id', 'staff-id-123');
      await jest.runAllTimersAsync();
      await closePromise;

      // Assert
      expect(mockChannel.send).toHaveBeenCalledWith('Custom goodbye message');

      jest.useRealTimers();
    });

    it('should update statistics correctly with resolution time', async () => {
      // Arrange
      jest.useFakeTimers();
      const createdAt = '2024-01-15T10:00:00Z';
      mockTicketInfo.createdAt = createdAt;
      (mockTicketStorage.getTicket as jest.Mock).mockResolvedValue(mockTicketInfo);

      // Act
      const closePromise = ticketManager.closeTicket('ticket-channel-id', 'staff-id-123');
      await jest.runAllTimersAsync();
      await closePromise;

      // Assert
      expect(mockTicketStorage.updateStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          totalClosed: 6,
          currentlyOpen: 4,
          averageResolutionTime: expect.any(Number)
        })
      );

      jest.useRealTimers();
    });

    it('should wait configured delay before deleting channel', async () => {
      // Arrange
      jest.useFakeTimers();
      const closePromise = ticketManager.closeTicket('ticket-channel-id', 'staff-id-123');

      // Fast-forward time
      await jest.runAllTimersAsync();

      // Act
      await closePromise;

      // Assert
      expect(mockChannelManager.deleteChannel).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('addUserToTicket', () => {
    it('should add user to ticket successfully', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const userId = 'user-456';
      const mockTicket: TicketInfo = {
        id: ticketId,
        userId: 'original-user',
        username: 'originaluser',
        guildId: 'guild-123',
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

      const mockChannel = {
        id: ticketId,
        isTextBased: () => true,
        permissionOverwrites: {
          edit: jest.fn().mockResolvedValue(undefined)
        }
      };

      mockTicketStorage.getTicket.mockResolvedValue(mockTicket);
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockChannel as any);
      mockTicketStorage.saveTicket.mockResolvedValue(undefined);

      // Act
      await ticketManager.addUserToTicket(ticketId, userId);

      // Assert
      expect(mockTicketStorage.getTicket).toHaveBeenCalledWith(ticketId);
      expect(mockClient.channels.fetch).toHaveBeenCalledWith(ticketId);
      expect(mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      });
      expect(mockTicketStorage.saveTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalUsers: [userId]
        })
      );
    });

    it('should throw error if ticket not found', async () => {
      mockTicketStorage.getTicket.mockResolvedValue(null);

      await expect(
        ticketManager.addUserToTicket('ticket-id', 'user-id')
      ).rejects.toThrow('Ticket con ID ticket-id no encontrado');
    });

    it('should throw error if channel not found', async () => {
      const mockTicket: TicketInfo = {
        id: 'ticket-123',
        userId: 'user-123',
        username: 'testuser',
        guildId: 'guild-123',
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

      mockTicketStorage.getTicket.mockResolvedValue(mockTicket);
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(null);

      await expect(
        ticketManager.addUserToTicket('ticket-123', 'user-456')
      ).rejects.toThrow('Canal del ticket ticket-123 no encontrado');
    });

    it('should not add duplicate user', async () => {
      const ticketId = 'ticket-123';
      const userId = 'user-456';
      const mockTicket: TicketInfo = {
        id: ticketId,
        userId: 'original-user',
        username: 'originaluser',
        guildId: 'guild-123',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [userId], // Usuario ya está en la lista
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      const mockChannel = {
        id: ticketId,
        isTextBased: () => true,
        permissionOverwrites: {
          edit: jest.fn().mockResolvedValue(undefined)
        }
      };

      mockTicketStorage.getTicket.mockResolvedValue(mockTicket);
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockChannel as any);
      mockTicketStorage.saveTicket.mockResolvedValue(undefined);

      await ticketManager.addUserToTicket(ticketId, userId);

      // El usuario no debe duplicarse
      expect(mockTicketStorage.saveTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalUsers: [userId] // Solo una vez
        })
      );
    });
  });

  describe('removeUserFromTicket', () => {
    it('should remove user from ticket successfully', async () => {
      const ticketId = 'ticket-123';
      const userId = 'user-456';
      const mockTicket: TicketInfo = {
        id: ticketId,
        userId: 'original-user',
        username: 'originaluser',
        guildId: 'guild-123',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [userId],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      const mockChannel = {
        id: ticketId,
        isTextBased: () => true,
        permissionOverwrites: {
          delete: jest.fn().mockResolvedValue(undefined)
        }
      };

      mockTicketStorage.getTicket.mockResolvedValue(mockTicket);
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockChannel as any);
      mockTicketStorage.saveTicket.mockResolvedValue(undefined);

      // Act
      await ticketManager.removeUserFromTicket(ticketId, userId);

      // Assert
      expect(mockTicketStorage.getTicket).toHaveBeenCalledWith(ticketId);
      expect(mockClient.channels.fetch).toHaveBeenCalledWith(ticketId);
      expect(mockChannel.permissionOverwrites.delete).toHaveBeenCalledWith(userId);
      expect(mockTicketStorage.saveTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalUsers: []
        })
      );
    });

    it('should throw error if ticket not found', async () => {
      mockTicketStorage.getTicket.mockResolvedValue(null);

      await expect(
        ticketManager.removeUserFromTicket('ticket-id', 'user-id')
      ).rejects.toThrow('Ticket con ID ticket-id no encontrado');
    });

    it('should throw error if channel not found', async () => {
      const mockTicket: TicketInfo = {
        id: 'ticket-123',
        userId: 'user-123',
        username: 'testuser',
        guildId: 'guild-123',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: ['user-456'],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      mockTicketStorage.getTicket.mockResolvedValue(mockTicket);
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(null);

      await expect(
        ticketManager.removeUserFromTicket('ticket-123', 'user-456')
      ).rejects.toThrow('Canal del ticket ticket-123 no encontrado');
    });

    it('should handle removing user not in additionalUsers', async () => {
      const ticketId = 'ticket-123';
      const userId = 'user-456';
      const mockTicket: TicketInfo = {
        id: ticketId,
        userId: 'original-user',
        username: 'originaluser',
        guildId: 'guild-123',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [], // Usuario no está en la lista
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      const mockChannel = {
        id: ticketId,
        isTextBased: () => true,
        permissionOverwrites: {
          delete: jest.fn().mockResolvedValue(undefined)
        }
      };

      mockTicketStorage.getTicket.mockResolvedValue(mockTicket);
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockChannel as any);
      mockTicketStorage.saveTicket.mockResolvedValue(undefined);

      await ticketManager.removeUserFromTicket(ticketId, userId);

      // Debe completarse sin error
      expect(mockTicketStorage.saveTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalUsers: []
        })
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics from storage', async () => {
      const mockStats: TicketStatistics = {
        totalCreated: 10,
        totalClosed: 5,
        currentlyOpen: 5,
        closedToday: 2,
        averageResolutionTime: 30,
        byCategory: {
          [TicketCategory.TECHNICAL_SUPPORT]: 4,
          [TicketCategory.SALES]: 3,
          [TicketCategory.REPORTS]: 2,
          [TicketCategory.OTHER]: 1
        },
        lastUpdated: new Date().toISOString()
      };

      mockTicketStorage.getStatistics.mockResolvedValue(mockStats);

      const result = await ticketManager.getStatistics('guild-123');

      expect(result).toEqual(mockStats);
      expect(mockTicketStorage.getStatistics).toHaveBeenCalled();
    });

    it('should throw error if statistics retrieval fails', async () => {
      mockTicketStorage.getStatistics.mockRejectedValue(new Error('Storage error'));

      await expect(
        ticketManager.getStatistics('guild-123')
      ).rejects.toThrow('Storage error');
    });
  });

  describe('createCategorySelectMenu', () => {
    it('should create a select menu with all configured categories', () => {
      // Arrange
      const customId = 'select_ticket_category';

      // Act
      const result = ticketManager.createCategorySelectMenu(customId);

      // Assert
      expect(result).toBeDefined();
      expect(result.components).toHaveLength(1);
      
      const selectMenu = result.components[0];
      expect(selectMenu.data.custom_id).toBe(customId);
      expect(selectMenu.data.placeholder).toBe('Select a category for your ticket');
      expect(selectMenu.data.min_values).toBe(1);
      expect(selectMenu.data.max_values).toBe(1);
      
      // Check that options exist (they are in the builder, not in data yet)
      expect(selectMenu.options).toHaveLength(4); // 4 categories configured
    });

    it('should include correct category information in options', () => {
      // Arrange
      const customId = 'select_ticket_category';

      // Act
      const result = ticketManager.createCategorySelectMenu(customId);
      const selectMenu = result.components[0];
      const options = selectMenu.options;

      // Assert - Check that all categories are present
      const categoryKeys = options?.map((opt: any) => opt.data.value) || [];
      expect(categoryKeys).toContain(TicketCategory.TECHNICAL_SUPPORT);
      expect(categoryKeys).toContain(TicketCategory.SALES);
      expect(categoryKeys).toContain(TicketCategory.REPORTS);
      expect(categoryKeys).toContain(TicketCategory.OTHER);

      // Assert - Check that options have correct structure
      const techSupportOption = options?.find((opt: any) => opt.data.value === TicketCategory.TECHNICAL_SUPPORT);
      expect(techSupportOption).toBeDefined();
      expect(techSupportOption?.data.label).toBe('Soporte Técnico');
      expect(techSupportOption?.data.description).toBe('Soporte técnico');
      expect(techSupportOption?.data.emoji?.name).toBe('🔧');
    });

    it('should include emoji for each category option', () => {
      // Arrange
      const customId = 'select_ticket_category';

      // Act
      const result = ticketManager.createCategorySelectMenu(customId);
      const selectMenu = result.components[0];
      const options = selectMenu.options || [];

      // Assert - All options should have emojis
      expect(options.every((opt: any) => opt.data.emoji !== undefined)).toBe(true);
      
      // Check specific emojis
      const salesOption = options.find((opt: any) => opt.data.value === TicketCategory.SALES);
      expect(salesOption?.data.emoji?.name).toBe('💰');
      
      const reportsOption = options.find((opt: any) => opt.data.value === TicketCategory.REPORTS);
      expect(reportsOption?.data.emoji?.name).toBe('📝');
      
      const otherOption = options.find((opt: any) => opt.data.value === TicketCategory.OTHER);
      expect(otherOption?.data.emoji?.name).toBe('❓');
    });

    it('should use custom ID provided as parameter', () => {
      // Arrange
      const customId1 = 'custom_id_1';
      const customId2 = 'another_custom_id';

      // Act
      const result1 = ticketManager.createCategorySelectMenu(customId1);
      const result2 = ticketManager.createCategorySelectMenu(customId2);

      // Assert
      expect(result1.components[0].data.custom_id).toBe(customId1);
      expect(result2.components[0].data.custom_id).toBe(customId2);
    });

    it('should log debug messages when creating menu', () => {
      // Arrange
      const customId = 'select_ticket_category';

      // Act
      ticketManager.createCategorySelectMenu(customId);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Creating category select menu',
        { customId }
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Category select menu created',
        { customId, optionsCount: 4 }
      );
    });
  });
});
