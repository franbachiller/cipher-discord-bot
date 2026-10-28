import { 
  Client, 
  Interaction, 
  ButtonInteraction, 
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalActionRowComponentBuilder
} from 'discord.js';
import { ITicketManager } from './TicketManager';
import { TicketCategory } from './types';
import { Logger } from '../utils/Logger';

/**
 * Manejadores de interacciones para el sistema de tickets
 * 
 * Gestiona las interacciones de botones y menús de selección relacionados
 * con la creación y cierre de tickets.
 * 
 * Requirements: 1.1, 2.1, 2.3, 4.1
 */
export class InteractionHandlers {
  private client: Client;
  private ticketManager: ITicketManager;
  private logger: Logger;

  /**
   * Constructor de InteractionHandlers
   * @param client - Cliente de Discord.js
   * @param ticketManager - Gestor de tickets
   * @param logger - Sistema de logging
   */
  constructor(client: Client, ticketManager: ITicketManager, logger: Logger) {
    this.client = client;
    this.ticketManager = ticketManager;
    this.logger = logger;
  }

  /**
   * Registra todos los manejadores de interacciones
   * 
   * Escucha el evento interactionCreate y delega a los manejadores específicos
   * según el tipo de interacción.
   */
  registerHandlers(): void {
    this.client.on('interactionCreate', async (interaction: Interaction) => {
      try {
        if (interaction.isButton()) {
          await this.handleButtonInteraction(interaction);
        } else if (interaction.isStringSelectMenu()) {
          await this.handleSelectMenuInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
          await this.handleModalSubmit(interaction);
        }
      } catch (error) {
        this.logger.error('Error handling interaction', {
          interactionId: interaction.id,
          type: interaction.type,
          error: error instanceof Error ? error.message : String(error)
        });

        // Intentar responder con mensaje de error al usuario
        try {
          const errorMessage = '❌ An error occurred while processing your request. Please try again.';
          
          if (interaction.isRepliable()) {
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
              await interaction.reply({ content: errorMessage, ephemeral: true });
            }
          }
        } catch (replyError) {
          this.logger.error('Failed to send error message to user', { replyError });
        }
      }
    });

    this.logger.info('Interaction handlers registered');
  }

  /**
   * Maneja interacciones de botones
   * 
   * Filtra por customId y delega al manejador apropiado:
   * - ticket_create: Muestra menú de selección de categorías
   * - close_ticket_*: Muestra modal de confirmación de cierre
   * 
   * @param interaction - Interacción de botón
   * 
   * Requirements: 1.1, 2.1, 4.1
   */
  private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const { customId } = interaction;

    this.logger.debug('Button interaction received', {
      customId,
      userId: interaction.user.id,
      guildId: interaction.guildId
    });

    // Manejador para botón de crear ticket (Requirement 1.1, 2.1)
    if (customId === 'ticket_create') {
      await this.handleCreateTicketButton(interaction);
      return;
    }

    // Manejador para botón de compra de licencia
    if (customId === 'create_ticket_purchase') {
      await this.handlePurchaseTicketButton(interaction);
      return;
    }

    // Manejador para botón de cerrar ticket (Requirement 4.1)
    if (customId.startsWith('close_ticket_')) {
      await this.handleCloseTicketButton(interaction);
      return;
    }

    this.logger.warn('Unknown button interaction', { customId });
  }

  private async handlePurchaseTicketButton(interaction: ButtonInteraction): Promise<void> {
    this.logger.info('Purchase ticket button clicked', {
      userId: interaction.user.id,
      guildId: interaction.guildId
    });

    try {
      // Diferir la respuesta ya que crear el ticket puede tomar tiempo
      await interaction.deferReply({ ephemeral: true });

      // Crear el ticket directamente en la categoría de ventas
      const ticketInfo = await this.ticketManager.createTicket(
        interaction.user.id,
        interaction.guildId!,
        TicketCategory.SALES
      );

      // Responder con éxito
      await interaction.editReply({
        content: `✅ **Purchase ticket created successfully!**\n\n` +
                 `Your purchase ticket has been created in <#${ticketInfo.id}>.\n` +
                 `A member of our sales team will assist you immediately.`
      });

      this.logger.info('Purchase ticket created successfully', {
        ticketId: ticketInfo.id,
        userId: interaction.user.id
      });
    } catch (error) {
      this.logger.error('Error creating purchase ticket', {
        userId: interaction.user.id,
        error: error instanceof Error ? error.message : String(error)
      });

      // Responder con mensaje de error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      await interaction.editReply({
        content: `❌ **No se pudo crear el ticket de compra**\n\n${errorMessage}`
      });
    }
  }

  /**
   * Maneja el botón de crear ticket
   * 
   * Muestra un menú de selección con las categorías disponibles para que
   * el usuario elija el tipo de ticket que desea crear.
   * 
   * @param interaction - Interacción de botón
   * 
   * Requirements: 1.1, 2.1
   */
  private async handleCreateTicketButton(interaction: ButtonInteraction): Promise<void> {
    this.logger.info('Create ticket button clicked', {
      userId: interaction.user.id,
      guildId: interaction.guildId
    });

    try {
      // Crear menú de selección de categorías usando TicketManager
      const categoryMenu = this.ticketManager.createCategorySelectMenu('ticket_category_select');

      // Responder con el menú de selección (efímero para que solo el usuario lo vea)
      await interaction.reply({
        content: '📋 **Select a category for your ticket:**',
        components: [categoryMenu],
        ephemeral: true
      });

      this.logger.debug('Category selection menu sent', {
        userId: interaction.user.id
      });
    } catch (error) {
      this.logger.error('Error showing category menu', {
        userId: interaction.user.id,
        error: error instanceof Error ? error.message : String(error)
      });

      await interaction.reply({
        content: '❌ Could not display the category menu. Please contact an administrator.',
        ephemeral: true
      });
    }
  }

  /**
   * Maneja el botón de cerrar ticket
   * 
   * Muestra un modal de confirmación antes de cerrar el ticket para evitar
   * cierres accidentales.
   * 
   * @param interaction - Interacción de botón
   * 
   * Requirements: 4.1
   */
  private async handleCloseTicketButton(interaction: ButtonInteraction): Promise<void> {
    // Extraer el ID del ticket del customId
    const ticketId = interaction.customId.replace('close_ticket_', '');

    this.logger.info('Close ticket button clicked', {
      ticketId,
      userId: interaction.user.id,
      guildId: interaction.guildId
    });

    try {
      // Crear modal de confirmación
      const modal = new ModalBuilder()
        .setCustomId(`confirm_close_${ticketId}`)
        .setTitle('Confirmar Cierre de Ticket');

      // Campo de razón de cierre (opcional)
      const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('Razón del cierre (opcional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ej: Problema resuelto, consulta respondida, etc.')
        .setRequired(false)
        .setMaxLength(500);

      const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
        .addComponents(reasonInput);

      modal.addComponents(actionRow);

      // Mostrar modal
      await interaction.showModal(modal);

      this.logger.debug('Close confirmation modal shown', {
        ticketId,
        userId: interaction.user.id
      });
    } catch (error) {
      this.logger.error('Error showing close confirmation modal', {
        ticketId,
        userId: interaction.user.id,
        error: error instanceof Error ? error.message : String(error)
      });

      await interaction.reply({
        content: '❌ Could not display the confirmation form. Please try again.',
        ephemeral: true
      });
    }
  }

  /**
   * Maneja interacciones de menús de selección
   * 
   * Filtra por customId y delega al manejador apropiado:
   * - ticket_category_select: Crea el ticket con la categoría seleccionada
   * 
   * @param interaction - Interacción de menú de selección
   * 
   * Requirements: 2.1, 2.3
   */
  private async handleSelectMenuInteraction(interaction: StringSelectMenuInteraction): Promise<void> {
    const { customId } = interaction;

    this.logger.debug('Select menu interaction received', {
      customId,
      userId: interaction.user.id,
      guildId: interaction.guildId
    });

    // Manejador para selección de categoría (Requirements 2.1, 2.3)
    if (customId === 'ticket_category_select') {
      await this.handleCategorySelection(interaction);
      return;
    }

    this.logger.warn('Unknown select menu interaction', { customId });
  }

  /**
   * Maneja la selección de categoría de ticket
   * 
   * Extrae la categoría seleccionada del menú y llama a TicketManager.createTicket
   * para crear el ticket en la categoría apropiada.
   * 
   * @param interaction - Interacción de menú de selección
   * 
   * Requirements: 2.1, 2.3
   */
  private async handleCategorySelection(interaction: StringSelectMenuInteraction): Promise<void> {
    const selectedCategory = interaction.values[0] as TicketCategory;

    this.logger.info('Category selected', {
      category: selectedCategory,
      userId: interaction.user.id,
      guildId: interaction.guildId
    });

    try {
      // Diferir la respuesta ya que crear el ticket puede tomar tiempo
      await interaction.deferReply({ ephemeral: true });

      // Crear el ticket usando TicketManager
      const ticketInfo = await this.ticketManager.createTicket(
        interaction.user.id,
        interaction.guildId!,
        selectedCategory
      );

      // Responder con éxito
      await interaction.editReply({
        content: `✅ **Ticket created successfully!**\n\n` +
                 `Your ticket has been created in <#${ticketInfo.id}>.\n` +
                 `Please go to the channel to describe your inquiry.`
      });

      this.logger.info('Ticket created successfully via interaction', {
        ticketId: ticketInfo.id,
        category: selectedCategory,
        userId: interaction.user.id
      });
    } catch (error) {
      this.logger.error('Error creating ticket from category selection', {
        category: selectedCategory,
        userId: interaction.user.id,
        error: error instanceof Error ? error.message : String(error)
      });

      // Responder con mensaje de error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      await interaction.editReply({
        content: `❌ **No se pudo crear el ticket**\n\n${errorMessage}`
      });
    }
  }

  /**
   * Maneja el envío de modales
   * 
   * Procesa la confirmación de cierre de ticket cuando el usuario
   * envía el modal con la razón de cierre.
   * 
   * @param interaction - Interacción de modal
   * 
   * Requirements: 4.1
   */
  private async handleModalSubmit(interaction: any): Promise<void> {
    const { customId } = interaction;

    this.logger.debug('Modal submit received', {
      customId,
      userId: interaction.user.id,
      guildId: interaction.guildId
    });

    // Manejador para confirmación de cierre (Requirement 4.1)
    if (customId.startsWith('confirm_close_')) {
      await this.handleCloseConfirmation(interaction);
      return;
    }

    this.logger.warn('Unknown modal submit', { customId });
  }

  /**
   * Maneja la confirmación de cierre de ticket
   * 
   * Extrae la razón de cierre del modal y llama a TicketManager.closeTicket
   * para cerrar el ticket.
   * 
   * @param interaction - Interacción de modal
   * 
   * Requirements: 4.1
   */
  private async handleCloseConfirmation(interaction: any): Promise<void> {
    // Extraer el ID del ticket del customId
    const ticketId = interaction.customId.replace('confirm_close_', '');
    
    // Obtener la razón de cierre del modal
    const closeReason = interaction.fields.getTextInputValue('close_reason') || undefined;

    this.logger.info('Close ticket confirmed', {
      ticketId,
      userId: interaction.user.id,
      hasReason: !!closeReason
    });

    try {
      // Diferir la respuesta ya que cerrar el ticket puede tomar tiempo
      await interaction.deferReply({ ephemeral: true });

      // Cerrar el ticket usando TicketManager
      await this.ticketManager.closeTicket(
        ticketId,
        interaction.user.id,
        closeReason
      );

      // Responder con éxito
      await interaction.editReply({
        content: '✅ **Ticket closed successfully**\n\n' +
                 'The ticket will be closed in a few seconds. Thank you for using our support system.'
      });

      this.logger.info('Ticket closed successfully via interaction', {
        ticketId,
        closedBy: interaction.user.id,
        reason: closeReason
      });
    } catch (error) {
      this.logger.error('Error closing ticket from confirmation', {
        ticketId,
        userId: interaction.user.id,
        error: error instanceof Error ? error.message : String(error)
      });

      // Responder con mensaje de error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      await interaction.editReply({
        content: `❌ **No se pudo cerrar el ticket**\n\n${errorMessage}`
      });
    }
  }
}

