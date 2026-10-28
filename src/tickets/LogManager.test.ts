import { LogManager } from './LogManager';
import { TicketInfo, TicketCategory } from './types';
import { Logger } from '../utils/Logger';
import { Client, TextChannel } from 'discord.js';

describe('LogManager', () => {
  let logManager: LogManager;
  let mockClient: jest.Mocked<Client>;
  let mockLogger: jest.Mocked<Logger>;
  let mockLogChannel: jest.Mocked<TextChannel>;

  beforeEach(() => {
    // Crear mocks
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      logCommand: jest.fn()
    } as any;

    mockLogChannel = {
      send: jest.fn().mockResolvedValue({}),
      isTextBased: jest.fn().mockReturnValue(true)
    } as any;

    mockClient = {
      channels: {
        fetch: jest.fn().mockResolvedValue(mockLogChannel)
      }
    } as any;

    logManager = new LogManager(mockClient, mockLogger);
  });

  describe('logTicketCreation', () => {
    it('should log ticket creation with green embed', async () => {
      const ticketInfo: TicketInfo = {
        id: '123456789',
        userId: '987654321',
        username: 'testuser',
        guildId: '111222333',
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

      await logManager.logTicketCreation(ticketInfo, 'log-channel-id');

      expect(mockClient.channels.fetch).toHaveBeenCalledWith('log-channel-id');
      expect(mockLogChannel.send).toHaveBeenCalledTimes(1);
      
      const sendCall = mockLogChannel.send.mock.calls[0][0] as any;
      expect(sendCall.embeds).toHaveLength(1);
      
      const embed = sendCall.embeds[0];
      expect(embed.data.title).toBe('🎫 Ticket Creado');
      expect(embed.data.color).toBe(0x00FF00); // Verde
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Usuario' }),
          expect.objectContaining({ name: 'ID Usuario', value: ticketInfo.userId }),
          expect.objectContaining({ name: 'Categoría', value: ticketInfo.category }),
          expect.objectContaining({ name: 'Canal' }),
          expect.objectContaining({ name: 'ID Canal', value: ticketInfo.id }),
          expect.objectContaining({ name: 'Número de Ticket', value: '#1' })
        ])
      );
      
      expect(mockLogger.info).toHaveBeenCalledWith('Ticket creation logged', {
        ticketId: ticketInfo.id,
        userId: ticketInfo.userId,
        category: ticketInfo.category
      });
    });

    it('should handle missing log channel gracefully', async () => {
      mockClient.channels.fetch = jest.fn().mockResolvedValue(null);

      const ticketInfo: TicketInfo = {
        id: '123456789',
        userId: '987654321',
        username: 'testuser',
        guildId: '111222333',
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

      await logManager.logTicketCreation(ticketInfo, 'invalid-channel-id');

      expect(mockLogChannel.send).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Canal de logs no encontrado', {
        logChannelId: 'invalid-channel-id'
      });
    });

    it('should handle errors during logging', async () => {
      mockLogChannel.send = jest.fn().mockRejectedValue(new Error('Send failed'));

      const ticketInfo: TicketInfo = {
        id: '123456789',
        userId: '987654321',
        username: 'testuser',
        guildId: '111222333',
        category: TicketCategory.REPORTS,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber: 3,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      await logManager.logTicketCreation(ticketInfo, 'log-channel-id');

      expect(mockLogger.error).toHaveBeenCalledWith('Error al registrar creación de ticket', {
        error: 'Send failed',
        ticketId: ticketInfo.id
      });
    });
  });

  describe('logTicketClosure', () => {
    it('should log ticket closure with red embed and transcript', async () => {
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const closedAt = new Date('2024-01-01T11:30:00Z');
      
      const ticketInfo: TicketInfo = {
        id: '123456789',
        userId: '987654321',
        username: 'testuser',
        guildId: '111222333',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: createdAt.toISOString(),
        closedAt: closedAt.toISOString(),
        closedBy: '555666777',
        closeReason: 'Problema resuelto',
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: closedAt.toISOString(),
        closedByInactivity: false
      };

      const transcript = 'Transcript del ticket...';

      await logManager.logTicketClosure(ticketInfo, '555666777', transcript, 'log-channel-id');

      expect(mockClient.channels.fetch).toHaveBeenCalledWith('log-channel-id');
      expect(mockLogChannel.send).toHaveBeenCalledTimes(1);
      
      const sendCall = mockLogChannel.send.mock.calls[0][0] as any;
      expect(sendCall.embeds).toHaveLength(1);
      expect(sendCall.files).toHaveLength(1);
      
      const embed = sendCall.embeds[0];
      expect(embed.data.title).toBe('🔒 Ticket Cerrado');
      expect(embed.data.color).toBe(0xFF0000); // Rojo
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Usuario' }),
          expect.objectContaining({ name: 'ID Usuario', value: ticketInfo.userId }),
          expect.objectContaining({ name: 'Categoría', value: ticketInfo.category }),
          expect.objectContaining({ name: 'Cerrado por' }),
          expect.objectContaining({ name: 'Duración', value: '1h 30m' }),
          expect.objectContaining({ name: 'Número de Ticket', value: '#1' }),
          expect.objectContaining({ name: 'Razón', value: 'Problema resuelto' })
        ])
      );

      const file = sendCall.files[0];
      expect(file.name).toBe('ticket-123456789-transcript.txt');
      
      expect(mockLogger.info).toHaveBeenCalledWith('Ticket closure logged', {
        ticketId: ticketInfo.id,
        userId: ticketInfo.userId,
        closedBy: '555666777',
        duration: '1h 30m'
      });
    });

    it('should include inactivity indicator when ticket closed by inactivity', async () => {
      const ticketInfo: TicketInfo = {
        id: '123456789',
        userId: '987654321',
        username: 'testuser',
        guildId: '111222333',
        category: TicketCategory.OTHER,
        createdAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        closedBy: 'system',
        closeReason: null,
        ticketNumber: 5,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: true
      };

      const transcript = 'Transcript...';

      await logManager.logTicketClosure(ticketInfo, 'system', transcript, 'log-channel-id');

      const sendCall = mockLogChannel.send.mock.calls[0][0] as any;
      const embed = sendCall.embeds[0];
      
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            name: 'Tipo de Cierre', 
            value: '⏰ Cerrado por inactividad' 
          })
        ])
      );
    });

    it('should format duration correctly for short tickets', async () => {
      const createdAt = new Date('2024-01-01T10:00:00Z');
      const closedAt = new Date('2024-01-01T10:15:00Z');
      
      const ticketInfo: TicketInfo = {
        id: '123456789',
        userId: '987654321',
        username: 'testuser',
        guildId: '111222333',
        category: TicketCategory.SALES,
        createdAt: createdAt.toISOString(),
        closedAt: closedAt.toISOString(),
        closedBy: '555666777',
        closeReason: null,
        ticketNumber: 2,
        additionalUsers: [],
        lastActivity: closedAt.toISOString(),
        closedByInactivity: false
      };

      const transcript = 'Transcript...';

      await logManager.logTicketClosure(ticketInfo, '555666777', transcript, 'log-channel-id');

      const sendCall = mockLogChannel.send.mock.calls[0][0] as any;
      const embed = sendCall.embeds[0];
      const durationField = embed.data.fields.find((f: any) => f.name === 'Duración');
      
      expect(durationField.value).toBe('15m');
    });

    it('should handle errors during closure logging', async () => {
      mockLogChannel.send = jest.fn().mockRejectedValue(new Error('Send failed'));

      const ticketInfo: TicketInfo = {
        id: '123456789',
        userId: '987654321',
        username: 'testuser',
        guildId: '111222333',
        category: TicketCategory.TECHNICAL_SUPPORT,
        createdAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        closedBy: '555666777',
        closeReason: null,
        ticketNumber: 1,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      await logManager.logTicketClosure(ticketInfo, '555666777', 'transcript', 'log-channel-id');

      expect(mockLogger.error).toHaveBeenCalledWith('Error al registrar cierre de ticket', {
        error: 'Send failed',
        ticketId: ticketInfo.id
      });
    });
  });

  describe('logError', () => {
    it('should log system errors with stack trace', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:10:5';
      const context = 'Testing error logging';

      await logManager.logError(error, context, 'log-channel-id');

      expect(mockClient.channels.fetch).toHaveBeenCalledWith('log-channel-id');
      expect(mockLogChannel.send).toHaveBeenCalledTimes(1);
      
      const sendCall = mockLogChannel.send.mock.calls[0][0] as any;
      expect(sendCall.embeds).toHaveLength(1);
      
      const embed = sendCall.embeds[0];
      expect(embed.data.title).toBe('❌ Error del Sistema de Tickets');
      expect(embed.data.color).toBe(0xFF0000); // Rojo
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Contexto', value: context }),
          expect.objectContaining({ name: 'Error', value: error.message }),
          expect.objectContaining({ name: 'Stack Trace' })
        ])
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith('System error logged to Discord', {
        context,
        error: error.message
      });
    });

    it('should truncate long stack traces', async () => {
      const error = new Error('Test error');
      error.stack = 'a'.repeat(2000); // Stack trace muy largo
      const context = 'Testing truncation';

      await logManager.logError(error, context, 'log-channel-id');

      expect(mockLogChannel.send).toHaveBeenCalledTimes(1);
      const sendCall = mockLogChannel.send.mock.calls[0][0] as any;
      const embed = sendCall.embeds[0];
      const stackField = embed.data.fields.find((f: any) => f.name === 'Stack Trace');
      
      // El valor incluye ``` al inicio y final, más los ... al final
      expect(stackField.value.length).toBeLessThanOrEqual(1024 + 6); // 1024 + ``` + ```
      expect(stackField.value).toContain('...');
    });

    it('should handle errors without stack trace', async () => {
      const error = new Error('Test error');
      delete error.stack;
      const context = 'Testing without stack';

      await logManager.logError(error, context, 'log-channel-id');

      const sendCall = mockLogChannel.send.mock.calls[0][0] as any;
      const embed = sendCall.embeds[0];
      const stackField = embed.data.fields.find((f: any) => f.name === 'Stack Trace');
      
      expect(stackField).toBeUndefined();
    });

    it('should handle errors during error logging', async () => {
      mockLogChannel.send = jest.fn().mockRejectedValue(new Error('Send failed'));

      const error = new Error('Original error');
      const context = 'Testing error handling';

      await logManager.logError(error, context, 'log-channel-id');

      expect(mockLogger.error).toHaveBeenCalledWith('Error al registrar error en Discord', 
        expect.objectContaining({
          originalError: error.message,
          context
        })
      );
    });
  });
});
