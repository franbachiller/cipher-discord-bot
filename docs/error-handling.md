# Guía de Manejo de Errores

Esta guía explica cómo usar el sistema de manejo de errores del bot de Discord.

## Componentes

### BotError

Clase de error personalizada que proporciona información estructurada sobre errores.

```typescript
import { BotError, ErrorCategory } from './utils/BotError';

throw new BotError(
  'Technical message for logs',
  'ERROR_CODE',
  'User-friendly message in Spanish',
  ErrorCategory.VALIDATION,
  { additionalDetails: 'optional' }
);
```

### ErrorCategory

Categorías de errores disponibles:

- `AUTHENTICATION`: Errores de autenticación con Discord API
- `PERMISSION`: Errores de permisos insuficientes
- `VALIDATION`: Errores de validación de parámetros
- `API`: Errores retornados por la API de Discord
- `CONFIGURATION`: Errores de configuración inválida
- `NETWORK`: Errores de conectividad de red

### CommonErrors

Clase con métodos estáticos para crear errores comunes:

```typescript
import { CommonErrors } from './utils/BotError';

// Error de permisos insuficientes
throw CommonErrors.insufficientPermissions(
  ['MANAGE_CHANNELS'],
  ['SEND_MESSAGES']
);

// Error de parámetro faltante
throw CommonErrors.missingParameter('channelName');

// Error de parámetro inválido
throw CommonErrors.invalidParameter(
  'channelName',
  '',
  'no puede estar vacío'
);

// Error de autenticación
throw CommonErrors.authenticationFailed('Invalid token');

// Error de configuración
throw CommonErrors.invalidConfiguration('token', 'cannot be empty');

// Error de Discord API
throw CommonErrors.discordApiError(discordError);

// Error de red
throw CommonErrors.networkError('Connection timeout');

// Error de recurso no encontrado
throw CommonErrors.notFound('Canal', 'general');

// Error interno
throw CommonErrors.internalError(originalError);
```

### ErrorHandler

Manejador centralizado de errores con logging automático:

```typescript
import { ErrorHandler } from './utils/ErrorHandler';
import { Logger } from './utils/Logger';

const logger = new Logger('logs/bot.log', LogLevel.INFO);
const errorHandler = new ErrorHandler(logger);

// En un comando o manager
try {
  await channelManager.createTextChannel(guild, name);
} catch (error) {
  return errorHandler.handleError(error, {
    user: { id: message.author.id, username: message.author.username },
    command: 'createchannel',
    args: ['general', 'text'],
    guildId: guild.id
  });
}
```

## Ejemplos de Uso

### En un Manager

```typescript
import { CommonErrors } from '../utils/BotError';

export class ChannelManager {
  async createTextChannel(guild: Guild, name: string): Promise<TextChannel> {
    // Validar parámetros
    if (!name || name.trim() === '') {
      throw CommonErrors.invalidParameter(
        'name',
        name,
        'no puede estar vacío'
      );
    }

    try {
      const channel = await guild.channels.create({
        name,
        type: ChannelType.GuildText
      });
      return channel;
    } catch (error: any) {
      // Convertir errores de Discord en BotErrors
      if (error.code === 50013) {
        throw CommonErrors.insufficientPermissions(['MANAGE_CHANNELS']);
      }
      throw CommonErrors.discordApiError(error);
    }
  }
}
```

### En un Comando

```typescript
import { Command, CommandContext, CommandResult } from './types';
import { ErrorHandler } from '../utils/ErrorHandler';
import { CommonErrors } from '../utils/BotError';

export class CreateChannelCommand implements Command {
  constructor(
    private channelManager: ChannelManager,
    private errorHandler: ErrorHandler
  ) {}

  async execute(context: CommandContext): Promise<CommandResult> {
    const { message, args, guild } = context;

    // Validar argumentos
    if (args.length < 2) {
      return this.errorHandler.handleMissingParameter('name', {
        user: { id: message.author.id, username: message.author.username },
        command: 'createchannel',
        args
      });
    }

    const [name, type] = args;

    try {
      // Ejecutar operación
      const channel = await this.channelManager.createTextChannel(guild, name);

      return {
        success: true,
        message: `Canal ${channel.name} creado exitosamente.`,
        data: { channelId: channel.id, channelName: channel.name }
      };
    } catch (error) {
      // Manejar error con contexto
      return this.errorHandler.handleError(error, {
        user: { id: message.author.id, username: message.author.username },
        command: 'createchannel',
        args,
        guildId: guild.id
      });
    }
  }
}
```

### Validación de Permisos

```typescript
import { PermissionsBitField } from 'discord.js';
import { CommonErrors } from '../utils/BotError';

function validatePermissions(
  member: GuildMember,
  required: PermissionsBitField[]
): void {
  const missing = required.filter(perm => !member.permissions.has(perm));
  
  if (missing.length > 0) {
    throw CommonErrors.insufficientPermissions(
      missing.map(p => p.toString()),
      member.permissions.toArray()
    );
  }
}
```

## Formato de Respuesta

Todas las respuestas de error siguen este formato consistente:

```typescript
{
  success: false,
  message: "Mensaje amigable para el usuario en español",
  errorCode: "CODIGO_ERROR",
  details: {
    // Información adicional relevante
  }
}
```

## Logging de Errores

Todos los errores se registran automáticamente con:

- Timestamp en formato ISO
- Nivel de error (ERROR o WARN según el tipo)
- Mensaje técnico
- Código de error
- Categoría del error
- Mensaje para el usuario
- Detalles adicionales
- Stack trace
- Contexto (usuario, comando, guild, etc.)

Ejemplo de entrada de log:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "error",
  "message": "User lacks required permissions: MANAGE_CHANNELS",
  "metadata": {
    "name": "BotError",
    "code": "INSUFFICIENT_PERMISSIONS",
    "category": "PERMISSION",
    "userMessage": "No tienes permisos suficientes para ejecutar este comando.",
    "details": {
      "required": ["MANAGE_CHANNELS"],
      "actual": ["SEND_MESSAGES"]
    },
    "stack": "...",
    "context": {
      "user": { "id": "123", "username": "usuario" },
      "command": "createchannel",
      "args": ["general", "text"],
      "guildId": "456"
    }
  }
}
```

## Mejores Prácticas

1. **Usar CommonErrors**: Siempre que sea posible, usar los métodos de `CommonErrors` en lugar de crear `BotError` manualmente.

2. **Proporcionar contexto**: Siempre incluir contexto relevante al manejar errores (usuario, comando, guild, etc.).

3. **Mensajes en español**: Todos los mensajes para usuarios deben estar en español y ser descriptivos.

4. **Validar temprano**: Validar parámetros al inicio de funciones y lanzar errores de validación antes de realizar operaciones.

5. **Convertir errores de Discord**: Siempre convertir errores de Discord API en BotErrors para mantener consistencia.

6. **No exponer detalles técnicos**: Los mensajes de usuario no deben incluir stack traces o detalles técnicos.

7. **Usar ErrorHandler**: Usar `ErrorHandler` en comandos para manejo centralizado con logging automático.

8. **Categorizar correctamente**: Usar la categoría de error apropiada para facilitar el análisis de logs.
