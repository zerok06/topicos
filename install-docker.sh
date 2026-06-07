#!/usr/bin/env bash

# =============================================================================
# ENTERPRISE LAB PLATFORM - INSTALADOR AUTOMÁTICO DE DOCKER
# =============================================================================
# S.O. Recomendado: Ubuntu Server 24.04 LTS o superior
# Automatiza la instalación de Docker Engine, CLI, plugins y Docker Compose.
# =============================================================================

set -e # Terminar ejecución inmediatamente si algún comando falla

# Evitar prompts interactivos durante la instalación de paquetes APT
export DEBIAN_FRONTEND=noninteractive

# Paleta de colores para la salida en consola
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin Color

# Función para imprimir mensajes informativos
info_msg() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Función para imprimir mensajes de éxito
success_msg() {
    echo -e "${GREEN}[ÉXITO]${NC} $1"
}

# Función para imprimir advertencias o errores
warn_msg() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

error_msg() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${YELLOW}=================================================================${NC}"
echo -e "${YELLOW}       INSTALADOR AUTOMÁTICO DE DOCKER & DOCKER COMPOSE         ${NC}"
echo -e "${YELLOW}=================================================================${NC}"

# 1. Validar privilegios de ejecución (debe ser root/sudo)
if [ "$EUID" -ne 0 ]; then
    error_msg "Este script debe ejecutarse con privilegios de root (utilizando sudo)."
    echo "Uso recomendado: sudo ./install-docker.sh"
    exit 1
fi

# Obtener el nombre del usuario real que invocó sudo
REAL_USER=${SUDO_USER:-$USER}

# 2. Preparar el sistema y actualizar APT
info_msg "Actualizando índices de paquetes APT..."
apt-get update -y

info_msg "Actualizando paquetes instalados en el sistema (esto puede tardar unos minutos)..."
apt-get upgrade -y

# 3. Instalar dependencias previas obligatorias
info_msg "Instalando dependencias requeridas para soporte HTTPS en repositorios..."
apt-get install -y ca-certificates curl gnupg lsb-release

# 4. Configurar el repositorio oficial de Docker
info_msg "Creando directorio para almacenar llaveros de seguridad (keyrings)..."
install -m 0755 -d /etc/apt/keyrings

info_msg "Descargando la clave GPG oficial de Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

info_msg "Añadiendo el repositorio oficial de Docker a las fuentes de APT..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Instalar Docker Engine y plugins oficiales
info_msg "Actualizando índices de paquetes APT con el nuevo repositorio..."
apt-get update -y

info_msg "Instalando Docker Engine, CLI, Containerd y Docker Compose..."
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Habilitar e iniciar el demonio de Docker en systemd
info_msg "Asegurando el inicio automático de Docker en el arranque del sistema..."
systemctl enable docker
systemctl start docker

# 6. Configurar permisos de usuario (Ejecución sin sudo)
if [ -n "$REAL_USER" ] && [ "$REAL_USER" != "root" ]; then
    info_msg "Configurando permisos para permitir ejecución sin 'sudo' para el usuario: ${REAL_USER}..."
    
    # Crear el grupo docker si no existiera
    if ! getent group docker >/dev/null; then
        groupadd docker
    fi
    
    # Añadir usuario al grupo docker
    usermod -aG docker "$REAL_USER"
    success_msg "Usuario '${REAL_USER}' agregado correctamente al grupo 'docker'."
    warn_msg "NOTA: Para aplicar los permisos de grupo en tu sesión actual de terminal sin reiniciar,"
    warn_msg "      debes ejecutar el comando: newgrp docker"
    warn_msg "      O cerrar sesión y volver a ingresar al servidor."
else
    warn_msg "No se detectó un usuario no-root (ejecución directa como root). Saltando paso de asignación de grupo."
fi

# 7. Ejecutar contenedor de verificación
info_msg "Realizando prueba rápida de ejecución con contenedor hello-world..."
if docker run --rm hello-world >/dev/null 2>&1; then
    success_msg "¡Prueba de contenedor hello-world exitosa!"
else
    warn_msg "La prueba de hello-world falló o no se pudo descargar el contenedor (esto es normal si el servidor está offline)."
    warn_msg "Docker fue instalado, pero verifica la conectividad si necesitas descargar imágenes públicas."
fi

# 8. Reportar versiones instaladas
echo -e "${YELLOW}=================================================================${NC}"
echo -e "${GREEN}             INSTALACIÓN COMPLETADA CON ÉXITO                  ${NC}"
echo -e "${YELLOW}=================================================================${NC}"
docker --version
docker compose version
echo -e "${YELLOW}=================================================================${NC}"
