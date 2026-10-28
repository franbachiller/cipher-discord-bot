#!/bin/bash

# Script de Monitoreo del Discord Bot
# Uso: ./monitor.sh

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

BOT_NAME="discord-bot"

clear
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          📊 Discord Bot - Monitor Dashboard              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Función para obtener estado del bot
get_bot_status() {
    if pm2 list | grep -q "$BOT_NAME.*online"; then
        echo -e "${GREEN}🟢 ONLINE${NC}"
    elif pm2 list | grep -q "$BOT_NAME.*stopped"; then
        echo -e "${RED}🔴 STOPPED${NC}"
    elif pm2 list | grep -q "$BOT_NAME.*errored"; then
        echo -e "${RED}❌ ERROR${NC}"
    else
        echo -e "${YELLOW}⚪ NOT RUNNING${NC}"
    fi
}

# Función para obtener uptime
get_uptime() {
    pm2 jlist | jq -r ".[] | select(.name==\"$BOT_NAME\") | .pm2_env.pm_uptime" 2>/dev/null
}

# Función para obtener memoria
get_memory() {
    pm2 jlist | jq -r ".[] | select(.name==\"$BOT_NAME\") | .monit.memory" 2>/dev/null
}

# Función para obtener CPU
get_cpu() {
    pm2 jlist | jq -r ".[] | select(.name==\"$BOT_NAME\") | .monit.cpu" 2>/dev/null
}

# Función para obtener reinicios
get_restarts() {
    pm2 jlist | jq -r ".[] | select(.name==\"$BOT_NAME\") | .pm2_env.restart_time" 2>/dev/null
}

# Información del sistema
echo -e "${CYAN}═══ Información del Sistema ═══${NC}"
echo -e "  Hostname: ${GREEN}$(hostname)${NC}"
echo -e "  Uptime: ${GREEN}$(uptime -p)${NC}"
echo -e "  Carga: ${GREEN}$(uptime | awk -F'load average:' '{print $2}')${NC}"
echo ""

# Memoria del sistema
echo -e "${CYAN}═══ Memoria del Sistema ═══${NC}"
free -h | awk 'NR==2{printf "  Total: %s | Usado: %s | Libre: %s | Uso: %.2f%%\n", $2, $3, $4, $3/$2*100}'
echo ""

# Disco
echo -e "${CYAN}═══ Espacio en Disco ═══${NC}"
df -h / | awk 'NR==2{printf "  Total: %s | Usado: %s | Libre: %s | Uso: %s\n", $2, $3, $4, $5}'
echo ""

# Estado del bot
echo -e "${CYAN}═══ Estado del Bot ═══${NC}"
echo -e "  Estado: $(get_bot_status)"

if pm2 list | grep -q "$BOT_NAME"; then
    MEMORY=$(get_memory)
    CPU=$(get_cpu)
    RESTARTS=$(get_restarts)
    UPTIME=$(get_uptime)
    
    if [ ! -z "$MEMORY" ]; then
        MEMORY_MB=$((MEMORY / 1024 / 1024))
        echo -e "  Memoria: ${GREEN}${MEMORY_MB} MB${NC}"
    fi
    
    if [ ! -z "$CPU" ]; then
        echo -e "  CPU: ${GREEN}${CPU}%${NC}"
    fi
    
    if [ ! -z "$RESTARTS" ]; then
        echo -e "  Reinicios: ${YELLOW}${RESTARTS}${NC}"
    fi
    
    if [ ! -z "$UPTIME" ]; then
        UPTIME_FORMATTED=$(date -d @$(($(date +%s) - UPTIME / 1000)) +'%Y-%m-%d %H:%M:%S' 2>/dev/null)
        if [ ! -z "$UPTIME_FORMATTED" ]; then
            echo -e "  Iniciado: ${GREEN}${UPTIME_FORMATTED}${NC}"
        fi
    fi
fi
echo ""

# Logs recientes
echo -e "${CYAN}═══ Últimos Logs (10 líneas) ═══${NC}"
if [ -f ~/discord-bot/bot.log ]; then
    tail -n 10 ~/discord-bot/bot.log | while IFS= read -r line; do
        if echo "$line" | grep -qi "error"; then
            echo -e "${RED}$line${NC}"
        elif echo "$line" | grep -qi "warn"; then
            echo -e "${YELLOW}$line${NC}"
        else
            echo -e "${GREEN}$line${NC}"
        fi
    done
else
    echo -e "${YELLOW}  No se encontró archivo de logs${NC}"
fi
echo ""

# Procesos PM2
echo -e "${CYAN}═══ Procesos PM2 ═══${NC}"
pm2 list
echo ""

# Comandos útiles
echo -e "${CYAN}═══ Comandos Útiles ═══${NC}"
echo -e "  ${GREEN}pm2 logs $BOT_NAME${NC}        - Ver logs en tiempo real"
echo -e "  ${GREEN}pm2 restart $BOT_NAME${NC}     - Reiniciar el bot"
echo -e "  ${GREEN}pm2 stop $BOT_NAME${NC}        - Detener el bot"
echo -e "  ${GREEN}pm2 monit${NC}                 - Monitor interactivo"
echo -e "  ${GREEN}./scripts/monitor.sh${NC}      - Actualizar este dashboard"
echo ""

# Opción de ver logs en tiempo real
echo -e "${YELLOW}¿Deseas ver los logs en tiempo real? (y/n)${NC}"
read -t 5 -r view_logs
if [ "$view_logs" = "y" ]; then
    echo -e "${BLUE}Mostrando logs en tiempo real (Ctrl+C para salir)...${NC}"
    sleep 1
    pm2 logs $BOT_NAME
fi
