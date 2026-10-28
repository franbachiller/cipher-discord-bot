import { moveChannelCommand } from './movechannel';
import { ChannelManager } from '../managers/ChannelManager';
import { Logger } from '../utils/Logger';
import { LogLevel } from '../managers/ConfigManager';
import { CommandContext } from './types';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

// Mock del Logger y ChannelManager
jest.mock('../utils/Logger');
jest.mock('../managers/ChannelManager');

describe('moveChannelCommand', () => {
  let mockChannelManager: jest.Mocked<ChannelManager>;
  let mockLogger: jest.Mocked<Logger>;
  let mockContext: CommandContext;

  beforeEach(() => {
    // Crear mocks
    mockLogger = new Logger('test.log', LogLevel.DEBUG) as jest.Mocked<Logger>;
    mockChannelManager = new ChannelManager(mockLogger) as jest.Mocked<ChannelManager>;

    // Mock del contexto
    const mockChannel = {
      id: 'channel123',
      name: 'general',
      type: ChannelType.GuildText
    };

    const mockCategory = {
      id: 'category123',
      name: 'Text Channels',
      type: ChannelType.GuildCategory
    };

    // Crear un Map con el método find
    const channelsCache = new Map([
      ['channel123', mockChannel],
      ['category123', mockCategory]
    ]);

    // Agregar el método find al Map
    (channelsCache as any).find = function(predicate: any) {
      for (const [, value] of this) {
        if (predicate(value)) {
          return value;
        }
      }
      return undefined;
    };

    const mockGuild = {
      id: 'guild123',
      name: 'Test Guild',
      channels: {
        cache: channelsCache
      }
    };

    mockContext = {
      message: {} as any,
      args: [],
      guild: mockGuild as any,
      author: {
        id: 'user123',
        username: 'testuser',
        discriminator: '0001'
      } as any
    };
  });

  it('should have correct command metadata', () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);

    expect(command.name).toBe('movechannel');
    expect(command.description).toBe('Mueve un canal a una categoría específica');
    expect(command.usage).toBe('!movechannel <canal> <categoría>');
    expect(command.category).toBe('Canales');
    expect(command.requiredPermissions).toContain(PermissionFlagsBits.ManageChannels);
  });

  it('should return error when insufficient arguments provided', async () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);
    mockContext.args = ['general'];

    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Uso incorrecto');
  });

  it('should return error when channel not found', async () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);
    mockContext.args = ['nonexistent', 'Text Channels'];

    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.message).toContain('No se encontró el canal');
  });

  it('should return error when category not found', async () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);
    mockContext.args = ['general', 'NonexistentCategory'];

    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.message).toContain('No se encontró la categoría');
  });

  it('should successfully move channel to category', async () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);
    mockContext.args = ['general', 'Text', 'Channels'];

    mockChannelManager.moveToCategory = jest.fn().mockResolvedValue(undefined);

    const result = await command.execute(mockContext);

    expect(result.success).toBe(true);
    expect(result.message).toContain('movido a la categoría');
    expect(result.message).toContain('general');
    expect(result.message).toContain('Text Channels');
    expect(mockChannelManager.moveToCategory).toHaveBeenCalled();
  });

  it('should handle permission errors', async () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);
    mockContext.args = ['general', 'Text', 'Channels'];

    mockChannelManager.moveToCategory = jest.fn().mockRejectedValue(
      new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar canales')
    );

    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.message).toContain('No tengo permisos suficientes');
  });

  it('should handle generic errors', async () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);
    mockContext.args = ['general', 'Text', 'Channels'];

    mockChannelManager.moveToCategory = jest.fn().mockRejectedValue(
      new Error('Network error')
    );

    const result = await command.execute(mockContext);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Error al mover el canal');
    expect(result.message).toContain('Network error');
  });

  it('should handle multi-word category names', async () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);
    mockContext.args = ['general', 'Text', 'Channels'];

    mockChannelManager.moveToCategory = jest.fn().mockResolvedValue(undefined);

    const result = await command.execute(mockContext);

    expect(result.success).toBe(true);
    expect(mockChannelManager.moveToCategory).toHaveBeenCalled();
  });

  it('should return error when trying to move a category', async () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);
    
    // Crear un nuevo contexto con una categoría que se pueda encontrar
    const mockCategoryToMove = {
      id: 'category456',
      name: 'voice',
      type: ChannelType.GuildCategory
    };

    const mockTargetCategory = {
      id: 'category123',
      name: 'Text Channels',
      type: ChannelType.GuildCategory
    };

    // Crear un nuevo cache con el método find
    const channelsCache = new Map([
      ['category456', mockCategoryToMove],
      ['category123', mockTargetCategory]
    ]);

    (channelsCache as any).find = function(predicate: any) {
      for (const [, value] of this) {
        if (predicate(value)) {
          return value;
        }
      }
      return undefined;
    };

    const testContext = {
      ...mockContext,
      guild: {
        ...mockContext.guild,
        channels: {
          cache: channelsCache
        }
      }
    };
    
    testContext.args = ['voice', 'Text', 'Channels'];

    const result = await command.execute(testContext as any);

    // El comando debería no encontrar el canal porque busca solo GuildText o GuildVoice
    expect(result.success).toBe(false);
    expect(result.message).toContain('No se encontró el canal');
  });

  it('should perform case-insensitive channel search', async () => {
    const command = moveChannelCommand(mockChannelManager, mockLogger);
    mockContext.args = ['GENERAL', 'text', 'channels'];

    mockChannelManager.moveToCategory = jest.fn().mockResolvedValue(undefined);

    const result = await command.execute(mockContext);

    expect(result.success).toBe(true);
    expect(mockChannelManager.moveToCategory).toHaveBeenCalled();
  });
});
