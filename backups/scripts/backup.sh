#!/bin/bash
# =============================================================================
# NIKE ENTERPRISE PLATFORM — Script de Backup
# =============================================================================
# Uso: sudo ./backup.sh [directorio_destino]
#
# Realiza:
#   1. Dump completo de PostgreSQL (pg_dumpall)
#   2. Copia de volúmenes Docker críticos
#   3. Copia de configuraciones
#   4. Compresión con tar+gzip
#   5. Rotación automática de backups antiguos
#
# Requiere: Docker en ejecución, usuario con acceso a Docker
# =============================================================================

set -euo pipefail

# --- Configuración ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${1:-/opt/nike-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="nike-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
COMPOSE_PROJECT="nike"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*"; }

# --- Verificaciones ---
if ! command -v docker &> /dev/null; then
    log_error "Docker no está instalado"
    exit 1
fi

if ! docker ps &> /dev/null; then
    log_error "Docker no está en ejecución o no tienes permisos"
    exit 1
fi

# --- Crear directorio de backup ---
mkdir -p "${BACKUP_PATH}"
log_info "Directorio de backup: ${BACKUP_PATH}"

# --- 1. Dump de PostgreSQL ---
log_info "Realizando dump de PostgreSQL..."
POSTGRES_CONTAINER=$(docker ps --filter "name=nike-postgres" --format "{{.Names}}" | head -1)

if [ -n "$POSTGRES_CONTAINER" ]; then
    docker exec "$POSTGRES_CONTAINER" pg_dumpall \
        -U "${POSTGRES_USER:-nikeadmin}" \
        --clean \
        --if-exists \
        > "${BACKUP_PATH}/postgres_all_databases.sql" 2>/dev/null

    if [ $? -eq 0 ]; then
        log_ok "PostgreSQL dump completado ($(du -h "${BACKUP_PATH}/postgres_all_databases.sql" | cut -f1))"
    else
        log_error "Fallo en el dump de PostgreSQL"
    fi

    # Dumps individuales por base de datos
    for DB in keycloak gitea grafana; do
        docker exec "$POSTGRES_CONTAINER" pg_dump \
            -U "${POSTGRES_USER:-nikeadmin}" \
            --clean --if-exists \
            -d "$DB" \
            > "${BACKUP_PATH}/postgres_${DB}.sql" 2>/dev/null
        log_ok "  → ${DB} dump completado"
    done
else
    log_warn "Contenedor PostgreSQL no encontrado, saltando dump de BD"
fi

# --- 2. Backup de volúmenes Docker ---
log_info "Copiando volúmenes Docker..."

VOLUMES=(
    "nike_gitea_data"
    "nike_grafana_data"
    "nike_portainer_data"
    "nike_adguard_work"
    "nike_wireguard_data"
    "nike_traefik_certs"
)

for VOLUME in "${VOLUMES[@]}"; do
    if docker volume inspect "$VOLUME" &>/dev/null; then
        docker run --rm \
            -v "${VOLUME}:/source:ro" \
            -v "${BACKUP_PATH}:/backup" \
            alpine:3.20 \
            tar czf "/backup/volume_${VOLUME}.tar.gz" -C /source . 2>/dev/null
        log_ok "  → ${VOLUME} ($(du -h "${BACKUP_PATH}/volume_${VOLUME}.tar.gz" | cut -f1))"
    else
        log_warn "  → ${VOLUME} no existe, saltando"
    fi
done

# --- 3. Backup de configuraciones ---
log_info "Copiando configuraciones del proyecto..."
tar czf "${BACKUP_PATH}/project_configs.tar.gz" \
    -C "$PROJECT_DIR" \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='*.log' \
    . 2>/dev/null
log_ok "Configuraciones copiadas ($(du -h "${BACKUP_PATH}/project_configs.tar.gz" | cut -f1))"

# --- 4. Compresión final ---
log_info "Comprimiendo backup final..."
cd "${BACKUP_DIR}"
tar czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"
rm -rf "${BACKUP_PATH}"
FINAL_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
log_ok "Backup final: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz (${FINAL_SIZE})"

# --- 5. Generar checksum ---
sha256sum "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" > "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.sha256"
log_ok "Checksum SHA256 generado"

# --- 6. Rotación de backups antiguos ---
log_info "Rotando backups antiguos (retención: ${RETENTION_DAYS} días)..."
DELETED=$(find "${BACKUP_DIR}" -name "nike-backup-*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)
find "${BACKUP_DIR}" -name "nike-backup-*.tar.gz.sha256" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null
if [ "$DELETED" -gt 0 ]; then
    log_ok "Eliminados ${DELETED} backups antiguos"
else
    log_info "No hay backups antiguos para eliminar"
fi

# --- Resumen ---
echo ""
echo "============================================="
echo -e "${GREEN}BACKUP COMPLETADO EXITOSAMENTE${NC}"
echo "============================================="
echo "Archivo:   ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Tamaño:    ${FINAL_SIZE}"
echo "Checksum:  ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.sha256"
echo "Timestamp: $(date)"
echo "============================================="
