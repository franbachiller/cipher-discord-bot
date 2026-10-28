import {
  Guild,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  GuildChannel,
  ChannelType,
  GuildChannelCreateOptions,
  PermissionsBitField
} from 'discord.js';
import { Logger } from '../utils/Logger';

/**
 * Opciones para la creación de canales
 */
export interface ChannelOptions {
  /** Categoría padre del canal */
  category?: CategoryChannel;
  
  /** Posición del canal en la lista */
  position?: number;
  
  /** Tema o descripción del canal (solo para canales de texto) */
  topic?: string;
  
  /** Indica si el canal es NSFW */
  nsfw?: boolean;
}

/**
 * Gestor de operaciones relacionadas con canales
 */
export class ChannelManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Crea un canal de texto en el servidor
   * @param guild - Servidor donde crear el canal
   * @param name - Nombre del canal
   * @param options - Opciones adicionales del canal
   * @returns Canal de texto creado
   * @throws Error si falta el permiso MANAGE_CHANNELS o los parámetros son inválidos
   */
  async createTextChannel(
    guild: Guild,
    name: string,
    options?: ChannelOptions
  ): Promise<TextChannel> {
    try {
      // Validar parámetros
      if (!name || name.trim().length === 0) {
        const error = new Error('El nombre del canal no puede estar vacío');
        this.logger.error('Validation error creating text channel', { name, error });
        throw error;
      }

      if (name.length > 100) {
        const error = new Error('El nombre del canal no puede exceder 100 caracteres');
        this.logger.error('Validation error creating text channel', { name, error });
        throw error;
      }

      // Verificar permisos del bot
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar canales');
        this.logger.error('Permission error creating text channel', { 
          guildId: guild.id, 
          name,
          error 
        });
        throw error;
      }

      // Preparar opciones de creación
      const createOptions: GuildChannelCreateOptions = {
        name,
        type: ChannelType.GuildText,
        parent: options?.category?.id,
        position: options?.position,
        topic: options?.topic,
        nsfw: options?.nsfw
      };

      // Crear el canal
      const channel = await guild.channels.create(createOptions);

      this.logger.info('Text channel created successfully', {
        guildId: guild.id,
        channelId: channel.id,
        channelName: name
      });

      return channel as TextChannel;
    } catch (error) {
      this.logger.error('Error creating text channel', {
        guildId: guild.id,
        name,
        error
      });
      throw error;
    }
  }

  /**
   * Crea un canal de voz en el servidor
   * @param guild - Servidor donde crear el canal
   * @param name - Nombre del canal
   * @param options - Opciones adicionales del canal
   * @returns Canal de voz creado
   * @throws Error si falta el permiso MANAGE_CHANNELS o los parámetros son inválidos
   */
  async createVoiceChannel(
    guild: Guild,
    name: string,
    options?: ChannelOptions
  ): Promise<VoiceChannel> {
    try {
      // Validar parámetros
      if (!name || name.trim().length === 0) {
        const error = new Error('El nombre del canal no puede estar vacío');
        this.logger.error('Validation error creating voice channel', { name, error });
        throw error;
      }

      if (name.length > 100) {
        const error = new Error('El nombre del canal no puede exceder 100 caracteres');
        this.logger.error('Validation error creating voice channel', { name, error });
        throw error;
      }

      // Verificar permisos del bot
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar canales');
        this.logger.error('Permission error creating voice channel', { 
          guildId: guild.id, 
          name,
          error 
        });
        throw error;
      }

      // Preparar opciones de creación
      const createOptions: GuildChannelCreateOptions = {
        name,
        type: ChannelType.GuildVoice,
        parent: options?.category?.id,
        position: options?.position,
        nsfw: options?.nsfw
      };

      // Crear el canal
      const channel = await guild.channels.create(createOptions);

      this.logger.info('Voice channel created successfully', {
        guildId: guild.id,
        channelId: channel.id,
        channelName: name
      });

      // Discord.js garantiza que el canal será del tipo especificado en las opciones
      return channel as unknown as VoiceChannel;
    } catch (error) {
      this.logger.error('Error creating voice channel', {
        guildId: guild.id,
        name,
        error
      });
      throw error;
    }
  }

  /**
   * Mueve un canal a una categoría
   * @param channel - Canal a mover
   * @param category - Categoría destino
   * @throws Error si falta el permiso MANAGE_CHANNELS
   */
  async moveToCategory(
    channel: GuildChannel,
    category: CategoryChannel
  ): Promise<void> {
    try {
      // Verificar permisos del bot
      const guild = channel.guild;
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar canales');
        this.logger.error('Permission error moving channel', { 
          guildId: guild.id,
          channelId: channel.id,
          categoryId: category.id,
          error 
        });
        throw error;
      }

      // Mover el canal
      await channel.setParent(category.id);

      this.logger.info('Channel moved to category successfully', {
        guildId: guild.id,
        channelId: channel.id,
        categoryId: category.id
      });
    } catch (error) {
      this.logger.error('Error moving channel to category', {
        channelId: channel.id,
        categoryId: category.id,
        error
      });
      throw error;
    }
  }

  /**
   * Elimina un canal del servidor
   * @param channel - Canal a eliminar
   * @throws Error si falta el permiso MANAGE_CHANNELS
   */
  async deleteChannel(channel: GuildChannel): Promise<void> {
    try {
      // Verificar permisos del bot
      const guild = channel.guild;
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar canales');
        this.logger.error('Permission error deleting channel', { 
          guildId: guild.id,
          channelId: channel.id,
          error 
        });
        throw error;
      }

      const channelId = channel.id;
      const guildId = guild.id;

      // Eliminar el canal
      await channel.delete();

      this.logger.info('Channel deleted successfully', {
        guildId,
        channelId
      });
    } catch (error) {
      this.logger.error('Error deleting channel', {
        channelId: channel.id,
        error
      });
      throw error;
    }
  }
}
