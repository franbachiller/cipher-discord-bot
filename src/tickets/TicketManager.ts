import { Client, Guild, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { TicketInfo, TicketCategory, TicketConfig, TicketStatistics } from './types';
import { TicketStorage, ITicketStorage } from './TicketStorage';
import { TranscriptGenerator } from './TranscriptGenerator';
import { LogManager, ILogManager } from './LogManager';
import { NotificationManager, INotificationManager } from './NotificationManager';
import { ChannelManager } from '../managers/ChannelManager';
import { PermissionManager } from '../managers/PermissionManager';
import { Logger } from '../utils/Logger';

/**
 * Interfaz del TicketManager
 */
export interface ITicketManager {
  createTicket(userId: string, guildId: string, category: TicketCategory): Promise<TicketInfo>;
  closeTicket(ticketId: string, closedBy: string, reason?: string): Promise<string>;
  getUserOpenTickets(userId: string): Promise<TicketInfo[]>;
  addUserToTicket(ticketId: string, userId: string): Promise<void>;
  removeUserFromTicket(ticketId: string, userId: string): Promise<void>;
  getStatistics(guildId: string): Promise<TicketStatistics>;
  createCategorySelectMenu(customId: string): ActionRowBuilder<StringSelectMenuBuilder>;
}

/**
 * Gestor principal del sistema de tickets
 * 
 * Orquesta todas las operaciones de tickets, coordinando con otros managers
 * para crear, cerrar y gestionar tickets de forma completa.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.5, 12.4, 12.6
 */
export class TicketManager implements ITicketManager {
  private client: Client;
  private ticketStorage: ITicketStorage;
  private transcriptGenerator: TranscriptGenerator;
  private logManager: ILogManager;
  private notificationManager: INotificationManager;
  private channelManager: ChannelManager;
  private permissionManager: PermissionManager;
  private logger: Logger;
  private config: TicketConfig;

  /**
   * Constructor del TicketManager
   * @param client - Cliente de Discord.js
   * @param ticketStorage - Gestor de persistencia de tickets
   * @param transcriptGenerator - Generador de transcripts
   * @param logManager - Gestor de logs
   * @param notificationManager - Gestor de notificaciones
   * @param channelManager - Gestor de canales
   * @param permissionManager - Gestor de permisos
   * @param logger - Logger para registro de eventos
   * @param config - Configuración del sistema de tickets
   */
  constructor(
    client: Client,
    ticketStorage: ITicketStorage,
    transcriptGenerator: TranscriptGenerator,
    logManager: ILogManager,
    notificationManager: INotificationManager,
    channelManager: ChannelManager,
    permissionManager: PermissionManager,
    logger: Logger,
    config: TicketConfig
  ) {
    this.client = client;
    this.ticketStorage = ticketStorage;
    this.transcriptGenerator = transcriptGenerator;
    this.logManager = logManager;
    this.notificationManager = notificationManager;
    this.channelManager = channelManager;
    this.permissionManager = permissionManager;
    this.logger = logger;
    this.config = config;
  }

  /**
   * Crea un nuevo ticket para un usuario
   * 
   * Valida límites, crea el canal con permisos apropiados, envía mensaje de bienvenida,
   * guarda en storage y registra en logs.
   * 
   * @param userId - ID del usuario que crea el ticket
   * @param guildId - ID del servidor
   * @param category - Categoría del ticket
   * @returns Información del ticket creado
   * @throws Error si el usuario alcanzó el límite de tickets
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.5, 12.4, 12.6
   */
  async createTicket(userId: string, guildId: string, category: TicketCategory): Promise<TicketInfo> {
    this.logger.info('Creating ticket', { userId, guildId, category });

    try {
      // 1. Validar límite de tickets abiertos por usuario (Requirements 3.1, 3.2, 3.3)
      const userTickets = await this.ticketStorage.getUserTickets(userId);
      if (userTickets.length >= this.config.maxTicketsPerUser) {
        const error = new Error(
          `You have reached the limit of ${this.config.maxTicketsPerUser} open tickets. ` +
          `Please close some existing tickets before creating a new one.`
        );
        this.logger.warn('User reached ticket limit', { userId, currentTickets: userTickets.length });
        throw error;
      }

      // Obtener el servidor
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        throw new Error(`Servidor con ID ${guildId} no encontrado`);
      }

      // Obtener el usuario
      const user = await guild.members.fetch(userId);
      if (!user) {
        throw new Error(`Usuario con ID ${userId} no encontrado en el servidor`);
      }

      // 2. Generar nombre de canal único: "ticket-{username}-{número}" (Requirement 1.2)
      const ticketNumber = await this.getNextTicketNumber(userId);
      const channelName = this.formatTicketChannelName(user.user.username, ticketNumber);

      // Obtener configuración de la categoría
      const categoryConfig = this.config.categories[category];
      if (!categoryConfig) {
        throw new Error(`Categoría ${category} no configurada`);
      }

      // Obtener la categoría de Discord
      const discordCategory = await guild.channels.fetch(categoryConfig.discordCategoryId);
      if (!discordCategory || discordCategory.type !== 4) { // 4 = CategoryChannel
        throw new Error(`Categoría de Discord ${categoryConfig.discordCategoryId} no encontrada`);
      }

      // 3. Crear canal en la categoría correcta (Requirement 1.1)
      const channel = await this.channelManager.createTextChannel(guild, channelName, {
        category: discordCategory as any,
        topic: `Ticket de ${categoryConfig.name} - ${user.user.username}`
      });

      // 4. Configurar permisos del canal (Requirements 1.3, 5.1, 5.2, 5.3, 5.5)
      await this.configureChannelPermissions(channel, user.id, guild);

      // 5. Crear información del ticket
      const ticketInfo: TicketInfo = {
        id: channel.id,
        userId: user.id,
        username: user.user.username,
        guildId: guild.id,
        category,
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null,
        closeReason: null,
        ticketNumber,
        additionalUsers: [],
        lastActivity: new Date().toISOString(),
        closedByInactivity: false
      };

      // 6. Enviar mensaje de bienvenida con botón de cerrar (Requirements 1.4, 1.5, 2.4, 15.5)
      await this.sendWelcomeMessage(channel, ticketInfo, categoryConfig);

      // 7. Guardar ticket en storage (Requirement 12.4)
      await this.ticketStorage.saveTicket(ticketInfo);

      // 8. Registrar en logs (Requirement 1.6)
      await this.logManager.logTicketCreation(ticketInfo, this.config.logChannelId);

      // 9. Enviar notificación si está habilitada (Requirements 9.1, 9.2, 9.3, 9.4)
      if (this.config.notifications && this.config.notifications.enabled) {
        await this.notificationManager.notifyNewTicket(ticketInfo, this.config.notifications);
      }

      // 10. Actualizar estadísticas (Requirement 12.6)
      await this.updateStatisticsOnCreate(category);

      this.logger.info('Ticket created successfully', {
        ticketId: ticketInfo.id,
        userId,
        category,
        channelName
      });

      return ticketInfo;
    } catch (error) {
      this.logger.error('Error creating ticket', {
        userId,
        guildId,
        category,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Cierra un ticket existente
   * 
   * Genera transcript, registra en logs, envía mensaje de despedida,
   * espera el tiempo configurado y elimina el canal. Actualiza persistencia
   * y estadísticas.
   * 
   * @param ticketId - ID del ticket a cerrar
   * @param closedBy - ID del usuario que cierra el ticket
   * @param reason - Razón del cierre (opcional)
   * @returns Transcript del ticket
   * @throws Error si el ticket no existe o no se puede cerrar
   * 
   * Requirements: 4.2, 4.3, 4.5, 4.6, 12.5, 12.6
   */
  async closeTicket(ticketId: string, closedBy: string, reason?: string): Promise<string> {
    this.logger.info('Closing ticket', { ticketId, closedBy, reason });

    try {
      // 1. Obtener información del ticket
      const ticketInfo = await this.ticketStorage.getTicket(ticketId);
      if (!ticketInfo) {
        throw new Error(`Ticket con ID ${ticketId} no encontrado`);
      }

      // 2. Obtener el canal
      const channel = await this.client.channels.fetch(ticketId);
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Canal del ticket ${ticketId} no encontrado o no es un canal de texto`);
      }

      // 3. Actualizar información del ticket antes de cerrar (Requirement 12.5)
      const closedAt = new Date().toISOString();
      const updatedTicketInfo: TicketInfo = {
        ...ticketInfo,
        closedAt,
        closedBy,
        closeReason: reason || null
      };

      // 4. Generar transcript usando TranscriptGenerator (Requirement 4.2)
      this.logger.debug('Generating transcript', { ticketId });
      const transcript = await this.transcriptGenerator.generateTranscript(ticketId, updatedTicketInfo);

      // 5. Enviar transcript a logs usando LogManager (Requirement 4.3)
      this.logger.debug('Logging ticket closure', { ticketId });
      await this.logManager.logTicketClosure(
        updatedTicketInfo,
        closedBy,
        transcript,
        this.config.logChannelId
      );

      // 6. Enviar mensaje de despedida (Requirement 4.5)
      const goodbyeMessage = this.config.goodbyeMessage || 
        '🔒 **Ticket Closed**\n\n' +
        'This ticket has been closed. The channel will be deleted in a few seconds.\n' +
        'Thank you for using our support system.';
      
      await (channel as any).send(goodbyeMessage);

      // 7. Actualizar persistencia - eliminar ticket del storage (Requirement 12.5)
      await this.ticketStorage.deleteTicket(ticketId);

      // 8. Actualizar estadísticas (Requirement 12.6)
      await this.updateStatisticsOnClose(ticketInfo, closedAt);

      // 9. Esperar tiempo configurado antes de eliminar canal (Requirement 4.6)
      const closeDelayMs = this.config.closeDelay * 1000;
      this.logger.debug('Waiting before deleting channel', { 
        ticketId, 
        delaySeconds: this.config.closeDelay 
      });
      await new Promise(resolve => setTimeout(resolve, closeDelayMs));

      // 10. Eliminar canal usando ChannelManager (Requirement 4.6)
      this.logger.debug('Deleting channel', { ticketId });
      await this.channelManager.deleteChannel(channel as any);

      this.logger.info('Ticket closed successfully', {
        ticketId,
        closedBy,
        reason,
        transcriptLength: transcript.length
      });

      return transcript;
    } catch (error) {
      this.logger.error('Error closing ticket', {
        ticketId,
        closedBy,
        reason,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Obtiene los tickets abiertos de un usuario
   * @param userId - ID del usuario
   * @returns Array de tickets abiertos
   */
  async getUserOpenTickets(userId: string): Promise<TicketInfo[]> {
    return await this.ticketStorage.getUserTickets(userId);
  }

  /**
   * Obtiene estadísticas de tickets
   * 
   * Delega a TicketStorage para obtener las estadísticas del sistema.
   * 
   * @param guildId - ID del servidor
   * @returns Estadísticas del sistema
   * 
   * Requirements: 10.5
   */
  async getStatistics(guildId: string): Promise<TicketStatistics> {
    this.logger.debug('Getting ticket statistics', { guildId });
    
    try {
      return await this.ticketStorage.getStatistics();
    } catch (error) {
      this.logger.error('Error getting ticket statistics', {
        guildId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Añade un usuario a un ticket existente
   * 
   * Otorga permisos al usuario en el canal del ticket y actualiza
   * la lista de usuarios adicionales en el almacenamiento.
   * 
   * @param ticketId - ID del ticket
   * @param userId - ID del usuario a añadir
   * @throws Error si el ticket no existe o el canal no se encuentra
   * 
   * Requirements: 10.2
   */
  async addUserToTicket(ticketId: string, userId: string): Promise<void> {
    this.logger.info('Adding user to ticket', { ticketId, userId });

    try {
      // 1. Obtener el ticket desde TicketStorage
      const ticket = await this.ticketStorage.getTicket(ticketId);
      if (!ticket) {
        throw new Error(`Ticket con ID ${ticketId} no encontrado`);
      }

      // 2. Obtener el canal de Discord
      const channel = await this.client.channels.fetch(ticketId);
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Canal del ticket ${ticketId} no encontrado o no es un canal de texto`);
      }

      // 3. Otorgar permisos al usuario usando PermissionManager
      await (channel as any).permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      });

      // 4. Añadir userId a additionalUsers del ticket
      if (!ticket.additionalUsers.includes(userId)) {
        ticket.additionalUsers.push(userId);
      }

      // 5. Guardar ticket actualizado en TicketStorage
      await this.ticketStorage.saveTicket(ticket);

      this.logger.info('User added to ticket successfully', { ticketId, userId });
    } catch (error) {
      this.logger.error('Error adding user to ticket', {
        ticketId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Remueve un usuario de un ticket
   * 
   * Revoca los permisos del usuario en el canal del ticket y actualiza
   * la lista de usuarios adicionales en el almacenamiento.
   * 
   * @param ticketId - ID del ticket
   * @param userId - ID del usuario a remover
   * @throws Error si el ticket no existe o el canal no se encuentra
   * 
   * Requirements: 10.3
   */
  async removeUserFromTicket(ticketId: string, userId: string): Promise<void> {
    this.logger.info('Removing user from ticket', { ticketId, userId });

    try {
      // 1. Obtener el ticket desde TicketStorage
      const ticket = await this.ticketStorage.getTicket(ticketId);
      if (!ticket) {
        throw new Error(`Ticket con ID ${ticketId} no encontrado`);
      }

      // 2. Obtener el canal de Discord
      const channel = await this.client.channels.fetch(ticketId);
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Canal del ticket ${ticketId} no encontrado o no es un canal de texto`);
      }

      // 3. Revocar permisos del usuario usando PermissionManager
      await (channel as any).permissionOverwrites.delete(userId);

      // 4. Remover userId de additionalUsers del ticket
      const userIndex = ticket.additionalUsers.indexOf(userId);
      if (userIndex !== -1) {
        ticket.additionalUsers.splice(userIndex, 1);
      }

      // 5. Guardar ticket actualizado en TicketStorage
      await this.ticketStorage.saveTicket(ticket);

      this.logger.info('User removed from ticket successfully', { ticketId, userId });
    } catch (error) {
      this.logger.error('Error removing user from ticket', {
        ticketId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Crea un menú de selección de categorías para tickets
   * 
   * Genera un StringSelectMenu con todas las categorías configuradas,
   * incluyendo nombre, descripción y emoji de cada categoría.
   * 
   * @param customId - ID personalizado para el menú de selección
   * @returns ActionRow con el StringSelectMenu configurado
   * 
   * Requirements: 2.1
   */
  createCategorySelectMenu(customId: string): ActionRowBuilder<StringSelectMenuBuilder> {
    this.logger.debug('Creating category select menu', { customId });

    // Crear opciones del menú a partir de las categorías configuradas
    const options: StringSelectMenuOptionBuilder[] = [];

    // Iterar sobre todas las categorías configuradas
    for (const [categoryKey, categoryConfig] of Object.entries(this.config.categories)) {
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(categoryConfig.name)
        .setValue(categoryKey)
        .setDescription(categoryConfig.description)
        .setEmoji(categoryConfig.emoji);

      options.push(option);
    }

    // Crear el StringSelectMenu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Select a category for your ticket')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options);

    // Crear y retornar el ActionRow
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    this.logger.debug('Category select menu created', { 
      customId, 
      optionsCount: options.length 
    });

    return row;
  }

  /**
   * Formatea el nombre del canal del ticket
   * @param username - Nombre del usuario
   * @param ticketNumber - Número del ticket
   * @returns Nombre formateado del canal
   * @private
   */
  private formatTicketChannelName(username: string, ticketNumber: number): string {
    // Sanitizar el nombre de usuario para que sea válido como nombre de canal
    // Discord permite: a-z, 0-9, guiones
    const sanitizedUsername = username
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `ticket-${sanitizedUsername}-${ticketNumber}`;
  }

  /**
   * Obtiene el siguiente número de ticket para un usuario
   * @param userId - ID del usuario
   * @returns Número del siguiente ticket
   * @private
   */
  private async getNextTicketNumber(userId: string): Promise<number> {
    const userTickets = await this.ticketStorage.getUserTickets(userId);
    
    if (userTickets.length === 0) {
      return 1;
    }

    // Encontrar el número más alto y sumar 1
    const maxNumber = Math.max(...userTickets.map(t => t.ticketNumber));
    return maxNumber + 1;
  }

  /**
   * Configura los permisos del canal del ticket
   * @param channel - Canal del ticket
   * @param userId - ID del usuario creador
   * @param guild - Servidor
   * @private
   * 
   * Requirements: 1.3, 5.1, 5.2, 5.3, 5.5
   */
  private async configureChannelPermissions(
    channel: TextChannel,
    userId: string,
    guild: Guild
  ): Promise<void> {
    // 1. Denegar permisos a @everyone (Requirement 5.1)
    const everyoneRole = guild.roles.everyone;
    await this.permissionManager.setChannelPermissions(channel, everyoneRole, {
      allow: [],
      deny: [PermissionFlagsBits.ViewChannel]
    });

    // 2. Otorgar permisos al usuario creador (Requirement 5.2)
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true
    });

    // 3. Otorgar permisos a roles de staff (Requirement 5.3)
    for (const roleId of this.config.staffRoles) {
      try {
        const role = await guild.roles.fetch(roleId);
        if (role) {
          await this.permissionManager.setChannelPermissions(channel, role, {
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks
            ],
            deny: []
          });
        }
      } catch (error) {
        this.logger.warn('Failed to set permissions for staff role', { roleId, error });
      }
    }

    // 4. Otorgar permisos de gestión al bot (Requirement 5.5)
    const botMember = guild.members.me;
    if (botMember) {
      await channel.permissionOverwrites.edit(botMember.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageChannels: true,
        ManageMessages: true,
        AttachFiles: true,
        EmbedLinks: true
      });
    }
  }

  /**
   * Envía el mensaje de bienvenida al canal del ticket
   * @param channel - Canal del ticket
   * @param ticketInfo - Información del ticket
   * @param categoryConfig - Configuración de la categoría
   * @private
   * 
   * Requirements: 1.4, 1.5, 2.4, 2.5, 15.5
   */
  private async sendWelcomeMessage(
    channel: TextChannel,
    ticketInfo: TicketInfo,
    categoryConfig: any
  ): Promise<void> {
    // Crear embed de bienvenida (Requirements 1.4, 15.5)
    const embed = new EmbedBuilder()
      .setTitle(`🎫 Ticket #${ticketInfo.ticketNumber} - ${categoryConfig.name}`)
      .setDescription(
        this.config.welcomeMessage || 
        `Hello <@${ticketInfo.userId}>! Thank you for creating a ticket.\n\n` +
        `**Category:** ${categoryConfig.name}\n` +
        `**Instructions:**\n` +
        `• Describe your question or issue clearly\n` +
        `• Staff will respond as soon as possible\n` +
        `• You can close the ticket when your issue is resolved using the button below\n\n` +
        `*Please be patient and respectful.*`
      )
      .setColor(0x00AE86)
      .setTimestamp()
      .setFooter({ text: `Ticket ID: ${ticketInfo.id}` });

    // Crear botón de cerrar ticket (Requirement 1.5)
    const closeButton = new ButtonBuilder()
      .setCustomId(`close_ticket_${ticketInfo.id}`)
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(closeButton);

    // Mencionar roles de staff según la categoría (Requirement 2.5)
    let mentionText = '';
    if (categoryConfig.staffRoles && categoryConfig.staffRoles.length > 0) {
      const mentions = categoryConfig.staffRoles.map((roleId: string) => `<@&${roleId}>`).join(' ');
      mentionText = `${mentions} - New ${categoryConfig.name} ticket`;
    }

    // Enviar mensaje
    await channel.send({
      content: mentionText || undefined,
      embeds: [embed],
      components: [row]
    });
  }

  /**
   * Actualiza las estadísticas al crear un ticket
   * @param category - Categoría del ticket creado
   * @private
   * 
   * Requirement: 12.6
   */
  private async updateStatisticsOnCreate(category: TicketCategory): Promise<void> {
    try {
      const stats = await this.ticketStorage.getStatistics();
      
      await this.ticketStorage.updateStatistics({
        totalCreated: stats.totalCreated + 1,
        currentlyOpen: stats.currentlyOpen + 1,
        byCategory: {
          ...stats.byCategory,
          [category]: (stats.byCategory[category] || 0) + 1
        }
      });
    } catch (error) {
      this.logger.error('Failed to update statistics on ticket creation', { category, error });
      // No lanzar error para no interrumpir la creación del ticket
    }
  }

  /**
   * Actualiza las estadísticas al cerrar un ticket
   * @param ticketInfo - Información del ticket cerrado
   * @param closedAt - Timestamp de cierre
   * @private
   * 
   * Requirement: 12.6
   */
  private async updateStatisticsOnClose(ticketInfo: TicketInfo, closedAt: string): Promise<void> {
    try {
      const stats = await this.ticketStorage.getStatistics();
      
      // Calcular tiempo de resolución en minutos
      const createdTime = new Date(ticketInfo.createdAt).getTime();
      const closedTime = new Date(closedAt).getTime();
      const resolutionTimeMinutes = Math.floor((closedTime - createdTime) / 60000);
      
      // Calcular nuevo tiempo promedio de resolución
      const totalClosedAfter = stats.totalClosed + 1;
      const newAverageResolutionTime = Math.floor(
        (stats.averageResolutionTime * stats.totalClosed + resolutionTimeMinutes) / totalClosedAfter
      );
      
      // Verificar si el ticket se cerró hoy
      const today = new Date().toISOString().split('T')[0];
      const closedToday = closedAt.split('T')[0];
      const isClosedToday = today === closedToday;
      
      await this.ticketStorage.updateStatistics({
        totalClosed: totalClosedAfter,
        currentlyOpen: Math.max(0, stats.currentlyOpen - 1),
        closedToday: isClosedToday ? stats.closedToday + 1 : stats.closedToday,
        averageResolutionTime: newAverageResolutionTime
      });
    } catch (error) {
      this.logger.error('Failed to update statistics on ticket closure', { 
        ticketId: ticketInfo.id, 
        error 
      });
      // No lanzar error para no interrumpir el cierre del ticket
    }
  }
}
