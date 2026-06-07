# Checklist de Seguridad

## Pre-Despliegue

### Contraseñas y Secretos
- [ ] Cambiar **todas** las contraseñas por defecto en `.env`
- [ ] Usar contraseñas de al menos 16 caracteres con mayúsculas, minúsculas, números y símbolos
- [ ] Generar `WGEASY_PASSWORD_HASH` con el comando de wg-easy
- [ ] Generar `ADGUARD_PASSWORD_HASH` con htpasswd
- [ ] Cambiar `GITEA_SECRET_KEY` por un valor aleatorio
- [ ] Cambiar `GITEA_INTERNAL_TOKEN` por un JWT válido
- [ ] Cambiar los `secret` de los clients en `realm-export.json`
- [ ] No subir `.env` a repositorios Git (añadir a `.gitignore`)

### Red
- [ ] Configurar IP estática en el servidor
- [ ] Verificar que solo los puertos necesarios están expuestos
- [ ] Configurar firewall (UFW):
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow ssh
  sudo ufw allow 80/tcp      # HTTP
  sudo ufw allow 443/tcp     # HTTPS (futuro)
  sudo ufw allow 53/tcp      # DNS
  sudo ufw allow 53/udp      # DNS
  sudo ufw allow 51820/udp   # WireGuard
  sudo ufw allow 2222/tcp    # Git SSH
  sudo ufw enable
  ```
- [ ] Desactivar `systemd-resolved` si interfiere con el puerto 53

### Docker
- [ ] Docker socket montado como `:ro` en Traefik (solo lectura)
- [ ] Docker socket con acceso completo solo en Portainer (necesario para gestión)
- [ ] Verificar que no hay contenedores con `privileged: true` (excepto wg-easy con caps específicas)
- [ ] Redes Docker separadas por dominio funcional

### Sistema Operativo
- [ ] Actualizar Ubuntu: `sudo apt update && sudo apt upgrade -y`
- [ ] Deshabilitar login SSH por contraseña (usar claves SSH)
  ```bash
  sudo nano /etc/ssh/sshd_config
  # PasswordAuthentication no
  sudo systemctl restart sshd
  ```
- [ ] Crear usuario no-root para operaciones diarias
- [ ] Configurar actualizaciones automáticas de seguridad:
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure unattended-upgrades
  ```

---

## Post-Despliegue

### Keycloak (Identity)
- [ ] Cambiar contraseña del admin de Keycloak desde la UI
- [ ] Verificar que la política de contraseñas está activa (min 8 chars)
- [ ] Habilitar protección contra fuerza bruta (ya configurada en realm)
- [ ] Revisar que MFA/OTP está disponible como opción
- [ ] No habilitar registro público de usuarios (controlado vía admin)
- [ ] Verificar que los client secrets son únicos y fuertes

### Gitea
- [ ] Verificar que el registro de usuarios está controlado
- [ ] Habilitar autenticación OAuth2 con Keycloak
- [ ] Verificar permisos de repositorios por defecto

### Grafana
- [ ] Cambiar contraseña admin desde la UI
- [ ] Deshabilitar registro de usuarios (ya en .env)
- [ ] Configurar OAuth2 con Keycloak para acceso SSO

### AdGuard Home
- [ ] Cambiar contraseña desde la UI
- [ ] Verificar que los DNS rewrites apuntan a la IP correcta
- [ ] Habilitar DNSSEC (ya configurado)
- [ ] Revisar listas de bloqueo activas

### WireGuard
- [ ] Generar un password hash seguro y actualizar `.env`
- [ ] Limitar peers VPN solo a usuarios autorizados
- [ ] Configurar `WG_ALLOWED_IPS` para restringir acceso solo a la red interna

### Portainer
- [ ] Completar setup inicial con contraseña fuerte
- [ ] Limitar acceso a administradores
- [ ] Considerar deshabilitar el acceso público y acceder solo por VPN

---

## Monitoreo de Seguridad Continuo

### Semanal
- [ ] Revisar logs de Keycloak para intentos de login fallidos
  ```bash
  docker compose logs keycloak | grep -i "login_error"
  ```
- [ ] Verificar que no hay contenedores con estado anormal
  ```bash
  docker compose ps
  ```
- [ ] Revisar uso de disco
  ```bash
  df -h && docker system df
  ```

### Mensual
- [ ] Verificar actualizaciones de seguridad para Ubuntu
  ```bash
  sudo apt list --upgradable
  ```
- [ ] Revisar changelogs de servicios para CVEs
- [ ] Verificar integridad de backups
  ```bash
  sha256sum -c /opt/nike-backups/nike-backup-*.sha256
  ```
- [ ] Revisar peers VPN activos y remover los no autorizados

### Trimestral
- [ ] Rotar contraseñas de servicios críticos (PostgreSQL, Keycloak admin)
- [ ] Revisar y actualizar reglas de firewall
- [ ] Actualizar servicios a últimas versiones estables
- [ ] Revisar certificados TLS (cuando se habilite HTTPS)
- [ ] Auditar usuarios y roles en Keycloak

---

## Preparación para HTTPS Futuro

Cuando se quiera habilitar HTTPS:

1. **Obtener dominio público** (si acceso externo) o usar certificados auto-firmados
2. **Descomentar secciones** en `traefik/traefik.yml`:
   - `certificatesResolvers`
   - Redirección HTTP → HTTPS en entrypoints
3. **Actualizar URLs** en `.env`:
   - `GITEA_ROOT_URL=https://git.nike.com`
   - `GF_SERVER_ROOT_URL=https://grafana.nike.com`
4. **Actualizar Keycloak**:
   - Cambiar `sslRequired` a `external` en realm
5. **Actualizar URLs** en `realm-export.json` (redirectUris)

---

## Checklist de `.gitignore`

Crear un archivo `.gitignore` en la raíz del proyecto:

```gitignore
# Secretos
.env

# Volúmenes locales
data/

# Backups
backups/data/
/opt/nike-backups/

# Logs
*.log

# OS
.DS_Store
Thumbs.db
```
