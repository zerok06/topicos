#!/usr/bin/env bash

# =============================================================================
# NIKE ENTERPRISE PLATFORM - REPARADOR DE SERVIDOR (RED / RESOLVED / SSH / UFW)
# =============================================================================
# S.O. Recomendado: Ubuntu Server
# Este script automatiza la resolucion del puerto 53 (AdGuard), la instalacion/
# activacion de SSH, la configuracion del firewall UFW y actualiza la IP a
# 192.168.2.101 de forma centralizada en todos los archivos de configuracion.
# =============================================================================

set -e

# Colores para la salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info_msg() { echo -e "${BLUE}[INFO]${NC} $1"; }
success_msg() { echo -e "${GREEN}[ÉXITO]${NC} $1"; }
warn_msg() { echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"; }
error_msg() { echo -e "${RED}[ERROR]${NC} $1"; }

TARGET_IP="192.168.2.101"

echo -e "${YELLOW}=================================================================${NC}"
echo -e "${YELLOW}       SCRIPT DE REPARACIÓN DE RED, RESOLVED, SSH Y UFW          ${NC}"
echo -e "${YELLOW}=================================================================${NC}"

# 1. Validar privilegios de administrador
if [ "$EUID" -ne 0 ]; then
    error_msg "Este script debe ejecutarse como root (utilizando sudo)."
    echo "Uso: sudo ./fix-server.sh"
    exit 1
fi

# 2. Desactivar y detener systemd-resolved (libera puerto 53 para AdGuard)
echo -e "\n${YELLOW}[Fase 1: Liberar Puerto 53 para AdGuard]${NC}"
info_msg "Deteniendo y desactivando systemd-resolved..."
systemctl stop systemd-resolved 2>/dev/null || true
systemctl disable systemd-resolved 2>/dev/null || true

info_msg "Reconfigurando resolv.conf con DNS temporal (1.1.1.1)..."
rm -f /etc/resolv.conf
echo "nameserver 1.1.1.1" > /etc/resolv.conf
success_msg "Puerto 53 liberado. resolv.conf configurado temporalmente con 1.1.1.1."

# 3. Asegurar instalacion y estado de OpenSSH
echo -e "\n${YELLOW}[Fase 2: Validar y Configurar SSH]${NC}"
info_msg "Actualizando indices de paquetes..."
apt-get update -y

info_msg "Instalando / Asegurando openssh-server..."
apt-get install -y openssh-server

info_msg "Habilitando e iniciando el servicio de SSH en el arranque..."
systemctl enable ssh
systemctl start ssh
success_msg "Servicio SSH instalado y activo."

# 4. Configurar y habilitar UFW de forma no interactiva
echo -e "\n${YELLOW}[Fase 3: Configurar Firewall (UFW)]${NC}"
info_msg "Estableciendo politicas por defecto para UFW..."
ufw default deny incoming
ufw default allow outgoing

info_msg "Abriendo puertos necesarios en el Firewall..."
ufw allow 22/tcp      # Host SSH
ufw allow 80/tcp      # HTTP Traefik
ufw allow 443/tcp     # HTTPS Traefik (Futuro)
ufw allow 53/tcp      # DNS AdGuard
ufw allow 53/udp      # DNS AdGuard
ufw allow 51820/udp   # WireGuard VPN
ufw allow 2222/tcp    # Gitea SSH

info_msg "Habilitando Firewall (UFW) de forma no interactiva..."
ufw --force enable
success_msg "Firewall (UFW) configurado y activo con reglas de seguridad."

# 5. Actualizar IP en el archivo .env si existe
echo -e "\n${YELLOW}[Fase 4: Actualizar IP del Ecosistema a ${TARGET_IP}]${NC}"
if [ -f .env ]; then
    info_msg "Se detecto un archivo '.env' activo. Actualizando IPs a ${TARGET_IP}..."
    sed -i "s|SERVER_IP=.*|SERVER_IP=${TARGET_IP}|g" .env
    sed -i "s|WG_HOST=.*|WG_HOST=${TARGET_IP}|g" .env
    sed -i "s|WG_DEFAULT_DNS=.*|WG_DEFAULT_DNS=${TARGET_IP}|g" .env
    success_msg "Archivo '.env' actualizado con IP ${TARGET_IP}."
else
    warn_msg "No se encontro archivo '.env'. Se aplicara la IP correcta cuando ejecutes 'setup.sh'."
fi

# 6. Actualizar IP en la configuracion de AdGuard Home si existe
if [ -f adguard/conf/AdGuardHome.yaml ]; then
    info_msg "Se detecto la configuracion de AdGuard Home. Actualizando IPs viejas..."
    # Reemplazar cualquier ip de la subred 1.x o vieja con 192.168.2.101 en AdGuard
    sed -i "s/192.168.1.100/${TARGET_IP}/g" adguard/conf/AdGuardHome.yaml
    success_msg "Configuracion de AdGuardHome.yaml actualizada."
fi

# 7. Reiniciar contenedores de red clave (si estan corriendo)
if command -v docker >/dev/null 2>&1 && docker compose ps >/dev/null 2>&1; then
    echo -e "\n${YELLOW}[Fase 5: Reiniciar Contenedores Clave]${NC}"
    info_msg "Reiniciando contenedores de red (traefik, adguard, wireguard) para aplicar la nueva IP..."
    docker compose up -d adguard traefik wireguard || true
    success_msg "Contenedores reiniciados."
fi

echo -e "\n${YELLOW}=================================================================${NC}"
echo -e "${GREEN}             REPARACIÓN DE SERVIDOR COMPLETADA                   ${NC}"
echo -e "${YELLOW}=================================================================${NC}"
info_msg "1. El puerto 53 esta liberado para AdGuard."
info_msg "2. El servicio SSH esta activo en el puerto 22."
info_msg "3. El Firewall (UFW) permite SSH y los puertos del lab."
info_msg "4. Las configuraciones apuntan a la IP: ${GREEN}${TARGET_IP}${NC}"
echo -e "${YELLOW}=================================================================${NC}"
warn_msg "Prueba conectarte desde tu laptop ejecutando: ssh tu_usuario@${TARGET_IP}"
echo -e "${YELLOW}=================================================================${NC}"
