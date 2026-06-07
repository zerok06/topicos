# Estrategia de Backup y Restore

## Resumen

| Aspecto | Detalle |
|---|---|
| Método | pg_dumpall + copia de volúmenes Docker |
| Frecuencia recomendada | Diaria a las 02:00 AM |
| Retención | 7 días (configurable) |
| Ubicación | `/opt/nike-backups/` |
| Compresión | tar + gzip |
| Verificación | SHA256 checksum |

## Qué se respalda

### Bases de datos (PostgreSQL)
- `keycloak` — Usuarios, roles, configuración SSO
- `gitea` — Repositorios, issues, usuarios
- `grafana` — Dashboards, alertas, configuración

### Volúmenes Docker
- `nike_gitea_data` — Repositorios Git (archivos)
- `nike_grafana_data` — Plugins, datos locales
- `nike_portainer_data` — Configuración de Portainer
- `nike_adguard_work` — Logs y estadísticas DNS
- `nike_wireguard_data` — Claves y configuración VPN
- `nike_traefik_certs` — Certificados TLS (cuando se habiliten)

### Configuraciones
- Todos los archivos YAML, JSON, HTML del proyecto
- `.env` (con secretos)

## Qué NO se respalda (no es necesario)

- `nike_postgres_data` — Se reconstruye desde el dump SQL
- `nike_prometheus_data` — Métricas son efímeras (retención 15d)
- Imágenes Docker — Se descargan con `docker compose pull`

## Ejecución Manual

```bash
# Backup
sudo ./backups/scripts/backup.sh

# Backup a directorio personalizado
sudo ./backups/scripts/backup.sh /mnt/usb-backup

# Restore
sudo ./backups/scripts/restore.sh /opt/nike-backups/nike-backup-20260606_020000.tar.gz
```

## Programación Automática (Cron)

```bash
# Editar crontab del root
sudo crontab -e

# Agregar línea para backup diario a las 02:00 AM
0 2 * * * /opt/nike-platform/backups/scripts/backup.sh >> /var/log/lab-backup.log 2>&1
```

## Verificar Backups

```bash
# Listar backups disponibles
ls -lh /opt/nike-backups/

# Verificar integridad
cd /opt/nike-backups
sha256sum -c nike-backup-*.sha256

# Ver contenido sin extraer
tar tzf nike-backup-20260606_020000.tar.gz | head -20
```

## Restore en Servidor Nuevo

Si necesitas restaurar en un servidor completamente nuevo:

1. Instalar Ubuntu Server 24.04 LTS
2. Instalar Docker Engine (ver README.md)
3. Configurar IP estática
4. Copiar archivos del proyecto
5. Copiar archivo de backup
6. Ejecutar restore:

```bash
cd /opt/nike-platform
sudo ./backups/scripts/restore.sh /ruta/al/backup.tar.gz
```

## Backup a Dispositivo Externo

```bash
# Montar USB
sudo mount /dev/sdb1 /mnt/usb

# Ejecutar backup directamente al USB
sudo ./backups/scripts/backup.sh /mnt/usb/nike-backups

# Desmontar
sudo umount /mnt/usb
```

## Tamaño Estimado de Backups

| Componente | Tamaño típico |
|---|---|
| PostgreSQL dumps | 5-50 MB |
| Gitea data | 10-500 MB (depende de repos) |
| Grafana data | 5-20 MB |
| Portainer data | 1-5 MB |
| WireGuard data | <1 MB |
| Configs | <1 MB |
| **Total comprimido** | **20-500 MB** |
