import { Client, GatewayIntentBits, Events } from 'discord.js';
import { Config } from '../managers/ConfigManager';
import { Logger } from '../utils/Logger';

/**
 * Interfaz del cliente del bot
 * Gestiona la conexión con Discord y el ciclo de vida del bot
 */
export interface IBotClient {
  /**
   * Inicializa y conecta el bot a Discord
   * @throws Error si la autenticación falla
   */
  start(): Promise<void>;

  /**
   * Desconecta el bot de forma limpia
   */
  stop(): Promise<void>;

  /**
   * Obtiene el cliente de Discord.js
   * @returns Cliente de Discord.js
   */
  getClient(): Client;

  /**
   * Registra un manejador de eventos
   * @param event Nombre del evento
   * @param handler Función manejadora del evento
   */
  on(event: string, handler: Function): void;
}

/**
 * Implementación del cliente del bot de Discord
 * Gestiona la conexión, autenticación y reconexión automática
 */
export class BotClient implements IBotClient {
  private client: Client;
  private config: Config;
  private logger: Logger;
  private isConnected: boolean = false;

  /**
   * Constructor del BotClient
   * @param config Configuración del bot
   * @param logger Sistema de logging
   */
  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Crear cliente de Discord con los intents necesarios
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ]
    });

    // Configurar manejadores de eventos de conexión
    this.setupConnectionHandlers();
  }

  /**
   * Configura los manejadores de eventos de conexión
   */
  private setupConnectionHandlers(): void {
    // Evento cuando el bot se conecta exitosamente
    this.client.on(Events.ClientReady, () => {
      this.isConnected = true;
      this.logger.info('Bot connected successfully', {
        username: this.client.user?.tag,
        userId: this.client.user?.id
      });
    });

    // Evento cuando el bot se desconecta
    this.client.on(Events.ShardDisconnect, (event) => {
      this.isConnected = false;
      this.logger.warn('Bot disconnected', {
        code: event.code,
        reason: event.reason
      });
    });

    // Evento cuando el bot se reconecta
    this.client.on(Events.ShardReconnecting, () => {
      this.logger.info('Bot reconnecting...');
    });

    // Evento cuando el bot se reconecta exitosamente
    this.client.on(Events.ShardResume, () => {
      this.isConnected = true;
      this.logger.info('Bot reconnected successfully');
    });

    // Evento de error
    this.client.on(Events.Error, (error) => {
      this.logger.error('Discord client error', {
        error: error.message,
        stack: error.stack
      });
    });

    // Evento de advertencia
    this.client.on(Events.Warn, (warning) => {
      this.logger.warn('Discord client warning', { warning });
    });
  }

  /**
   * Inicializa y conecta el bot a Discord
   * @throws Error si la autenticación falla
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting bot...');

      // Intentar autenticar con Discord
      await this.client.login(this.config.token);

      // Esperar a que el cliente esté listo
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout: Bot failed to connect within 30 seconds'));
        }, 30000);

        this.client.once(Events.ClientReady, () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client.once(Events.Error, (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.logger.info('Bot started successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to start bot', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      // Limpiar recursos si la conexión falla
      await this.cleanup();

      throw new Error(`Bot authentication failed: ${errorMessage}`);
    }
  }

  /**
   * Desconecta el bot de forma limpia
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping bot...');

      await this.cleanup();

      this.logger.info('Bot stopped successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error stopping bot', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw new Error(`Failed to stop bot: ${errorMessage}`);
    }
  }

  /**
   * Limpia recursos y destruye el cliente
   */
  private async cleanup(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.isConnected = false;
    }
  }

  /**
   * Obtiene el cliente de Discord.js
   * @returns Cliente de Discord.js
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Registra un manejador de eventos
   * @param event Nombre del evento
   * @param handler Función manejadora del evento
   */
  on(event: string, handler: Function): void {
    this.client.on(event, (...args: any[]) => handler(...args));
  }

  /**
   * Verifica si el bot está conectado
   * @returns true si el bot está conectado, false en caso contrario
   */
  isReady(): boolean {
    return this.isConnected && this.client.isReady();
  }
}
