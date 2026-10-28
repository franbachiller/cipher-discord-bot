import { TicketConfig, TicketCategory, CategoryConfig, AutoCloseConfig, NotificationConfig } from './types';
import { Logger } from '../utils/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Gestor de configuración del sistema de tickets
 * 
 * Carga, valida y proporciona acceso a la configuración del sistema de tickets.
 * Incluye valores predeterminados razonables para todas las opciones.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.5, 13.6
 */
export class TicketConfigManager {
  private logger: Logger;
  private config: TicketConfig | null = null;
  private configFilePath: string;

  /**
   * Constructor del TicketConfigManager
   * @param logger - Sistema de logging
   * @param configFilePath - Ruta al archivo de configuración (por defecto: 'config.json')
   */
  constructor(logger: Logger, configFilePath: string = 'config.json') {
    this.logger = logger;
    this.configFilePath = configFilePath;
  }

  /**
   * Carga la configuración desde el archivo
   * 
   * Lee el archivo de configuración, valida su contenido y aplica valores
   * predeterminados para opciones no especificadas.
   * 
   * @returns Configuración del sistema de tickets
   * @throws Error si la configuración es inválida
   * 
   * Requirements: 13.1, 13.5, 13.6
   */
  async load(): Promise<TicketConfig> {
    this.logger.info('Loading ticket system configuration', {
      configFile: this.configFilePath
    });

    try {
      // Leer el archivo de configuración (Requirement 13.1)
      const configData = await fs.readFile(this.configFilePath, 'utf-8');
      const fullConfig = JSON.parse(configData);

      // Extraer la sección de tickets
      const ticketsConfig = fullConfig.tickets;

      if (!ticketsConfig) {
        this.logger.warn('No tickets section in config, using defaults');
        this.config = this.getDefaultConfig();
        return this.config;
      }

      // Construir configuración con valores predeterminados (Requirement 13.6)
      this.config = this.buildConfigWithDefaults(ticketsConfig);

      // Validar la configuración (Requirement 13.5)
      await this.validateConfig(this.config);

      this.logger.info('Ticket system configuration loaded successfully', {
        maxTicketsPerUser: this.config.maxTicketsPerUser,
        categoriesCount: Object.keys(this.config.categories).length,
        autoCloseEnabled: this.config.autoClose?.enabled || false
      });

      return this.config;
    } catch (error) {
      this.logger.error('Failed to load ticket system configuration', {
        error: error instanceof Error ? error.message : String(error),
        configFile: this.configFilePath
      });

      // Si falla la carga, usar configuración predeterminada
      this.logger.warn('Using default configuration due to load failure');
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  /**
   * Construye la configuración aplicando valores predeterminados
   * 
   * @param ticketsConfig - Configuración parcial desde el archivo
   * @returns Configuración completa con valores predeterminados
   * 
   * Requirements: 13.6
   */
  private buildConfigWithDefaults(ticketsConfig: any): TicketConfig {
    const defaults = this.getDefaultConfig();

    return {
      maxTicketsPerUser: ticketsConfig.maxTicketsPerUser ?? defaults.maxTicketsPerUser,
      staffRoles: ticketsConfig.staffRoles ?? defaults.staffRoles,
      categories: this.buildCategoriesConfig(ticketsConfig.categories),
      logChannelId: ticketsConfig.logChannelId ?? defaults.logChannelId,
      notificationChannelId: ticketsConfig.notificationChannelId,
      transcriptChannelId: ticketsConfig.transcriptChannelId,
      closeDelay: ticketsConfig.closeDelay ?? defaults.closeDelay,
      welcomeMessage: ticketsConfig.welcomeMessage,
      goodbyeMessage: ticketsConfig.goodbyeMessage,
      autoClose: this.buildAutoCloseConfig(ticketsConfig.autoClose),
      notifications: this.buildNotificationConfig(ticketsConfig.notifications)
    };
  }

  /**
   * Construye la configuración de categorías con valores predeterminados
   * 
   * @param categoriesConfig - Configuración de categorías desde el archivo
   * @returns Configuración completa de categorías
   * 
   * Requirements: 13.2, 13.6
   */
  private buildCategoriesConfig(categoriesConfig: any): Record<TicketCategory, CategoryConfig> {
    const defaults = this.getDefaultConfig().categories;

    if (!categoriesConfig) {
      return defaults;
    }

    const result: Record<TicketCategory, CategoryConfig> = {} as any;

    // Procesar cada categoría
    for (const category of Object.values(TicketCategory)) {
      const categoryData = categoriesConfig[category];
      const defaultCategory = defaults[category];

      if (categoryData) {
        result[category] = {
          name: categoryData.name ?? defaultCategory.name,
          discordCategoryId: categoryData.discordCategoryId ?? defaultCategory.discordCategoryId,
          staffRoles: categoryData.staffRoles ?? defaultCategory.staffRoles,
          emoji: categoryData.emoji ?? defaultCategory.emoji,
          description: categoryData.description ?? defaultCategory.description
        };
      } else {
        result[category] = defaultCategory;
      }
    }

    return result;
  }

  /**
   * Construye la configuración de cierre automático con valores predeterminados
   * 
   * @param autoCloseConfig - Configuración de cierre automático desde el archivo
   * @returns Configuración completa de cierre automático
   * 
   * Requirements: 13.3, 13.6
   */
  private buildAutoCloseConfig(autoCloseConfig: any): AutoCloseConfig {
    const defaults: AutoCloseConfig = {
      enabled: false,
      inactivityTime: 60, // 60 minutos
      graceTime: 10 // 10 minutos
    };

    if (!autoCloseConfig) {
      return defaults;
    }

    return {
      enabled: autoCloseConfig.enabled ?? defaults.enabled,
      inactivityTime: autoCloseConfig.inactivityTime ?? defaults.inactivityTime,
      graceTime: autoCloseConfig.graceTime ?? defaults.graceTime
    };
  }

  /**
   * Construye la configuración de notificaciones con valores predeterminados
   * 
   * @param notificationConfig - Configuración de notificaciones desde el archivo
   * @returns Configuración completa de notificaciones
   * 
   * Requirements: 13.3, 13.6
   */
  private buildNotificationConfig(notificationConfig: any): NotificationConfig {
    const defaults: NotificationConfig = {
      enabled: true,
      unrespondedTime: 30 // 30 minutos
    };

    if (!notificationConfig) {
      return defaults;
    }

    return {
      enabled: notificationConfig.enabled ?? defaults.enabled,
      unrespondedTime: notificationConfig.unrespondedTime ?? defaults.unrespondedTime
    };
  }

  /**
   * Valida la configuración cargada
   * 
   * Verifica que todos los valores requeridos estén presentes y sean válidos.
   * Notifica errores de configuración al administrador.
   * 
   * @param config - Configuración a validar
   * @throws Error si la configuración es inválida
   * 
   * Requirements: 13.5
   */
  private async validateConfig(config: TicketConfig): Promise<void> {
    const errors: string[] = [];

    // Validar límite de tickets por usuario
    if (config.maxTicketsPerUser < 1 || config.maxTicketsPerUser > 10) {
      errors.push('maxTicketsPerUser debe estar entre 1 y 10');
    }

    // Validar que hay al menos un rol de staff
    if (!config.staffRoles || config.staffRoles.length === 0) {
      errors.push('Debe configurar al menos un rol de staff');
    }

    // Validar canal de logs
    if (!config.logChannelId) {
      errors.push('logChannelId es requerido');
    }

    // Validar categorías
    for (const [categoryKey, categoryConfig] of Object.entries(config.categories)) {
      if (!categoryConfig.discordCategoryId) {
        errors.push(`Categoría ${categoryKey}: discordCategoryId es requerido`);
      }

      if (!categoryConfig.name) {
        errors.push(`Categoría ${categoryKey}: name es requerido`);
      }
    }

    // Validar tiempo de cierre
    if (config.closeDelay < 0 || config.closeDelay > 60) {
      errors.push('closeDelay debe estar entre 0 y 60 segundos');
    }

    // Validar configuración de cierre automático
    if (config.autoClose && config.autoClose.enabled) {
      if (config.autoClose.inactivityTime < 5) {
        errors.push('autoClose.inactivityTime debe ser al menos 5 minutos');
      }

      if (config.autoClose.graceTime < 1) {
        errors.push('autoClose.graceTime debe ser al menos 1 minuto');
      }
    }

    // Si hay errores, registrarlos y lanzar excepción
    if (errors.length > 0) {
      const errorMessage = 'Configuración del sistema de tickets inválida:\n' + 
                          errors.map(e => `  - ${e}`).join('\n');
      
      this.logger.error('Invalid ticket system configuration', {
        errors,
        configFile: this.configFilePath
      });

      throw new Error(errorMessage);
    }

    this.logger.info('Ticket system configuration validated successfully');
  }

  /**
   * Obtiene la configuración predeterminada
   * 
   * Proporciona valores predeterminados razonables para todas las opciones
   * de configuración del sistema de tickets.
   * 
   * @returns Configuración predeterminada
   * 
   * Requirements: 13.6
   */
  private getDefaultConfig(): TicketConfig {
    return {
      maxTicketsPerUser: 3,
      staffRoles: [],
      categories: {
        [TicketCategory.TECHNICAL_SUPPORT]: {
          name: 'Soporte Técnico',
          discordCategoryId: '',
          staffRoles: [],
          emoji: '🔧',
          description: 'Problemas técnicos con el producto'
        },
        [TicketCategory.SALES]: {
          name: 'Ventas',
          discordCategoryId: '',
          staffRoles: [],
          emoji: '💰',
          description: 'Consultas sobre compras y precios'
        },
        [TicketCategory.REPORTS]: {
          name: 'Reportes',
          discordCategoryId: '',
          staffRoles: [],
          emoji: '⚠️',
          description: 'Reportar problemas o usuarios'
        },
        [TicketCategory.OTHER]: {
          name: 'Otros',
          discordCategoryId: '',
          staffRoles: [],
          emoji: '📋',
          description: 'Otras consultas generales'
        }
      },
      logChannelId: '',
      closeDelay: 5,
      autoClose: {
        enabled: false,
        inactivityTime: 60,
        graceTime: 10
      },
      notifications: {
        enabled: true,
        unrespondedTime: 30
      }
    };
  }

  /**
   * Obtiene la configuración actual
   * 
   * @returns Configuración del sistema de tickets
   * @throws Error si la configuración no ha sido cargada
   */
  getConfig(): TicketConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }

    return this.config;
  }

  /**
   * Verifica si la configuración ha sido cargada
   * 
   * @returns true si la configuración está cargada
   */
  isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Recarga la configuración desde el archivo
   * 
   * @returns Configuración actualizada
   */
  async reload(): Promise<TicketConfig> {
    this.logger.info('Reloading ticket system configuration');
    this.config = null;
    return await this.load();
  }

  /**
   * Obtiene una categoría específica de la configuración
   * 
   * @param category - Categoría a obtener
   * @returns Configuración de la categoría
   * @throws Error si la configuración no está cargada o la categoría no existe
   */
  getCategoryConfig(category: TicketCategory): CategoryConfig {
    const config = this.getConfig();
    const categoryConfig = config.categories[category];

    if (!categoryConfig) {
      throw new Error(`Category ${category} not found in configuration`);
    }

    return categoryConfig;
  }

  /**
   * Verifica si el cierre automático está habilitado
   * 
   * @returns true si el cierre automático está habilitado
   */
  isAutoCloseEnabled(): boolean {
    const config = this.getConfig();
    return config.autoClose?.enabled ?? false;
  }

  /**
   * Verifica si las notificaciones están habilitadas
   * 
   * @returns true si las notificaciones están habilitadas
   */
  areNotificationsEnabled(): boolean {
    const config = this.getConfig();
    return config.notifications?.enabled ?? true;
  }
}

