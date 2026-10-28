import { ticketPanelCommand } from './ticket-panel';
import { ticketAddCommand } from './ticket-add';
import { ticketRemoveCommand } from './ticket-remove';
import { ticketCloseCommand } from './ticket-close';
import { TicketPanelManager } from '../tickets/TicketPanelManager';
import { TicketManager } from '../tickets/TicketManager';
import { Logger } from '../utils/Logger';
import { CommandContext } from './types';
import { PermissionFlagsBits } from 'discord.js';

describe('Ticket Administrative Commands', () => {
  let mockTicketManager: jest.Mocked<TicketManager>;
  let mockPanelManager: jest.Mocked<TicketPanelManager>;
  let mockLogger: jest.Mocked<Logger>;
  let mockContext: CommandContext;

  beforeEach(() => {
    mockTicketManager = {
      addUserToTicket: jest.fn(),
      removeUserFromTicket: jest.fn(),
      closeTicket: jest.fn()
    } as any;

    mockPanelManager = {
      createPanel: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    const mockChannel = {
      id: 'channel123',
      isTextBased: () => true,
      send: jest.fn().mockResolvedValue({})
    };

    const mockGuild = {
      id: 'guild123',
      channels: {
        fetch: jest.fn().mockResolvedValue(mockChannel)
      },
      members: {
        fetch: jest.fn().mockResolvedValue({
          id: 'user456',
          user: { username: 'testuser' }
        })
      }
    };

    mockContext = {
      message: {
        author: {
          id: 'admin123',
          username: 'admin'
        },
        channel: mockChannel,
        reply: jest.fn().mockResolvedValue({}),
        guild: mockGuild
      } as any,
      args: [],
      guild: mockGuild as any,
      author: {
        id: 'admin123',
        username: 'admin'
      } as any
    };
  });

  describe('ticket-panel command', () => {
    it('should have correct command properties', () => {
      const command = ticketPanelCommand(mockPanelManager, mockLogger);

      expect(command.name).toBe('ticket-panel');
      expect(command.description).toBe('Crea un panel de tickets en el canal especificado');
      expect(command.category).toBe('Tickets');
      expect(command.requiredPermissions).toEqual([PermissionFlagsBits.Administrator]);
    });

    it('should return error if no channel is provided', async () => {
      const command = ticketPanelCommand(mockPanelManager, mockLogger);
      mockContext.args = [];

      const result = await command.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Uso incorrecto');
    });

    it('should create panel successfully', async () => {
      const command = ticketPanelCommand(mockPanelManager, mockLogger);
      mockPanelManager.createPanel.mockResolvedValue('panel123');
      mockContext.args = ['<#channel123>'];

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Panel de tickets creado exitosamente');
      expect(mockPanelManager.createPanel).toHaveBeenCalled();
    });
  });

  describe('ticket-add command', () => {
    it('should have correct command properties', () => {
      const command = ticketAddCommand(mockTicketManager, mockLogger);

      expect(command.name).toBe('ticket-add');
      expect(command.description).toBe('Añade un usuario a un ticket existente');
      expect(command.category).toBe('Tickets');
      expect(command.requiredPermissions).toEqual([PermissionFlagsBits.Administrator]);
    });

    it('should return error if no user is provided', async () => {
      const command = ticketAddCommand(mockTicketManager, mockLogger);
      mockContext.args = [];

      const result = await command.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Uso incorrecto');
    });

    it('should add user to ticket successfully', async () => {
      const command = ticketAddCommand(mockTicketManager, mockLogger);
      mockTicketManager.addUserToTicket.mockResolvedValue();
      mockContext.args = ['<@user456>'];

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('añadido al ticket exitosamente');
      expect(mockTicketManager.addUserToTicket).toHaveBeenCalledWith('channel123', 'user456');
    });
  });

  describe('ticket-remove command', () => {
    it('should have correct command properties', () => {
      const command = ticketRemoveCommand(mockTicketManager, mockLogger);

      expect(command.name).toBe('ticket-remove');
      expect(command.description).toBe('Remueve un usuario de un ticket');
      expect(command.category).toBe('Tickets');
      expect(command.requiredPermissions).toEqual([PermissionFlagsBits.Administrator]);
    });

    it('should return error if no user is provided', async () => {
      const command = ticketRemoveCommand(mockTicketManager, mockLogger);
      mockContext.args = [];

      const result = await command.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Uso incorrecto');
    });

    it('should remove user from ticket successfully', async () => {
      const command = ticketRemoveCommand(mockTicketManager, mockLogger);
      mockTicketManager.removeUserFromTicket.mockResolvedValue();
      mockContext.args = ['<@user456>'];

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('removido del ticket exitosamente');
      expect(mockTicketManager.removeUserFromTicket).toHaveBeenCalledWith('channel123', 'user456');
    });
  });

  describe('ticket-close command', () => {
    it('should have correct command properties', () => {
      const command = ticketCloseCommand(mockTicketManager, mockLogger);

      expect(command.name).toBe('ticket-close');
      expect(command.description).toBe('Cierra un ticket mediante comando');
      expect(command.category).toBe('Tickets');
      expect(command.requiredPermissions).toEqual([PermissionFlagsBits.ManageChannels]);
    });

    it('should close ticket with default reason', async () => {
      const command = ticketCloseCommand(mockTicketManager, mockLogger);
      mockTicketManager.closeTicket.mockResolvedValue('transcript content');
      mockContext.args = [];

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(mockContext.message.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cerrando ticket')
      );
      expect(mockTicketManager.closeTicket).toHaveBeenCalledWith(
        'channel123',
        'admin123',
        'Cerrado por staff mediante comando'
      );
    });

    it('should close ticket with custom reason', async () => {
      const command = ticketCloseCommand(mockTicketManager, mockLogger);
      mockTicketManager.closeTicket.mockResolvedValue('transcript content');
      mockContext.args = ['Problema', 'resuelto'];

      const result = await command.execute(mockContext);

      expect(result.success).toBe(true);
      expect(mockTicketManager.closeTicket).toHaveBeenCalledWith(
        'channel123',
        'admin123',
        'Problema resuelto'
      );
    });
  });
});
