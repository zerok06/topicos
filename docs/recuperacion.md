# Guía de Recuperación ante Fallos

## Escenarios de Fallo y Procedimientos

---

### 1. Un contenedor falla y no reinicia

**Síntomas:** `docker compose ps` muestra un servicio como `Exited` o `Restarting`

```bash
# 1. Ver logs del servicio
docker compose logs --tail=100 <servicio>

# 2. Intentar reinicio manual
docker compose restart <servicio>

# 3. Si persiste, recrear el contenedor
docker compose up -d --force-recreate <servicio>

# 4. Si aún falla, verificar recursos
docker stats --no-stream
df -h
free -h
```

**Causas comunes:**
- Falta de memoria (OOM killer)
- Disco lleno
- Puerto en uso por otro proceso
- Volumen corrupto

---

### 2. PostgreSQL no inicia

**Criticidad: ALTA** — Afecta a Keycloak, Gitea y Grafana.

```bash
# 1. Ver logs
docker compose logs --tail=50 postgres

# 2. Verificar permisos del volumen
docker volume inspect nike_postgres_data

# 3. Si el volumen está corrupto, restaurar desde backup
docker compose stop
docker volume rm nike_postgres_data
docker compose up -d postgres
sleep 15

# 4. Restaurar datos
docker exec -i nike-postgres psql -U nikeadmin -d postgres < /opt/nike-backups/último-backup/postgres_all_databases.sql

# 5. Levantar el resto
docker compose up -d
```

---

### 3. Keycloak no inicia

```bash
# 1. Causas comunes:
#    - PostgreSQL no está listo
#    - Base de datos keycloak no existe
#    - Variables de entorno incorrectas

# 2. Verificar que PostgreSQL está healthy
docker compose ps postgres

# 3. Verificar que la BD existe
docker exec nike-postgres psql -U nikeadmin -l | grep keycloak

# 4. Si no existe, crearla
docker exec nike-postgres psql -U nikeadmin -c "CREATE DATABASE keycloak;"

# 5. Reiniciar Keycloak
docker compose restart keycloak
```

---

### 4. DNS no resuelve dominios .lab

```bash
# 1. Verificar que AdGuard está corriendo
docker compose ps adguard

# 2. Probar resolución directa
dig @192.168.1.100 auth.nike.com

# 3. Si no responde, reiniciar
docker compose restart adguard

# 4. Verificar que el puerto 53 no está ocupado
sudo ss -tlnp | grep :53

# 5. Si systemd-resolved ocupa el puerto 53:
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved
sudo rm /etc/resolv.conf
echo "nameserver 127.0.0.1" | sudo tee /etc/resolv.conf
docker compose restart adguard

# 6. Verificar configuración de AdGuard
cat adguard/conf/AdGuardHome.yaml | grep -A 2 "rewrites"
```

---

### 5. Traefik no rutea tráfico

```bash
# 1. Verificar que Traefik está corriendo
docker compose ps traefik

# 2. Verificar dashboard
curl http://192.168.1.100:80/api/http/routers | python3 -m json.tool

# 3. Verificar que los servicios tienen labels correctos
docker inspect nike-gitea | grep -A 5 "traefik"

# 4. Verificar redes
docker network inspect nike_frontend

# 5. Reiniciar Traefik
docker compose restart traefik
```

---

### 6. Disco lleno

```bash
# 1. Verificar espacio
df -h

# 2. Ver uso de Docker
docker system df

# 3. Limpiar imágenes no usadas
docker image prune -a

# 4. Limpiar build cache
docker builder prune

# 5. Limpiar logs de contenedores
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log

# 6. Verificar backups antiguos
ls -lh /opt/nike-backups/
# Eliminar manualmente si es necesario
```

---

### 7. Servidor se reinició inesperadamente

```bash
# 1. Todos los servicios deben iniciar automáticamente (restart: unless-stopped)
# Verificar:
docker compose ps

# 2. Si algún servicio no inició, el orden de dependencias pudo fallar
# Levantar todo en orden
docker compose up -d

# 3. Verificar healthchecks
docker compose ps --format "table {{.Name}}\t{{.Status}}"

# 4. Verificar que Docker inicia con el sistema
sudo systemctl enable docker
sudo systemctl status docker
```

---

### 8. Pérdida total del servidor (Disaster Recovery)

**Procedimiento para reconstruir desde cero:**

```bash
# EN EL NUEVO SERVIDOR:

# 1. Instalar Ubuntu Server 24.04 LTS
# 2. Configurar IP estática (192.168.1.100)
# 3. Instalar Docker Engine (ver README.md)

# 4. Copiar archivos del proyecto
# (desde backup USB, otro servidor, o repositorio Git)
sudo mkdir -p /opt/nike-platform
# Copiar archivos...

# 5. Copiar archivo de backup más reciente
sudo mkdir -p /opt/nike-backups
# Copiar backup...

# 6. Configurar .env
cd /opt/nike-platform
cp .env.example .env
nano .env  # Configurar con los valores correctos

# 7. Hacer pull de todas las imágenes
docker compose pull

# 8. Ejecutar restore
sudo ./backups/scripts/restore.sh /opt/nike-backups/nike-backup-XXXX.tar.gz

# 9. Verificar
docker compose ps
dig @192.168.1.100 auth.nike.com
curl http://intranet.nike.com
```

**Tiempo estimado de recuperación:** 30-60 minutos (dependiendo del tamaño del backup y velocidad de descarga de imágenes Docker).

---

### 9. Falla de red

```bash
# Si los clientes no pueden acceder a los servicios:

# 1. Verificar conectividad al servidor
ping 192.168.1.100

# 2. Verificar que los puertos están abiertos
sudo ss -tlnp | grep -E '(80|443|53|51820)'

# 3. Verificar firewall
sudo ufw status
# Si está activo, abrir puertos necesarios:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 53/tcp
sudo ufw allow 53/udp
sudo ufw allow 51820/udp
sudo ufw allow 2222/tcp  # Git SSH

# 4. Verificar redes Docker
docker network ls
docker network inspect nike_frontend
```

---

## Contactos y Recursos

| Recurso | URL |
|---|---|
| Docker docs | https://docs.docker.com |
| Traefik docs | https://doc.traefik.io/traefik/ |
| Keycloak docs | https://www.keycloak.org/documentation |
| Grafana docs | https://grafana.com/docs/ |
| Gitea docs | https://docs.gitea.com |
| AdGuard Home | https://github.com/AdguardTeam/AdGuardHome/wiki |
| wg-easy | https://github.com/wg-easy/wg-easy |
