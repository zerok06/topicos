#!/usr/bin/env bash

# =============================================================================
# ENTERPRISE LAB PLATFORM - CONFIGURADOR INICIAL DE ENTORNO
# =============================================================================
# S.O. Recomendado: Ubuntu Server
# Copia el .env.example a .env, autodetecta la IP local del servidor,
# genera contraseñas seguras, genera hashes bcrypt para AdGuard y WireGuard
# y configura todas las variables críticas de forma automática.
# =============================================================================

set -e

# Colores para la consola
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info_msg() { echo -e "${BLUE}[INFO]${NC} $1"; }
success_msg() { echo -e "${GREEN}[ÉXITO]${NC} $1"; }
warn_msg() { echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"; }
error_msg() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Validar privilegios de root/sudo
if [ "$EUID" -ne 0 ]; then
    error_msg "Este script requiere privilegios de administrador para instalar dependencias locales (como apache2-utils)."
    echo "Uso: sudo ./setup.sh"
    exit 1
fi

echo -e "${YELLOW}=================================================================${NC}"
echo -e "${YELLOW}     CONFIGURADOR INICIAL DE VARIABLE DE ENTORNO (.env)         ${NC}"
echo -e "${YELLOW}=================================================================${NC}"

# 2. Copiar .env si no existe
if [ -f .env ]; then
    warn_msg "Se detectó que ya existe un archivo '.env' en este directorio."
    read -p "¿Deseas sobrescribirlo con una nueva configuración limpia? (s/N): " OVERWRITE
    OVERWRITE=${OVERWRITE:-n}
    if [[ ! "$OVERWRITE" =~ ^[sS]$ ]]; then
        info_msg "Operación cancelada. Se mantendrá el archivo .env actual sin cambios."
        exit 0
    fi
fi

info_msg "Copiando .env.example a .env..."
cp .env.example .env

# 3. Detectar IP Local del Servidor
info_msg "Detectando dirección IP local primaria..."
IP_DETECTED=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || true)
if [ -z "$IP_DETECTED" ]; then
    IP_DETECTED=$(hostname -I | awk '{print $1}' || true)
fi
if [ -z "$IP_DETECTED" ]; then
    IP_DETECTED="192.168.1.100"
fi

read -p "Confirma la IP de este servidor (Por defecto: $IP_DETECTED): " IP_CONFIRMED
IP_CONFIRMED=${IP_CONFIRMED:-$IP_DETECTED}
info_msg "Usando IP del servidor: $IP_CONFIRMED"

# 4. Solicitar contraseñas de administración críticas para la UI (opcional autogenerar)
echo -e "\n${YELLOW}[CONFIGURACIÓN DE CREDENCIALES DE ACCESO]${NC}"
echo "Elige una contraseña para AdGuard Home y WireGuard VPN."
read -p "¿Deseas autogenerar contraseñas aleatorias seguras para todo? (S/n): " AUTO_GEN
AUTO_GEN=${AUTO_GEN:-s}

if [[ "$AUTO_GEN" =~ ^[sS]$ ]]; then
    # Autogenerar contraseñas
    ADGUARD_PASS=$(openssl rand -base64 12 | tr -d '/+=')
    WG_PASS=$(openssl rand -base64 12 | tr -d '/+=')
    info_msg "Contraseñas autogeneradas con éxito."
else
    # Solicitar al usuario de forma segura
    echo -n "Introduce la contraseña para AdGuard Home UI (admin): "
    read -s ADGUARD_PASS
    echo ""
    while [ -z "$ADGUARD_PASS" ]; do
        error_msg "La contraseña no puede estar vacía."
        echo -n "Introduce la contraseña para AdGuard Home UI (admin): "
        read -s ADGUARD_PASS
        echo ""
    done

    echo -n "Introduce la contraseña para WireGuard VPN UI: "
    read -s WG_PASS
    echo ""
    while [ -z "$WG_PASS" ]; do
        error_msg "La contraseña no puede estar vacía."
        echo -n "Introduce la contraseña para WireGuard VPN UI: "
        read -s WG_PASS
        echo ""
    done
fi

# 5. Generar contraseñas aleatorias internas para base de datos y SSO
info_msg "Generando contraseñas internas seguras y tokens únicos..."
PG_PASS=$(openssl rand -base64 16 | tr -d '/+=')
KC_PASS=$(openssl rand -base64 16 | tr -d '/+=')
GF_PASS=$(openssl rand -base64 16 | tr -d '/+=')
PT_PASS=$(openssl rand -base64 16 | tr -d '/+=')
GITEA_KEY=$(openssl rand -hex 16)
GITEA_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJuYmYiOjE3MTcxMjAwMDB9.$(openssl rand -hex 12)"

# 6. Instalar apache2-utils si no está para generar hashes bcrypt
if ! command -v htpasswd >/dev/null 2>&1; then
    info_msg "Instalando utilidades de contraseña (apache2-utils) para hash bcrypt..."
    apt-get update -y && apt-get install -y apache2-utils
fi

# 7. Generar Hashes Bcrypt escapados para Docker Compose ($ -> $$)
info_msg "Generando hashes Bcrypt seguros..."
# AdGuard Hash
ADGUARD_RAW_HASH=$(htpasswd -nbB admin "$ADGUARD_PASS" | cut -d: -f2)
ADGUARD_ESCAPED_HASH=$(echo "$ADGUARD_RAW_HASH" | sed 's/\$/\$\$/g')

# WireGuard Hash (utiliza el mismo método bcrypt compatible de htpasswd)
WG_RAW_HASH=$(htpasswd -nbB admin "$WG_PASS" | cut -d: -f2)
WG_ESCAPED_HASH=$(echo "$WG_RAW_HASH" | sed 's/\$/\$\$/g')

# 8. Reemplazar valores en el archivo .env
info_msg "Escribiendo valores y hashes en '.env'..."

# Configuración de IPs
sed -i "s|SERVER_IP=.*|SERVER_IP=$IP_CONFIRMED|g" .env
sed -i "s|WG_HOST=.*|WG_HOST=$IP_CONFIRMED|g" .env
sed -i "s|WG_DEFAULT_DNS=.*|WG_DEFAULT_DNS=$IP_CONFIRMED|g" .env

# PostgreSQL
sed -i "s|POSTGRES_USER=.*|POSTGRES_USER=labadmin|g" .env
sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PG_PASS|g" .env

# Keycloak
sed -i "s|KC_ADMIN_PASSWORD=.*|KC_ADMIN_PASSWORD=$KC_PASS|g" .env
sed -i "s|KC_DB_USERNAME=.*|KC_DB_USERNAME=labadmin|g" .env
sed -i "s|KC_DB_PASSWORD=.*|KC_DB_PASSWORD=$PG_PASS|g" .env

# Gitea
sed -i "s|GITEA_DB_USER=.*|GITEA_DB_USER=labadmin|g" .env
sed -i "s|GITEA_DB_PASSWD=.*|GITEA_DB_PASSWD=$PG_PASS|g" .env
sed -i "s|GITEA_SECRET_KEY=.*|GITEA_SECRET_KEY=$GITEA_KEY|g" .env
sed -i "s|GITEA_INTERNAL_TOKEN=.*|GITEA_INTERNAL_TOKEN=$GITEA_TOKEN|g" .env

# Grafana
sed -i "s|GF_SECURITY_ADMIN_PASSWORD=.*|GF_SECURITY_ADMIN_PASSWORD=$GF_PASS|g" .env
sed -i "s|GF_DATABASE_USER=.*|GF_DATABASE_USER=labadmin|g" .env
sed -i "s|GF_DATABASE_PASSWORD=.*|GF_DATABASE_PASSWORD=$PG_PASS|g" .env

# Portainer
sed -i "s|PORTAINER_ADMIN_PASSWORD=.*|PORTAINER_ADMIN_PASSWORD=$PT_PASS|g" .env

# Hashes Bcrypt
sed -i "s|ADGUARD_PASSWORD_HASH=.*|ADGUARD_PASSWORD_HASH=$ADGUARD_ESCAPED_HASH|g" .env
sed -i "s|WGEASY_PASSWORD_HASH=.*|WGEASY_PASSWORD_HASH=$WG_ESCAPED_HASH|g" .env

# Asegurar permisos de ejecución para otros scripts utilitarios
info_msg "Asegurando permisos para scripts de backups e inicialización..."
chmod +x backups/scripts/*.sh || true
chmod +x postgres/*.sh || true

success_msg "¡Archivo .env configurado correctamente!"

# 9. Mostrar credenciales de acceso finales en pantalla
echo -e "\n${YELLOW}=================================================================${NC}"
echo -e "${GREEN}          RESUMEN DE CREDENCIALES CONFIGURADAS                   ${NC}"
echo -e "${YELLOW}=================================================================${NC}"
echo -e "IP del Servidor:       ${GREEN}$IP_CONFIRMED${NC}"
echo -e "PostgreSQL User:       ${GREEN}labadmin${NC}"
echo -e "PostgreSQL Pass:       ${GREEN}$PG_PASS${NC}"
echo -e "Keycloak Admin Pass:   ${GREEN}$KC_PASS${NC}"
echo -e "Grafana Admin Pass:    ${GREEN}$GF_PASS${NC}"
echo -e "Portainer Admin Pass:  ${GREEN}$PT_PASS${NC}"
echo -e "AdGuard Home User:     ${GREEN}admin${NC}"
echo -e "AdGuard Home Pass:     ${GREEN}$ADGUARD_PASS${NC}"
echo -e "WireGuard VPN Pass:    ${GREEN}$WG_PASS${NC}"
echo -e "${YELLOW}=================================================================${NC}"
warn_msg "Copia y guarda estas contraseñas en un lugar seguro."
warn_msg "El archivo '.env' contiene estas credenciales y está protegido en tu host local."
echo -e "${YELLOW}=================================================================${NC}"
