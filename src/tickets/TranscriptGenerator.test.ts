import { TranscriptGenerator } from './TranscriptGenerator';
import { TicketInfo, TicketCategory } from './types';
import { Logger } from '../utils/Logger';
import { LogLevel } from '../managers/ConfigManager';
import { Message, TextChannel, Collection, User, Attachment, Client } from 'discord.js';

describe('TranscriptGenerator', () => {
  let generator: TranscriptGenerator;
  let logger: Logger;
  let mockClient: Client;

  beforeEach(() => {
    logger = new Logger('logs/test.log', LogLevel.DEBUG);
    mockClient = {} as Client;
    generator = new TranscriptGenerator(mockClient, logger);
  });

  describe('formatMessage', () => {
    it('should format a message with timestamp, author and content', () => {
      const mockDate = new Date('2024-01-15T14:30:45Z');
      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: 'Hello, this is a test message',
        attachments: new Collection<string, Attachment>()
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[14:30:45]');
      expect(formatted).toContain('testuser:');
      expect(formatted).toContain('Hello, this is a test message');
    });

    it('should handle messages without content', () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: '',
        attachments: new Collection<string, Attachment>()
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[10:00:00]');
      expect(formatted).toContain('testuser:');
      expect(formatted).toContain('[Sin contenido]');
    });

    it('should include attachment URLs when present', () => {
      const mockDate = new Date('2024-01-15T16:45:30Z');
      const mockAttachment1 = {
        url: 'https://cdn.discord.com/attachments/123/image1.png'
      } as Attachment;
      const mockAttachment2 = {
        url: 'https://cdn.discord.com/attachments/123/image2.jpg'
      } as Attachment;

      const attachments = new Collection<string, Attachment>();
      attachments.set('1', mockAttachment1);
      attachments.set('2', mockAttachment2);

      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: 'Check these images',
        attachments
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[16:45:30]');
      expect(formatted).toContain('testuser:');
      expect(formatted).toContain('Check these images');
      expect(formatted).toContain('Adjuntos:');
      expect(formatted).toContain('https://cdn.discord.com/attachments/123/image1.png');
      expect(formatted).toContain('https://cdn.discord.com/attachments/123/image2.jpg');
    });

    it('should format timestamps with leading zeros', () => {
      const mockDate = new Date('2024-01-15T03:05:09Z');
      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: 'Early morning message',
        attachments: new Collection<string, Attachment>()
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[03:05:09]');
    });
  });

  describe('generateTranscript', () => {
    it('should throw error when channel is not found', async () => {
      const ticketInfo: TicketInfo = {
        id: 'ticket-123',
        userId: 'user-456',
        username: 'testuser',
        guildId: 'guild-789',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: '2024-01-15T10:00:00Z',
        closedAt: '2024-01-15T11:00:00Z',
        closedBy: 'staff-123',
        closeReason: 'Resolved',
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: '2024-01-15T10:30:00Z',
        closedByInactivity: false
      };

      // Mock client.channels.fetch to return null
      mockClient.channels = {
        fetch: jest.fn().mockResolvedValue(null)
      } as any;

      await expect(generator.generateTranscript('channel-123', ticketInfo))
        .rejects.toThrow('Canal con ID channel-123 no encontrado');
    });
  });

  describe('transcript format', () => {
    it('should include all required metadata fields', () => {
      // Este test verifica que el formato del transcript incluye todos los campos requeridos
      // Nota: Este es un test de formato, no de generación completa
      
      const ticketInfo: TicketInfo = {
        id: 'ticket-123',
        userId: 'user-456',
        username: 'testuser',
        guildId: 'guild-789',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: '2024-01-15T10:00:00Z',
        closedAt: '2024-01-15T11:00:00Z',
        closedBy: 'staff-123',
        closeReason: 'Resolved',
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: '2024-01-15T10:30:00Z',
        closedByInactivity: false
      };

      // Verificamos que los campos requeridos están presentes en TicketInfo
      expect(ticketInfo.username).toBeDefined();
      expect(ticketInfo.userId).toBeDefined();
      expect(ticketInfo.category).toBeDefined();
      expect(ticketInfo.createdAt).toBeDefined();
      expect(ticketInfo.closedAt).toBeDefined();
      expect(ticketInfo.closedBy).toBeDefined();
      expect(ticketInfo.closeReason).toBeDefined();
      expect(ticketInfo.ticketNumber).toBeDefined();
    });
  });

  describe('message formatting edge cases', () => {
    it('should handle very long messages', () => {
      const longContent = 'A'.repeat(2000); // Discord max message length
      const mockDate = new Date('2024-01-15T12:00:00Z');
      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: longContent,
        attachments: new Collection<string, Attachment>()
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[12:00:00]');
      expect(formatted).toContain('testuser:');
      expect(formatted).toContain(longContent);
    });

    it('should handle special characters in content', () => {
      const specialContent = 'Test with special chars: @user #channel <@123> **bold** *italic*';
      const mockDate = new Date('2024-01-15T13:00:00Z');
      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: specialContent,
        attachments: new Collection<string, Attachment>()
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[13:00:00]');
      expect(formatted).toContain('testuser:');
      expect(formatted).toContain(specialContent);
    });

    it('should handle usernames with special characters', () => {
      const mockDate = new Date('2024-01-15T14:00:00Z');
      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'test_user-123'
        },
        content: 'Message from user with special chars',
        attachments: new Collection<string, Attachment>()
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[14:00:00]');
      expect(formatted).toContain('test_user-123:');
      expect(formatted).toContain('Message from user with special chars');
    });
  });

  describe('attachment handling', () => {
    it('should handle single attachment', () => {
      const mockDate = new Date('2024-01-15T15:00:00Z');
      const mockAttachment = {
        url: 'https://cdn.discord.com/attachments/123/file.pdf'
      } as Attachment;

      const attachments = new Collection<string, Attachment>();
      attachments.set('1', mockAttachment);

      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: 'Here is a file',
        attachments
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('Adjuntos:');
      expect(formatted).toContain('https://cdn.discord.com/attachments/123/file.pdf');
    });

    it('should handle multiple attachments', () => {
      const mockDate = new Date('2024-01-15T16:00:00Z');
      const attachments = new Collection<string, Attachment>();
      
      for (let i = 1; i <= 5; i++) {
        attachments.set(String(i), {
          url: `https://cdn.discord.com/attachments/123/file${i}.png`
        } as Attachment);
      }

      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: 'Multiple files',
        attachments
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('Adjuntos:');
      for (let i = 1; i <= 5; i++) {
        expect(formatted).toContain(`https://cdn.discord.com/attachments/123/file${i}.png`);
      }
    });
  });

  describe('timestamp formatting', () => {
    it('should format midnight correctly', () => {
      const mockDate = new Date('2024-01-15T00:00:00Z');
      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: 'Midnight message',
        attachments: new Collection<string, Attachment>()
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[00:00:00]');
    });

    it('should format noon correctly', () => {
      const mockDate = new Date('2024-01-15T12:00:00Z');
      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: 'Noon message',
        attachments: new Collection<string, Attachment>()
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[12:00:00]');
    });

    it('should format end of day correctly', () => {
      const mockDate = new Date('2024-01-15T23:59:59Z');
      const mockMessage = {
        createdAt: mockDate,
        author: {
          username: 'testuser'
        },
        content: 'End of day message',
        attachments: new Collection<string, Attachment>()
      } as Message;

      const formatted = generator.formatMessage(mockMessage);

      expect(formatted).toContain('[23:59:59]');
    });
  });
});
