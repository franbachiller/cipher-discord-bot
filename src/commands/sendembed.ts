import { PermissionFlagsBits, EmbedBuilder, ColorResolvable, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command, CommandContext, CommandResult } from './types';
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

function getButtonStyle(style: string): ButtonStyle {
  const styleMap: Record<string, ButtonStyle> = {
    'PRIMARY': ButtonStyle.Primary,
    'SECONDARY': ButtonStyle.Secondary,
    'SUCCESS': ButtonStyle.Success,
    'DANGER': ButtonStyle.Danger,
    'LINK': ButtonStyle.Link
  };
  
  return styleMap[style.toUpperCase()] || ButtonStyle.Primary;
}

export function sendEmbedCommand(logger: Logger): Command {
  return {
    name: 'sendembed',
    description: 'Envía un mensaje embebido desde un archivo JSON',
    usage: '!sendembed <archivo.json> [#canal]',
    category: 'Mensajes',
    requiredPermissions: [PermissionFlagsBits.SendMessages],
    
    async execute(context: CommandContext): Promise<CommandResult> {
      const { args, message, guild } = context;

      // Validar argumentos
      if (args.length < 1) {
        return {
          success: false,
          message: 'Uso incorrecto. Sintaxis: `!sendembed <archivo.json> [#canal]`\nEjemplo: `!sendembed welcome.json #announcements`'
        };
      }

      const fileName = args[0];
      const channelMention = args[1];

      // Determinar el canal de destino
      let targetChannel = message.channel;
      if (channelMention) {
        const channelId = channelMention.replace(/[<>#]/g, '');
        const foundChannel = guild.channels.cache.get(channelId);
        
        if (!foundChannel || !foundChannel.isTextBased()) {
          return {
            success: false,
            message: `No se encontró el canal ${channelMention} o no es un canal de texto`
          };
        }
        
        targetChannel = foundChannel as any;
      }

      try {
        // Leer el archivo JSON desde la carpeta embeds/
        const embedsDir = path.join(process.cwd(), 'embeds');
        const filePath = path.join(embedsDir, fileName);

        if (!fs.existsSync(filePath)) {
          return {
            success: false,
            message: `No se encontró el archivo \`${fileName}\` en la carpeta \`embeds/\`\nAsegúrate de que el archivo existe.`
          };
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const embedData = JSON.parse(fileContent);

        // Validar estructura básica
        if (!embedData.title && !embedData.description) {
          return {
            success: false,
            message: 'El archivo JSON debe contener al menos un `title` o `description`'
          };
        }

        // Crear el embed
        const embed = new EmbedBuilder();

        // Propiedades básicas
        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        if (embedData.url) embed.setURL(embedData.url);
        if (embedData.color) embed.setColor(embedData.color as ColorResolvable);
        if (embedData.timestamp) embed.setTimestamp(embedData.timestamp === 'now' ? new Date() : new Date(embedData.timestamp));

        // Author
        if (embedData.author) {
          embed.setAuthor({
            name: embedData.author.name,
            iconURL: embedData.author.icon_url,
            url: embedData.author.url
          });
        }

        // Thumbnail y Image
        if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
        if (embedData.image) embed.setImage(embedData.image);

        // Fields
        if (embedData.fields && Array.isArray(embedData.fields)) {
          embedData.fields.forEach((field: any) => {
            embed.addFields({
              name: field.name,
              value: field.value,
              inline: field.inline || false
            });
          });
        }

        // Footer
        if (embedData.footer) {
          embed.setFooter({
            text: embedData.footer.text,
            iconURL: embedData.footer.icon_url
          });
        }

        // Enviar el embed
        const messagePayload: any = { embeds: [embed] };

        // Agregar botón si está definido en el JSON
        if (embedData.button) {
          const button = new ButtonBuilder()
            .setCustomId(embedData.button.customId)
            .setLabel(embedData.button.label)
            .setStyle(getButtonStyle(embedData.button.style));

          if (embedData.button.emoji) {
            button.setEmoji(embedData.button.emoji);
          }

          const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(button);

          messagePayload.components = [row];
        }

        await (targetChannel as any).send(messagePayload);

        logger.info('Embed sent successfully', {
          file: fileName,
          channel: targetChannel.id,
          user: message.author.id
        });

        return {
          success: true,
          message: `✅ Mensaje embebido enviado exitosamente en ${channelMention || 'este canal'}`,
          data: {
            file: fileName,
            channelId: targetChannel.id
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        
        if (errorMessage.includes('JSON')) {
          return {
            success: false,
            message: `Error al parsear el archivo JSON: ${errorMessage}\nVerifica que el formato sea válido.`
          };
        }

        if (errorMessage.includes('MISSING_PERMISSIONS')) {
          return {
            success: false,
            message: 'No tengo permisos suficientes para enviar mensajes en ese canal'
          };
        }

        logger.error('Error sending embed', {
          error: errorMessage,
          file: fileName,
          user: message.author.id
        });

        return {
          success: false,
          message: `Error al enviar el embed: ${errorMessage}`
        };
      }
    }
  };
}
