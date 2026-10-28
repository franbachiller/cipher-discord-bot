#!/bin/bash

# Script de Deployment Automático para Discord Bot
# Uso: ./deploy.sh

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuración
BOT_DIR=~/discord-bot
BOT_NAME="discord-bot"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 Discord Bot Deployment Script   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encuentra package.json${NC}"
    echo -e "${YELLOW}   Asegúrate de estar en el directorio del bot${NC}"
    exit 1
fi

# Función para verificar el último comando
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ Error: $1${NC}"
        exit 1
    fi
}

# 1. Obtener cambios (si es un repositorio git)
if [ -d ".git" ]; then
    echo -e "${BLUE}📥 Obteniendo últimos cambios...${NC}"
    git pull
    check_status "Cambios obtenidos"
else
    echo -e "${YELLOW}⚠️  No es un repositorio git, saltando git pull${NC}"
fi

# 2. Instalar/actualizar dependencias
echo -e "${BLUE}📦 Instalando dependencias...${NC}"
npm install
check_status "Dependencias instaladas"

# 3. Compilar proyecto
echo -e "${BLUE}🔨 Compilando proyecto TypeScript...${NC}"
npm run build
check_status "Proyecto compilado"

# 4. Verificar si PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 no está instalado. Instalando...${NC}"
    sudo npm install -g pm2
    check_status "PM2 instalado"
fi

# 5. Verificar si el bot ya está corriendo
if pm2 list | grep -q "$BOT_NAME"; then
    echo -e "${BLUE}🔄 Reiniciando bot...${NC}"
    pm2 restart $BOT_NAME
    check_status "Bot reiniciado"
else
    echo -e "${BLUE}🚀 Iniciando bot por primera vez...${NC}"
    pm2 start dist/index.js --name $BOT_NAME
    check_status "Bot iniciado"
    
    echo -e "${BLUE}💾 Guardando configuración de PM2...${NC}"
    pm2 save
    check_status "Configuración guardada"
    
    echo -e "${YELLOW}⚠️  Ejecuta el siguiente comando para auto-inicio:${NC}"
    echo -e "${GREEN}   pm2 startup${NC}"
    echo -e "${YELLOW}   Luego ejecuta el comando que PM2 te muestre${NC}"
fi

# 6. Mostrar estado
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Deployment Completado!         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Mostrar información del bot
echo -e "${BLUE}📊 Estado del bot:${NC}"
pm2 status

echo ""
echo -e "${BLUE}📝 Últimos logs (últimas 20 líneas):${NC}"
pm2 logs $BOT_NAME --lines 20 --nostream

echo ""
echo -e "${BLUE}💡 Comandos útiles:${NC}"
echo -e "   ${GREEN}pm2 logs $BOT_NAME${NC}      - Ver logs en tiempo real"
echo -e "   ${GREEN}pm2 restart $BOT_NAME${NC}   - Reiniciar el bot"
echo -e "   ${GREEN}pm2 stop $BOT_NAME${NC}      - Detener el bot"
echo -e "   ${GREEN}pm2 monit${NC}               - Monitor interactivo"
echo ""
