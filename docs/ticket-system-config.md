# Guía de Configuración del Sistema de Tickets

Esta guía explica cómo configurar el sistema de tickets de CIPHER BOT para tu servidor de Discord.

## Tabla de Contenidos

1. [Configuración Básica](#configuración-básica)
2. [Configuración de Categorías](#configuración-de-categorías)
3. [Roles de Staff](#roles-de-staff)
4. [Canales del Sistema](#canales-del-sistema)
5. [Mensajes Personalizados](#mensajes-personalizados)
6. [Cierre Automático](#cierre-automático)
7. [Notificaciones](#notificaciones)
8. [Ejemplo Completo](#ejemplo-completo)

## Configuración Básica

### maxTicketsPerUser

**Tipo:** `number`  
**Requerido:** Sí  
**Valor predeterminado:** `3`

Límite máximo de tickets abiertos simultáneamente por usuario. Esto previene spam y abuso del sistema.

```json
"maxTicketsPerUser": 3
```

**Recomendaciones:**
- Servidores pequeños (< 100 miembros): 2-3 tickets
- Servidores medianos (100-1000 miembros): 3-5 tickets
- Servidores grandes (> 1000 miembros): 5-10 tickets

### closeDelay

**Tipo:** `number`  
**Requerido:** No  
**Valor predeterminado:** `5`  
**Unidad:** Segundos

Tiempo de espera antes de eliminar el canal después de cerrar un ticket. Esto permite a los usuarios leer el mensaje de despedida.

```json
"closeDelay": 5
```

## Configuración de Categorías

Las categorías organizan los tickets por tipo. Cada categoría debe tener su propia categoría de Discord donde se crearán los canales.

### Estructura de una Categoría

```json
"nombre-categoria": {
  "name": "Nombre Visible",
  "discordCategoryId": "ID_DE_CATEGORIA_DISCORD",
  "staffRoles": ["ROL_ID_1", "ROL_ID_2"],
  "emoji": "🔧",
  "description": "Descripción de la categoría"
}
```

### Campos de Categoría

#### name

**Tipo:** `string`  
**Requerido:** Sí

Nombre visible de la categoría que se mostrará en el menú de selección.

#### discordCategoryId

**Tipo:** `string`  
**Requerido:** Sí

ID de la categoría de Discord donde se crearán los canales de tickets de esta categoría.

**Cómo obtener el ID:**
1. Activa el Modo Desarrollador en Discord (Configuración de Usuario > Avanzado > Modo Desarrollador)
2. Haz clic derecho en la categoría de Discord
3. Selecciona "Copiar ID"

#### staffRoles

**Tipo:** `string[]`  
**Requerido:** Sí

Array de IDs de roles que serán mencionados cuando se cree un ticket de esta categoría. Estos roles tendrán acceso automático al ticket.

```json
"staffRoles": [
  "123456789012345678",
  "987654321098765432"
]
```

#### emoji

**Tipo:** `string`  
**Requerido:** Sí

Emoji que se mostrará junto al nombre de la categoría en el menú de selección.

**Emojis recomendados:**
- Soporte Técnico: 🔧, 🛠️, ⚙️
- Ventas: 💰, 💳, 🛒
- Reportes: ⚠️, 🚨, 📢
- Otros: 📋, 📝, ❓

#### description

**Tipo:** `string`  
**Requerido:** Sí

Descripción breve de la categoría que ayuda a los usuarios a seleccionar la correcta.

### Categorías Predeterminadas

El sistema incluye cuatro categorías predeterminadas:

1. **soporte-tecnico**: Para problemas técnicos con el producto
2. **ventas**: Para consultas sobre compras y precios
3. **reportes**: Para reportar problemas o usuarios
4. **otros**: Para consultas generales

Puedes modificar, añadir o eliminar categorías según las necesidades de tu servidor.

## Roles de Staff

### staffRoles (Global)

**Tipo:** `string[]`  
**Requerido:** Sí

Array de IDs de roles que tienen acceso a todos los tickets, independientemente de la categoría.

```json
"staffRoles": [
  "ADMIN_ROLE_ID",
  "MODERATOR_ROLE_ID"
]
```

**Recomendaciones:**
- Incluye roles de administradores y moderadores principales
- Estos roles podrán ver y gestionar todos los tickets
- Los roles específicos de categoría se configuran en cada categoría

### Permisos Requeridos

Los roles de staff deben tener los siguientes permisos en Discord:
- Ver canales
- Enviar mensajes
- Leer historial de mensajes
- Gestionar canales (para cerrar tickets)

## Canales del Sistema

### logChannelId

**Tipo:** `string`  
**Requerido:** Sí

ID del canal donde se registrarán todos los eventos del sistema de tickets (creación, cierre, errores).

```json
"logChannelId": "123456789012345678"
```

**Recomendaciones:**
- Crea un canal privado solo visible para administradores
- Nombre sugerido: `#ticket-logs` o `#logs-tickets`
- Este canal contendrá información sensible, mantenlo privado

### notificationChannelId

**Tipo:** `string`  
**Requerido:** No  
**Valor predeterminado:** `null`

ID del canal donde se enviarán notificaciones cuando se creen nuevos tickets.

```json
"notificationChannelId": "123456789012345678"
```

**Recomendaciones:**
- Útil para servidores con mucho staff
- Permite a todos ver cuando hay nuevos tickets
- Puede ser el mismo canal que logChannelId o uno separado

### transcriptChannelId

**Tipo:** `string`  
**Requerido:** No  
**Valor predeterminado:** `null`

ID del canal donde se enviarán los transcripts de tickets cerrados como archivos adjuntos.

```json
"transcriptChannelId": "123456789012345678"
```

**Recomendaciones:**
- Útil para mantener un archivo de todas las conversaciones
- Los transcripts también se incluyen en los logs
- Mantén este canal privado para proteger información sensible

## Mensajes Personalizados

### welcomeMessage

**Tipo:** `string`  
**Requerido:** No  
**Valor predeterminado:** Mensaje genérico

Mensaje que se envía cuando se crea un nuevo ticket.

```json
"welcomeMessage": "¡Hola! Gracias por crear un ticket. El staff te responderá lo antes posible. Por favor, describe tu consulta de forma clara."
```

**Variables disponibles:**
- `{username}`: Nombre del usuario
- `{category}`: Nombre de la categoría

**Ejemplo con variables:**
```json
"welcomeMessage": "¡Hola {username}! Has creado un ticket en la categoría **{category}**. Nuestro equipo te responderá pronto."
```

### goodbyeMessage

**Tipo:** `string`  
**Requerido:** No  
**Valor predeterminado:** Mensaje genérico

Mensaje que se envía antes de cerrar y eliminar el canal del ticket.

```json
"goodbyeMessage": "🔒 **Ticket Cerrado**\n\nEste ticket ha sido cerrado. El canal será eliminado en unos segundos.\nGracias por usar nuestro sistema de soporte."
```

## Cierre Automático

El sistema puede cerrar automáticamente tickets que han estado inactivos durante un tiempo configurado.

### Configuración de autoClose

```json
"autoClose": {
  "enabled": true,
  "inactivityTime": 60,
  "graceTime": 10
}
```

### enabled

**Tipo:** `boolean`  
**Requerido:** Sí  
**Valor predeterminado:** `false`

Activa o desactiva el cierre automático por inactividad.

### inactivityTime

**Tipo:** `number`  
**Requerido:** Si enabled es true  
**Unidad:** Minutos

Tiempo de inactividad antes de enviar una advertencia de cierre.

**Recomendaciones:**
- Servidores activos: 30-60 minutos
- Servidores con soporte 24/7: 120-180 minutos
- Servidores con horario limitado: 240-480 minutos

### graceTime

**Tipo:** `number`  
**Requerido:** Si enabled es true  
**Unidad:** Minutos

Tiempo de gracia después de la advertencia antes de cerrar automáticamente el ticket.

**Recomendaciones:**
- Mínimo: 5-10 minutos
- Recomendado: 10-30 minutos

### Flujo de Cierre Automático

1. El ticket está inactivo durante `inactivityTime` minutos
2. El sistema envía una advertencia al canal
3. Si no hay actividad durante `graceTime` minutos adicionales
4. El ticket se cierra automáticamente

**Ejemplo:**
- `inactivityTime: 60` + `graceTime: 10` = El ticket se cierra después de 70 minutos de inactividad total

## Notificaciones

### Configuración de notifications

```json
"notifications": {
  "enabled": true,
  "unrespondedTime": 30
}
```

### enabled

**Tipo:** `boolean`  
**Requerido:** Sí  
**Valor predeterminado:** `true`

Activa o desactiva las notificaciones del sistema.

### unrespondedTime

**Tipo:** `number`  
**Requerido:** No  
**Unidad:** Minutos

Tiempo después del cual se notifica sobre tickets sin respuesta del staff.

```json
"unrespondedTime": 30
```

**Recomendaciones:**
- Soporte rápido: 15-30 minutos
- Soporte estándar: 30-60 minutos
- Soporte no urgente: 60-120 minutos

## Ejemplo Completo

```json
{
  "token": "YOUR_BOT_TOKEN_HERE",
  "prefix": "!",
  "logFile": "bot.log",
  "logLevel": "info",
  
  "tickets": {
    "maxTicketsPerUser": 3,
    "staffRoles": [
      "123456789012345678",
      "987654321098765432"
    ],
    "categories": {
      "soporte-tecnico": {
        "name": "Soporte Técnico",
        "discordCategoryId": "111111111111111111",
        "staffRoles": [
          "222222222222222222"
        ],
        "emoji": "🔧",
        "description": "Problemas técnicos con el producto"
      },
      "ventas": {
        "name": "Ventas",
        "discordCategoryId": "333333333333333333",
        "staffRoles": [
          "444444444444444444"
        ],
        "emoji": "💰",
        "description": "Consultas sobre compras y precios"
      },
      "reportes": {
        "name": "Reportes",
        "discordCategoryId": "555555555555555555",
        "staffRoles": [
          "666666666666666666"
        ],
        "emoji": "⚠️",
        "description": "Reportar problemas o usuarios"
      },
      "otros": {
        "name": "Otros",
        "discordCategoryId": "777777777777777777",
        "staffRoles": [
          "123456789012345678"
        ],
        "emoji": "📋",
        "description": "Otras consultas generales"
      }
    },
    "logChannelId": "888888888888888888",
    "notificationChannelId": "999999999999999999",
    "transcriptChannelId": "101010101010101010",
    "closeDelay": 5,
    "welcomeMessage": "¡Hola! Gracias por crear un ticket. El staff te responderá lo antes posible. Por favor, describe tu consulta de forma clara.",
    "goodbyeMessage": "🔒 **Ticket Cerrado**\n\nEste ticket ha sido cerrado. El canal será eliminado en unos segundos.\nGracias por usar nuestro sistema de soporte.",
    "autoClose": {
      "enabled": true,
      "inactivityTime": 60,
      "graceTime": 10
    },
    "notifications": {
      "enabled": true,
      "unrespondedTime": 30
    }
  }
}
```

## Pasos para Configurar

1. **Copia el archivo de ejemplo:**
   ```bash
   cp config.example.json config.json
   ```

2. **Configura el token del bot:**
   - Ve a [Discord Developer Portal](https://discord.com/developers/applications)
   - Crea o selecciona tu aplicación
   - Ve a la sección "Bot"
   - Copia el token y pégalo en `config.json`

3. **Crea las categorías en Discord:**
   - Crea 4 categorías en tu servidor (una para cada tipo de ticket)
   - Copia los IDs de cada categoría
   - Pégalos en la configuración correspondiente

4. **Configura los roles:**
   - Identifica los roles de staff en tu servidor
   - Copia sus IDs
   - Añádelos a `staffRoles` y a las categorías correspondientes

5. **Crea los canales del sistema:**
   - Crea un canal `#ticket-logs` (privado)
   - Opcionalmente, crea `#ticket-notifications` y `#ticket-transcripts`
   - Copia los IDs y pégalos en la configuración

6. **Personaliza los mensajes:**
   - Modifica `welcomeMessage` y `goodbyeMessage` según tu servidor
   - Ajusta los tiempos de cierre automático según tus necesidades

7. **Inicia el bot:**
   ```bash
   npm start
   ```

8. **Crea el panel de tickets:**
   ```
   !ticket-panel #canal-tickets
   ```

## Solución de Problemas

### El bot no crea tickets

- Verifica que el bot tenga permisos de "Gestionar Canales" en las categorías
- Verifica que los IDs de categorías sean correctos
- Revisa los logs en el canal de logs

### Los roles no son mencionados

- Verifica que los IDs de roles sean correctos
- Asegúrate de que los roles sean mencionables en Discord
- Verifica que el bot tenga permiso de "Mencionar Todos los Roles"

### El cierre automático no funciona

- Verifica que `autoClose.enabled` sea `true`
- Revisa los logs para ver si hay errores
- Asegúrate de que el bot esté en línea continuamente

### Los transcripts no se envían

- Verifica que el canal de transcripts exista
- Verifica que el bot tenga permisos de enviar mensajes y archivos
- Revisa los logs para ver errores específicos

## Soporte

Si tienes problemas con la configuración, revisa:
- Los logs del bot en `bot.log`
- Los logs en el canal `#ticket-logs`
- La documentación completa en `README.md`
