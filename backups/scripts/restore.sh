#!/bin/bash
# =============================================================================
# NIKE ENTERPRISE PLATFORM — Script de Restore
# =============================================================================
# Uso: sudo ./restore.sh <ruta_al_backup.tar.gz>
#
# Restaura:
#   1. Bases de datos PostgreSQL
#   2. Volúmenes Docker
#   3. Configuraciones del proyecto
#
# ⚠️  ATENCIÓN: Este script DETIENE todos los servicios durante el restore.
# =============================================================================

set -euo pipefail

# --- Colores ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*"; }

# --- Validación de argumentos ---
if [ $# -lt 1 ]; then
    echo "Uso: $0 <ruta_al_backup.tar.gz>"
    echo ""
    echo "Ejemplo: $0 /opt/nike-backups/nike-backup-20260606_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMP_DIR="/tmp/nike-restore-$$"

# --- Verificaciones ---
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Archivo de backup no encontrado: $BACKUP_FILE"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    log_error "Docker no está instalado"
    exit 1
fi

# --- Verificar checksum si existe ---
if [ -f "${BACKUP_FILE}.sha256" ]; then
    log_info "Verificando integridad del backup..."
    if sha256sum -c "${BACKUP_FILE}.sha256" &>/dev/null; then
        log_ok "Checksum verificado correctamente"
    else
        log_error "¡Checksum NO coincide! El backup puede estar corrupto."
        read -p "¿Continuar de todas formas? (s/N): " CONTINUE
        if [ "$CONTINUE" != "s" ] && [ "$CONTINUE" != "S" ]; then
            exit 1
        fi
    fi
else
    log_warn "No se encontró archivo de checksum, saltando verificación"
fi

# --- Confirmación ---
echo ""
echo -e "${YELLOW}⚠️  ATENCIÓN: Este proceso va a:${NC}"
echo "  1. DETENER todos los servicios del lab"
echo "  2. REEMPLAZAR todas las bases de datos"
echo "  3. REEMPLAZAR todos los volúmenes Docker"
echo "  4. REINICIAR todos los servicios"
echo ""
read -p "¿Estás seguro de continuar? (escribe 'RESTORE' para confirmar): " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
    log_info "Restore cancelado por el usuario"
    exit 0
fi

# --- Extraer backup ---
log_info "Extrayendo backup..."
mkdir -p "$TEMP_DIR"
tar xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_DIR=$(ls "$TEMP_DIR" | head -1)
RESTORE_PATH="${TEMP_DIR}/${BACKUP_DIR}"
log_ok "Backup extraído en ${RESTORE_PATH}"

# --- Detener servicios (excepto PostgreSQL) ---
log_info "Deteniendo servicios..."
cd "$PROJECT_DIR"
docker compose stop gitea keycloak grafana portainer prometheus node-exporter wireguard intranet portal traefik adguard 2>/dev/null || true
log_ok "Servicios detenidos"

# --- 1. Restaurar PostgreSQL ---
if [ -f "${RESTORE_PATH}/postgres_all_databases.sql" ]; then
    log_info "Restaurando bases de datos PostgreSQL..."

    # Asegurar que PostgreSQL está corriendo
    docker compose up -d postgres
    sleep 10

    POSTGRES_CONTAINER=$(docker ps --filter "name=nike-postgres" --format "{{.Names}}" | head -1)
    if [ -n "$POSTGRES_CONTAINER" ]; then
        # Restaurar dump completo
        cat "${RESTORE_PATH}/postgres_all_databases.sql" | \
            docker exec -i "$POSTGRES_CONTAINER" psql \
                -U "${POSTGRES_USER:-nikeadmin}" \
                -d postgres \
                2>/dev/null
        log_ok "PostgreSQL restaurado desde dump completo"
    else
        log_error "No se pudo iniciar PostgreSQL"
    fi
else
    log_warn "No se encontró dump de PostgreSQL"
fi

# --- 2. Restaurar volúmenes Docker ---
log_info "Restaurando volúmenes Docker..."

for VOLUME_FILE in "${RESTORE_PATH}"/volume_*.tar.gz; do
    if [ -f "$VOLUME_FILE" ]; then
        VOLUME_NAME=$(basename "$VOLUME_FILE" | sed 's/^volume_//' | sed 's/.tar.gz$//')
        log_info "  → Restaurando ${VOLUME_NAME}..."

        # Crear volumen si no existe
        docker volume create "$VOLUME_NAME" 2>/dev/null || true

        # Restaurar datos
        docker run --rm \
            -v "${VOLUME_NAME}:/target" \
            -v "$(dirname "$VOLUME_FILE"):/backup:ro" \
            alpine:3.20 \
            sh -c "rm -rf /target/* && tar xzf /backup/$(basename "$VOLUME_FILE") -C /target" 2>/dev/null

        log_ok "  → ${VOLUME_NAME} restaurado"
    fi
done

# --- 3. Restaurar configuraciones (opcional) ---
if [ -f "${RESTORE_PATH}/project_configs.tar.gz" ]; then
    log_info "¿Restaurar configuraciones del proyecto? (Esto sobrescribirá los archivos actuales)"
    read -p "(s/N): " RESTORE_CONFIGS
    if [ "$RESTORE_CONFIGS" = "s" ] || [ "$RESTORE_CONFIGS" = "S" ]; then
        tar xzf "${RESTORE_PATH}/project_configs.tar.gz" -C "$PROJECT_DIR"
        log_ok "Configuraciones restauradas"
    else
        log_info "Configuraciones no restauradas (manteniendo las actuales)"
    fi
fi

# --- Reiniciar todos los servicios ---
log_info "Reiniciando todos los servicios..."
cd "$PROJECT_DIR"
docker compose up -d
log_ok "Servicios reiniciados"

# --- Verificación ---
log_info "Esperando 30 segundos para verificación de salud..."
sleep 30

echo ""
echo "============================================="
echo -e "${GREEN}RESTORE COMPLETADO${NC}"
echo "============================================="
echo ""
docker compose ps --format "table {{.Name}}\t{{.Status}}"
echo ""
echo "============================================="

# --- Limpieza ---
rm -rf "$TEMP_DIR"
log_ok "Archivos temporales limpiados"

echo ""
log_warn "Acciones recomendadas post-restore:"
echo "  1. Verificar acceso a http://intranet.nike.com"
echo "  2. Verificar login en http://auth.nike.com"
echo "  3. Verificar repositorios en http://git.nike.com"
echo "  4. Verificar dashboards en http://grafana.nike.com"
echo "  5. Verificar DNS: dig auth.nike.com"
