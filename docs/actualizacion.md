# Guía de Actualización

## Principios

1. **Nunca actualizar todos los servicios a la vez** — Uno por uno
2. **Siempre hacer backup antes** — `sudo ./backups/scripts/backup.sh`
3. **Leer changelogs** — Verificar breaking changes
4. **Probar en horario de baja actividad** — Ventana de mantenimiento

## Procedimiento General

### 1. Backup Pre-Actualización

```bash
cd /opt/nike-platform
sudo ./backups/scripts/backup.sh
```

### 2. Actualizar Versión en .env

```bash
# Editar la versión del servicio a actualizar
nano .env

# Ejemplo: actualizar Grafana de 13.0.2 a 13.1.0
# GRAFANA_VERSION=13.0.2  →  GRAFANA_VERSION=13.1.0
```

### 3. Pull de la Nueva Imagen

```bash
# Descargar solo la imagen del servicio
docker compose pull grafana
```

### 4. Recrear el Contenedor

```bash
# Recrear solo el servicio actualizado
docker compose up -d grafana
```

### 5. Verificar

```bash
# Ver logs del servicio
docker compose logs -f grafana

# Verificar healthcheck
docker compose ps grafana

# Probar acceso
curl -s -o /dev/null -w "%{http_code}" http://grafana.nike.com
```

### 6. Rollback (si hay problemas)

```bash
# Restaurar versión anterior en .env
nano .env
# GRAFANA_VERSION=13.1.0  →  GRAFANA_VERSION=13.0.2

# Recrear con versión anterior
docker compose pull grafana
docker compose up -d grafana

# Si los datos están corruptos, hacer restore completo
sudo ./backups/scripts/restore.sh /opt/nike-backups/nike-backup-XXXX.tar.gz
```

---

## Guías Específicas por Servicio

### PostgreSQL

⚠️ **ALTA CRITICIDAD** — Contiene todos los datos de la plataforma.

```bash
# 1. Backup
sudo ./backups/scripts/backup.sh

# 2. Verificar compatibilidad de la nueva versión
# PostgreSQL soporta upgrade de minor sin dump (17.9 → 17.10)
# Major upgrade (17 → 18) requiere pg_dumpall + restaurar

# Para minor upgrade:
nano .env  # Cambiar POSTGRES_VERSION
docker compose pull postgres
docker compose up -d postgres
docker compose logs -f postgres

# Para major upgrade:
# a) Hacer pg_dumpall con la versión actual
docker exec nike-postgres pg_dumpall -U nikeadmin > /tmp/pg_full_dump.sql

# b) Parar todo
docker compose down

# c) Eliminar volumen de datos
docker volume rm nike_postgres_data

# d) Cambiar versión y levantar
nano .env  # POSTGRES_VERSION=18.x
docker compose up -d postgres
sleep 10

# e) Restaurar dump
cat /tmp/pg_full_dump.sql | docker exec -i nike-postgres psql -U nikeadmin -d postgres

# f) Levantar el resto
docker compose up -d
```

### Keycloak

```bash
# Keycloak maneja migraciones de schema automáticamente
# Solo verificar changelogs para deprecated features

nano .env  # Cambiar KC version
docker compose pull keycloak
docker compose up -d keycloak

# Verificar que el realm sigue funcionando
curl -s http://auth.nike.com/realms/lab/.well-known/openid_configuration | head
```

### Traefik

```bash
# Traefik v3.x → v3.y generalmente es compatible
# Verificar changelogs para cambios en configuración YAML

nano .env
docker compose pull traefik
docker compose up -d traefik
docker compose logs -f traefik

# Verificar que todos los routers funcionan
curl -s http://auth.nike.com -o /dev/null -w "%{http_code}"
curl -s http://git.nike.com -o /dev/null -w "%{http_code}"
```

### Gitea

```bash
# Gitea maneja migraciones automáticas de BD
nano .env
docker compose pull gitea
docker compose up -d gitea

# Verificar
curl -s http://git.nike.com/api/healthz
```

---

## Actualizar Docker Engine

```bash
# Actualizar paquetes
sudo apt update
sudo apt upgrade -y docker-ce docker-ce-cli containerd.io

# Verificar
docker --version

# Los contenedores se reiniciarán automáticamente (unless-stopped)
```

## Actualizar Ubuntu Server

```bash
# Actualizar paquetes (sin upgrade de versión mayor)
sudo apt update && sudo apt upgrade -y

# Si requiere reinicio
sudo reboot

# Los contenedores arrancarán automáticamente con Docker
```

## Calendario de Mantenimiento Recomendado

| Frecuencia | Acción |
|---|---|
| Diario | Backup automático (cron) |
| Semanal | Revisar logs de errores, espacio en disco |
| Mensual | Verificar actualizaciones de seguridad |
| Trimestral | Actualizar servicios a última minor version |
| Semestral | Evaluar major upgrades |
