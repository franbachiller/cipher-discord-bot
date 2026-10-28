import { EmbedBuilder, ColorResolvable } from 'discord.js';

/**
 * Helper para mejorar la experiencia de usuario del sistema de tickets
 * 
 * Proporciona métodos para crear mensajes de confirmación, embeds con formato
 * consistente y mensajes de error descriptivos.
 * 
 * Requirements: 15.1, 15.3, 15.4, 15.6
 */
export class TicketUXHelper {
  /**
   * Colores consistentes para diferentes tipos de mensajes
   */
  private static readonly COLORS = {
    SUCCESS: 0x00AE86,    // Verde - Para creación y confirmaciones
    ERROR: 0xE74C3C,      // Rojo - Para errores
    WARNING: 0xF39C12,    // Naranja - Para advertencias
    INFO: 0x3498DB,       // Azul - Para información
    CLOSURE: 0x95A5A6     // Gris - Para cierres
  };

  /**
   * Emojis apropiados para diferentes contextos
   */
  private static readonly EMOJIS = {
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    TICKET: '🎫',
    CLOSE: '🔒',
    STAFF: '👤',
    CATEGORY: '📋',
    TIME: '⏰',
    STATS: '📊'
  };

  /**
   * Crea un mensaje de confirmación de creación de ticket
   * 
   * @param ticketId - ID del ticket creado
   * @param category - Categoría del ticket
   * @returns Mensaje de confirmación formateado
   * 
   * Requirements: 15.3
   */
  static createTicketCreatedConfirmation(ticketId: string, category: string): string {
    return `${this.EMOJIS.SUCCESS} **Ticket creado exitosamente!**\n\n` +
           `${this.EMOJIS.TICKET} Your ticket has been created in <#${ticketId}>.\n` +
           `${this.EMOJIS.CATEGORY} **Category:** ${category}\n\n` +
           `Please go to the channel to describe your inquiry. ` +
           `Staff will respond as soon as possible.`;
  }

  /**
   * Crea un mensaje de confirmación de cierre de ticket
   * 
   * @param ticketNumber - Número del ticket cerrado
   * @returns Mensaje de confirmación formateado
   * 
   * Requirements: 15.3
   */
  static createTicketClosedConfirmation(ticketNumber: number): string {
    return `${this.EMOJIS.SUCCESS} **Ticket #${ticketNumber} closed successfully**\n\n` +
           `${this.EMOJIS.CLOSE} The ticket will be closed in a few seconds.\n` +
           `Thank you for using our support system.`;
  }

  /**
   * Crea un embed de bienvenida para un ticket
   * 
   * @param ticketNumber - Número del ticket
   * @param categoryName - Nombre de la categoría
   * @param userId - ID del usuario que creó el ticket
   * @param customMessage - Mensaje personalizado (opcional)
   * @returns Embed de bienvenida formateado
   * 
   * Requirements: 15.1, 15.6
   */
  static createWelcomeEmbed(
    ticketNumber: number,
    categoryName: string,
    userId: string,
    customMessage?: string
  ): EmbedBuilder {
    const defaultMessage = 
      `Hello <@${userId}>! Thank you for creating a ticket.\n\n` +
      `**Instructions:**\n` +
      `${this.EMOJIS.INFO} Describe your inquiry or problem clearly\n` +
      `${this.EMOJIS.STAFF} Staff will respond as soon as possible\n` +
      `${this.EMOJIS.CLOSE} You can close the ticket when your issue is resolved using the button below\n\n` +
      `*Please be patient and respectful.*`;

    return new EmbedBuilder()
      .setTitle(`${this.EMOJIS.TICKET} Ticket #${ticketNumber} - ${categoryName}`)
      .setDescription(customMessage || defaultMessage)
      .setColor(this.COLORS.SUCCESS as ColorResolvable)
      .setTimestamp()
      .setFooter({ text: 'Sistema de Tickets' });
  }

  /**
   * Crea un embed de estadísticas de tickets
   * 
   * @param stats - Estadísticas del sistema
   * @returns Embed de estadísticas formateado
   * 
   * Requirements: 15.1, 15.6
   */
  static createStatsEmbed(stats: {
    totalCreated: number;
    totalClosed: number;
    currentlyOpen: number;
    closedToday: number;
    averageResolutionTime: number;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`${this.EMOJIS.STATS} Estadísticas de Tickets`)
      .setColor(this.COLORS.INFO as ColorResolvable)
      .addFields(
        {
          name: `${this.EMOJIS.TICKET} Total Creados`,
          value: stats.totalCreated.toString(),
          inline: true
        },
        {
          name: `${this.EMOJIS.SUCCESS} Total Cerrados`,
          value: stats.totalClosed.toString(),
          inline: true
        },
        {
          name: `${this.EMOJIS.INFO} Actualmente Abiertos`,
          value: stats.currentlyOpen.toString(),
          inline: true
        },
        {
          name: `${this.EMOJIS.TIME} Cerrados Hoy`,
          value: stats.closedToday.toString(),
          inline: true
        },
        {
          name: `${this.EMOJIS.TIME} Tiempo Promedio de Resolución`,
          value: `${stats.averageResolutionTime} minutos`,
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Sistema de Tickets' });
  }

  /**
   * Crea un mensaje de error descriptivo y accionable
   * 
   * @param errorType - Tipo de error
   * @param details - Detalles del error
   * @param solution - Solución sugerida
   * @returns Mensaje de error formateado
   * 
   * Requirements: 15.4
   */
  static createErrorMessage(errorType: string, details: string, solution: string): string {
    return `${this.EMOJIS.ERROR} **Error: ${errorType}**\n\n` +
           `**Qué salió mal:**\n${details}\n\n` +
           `**Cómo solucionarlo:**\n${solution}`;
  }

  /**
   * Crea un mensaje de error para límite de tickets alcanzado
   * 
   * @param currentTickets - Número de tickets abiertos actualmente
   * @param maxTickets - Límite máximo de tickets
   * @returns Mensaje de error formateado
   * 
   * Requirements: 15.4
   */
  static createTicketLimitError(currentTickets: number, maxTickets: number): string {
    return this.createErrorMessage(
      'Límite de Tickets Alcanzado',
      `Tienes ${currentTickets} tickets abiertos. El límite es ${maxTickets} tickets por usuario.`,
      `Cierra algunos de tus tickets existentes antes de crear uno nuevo.\n` +
      `Puedes cerrar un ticket usando el botón ${this.EMOJIS.CLOSE} en el canal del ticket.`
    );
  }

  /**
   * Crea un mensaje de error para permisos insuficientes
   * 
   * @param requiredPermission - Permiso requerido
   * @returns Mensaje de error formateado
   * 
   * Requirements: 15.4
   */
  static createPermissionError(requiredPermission: string): string {
    return this.createErrorMessage(
      'Permisos Insuficientes',
      `El bot no tiene el permiso necesario: **${requiredPermission}**`,
      `Contacta a un administrador del servidor para que otorgue los permisos necesarios al bot.\n\n` +
      `**Pasos para el administrador:**\n` +
      `1. Ve a Configuración del Servidor → Roles\n` +
      `2. Selecciona el rol del bot\n` +
      `3. Activa el permiso "${requiredPermission}"`
    );
  }

  /**
   * Crea un mensaje de error para categoría llena
   * 
   * @returns Mensaje de error formateado
   * 
   * Requirements: 15.4
   */
  static createCategoryFullError(): string {
    return this.createErrorMessage(
      'Categoría Llena',
      'La categoría de Discord ha alcanzado el límite de 50 canales.',
      `${this.EMOJIS.INFO} Contacta a un administrador para que limpie tickets antiguos\n` +
      `${this.EMOJIS.INFO} Intenta crear un ticket en otra categoría\n` +
      `${this.EMOJIS.INFO} Espera a que se cierren algunos tickets existentes`
    );
  }

  /**
   * Crea un embed de log de creación de ticket
   * 
   * @param ticketInfo - Información del ticket
   * @returns Embed de log formateado
   * 
   * Requirements: 15.1, 15.6
   */
  static createTicketCreationLogEmbed(ticketInfo: {
    id: string;
    userId: string;
    username: string;
    category: string;
    ticketNumber: number;
    createdAt: string;
  }): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`${this.EMOJIS.TICKET} Ticket Creado`)
      .setColor(this.COLORS.SUCCESS as ColorResolvable)
      .addFields(
        {
          name: `${this.EMOJIS.TICKET} Número de Ticket`,
          value: `#${ticketInfo.ticketNumber}`,
          inline: true
        },
        {
          name: `${this.EMOJIS.STAFF} Usuario`,
          value: `<@${ticketInfo.userId}> (${ticketInfo.username})`,
          inline: true
        },
        {
          name: `${this.EMOJIS.CATEGORY} Categoría`,
          value: ticketInfo.category,
          inline: true
        },
        {
          name: `${this.EMOJIS.INFO} Canal`,
          value: `<#${ticketInfo.id}>`,
          inline: true
        },
        {
          name: `${this.EMOJIS.TIME} Creado`,
          value: `<t:${Math.floor(new Date(ticketInfo.createdAt).getTime() / 1000)}:F>`,
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ text: `Ticket ID: ${ticketInfo.id}` });
  }

  /**
   * Crea un embed de log de cierre de ticket
   * 
   * @param ticketInfo - Información del ticket
   * @param closedBy - Usuario que cerró el ticket
   * @param duration - Duración del ticket en minutos
   * @param messageCount - Número de mensajes en el ticket
   * @returns Embed de log formateado
   * 
   * Requirements: 15.1, 15.6
   */
  static createTicketClosureLogEmbed(
    ticketInfo: {
      id: string;
      userId: string;
      username: string;
      category: string;
      ticketNumber: number;
      createdAt: string;
      closedAt: string;
      closeReason?: string;
    },
    closedBy: string,
    duration: number,
    messageCount: number
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle(`${this.EMOJIS.CLOSE} Ticket Cerrado`)
      .setColor(this.COLORS.CLOSURE as ColorResolvable)
      .addFields(
        {
          name: `${this.EMOJIS.TICKET} Número de Ticket`,
          value: `#${ticketInfo.ticketNumber}`,
          inline: true
        },
        {
          name: `${this.EMOJIS.STAFF} Usuario`,
          value: `<@${ticketInfo.userId}> (${ticketInfo.username})`,
          inline: true
        },
        {
          name: `${this.EMOJIS.CATEGORY} Categoría`,
          value: ticketInfo.category,
          inline: true
        },
        {
          name: `${this.EMOJIS.STAFF} Cerrado Por`,
          value: `<@${closedBy}>`,
          inline: true
        },
        {
          name: `${this.EMOJIS.TIME} Duración`,
          value: `${duration} minutos`,
          inline: true
        },
        {
          name: `${this.EMOJIS.INFO} Mensajes`,
          value: messageCount.toString(),
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ text: `Ticket ID: ${ticketInfo.id}` });

    if (ticketInfo.closeReason) {
      embed.addFields({
        name: `${this.EMOJIS.INFO} Razón de Cierre`,
        value: ticketInfo.closeReason,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Crea un mensaje de advertencia de inactividad
   * 
   * @param inactivityMinutes - Minutos de inactividad
   * @param graceMinutes - Minutos de gracia antes del cierre
   * @returns Mensaje de advertencia formateado
   * 
   * Requirements: 15.1, 15.6
   */
  static createInactivityWarning(inactivityMinutes: number, graceMinutes: number): string {
    return `${this.EMOJIS.WARNING} **Advertencia de Inactividad**\n\n` +
           `${this.EMOJIS.TIME} Este ticket ha estado inactivo durante **${inactivityMinutes} minutos**.\n\n` +
           `If there is no activity in the next **${graceMinutes} minutes**, ` +
           `the ticket will be closed automatically.\n\n` +
           `${this.EMOJIS.INFO} *If you still need help, please send a message in this channel.*`;
  }

  /**
   * Crea un mensaje de despedida para el cierre de ticket
   * 
   * @param customMessage - Mensaje personalizado (opcional)
   * @returns Mensaje de despedida formateado
   * 
   * Requirements: 15.1, 15.6
   */
  static createGoodbyeMessage(customMessage?: string): string {
    const defaultMessage = 
      `${this.EMOJIS.CLOSE} **Ticket Closed**\n\n` +
      `This ticket has been closed. The channel will be deleted in a few seconds.\n` +
      `${this.EMOJIS.SUCCESS} Thank you for using our support system.`;

    return customMessage || defaultMessage;
  }

  /**
   * Obtiene el color apropiado para un tipo de mensaje
   * 
   * @param type - Tipo de mensaje
   * @returns Color en formato hexadecimal
   */
  static getColor(type: 'success' | 'error' | 'warning' | 'info' | 'closure'): number {
    const colorMap = {
      success: this.COLORS.SUCCESS,
      error: this.COLORS.ERROR,
      warning: this.COLORS.WARNING,
      info: this.COLORS.INFO,
      closure: this.COLORS.CLOSURE
    };

    return colorMap[type];
  }

  /**
   * Obtiene el emoji apropiado para un contexto
   * 
   * @param context - Contexto del emoji
   * @returns Emoji
   */
  static getEmoji(context: keyof typeof TicketUXHelper.EMOJIS): string {
    return this.EMOJIS[context];
  }
}

