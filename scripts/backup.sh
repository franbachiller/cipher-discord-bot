#!/bin/bash

# Script de Backup Automático para Discord Bot
# Uso: ./backup.sh

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuración
BACKUP_DIR=~/backups
BOT_DIR=~/discord-bot
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="bot-backup-$DATE.tar.gz"
KEEP_BACKUPS=7  # Número de backups a mantener

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      💾 Discord Bot Backup Script    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Verificar que el directorio del bot existe
if [ ! -d "$BOT_DIR" ]; then
    echo -e "${RED}❌ Error: Directorio del bot no encontrado: $BOT_DIR${NC}"
    exit 1
fi

# Crear backup
echo -e "${BLUE}📦 Creando backup...${NC}"
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    -C $BOT_DIR \
    config.json \
    data/ \
    bot.log \
    2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"
    
    # Mostrar tamaño del backup
    SIZE=$(du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1)
    echo -e "${BLUE}📊 Tamaño: $SIZE${NC}"
else
    echo -e "${RED}❌ Error al crear backup${NC}"
    exit 1
fi

# Limpiar backups antiguos
echo -e "${BLUE}🧹 Limpiando backups antiguos (manteniendo últimos $KEEP_BACKUPS)...${NC}"
cd $BACKUP_DIR
ls -t bot-backup-*.tar.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm

# Mostrar backups disponibles
echo ""
echo -e "${GREEN}📋 Backups disponibles:${NC}"
ls -lh $BACKUP_DIR/bot-backup-*.tar.gz 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'

echo ""
echo -e "${GREEN}✅ Backup completado!${NC}"
echo ""
echo -e "${YELLOW}💡 Para restaurar un backup:${NC}"
echo -e "   ${GREEN}cd ~/discord-bot${NC}"
echo -e "   ${GREEN}tar -xzf ~/backups/$BACKUP_FILE${NC}"
echo ""
