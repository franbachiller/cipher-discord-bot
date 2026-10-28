import { 
  Client, 
  TextChannel, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  Message
} from 'discord.js';
import { PanelConfig, PanelInfo } from './types';
import { Logger } from '../utils/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Interfaz del gestor de paneles de tickets
 */
export interface ITicketPanelManager {
  /**
   * Crea un panel de tickets en un canal
   * @param channelId - ID del canal donde crear el panel
   * @param config - Configuración del panel
   * @returns ID del mensaje del panel
   */
  createPanel(channelId: string, config: PanelConfig): Promise<string>;

  /**
   * Actualiza un panel existente
   * @param messageId - ID del mensaje del panel
   * @param config - Nueva configuración
   */
  updatePanel(messageId: string, config: PanelConfig): Promise<void>;

  /**
   * Registra un panel para mantenerlo funcional después de reinicios
   * @param panelId - ID del panel
   * @param channelId - ID del canal
   */
  registerPanel(panelId: string, channelId: string): Promise<void>;

  /**
   * Carga los paneles persistidos al iniciar el bot
   */
  loadPanels(): Promise<void>;
}

/**
 * Gestor de paneles de tickets
 * Responsable de crear, actualizar y persistir paneles de tickets
 */
export class TicketPanelManager implements ITicketPanelManager {
  private client: Client;
  private logger: Logger;
  private panelsFilePath: string;
  private panels: Map<string, PanelInfo>;

  /**
   * Constructor del TicketPanelManager
   * @param client - Cliente de Discord.js
   * @param logger - Sistema de logging
   * @param dataDir - Directorio para almacenar datos (por defecto: 'data')
   */
  constructor(client: Client, logger: Logger, dataDir: string = 'data') {
    this.client = client;
    this.logger = logger;
    this.panelsFilePath = path.join(dataDir, 'panels.json');
    this.panels = new Map();
  }

  /**
   * Crea un panel de tickets en un canal
   * @param channelId - ID del canal donde crear el panel
   * @param config - Configuración del panel
   * @returns ID del mensaje del panel
   */
  async createPanel(channelId: string, config: PanelConfig): Promise<string> {
    try {
      // Obtener el canal
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Canal ${channelId} no encontrado o no es un canal de texto`);
      }

      const textChannel = channel as TextChannel;

      // Crear el embed con la configuración proporcionada
      const embed = new EmbedBuilder()
        .setTitle(config.title)
        .setDescription(config.description)
        .setColor(config.color as any);

      // Añadir imagen si está configurada
      if (config.imageUrl) {
        embed.setImage(config.imageUrl);
      }

      // Añadir thumbnail si está configurado
      if (config.thumbnailUrl) {
        embed.setThumbnail(config.thumbnailUrl);
      }

      // Crear el botón con la configuración proporcionada
      const button = new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel(config.buttonText)
        .setEmoji(config.buttonEmoji)
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

      // Enviar el mensaje con el embed y el botón
      const message = await textChannel.send({
        embeds: [embed],
        components: [row]
      });

      this.logger.info('Panel de tickets creado', {
        channelId,
        messageId: message.id,
        title: config.title
      });

      // Registrar el panel para persistencia
      await this.savePanelInfo(message.id, channelId, message.guildId!, config);

      return message.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error al crear panel de tickets', {
        channelId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`No se pudo crear el panel de tickets: ${errorMessage}`);
    }
  }

  /**
   * Actualiza un panel existente
   * @param messageId - ID del mensaje del panel
   * @param config - Nueva configuración
   */
  async updatePanel(messageId: string, config: PanelConfig): Promise<void> {
    try {
      // Buscar el panel en la memoria
      const panelInfo = this.panels.get(messageId);
      
      if (!panelInfo) {
        throw new Error(`Panel ${messageId} no encontrado`);
      }

      // Obtener el canal y el mensaje
      const channel = await this.client.channels.fetch(panelInfo.channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Canal ${panelInfo.channelId} no encontrado o no es un canal de texto`);
      }

      const textChannel = channel as TextChannel;
      const message = await textChannel.messages.fetch(messageId);

      // Crear el nuevo embed
      const embed = new EmbedBuilder()
        .setTitle(config.title)
        .setDescription(config.description)
        .setColor(config.color as any);

      if (config.imageUrl) {
        embed.setImage(config.imageUrl);
      }

      if (config.thumbnailUrl) {
        embed.setThumbnail(config.thumbnailUrl);
      }

      // Crear el nuevo botón
      const button = new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel(config.buttonText)
        .setEmoji(config.buttonEmoji)
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

      // Actualizar el mensaje
      await message.edit({
        embeds: [embed],
        components: [row]
      });

      // Actualizar la configuración en memoria y persistencia
      panelInfo.config = config;
      await this.savePanels();

      this.logger.info('Panel de tickets actualizado', {
        messageId,
        title: config.title
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error al actualizar panel de tickets', {
        messageId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`No se pudo actualizar el panel de tickets: ${errorMessage}`);
    }
  }

  /**
   * Registra un panel para mantenerlo funcional después de reinicios
   * @param panelId - ID del panel
   * @param channelId - ID del canal
   * @param guildId - ID del servidor
   * @param config - Configuración del panel
   */
  private async savePanelInfo(
    panelId: string, 
    channelId: string, 
    guildId: string,
    config: PanelConfig
  ): Promise<void> {
    const panelInfo: PanelInfo = {
      messageId: panelId,
      channelId,
      guildId,
      config
    };

    this.panels.set(panelId, panelInfo);
    await this.savePanels();

    this.logger.info('Panel registrado para persistencia', {
      panelId,
      channelId,
      guildId
    });
  }

  /**
   * Registra un panel (método público para compatibilidad con la interfaz)
   * @param panelId - ID del panel
   * @param channelId - ID del canal
   */
  async registerPanel(panelId: string, channelId: string): Promise<void> {
    // Buscar el mensaje para obtener el guildId y config
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Canal ${channelId} no encontrado`);
      }

      const textChannel = channel as TextChannel;
      const message = await textChannel.messages.fetch(panelId);

      // Extraer configuración del mensaje existente
      const embed = message.embeds[0];
      const actionRow = message.components[0] as any;
      
      if (!embed || !actionRow) {
        throw new Error('Mensaje no tiene el formato esperado de panel');
      }

      // Acceder al botón correctamente
      const button = actionRow.components ? actionRow.components[0] : null;

      const config: PanelConfig = {
        title: embed.title || 'Panel de Tickets',
        description: embed.description || '',
        color: embed.color?.toString(16).padStart(6, '0') || '5865F2',
        buttonText: button?.data?.label || 'Crear Ticket',
        buttonEmoji: button?.data?.emoji?.name || '🎫'
      };

      await this.savePanelInfo(panelId, channelId, message.guildId!, config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error al registrar panel', {
        panelId,
        channelId,
        error: errorMessage
      });
      throw new Error(`No se pudo registrar el panel: ${errorMessage}`);
    }
  }

  /**
   * Carga los paneles persistidos al iniciar el bot
   */
  async loadPanels(): Promise<void> {
    try {
      // Verificar si el archivo existe
      try {
        await fs.access(this.panelsFilePath);
      } catch {
        // El archivo no existe, crear uno vacío
        await this.ensureDataDirectory();
        await fs.writeFile(this.panelsFilePath, JSON.stringify([], null, 2));
        this.logger.info('Archivo de paneles creado', { path: this.panelsFilePath });
        return;
      }

      // Leer el archivo
      const data = await fs.readFile(this.panelsFilePath, 'utf-8');
      const panelsArray: PanelInfo[] = JSON.parse(data);

      // Cargar paneles en memoria
      this.panels.clear();
      for (const panel of panelsArray) {
        this.panels.set(panel.messageId, panel);
      }

      this.logger.info('Paneles cargados desde persistencia', {
        count: panelsArray.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error al cargar paneles', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      // No lanzar error, continuar con paneles vacíos
      this.panels.clear();
    }
  }

  /**
   * Guarda los paneles en el archivo de persistencia
   */
  private async savePanels(): Promise<void> {
    try {
      await this.ensureDataDirectory();

      const panelsArray = Array.from(this.panels.values());
      await fs.writeFile(
        this.panelsFilePath, 
        JSON.stringify(panelsArray, null, 2)
      );

      this.logger.debug('Paneles guardados en persistencia', {
        count: panelsArray.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error al guardar paneles', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      // No lanzar error para no interrumpir la operación principal
    }
  }

  /**
   * Asegura que el directorio de datos existe
   */
  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.panelsFilePath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  /**
   * Obtiene todos los paneles registrados
   * @returns Array de información de paneles
   */
  getAllPanels(): PanelInfo[] {
    return Array.from(this.panels.values());
  }

  /**
   * Obtiene un panel por su ID
   * @param panelId - ID del panel
   * @returns Información del panel o undefined si no existe
   */
  getPanel(panelId: string): PanelInfo | undefined {
    return this.panels.get(panelId);
  }
}
