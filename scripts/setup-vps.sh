#!/bin/bash

# Script de Configuración Inicial de VPS para Discord Bot
# Uso: bash setup-vps.sh

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🔧 VPS Setup Script - Discord Bot  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar si se ejecuta como root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${YELLOW}⚠️  No ejecutes este script como root${NC}"
    echo -e "${YELLOW}   Usa: bash setup-vps.sh${NC}"
    exit 1
fi

# Función para verificar comandos
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ Error: $1${NC}"
        exit 1
    fi
}

# 1. Actualizar sistema
echo -e "${BLUE}📦 Actualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y
check_status "Sistema actualizado"

# 2. Instalar dependencias básicas
echo -e "${BLUE}🔧 Instalando dependencias básicas...${NC}"
sudo apt install -y curl wget git build-essential
check_status "Dependencias instaladas"

# 3. Instalar Node.js 20.x
echo -e "${BLUE}📦 Instalando Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    check_status "Node.js instalado"
else
    echo -e "${GREEN}✅ Node.js ya está instalado ($(node --version))${NC}"
fi

# 4. Instalar PM2
echo -e "${BLUE}🔧 Instalando PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    check_status "PM2 instalado"
else
    echo -e "${GREEN}✅ PM2 ya está instalado ($(pm2 --version))${NC}"
fi

# 5. Configurar PM2 logrotate
echo -e "${BLUE}📝 Configurando rotación de logs...${NC}"
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
check_status "Rotación de logs configurada"

# 6. Crear directorio para el bot
echo -e "${BLUE}📁 Creando directorio para el bot...${NC}"
mkdir -p ~/discord-bot
mkdir -p ~/backups
check_status "Directorios creados"

# 7. Configurar firewall (opcional)
echo -e "${BLUE}🔒 ¿Deseas configurar el firewall? (y/n)${NC}"
read -r configure_firewall
if [ "$configure_firewall" = "y" ]; then
    echo -e "${BLUE}🔒 Configurando firewall...${NC}"
    sudo ufw allow 22/tcp
    sudo ufw --force enable
    check_status "Firewall configurado"
fi

# 8. Mostrar información del sistema
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Configuración Completada!      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Información del sistema:${NC}"
echo -e "   Node.js: ${GREEN}$(node --version)${NC}"
echo -e "   npm: ${GREEN}$(npm --version)${NC}"
echo -e "   PM2: ${GREEN}$(pm2 --version)${NC}"
echo -e "   Directorio del bot: ${GREEN}~/discord-bot${NC}"
echo ""
echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo -e "   1. Sube los archivos del bot a ${GREEN}~/discord-bot${NC}"
echo -e "   2. Configura ${GREEN}config.json${NC} con tu token de Discord"
echo -e "   3. Ejecuta ${GREEN}cd ~/discord-bot && bash scripts/deploy.sh${NC}"
echo ""
echo -e "${YELLOW}💡 Comandos útiles:${NC}"
echo -e "   ${GREEN}pm2 status${NC}              - Ver estado de procesos"
echo -e "   ${GREEN}pm2 logs discord-bot${NC}    - Ver logs del bot"
echo -e "   ${GREEN}pm2 monit${NC}               - Monitor interactivo"
echo ""
