import {
  Guild,
  CategoryChannel,
  ChannelType,
  GuildChannelCreateOptions,
  PermissionsBitField
} from 'discord.js';
import { Logger } from '../utils/Logger';

/**
 * Gestor de operaciones relacionadas con la configuración del servidor
 */
export class ServerManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Actualiza el nombre del servidor
   * @param guild - Servidor a actualizar
   * @param name - Nuevo nombre del servidor
   * @throws Error si falta el permiso MANAGE_GUILD o los parámetros son inválidos
   */
  async setServerName(guild: Guild, name: string): Promise<void> {
    try {
      // Validar parámetros
      if (!name || name.trim().length === 0) {
        const error = new Error('El nombre del servidor no puede estar vacío');
        this.logger.error('Validation error setting server name', { name, error });
        throw error;
      }

      if (name.length > 100) {
        const error = new Error('El nombre del servidor no puede exceder 100 caracteres');
        this.logger.error('Validation error setting server name', { name, error });
        throw error;
      }

      // Verificar permisos del bot
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar el servidor');
        this.logger.error('Permission error setting server name', { 
          guildId: guild.id, 
          name,
          error 
        });
        throw error;
      }

      // Actualizar el nombre del servidor
      await guild.setName(name);

      this.logger.info('Server name updated successfully', {
        guildId: guild.id,
        newName: name
      });
    } catch (error) {
      this.logger.error('Error setting server name', {
        guildId: guild.id,
        name,
        error
      });
      throw error;
    }
  }

  /**
   * Actualiza la descripción del servidor
   * @param guild - Servidor a actualizar
   * @param description - Nueva descripción del servidor
   * @throws Error si falta el permiso MANAGE_GUILD o los parámetros son inválidos
   */
  async setServerDescription(guild: Guild, description: string): Promise<void> {
    try {
      // Validar parámetros
      if (description === null || description === undefined) {
        const error = new Error('La descripción del servidor no puede ser nula');
        this.logger.error('Validation error setting server description', { description, error });
        throw error;
      }

      if (description.length > 1024) {
        const error = new Error('La descripción del servidor no puede exceder 1024 caracteres');
        this.logger.error('Validation error setting server description', { description, error });
        throw error;
      }

      // Verificar permisos del bot
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar el servidor');
        this.logger.error('Permission error setting server description', { 
          guildId: guild.id, 
          description,
          error 
        });
        throw error;
      }

      // Actualizar la descripción del servidor
      await guild.edit({ description });

      this.logger.info('Server description updated successfully', {
        guildId: guild.id,
        newDescription: description
      });
    } catch (error) {
      this.logger.error('Error setting server description', {
        guildId: guild.id,
        description,
        error
      });
      throw error;
    }
  }

  /**
   * Crea una categoría en el servidor
   * @param guild - Servidor donde crear la categoría
   * @param name - Nombre de la categoría
   * @returns Categoría creada
   * @throws Error si falta el permiso MANAGE_CHANNELS o los parámetros son inválidos
   */
  async createCategory(guild: Guild, name: string): Promise<CategoryChannel> {
    try {
      // Validar parámetros
      if (!name || name.trim().length === 0) {
        const error = new Error('El nombre de la categoría no puede estar vacío');
        this.logger.error('Validation error creating category', { name, error });
        throw error;
      }

      if (name.length > 100) {
        const error = new Error('El nombre de la categoría no puede exceder 100 caracteres');
        this.logger.error('Validation error creating category', { name, error });
        throw error;
      }

      // Verificar permisos del bot
      const botMember = guild.members.me;
      if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        const error = new Error('MISSING_PERMISSIONS: El bot no tiene permiso para gestionar canales');
        this.logger.error('Permission error creating category', { 
          guildId: guild.id, 
          name,
          error 
        });
        throw error;
      }

      // Preparar opciones de creación
      const createOptions: GuildChannelCreateOptions = {
        name,
        type: ChannelType.GuildCategory
      };

      // Crear la categoría
      const category = await guild.channels.create(createOptions);

      this.logger.info('Category created successfully', {
        guildId: guild.id,
        categoryId: category.id,
        categoryName: name
      });

      // Discord.js garantiza que el canal será del tipo especificado en las opciones
      return category as unknown as CategoryChannel;
    } catch (error) {
      this.logger.error('Error creating category', {
        guildId: guild.id,
        name,
        error
      });
      throw error;
    }
  }
}
