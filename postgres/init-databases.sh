#!/bin/bash
# =============================================================================
# PostgreSQL — Inicialización de Bases de Datos Múltiples
# =============================================================================
# Este script se ejecuta SOLO en la primera inicialización del contenedor.
# Crea las bases de datos para Keycloak, Gitea y Grafana.
# =============================================================================

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Crear base de datos para Keycloak
    SELECT 'CREATE DATABASE keycloak'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak');
    CREATE DATABASE keycloak;

    -- Crear base de datos para Gitea
    SELECT 'CREATE DATABASE gitea'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'gitea');
    CREATE DATABASE gitea;

    -- Crear base de datos para Grafana
    SELECT 'CREATE DATABASE grafana'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'grafana');
    CREATE DATABASE grafana;

    -- Otorgar permisos completos al usuario principal
    GRANT ALL PRIVILEGES ON DATABASE keycloak TO ${POSTGRES_USER};
    GRANT ALL PRIVILEGES ON DATABASE gitea TO ${POSTGRES_USER};
    GRANT ALL PRIVILEGES ON DATABASE grafana TO ${POSTGRES_USER};
EOSQL

echo "=== Bases de datos keycloak, gitea y grafana creadas exitosamente ==="
