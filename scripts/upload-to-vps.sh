#!/bin/bash

# Script para Subir Archivos del Bot a la VPS
# Uso: ./upload-to-vps.sh [usuario@]ip

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuración por defecto
DEFAULT_VPS="<IP_DEL_VPS>"
VPS_USER="usuario"
VPS_DIR="~/discord-bot"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   📤 Upload Bot to VPS Script        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Obtener IP de la VPS
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usando VPS por defecto: $DEFAULT_VPS${NC}"
    VPS_HOST="$VPS_USER@$DEFAULT_VPS"
else
    VPS_HOST="$1"
fi

echo -e "${BLUE}🎯 Destino: $VPS_HOST:$VPS_DIR${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encuentra package.json${NC}"
    echo -e "${YELLOW}   Ejecuta este script desde el directorio raíz del bot${NC}"
    exit 1
fi

# Preguntar confirmación
echo -e "${YELLOW}¿Deseas continuar con la subida? (y/n)${NC}"
read -r confirm
if [ "$confirm" != "y" ]; then
    echo -e "${RED}❌ Cancelado${NC}"
    exit 0
fi

# Crear directorio temporal para el upload
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}📦 Preparando archivos...${NC}"

# Copiar archivos necesarios (excluyendo node_modules, dist, etc.)
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude 'config.json' \
    ./ $TEMP_DIR/

# Crear archivo tar
echo -e "${BLUE}🗜️  Comprimiendo archivos...${NC}"
cd $TEMP_DIR
tar -czf discord-bot.tar.gz *
cd - > /dev/null

# Subir archivo a la VPS
echo -e "${BLUE}📤 Subiendo a la VPS...${NC}"
scp $TEMP_DIR/discord-bot.tar.gz $VPS_HOST:~/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archivos subidos exitosamente${NC}"
    
    # Descomprimir en la VPS
    echo -e "${BLUE}📂 Descomprimiendo en la VPS...${NC}"
    ssh $VPS_HOST << 'EOF'
        mkdir -p ~/discord-bot
        tar -xzf ~/discord-bot.tar.gz -C ~/discord-bot
        rm ~/discord-bot.tar.gz
        echo "✅ Archivos descomprimidos en ~/discord-bot"
EOF
    
    # Limpiar archivos temporales
    rm -rf $TEMP_DIR
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     ✅ Upload Completado!             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📝 Próximos pasos en la VPS:${NC}"
    echo -e "   1. ${GREEN}ssh $VPS_HOST${NC}"
    echo -e "   2. ${GREEN}cd ~/discord-bot${NC}"
    echo -e "   3. ${GREEN}npm install${NC}"
    echo -e "   4. ${GREEN}npm run build${NC}"
    echo -e "   5. ${GREEN}pm2 restart discord-bot${NC}"
    echo ""
    echo -e "${YELLOW}💡 O ejecuta el script de deployment:${NC}"
    echo -e "   ${GREEN}ssh $VPS_HOST 'cd ~/discord-bot && bash scripts/deploy.sh'${NC}"
    echo ""
else
    echo -e "${RED}❌ Error al subir archivos${NC}"
    rm -rf $TEMP_DIR
    exit 1
fi
