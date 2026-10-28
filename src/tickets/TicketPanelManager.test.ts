import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  Client, 
  TextChannel, 
  Message
} from 'discord.js';
import { TicketPanelManager } from './TicketPanelManager';
import { PanelConfig } from './types';
import { Logger } from '../utils/Logger';
import { LogLevel } from '../managers/ConfigManager';

// Mock de Discord.js
jest.mock('discord.js', () => {
  const mockEmbed = {
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setImage: jest.fn().mockReturnThis(),
    setThumbnail: jest.fn().mockReturnThis()
  };

  const mockButton = {
    setCustomId: jest.fn().mockReturnThis(),
    setLabel: jest.fn().mockReturnThis(),
    setEmoji: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis()
  };

  const mockRow = {
    addComponents: jest.fn().mockReturnThis()
  };

  return {
    Client: jest.fn(),
    EmbedBuilder: jest.fn(() => mockEmbed),
    ButtonBuilder: jest.fn(() => mockButton),
    ActionRowBuilder: jest.fn(() => mockRow),
    ButtonStyle: {
      Primary: 1,
      Secondary: 2,
      Success: 3,
      Danger: 4,
      Link: 5
    }
  };
});

describe('TicketPanelManager', () => {
  let panelManager: TicketPanelManager;
  let mockClient: jest.Mocked<Client>;
  let mockChannel: jest.Mocked<TextChannel>;
  let mockMessage: jest.Mocked<Message>;
  let logger: Logger;
  const testDataDir = 'test-data';
  const testPanelsFile = path.join(testDataDir, 'panels.json');

  beforeEach(() => {
    // Crear logger
    logger = new Logger('logs/test.log', LogLevel.DEBUG);

    // Crear mocks
    mockClient = {
      channels: {
        fetch: jest.fn()
      }
    } as any;

    mockMessage = {
      id: 'message-123',
      guildId: 'guild-456',
      embeds: [],
      components: [],
      edit: jest.fn()
    } as any;

    mockChannel = {
      id: 'channel-789',
      isTextBased: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue(mockMessage),
      messages: {
        fetch: jest.fn().mockResolvedValue(mockMessage)
      }
    } as any;

    // Configurar el mock del cliente
    (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockChannel);

    // Crear instancia del manager
    panelManager = new TicketPanelManager(mockClient as any, logger, testDataDir);
  });

  afterEach(async () => {
    // Limpiar archivos de test
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignorar si no existe
    }
  });

  describe('createPanel', () => {
    it('should create a panel with default configuration', async () => {
      const config: PanelConfig = {
        title: 'Sistema de Tickets',
        description: 'Haz clic en el botón para crear un ticket',
        color: '5865F2',
        buttonText: 'Crear Ticket',
        buttonEmoji: '🎫'
      };

      const messageId = await panelManager.createPanel('channel-789', config);

      expect(messageId).toBe('message-123');
      expect(mockClient.channels.fetch).toHaveBeenCalledWith('channel-789');
      expect(mockChannel.send).toHaveBeenCalled();
      
      // Verificar que se llamó con embed y botón
      const sendCall = (mockChannel.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.embeds).toHaveLength(1);
      expect(sendCall.components).toHaveLength(1);
    });

    it('should create a panel with image and thumbnail', async () => {
      const config: PanelConfig = {
        title: 'Soporte',
        description: 'Obtén ayuda aquí',
        color: 'FF0000',
        buttonText: 'Abrir Ticket',
        buttonEmoji: '📩',
        imageUrl: 'https://example.com/image.png',
        thumbnailUrl: 'https://example.com/thumb.png'
      };

      const messageId = await panelManager.createPanel('channel-789', config);

      expect(messageId).toBe('message-123');
      expect(mockChannel.send).toHaveBeenCalled();
    });

    it('should throw error if channel not found', async () => {
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(null);

      const config: PanelConfig = {
        title: 'Test',
        description: 'Test',
        color: '000000',
        buttonText: 'Test',
        buttonEmoji: '🎫'
      };

      await expect(
        panelManager.createPanel('invalid-channel', config)
      ).rejects.toThrow('no encontrado');
    });

    it('should throw error if channel is not text-based', async () => {
      const nonTextChannel = {
        ...mockChannel,
        isTextBased: jest.fn().mockReturnValue(false)
      };
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(nonTextChannel);

      const config: PanelConfig = {
        title: 'Test',
        description: 'Test',
        color: '000000',
        buttonText: 'Test',
        buttonEmoji: '🎫'
      };

      await expect(
        panelManager.createPanel('channel-789', config)
      ).rejects.toThrow('no es un canal de texto');
    });

    it('should persist panel after creation', async () => {
      const config: PanelConfig = {
        title: 'Tickets',
        description: 'Crear ticket',
        color: '00FF00',
        buttonText: 'Nuevo',
        buttonEmoji: '✨'
      };

      await panelManager.createPanel('channel-789', config);

      // Verificar que el archivo fue creado
      const data = await fs.readFile(testPanelsFile, 'utf-8');
      const panels = JSON.parse(data);
      
      expect(panels).toHaveLength(1);
      expect(panels[0].messageId).toBe('message-123');
      expect(panels[0].channelId).toBe('channel-789');
      expect(panels[0].config.title).toBe('Tickets');
    });
  });

  describe('updatePanel', () => {
    it('should update an existing panel', async () => {
      // Primero crear un panel
      const originalConfig: PanelConfig = {
        title: 'Original',
        description: 'Original description',
        color: '000000',
        buttonText: 'Original Button',
        buttonEmoji: '🎫'
      };

      await panelManager.createPanel('channel-789', originalConfig);

      // Actualizar el panel
      const newConfig: PanelConfig = {
        title: 'Updated',
        description: 'Updated description',
        color: 'FFFFFF',
        buttonText: 'Updated Button',
        buttonEmoji: '✨'
      };

      await panelManager.updatePanel('message-123', newConfig);

      expect(mockMessage.edit).toHaveBeenCalled();
      
      // Verificar que se actualizó en persistencia
      const data = await fs.readFile(testPanelsFile, 'utf-8');
      const panels = JSON.parse(data);
      
      expect(panels[0].config.title).toBe('Updated');
      expect(panels[0].config.description).toBe('Updated description');
    });

    it('should throw error if panel not found', async () => {
      const config: PanelConfig = {
        title: 'Test',
        description: 'Test',
        color: '000000',
        buttonText: 'Test',
        buttonEmoji: '🎫'
      };

      await expect(
        panelManager.updatePanel('non-existent', config)
      ).rejects.toThrow('no encontrado');
    });
  });

  describe('loadPanels', () => {
    it('should load panels from file', async () => {
      // Crear archivo de paneles manualmente
      await fs.mkdir(testDataDir, { recursive: true });
      const panelsData = [
        {
          messageId: 'msg-1',
          channelId: 'ch-1',
          guildId: 'guild-1',
          config: {
            title: 'Panel 1',
            description: 'Description 1',
            color: '000000',
            buttonText: 'Button 1',
            buttonEmoji: '🎫'
          }
        },
        {
          messageId: 'msg-2',
          channelId: 'ch-2',
          guildId: 'guild-2',
          config: {
            title: 'Panel 2',
            description: 'Description 2',
            color: 'FFFFFF',
            buttonText: 'Button 2',
            buttonEmoji: '✨'
          }
        }
      ];
      
      await fs.writeFile(testPanelsFile, JSON.stringify(panelsData, null, 2));

      // Cargar paneles
      await panelManager.loadPanels();

      // Verificar que se cargaron
      const panels = panelManager.getAllPanels();
      expect(panels).toHaveLength(2);
      expect(panels[0].messageId).toBe('msg-1');
      expect(panels[1].messageId).toBe('msg-2');
    });

    it('should create empty file if it does not exist', async () => {
      await panelManager.loadPanels();

      // Verificar que se creó el archivo
      const data = await fs.readFile(testPanelsFile, 'utf-8');
      const panels = JSON.parse(data);
      
      expect(panels).toEqual([]);
    });

    it('should handle corrupted file gracefully', async () => {
      // Crear archivo corrupto
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testPanelsFile, 'invalid json {{{');

      // No debería lanzar error
      await expect(panelManager.loadPanels()).resolves.not.toThrow();

      // Los paneles deberían estar vacíos
      const panels = panelManager.getAllPanels();
      expect(panels).toEqual([]);
    });
  });

  describe('getAllPanels', () => {
    it('should return empty array when no panels exist', () => {
      const panels = panelManager.getAllPanels();
      expect(panels).toEqual([]);
    });

    it('should return all registered panels', async () => {
      const config1: PanelConfig = {
        title: 'Panel 1',
        description: 'Desc 1',
        color: '000000',
        buttonText: 'Button 1',
        buttonEmoji: '🎫'
      };

      const config2: PanelConfig = {
        title: 'Panel 2',
        description: 'Desc 2',
        color: 'FFFFFF',
        buttonText: 'Button 2',
        buttonEmoji: '✨'
      };

      // Crear dos paneles
      mockMessage.id = 'msg-1';
      await panelManager.createPanel('channel-1', config1);

      mockMessage.id = 'msg-2';
      await panelManager.createPanel('channel-2', config2);

      const panels = panelManager.getAllPanels();
      expect(panels).toHaveLength(2);
    });
  });

  describe('getPanel', () => {
    it('should return undefined for non-existent panel', () => {
      const panel = panelManager.getPanel('non-existent');
      expect(panel).toBeUndefined();
    });

    it('should return panel info for existing panel', async () => {
      const config: PanelConfig = {
        title: 'Test Panel',
        description: 'Test Description',
        color: '123456',
        buttonText: 'Test Button',
        buttonEmoji: '🎫'
      };

      await panelManager.createPanel('channel-789', config);

      const panel = panelManager.getPanel('message-123');
      expect(panel).toBeDefined();
      expect(panel?.messageId).toBe('message-123');
      expect(panel?.channelId).toBe('channel-789');
      expect(panel?.config.title).toBe('Test Panel');
    });
  });

  describe('persistence round-trip', () => {
    it('should persist and reload panels correctly', async () => {
      // Crear varios paneles
      const configs = [
        {
          title: 'Soporte Técnico',
          description: 'Ayuda técnica',
          color: 'FF0000',
          buttonText: 'Soporte',
          buttonEmoji: '🔧'
        },
        {
          title: 'Ventas',
          description: 'Consultas de ventas',
          color: '00FF00',
          buttonText: 'Ventas',
          buttonEmoji: '💰'
        },
        {
          title: 'General',
          description: 'Consultas generales',
          color: '0000FF',
          buttonText: 'General',
          buttonEmoji: '📝'
        }
      ];

      for (let i = 0; i < configs.length; i++) {
        mockMessage.id = `msg-${i}`;
        await panelManager.createPanel(`channel-${i}`, configs[i]);
      }

      // Crear nuevo manager y cargar paneles
      const newManager = new TicketPanelManager(mockClient as any, logger, testDataDir);
      await newManager.loadPanels();

      // Verificar que se cargaron correctamente
      const panels = newManager.getAllPanels();
      expect(panels).toHaveLength(3);
      
      for (let i = 0; i < configs.length; i++) {
        const panel = newManager.getPanel(`msg-${i}`);
        expect(panel).toBeDefined();
        expect(panel?.config.title).toBe(configs[i].title);
        expect(panel?.config.description).toBe(configs[i].description);
        expect(panel?.config.color).toBe(configs[i].color);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle panel with minimal configuration', async () => {
      const config: PanelConfig = {
        title: 'T',
        description: 'D',
        color: '000',
        buttonText: 'B',
        buttonEmoji: '🎫'
      };

      const messageId = await panelManager.createPanel('channel-789', config);
      expect(messageId).toBe('message-123');
    });

    it('should handle panel with very long text', async () => {
      const config: PanelConfig = {
        title: 'A'.repeat(256),
        description: 'B'.repeat(4096),
        color: 'FFFFFF',
        buttonText: 'C'.repeat(80),
        buttonEmoji: '🎫'
      };

      const messageId = await panelManager.createPanel('channel-789', config);
      expect(messageId).toBe('message-123');
    });

    it('should handle concurrent panel creation', async () => {
      const config: PanelConfig = {
        title: 'Concurrent',
        description: 'Test',
        color: '000000',
        buttonText: 'Test',
        buttonEmoji: '🎫'
      };

      // Crear múltiples paneles concurrentemente
      const promises = [];
      for (let i = 0; i < 5; i++) {
        mockMessage.id = `msg-${i}`;
        promises.push(panelManager.createPanel(`channel-${i}`, config));
      }

      await Promise.all(promises);

      const panels = panelManager.getAllPanels();
      expect(panels.length).toBeGreaterThanOrEqual(1);
    });
  });
});
