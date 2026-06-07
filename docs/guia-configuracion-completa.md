# Guía de Configuración Completa — Enterprise Lab Platform

> Esta guía cubre la configuración completa de TODOS los servicios, paso a paso,
> desde un servidor Ubuntu vacío hasta un ecosistema 100% funcional y verificado.
>
> ⏱️ Tiempo estimado: 60-90 minutos

---

## Índice

1. [Fase 1: Preparación del Servidor](#fase-1-preparación-del-servidor)
2. [Fase 2: Despliegue Inicial](#fase-2-despliegue-inicial)
3. [Fase 3: Configurar AdGuard Home (DNS)](#fase-3-configurar-adguard-home-dns)
4. [Fase 4: Configurar Keycloak (Identity Provider)](#fase-4-configurar-keycloak-identity-provider)
5. [Fase 5: Configurar Gitea (Git + SSO)](#fase-5-configurar-gitea-git--sso)
6. [Fase 6: Configurar Grafana (Dashboards + SSO)](#fase-6-configurar-grafana-dashboards--sso)
7. [Fase 7: Configurar Portainer (Docker Management)](#fase-7-configurar-portainer-docker-management)
8. [Fase 8: Configurar WireGuard VPN](#fase-8-configurar-wireguard-vpn)
9. [Fase 9: Configurar Prometheus (Métricas)](#fase-9-configurar-prometheus-métricas)
10. [Fase 10: Configurar Clientes (DNS)](#fase-10-configurar-clientes-dns)
11. [Fase 11: Prueba Completa del Ecosistema](#fase-11-prueba-completa-del-ecosistema)

---

## Fase 1: Preparación del Servidor

### 1.1 Instalar Ubuntu Server 24.04 LTS

Instalar con las opciones por defecto. Seleccionar "OpenSSH server" durante la instalación.

### 1.2 Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### 1.3 Instalar Docker Engine

```bash
# Dependencias
sudo apt install -y ca-certificates curl gnupg lsb-release

# Repositorio oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker --version
docker compose version
```

### 1.4 Configurar IP Estática

```bash
# Identificar la interfaz de red
ip a
# Buscar algo como: enp0s3, eth0, ens18, etc.

# Editar Netplan
sudo nano /etc/netplan/01-netcfg.yaml
```

Contenido (cambiar `enp0s3` por tu interfaz):

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1    # IP de tu router
      nameservers:
        addresses:
          - 127.0.0.1
          - 1.1.1.1
```

```bash
sudo netplan apply
# Verificar
ip addr show enp0s3
```

### 1.5 Desactivar systemd-resolved (liberar puerto 53)

AdGuard Home necesita el puerto 53. `systemd-resolved` lo ocupa por defecto.

```bash
# Verificar si el puerto 53 está ocupado
sudo ss -tlnp | grep :53

# Si systemd-resolved lo ocupa:
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved

# Reemplazar resolv.conf
sudo rm /etc/resolv.conf
echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf

# Verificar que el puerto 53 está libre
sudo ss -tlnp | grep :53
# Debe estar vacío
```

### 1.6 Configurar firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp       # HTTP (Traefik)
sudo ufw allow 443/tcp      # HTTPS futuro
sudo ufw allow 53/tcp       # DNS
sudo ufw allow 53/udp       # DNS
sudo ufw allow 51820/udp    # WireGuard VPN
sudo ufw allow 2222/tcp     # Git SSH
sudo ufw allow 3053/tcp     # AdGuard UI directo (opcional)
sudo ufw enable
sudo ufw status
```

### 1.7 Copiar archivos del proyecto

```bash
sudo mkdir -p /opt/lab-platform
cd /opt/lab-platform

# Si usas SCP desde tu máquina Windows:
# scp -r topicos/* usuario@192.168.1.100:/opt/lab-platform/

# Si usas Git:
# git clone <URL_REPO> .

# Asegurar permisos
sudo chown -R $USER:$USER /opt/lab-platform
chmod +x backups/scripts/*.sh
chmod +x postgres/init-databases.sh
```

---

## Fase 2: Despliegue Inicial

### 2.1 Configurar variables de entorno

```bash
cd /opt/lab-platform
nano .env
```

**Variables OBLIGATORIAS a cambiar:**

```bash
# Tu IP real del servidor
SERVER_IP=192.168.1.100       # ← CAMBIAR

# Contraseñas seguras (mínimo 16 caracteres)
POSTGRES_PASSWORD=TuPassword_PostgreSQL_Segura!
KC_ADMIN_PASSWORD=TuPassword_Keycloak_Segura!
KC_DB_PASSWORD=TuPassword_PostgreSQL_Segura!    # Igual que POSTGRES_PASSWORD
GITEA_DB_PASSWD=TuPassword_PostgreSQL_Segura!   # Igual que POSTGRES_PASSWORD
GF_SECURITY_ADMIN_PASSWORD=TuPassword_Grafana_Segura!
GF_DATABASE_PASSWORD=TuPassword_PostgreSQL_Segura!  # Igual que POSTGRES_PASSWORD

# WireGuard host
WG_HOST=192.168.1.100        # ← CAMBIAR (igual que SERVER_IP)
WG_DEFAULT_DNS=192.168.1.100 # ← CAMBIAR (igual que SERVER_IP)
```

### 2.2 Generar hash de contraseña para WireGuard

```bash
# Ejecutar esto y copiar el hash resultante
docker run --rm -it ghcr.io/wg-easy/wg-easy wgpw 'TuPasswordVPN_Segura!'

# El resultado será algo como:
# $2a$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# En el .env, DUPLICAR cada $ → $$
# Ejemplo: $2a$12$abc... → $$2a$$12$$abc...
nano .env
# Pegar el hash en WGEASY_PASSWORD_HASH
```

### 2.3 Configurar IP en AdGuard

```bash
# Reemplazar 192.168.1.100 por tu IP real en TODAS las ocurrencias
sed -i 's/192.168.1.100/TU_IP_REAL/g' adguard/conf/AdGuardHome.yaml
```

### 2.4 Generar hash para AdGuard Home

```bash
sudo apt install -y apache2-utils
htpasswd -nbB admin 'TuPasswordAdGuard_Segura!'
# Resultado: admin:$2y$05$xxxx...

# Copiar SOLO la parte después de "admin:" al archivo AdGuardHome.yaml
nano adguard/conf/AdGuardHome.yaml
# Buscar la línea "password:" bajo "users:" y reemplazar
```

### 2.5 Descargar imágenes y levantar servicios

```bash
cd /opt/lab-platform

# Descargar todas las imágenes (3-5 GB, tarda según Internet)
docker compose pull

# Levantar todo
docker compose up -d

# Ver el progreso
docker compose logs -f
# Ctrl+C para salir de los logs
```

### 2.6 Verificar que todo arrancó

```bash
# Ver estado de todos los contenedores
docker compose ps

# Todos deben mostrar "Up" y "(healthy)"
# Keycloak puede tardar 1-2 minutos en estar healthy
```

**Resultado esperado:**
```
NAME              STATUS                    PORTS
lab-adguard       Up (healthy)              53/tcp, 53/udp, 3053->3000/tcp
lab-gitea         Up (healthy)              3000/tcp, 2222->22/tcp
lab-grafana       Up (healthy)              3000/tcp
lab-intranet      Up (healthy)              80/tcp
lab-keycloak      Up (healthy)              8080/tcp
lab-node-exporter Up (healthy)              9100/tcp
lab-portal        Up (healthy)              80/tcp
lab-portainer     Up (healthy)              9000/tcp
lab-postgres      Up (healthy)              5432/tcp
lab-prometheus    Up (healthy)              9090/tcp
lab-traefik       Up (healthy)              80/tcp, 443/tcp
lab-wireguard     Up (healthy)              51820/udp, 51821/tcp
```

> ⚠️ Si algún servicio dice "Restarting" o "Exit", ver logs:
> `docker compose logs <servicio>`

---

## Fase 3: Configurar AdGuard Home (DNS)

### 3.1 Acceder a la UI

Desde el servidor o un navegador en la red local:
```
http://192.168.1.100:3053
```

> ℹ️ La primera vez puede pedir configuración inicial. Si la configuración YAML
> ya está cargada, se salta el wizard.

### 3.2 Verificar login

- **Usuario:** `admin`
- **Contraseña:** La que configuraste en el hash

### 3.3 Verificar DNS Rewrites

1. Ir a **Filtros → Reescrituras DNS**
2. Verificar que aparecen todos los dominios `.lab`:
   - `auth.lab` → `192.168.1.100`
   - `git.lab` → `192.168.1.100`
   - `grafana.lab` → `192.168.1.100`
   - `prometheus.lab` → `192.168.1.100`
   - `portainer.lab` → `192.168.1.100`
   - `intranet.lab` → `192.168.1.100`
   - `portal.lab` → `192.168.1.100`
   - `adguard.lab` → `192.168.1.100`
   - `vpn.lab` → `192.168.1.100`
   - `*.lab` → `192.168.1.100`

### 3.4 Verificar resolución DNS

Desde el servidor:
```bash
# Instalar dnsutils si no está
sudo apt install -y dnsutils

# Probar resolución
dig @192.168.1.100 auth.lab +short
# Debe responder: 192.168.1.100

dig @192.168.1.100 git.lab +short
# Debe responder: 192.168.1.100

dig @192.168.1.100 google.com +short
# Debe responder con una IP pública (si tienes Internet)
```

### 3.5 Configurar el servidor para usar su propio DNS

```bash
# Editar resolv.conf
sudo nano /etc/resolv.conf
```

Contenido:
```
nameserver 127.0.0.1
nameserver 1.1.1.1
```

Verificar:
```bash
# Ahora debe resolver sin especificar el servidor
dig auth.lab +short
# Debe responder: 192.168.1.100
```

**✅ AdGuard Home está configurado.**

---

## Fase 4: Configurar Keycloak (Identity Provider)

### 4.1 Acceder a la consola de administración

```
http://auth.lab
```

- **Usuario:** `admin`
- **Contraseña:** El valor de `KC_ADMIN_PASSWORD` en tu `.env`

### 4.2 Verificar que el realm "lab" se importó

1. En la esquina superior izquierda, hacer click en el dropdown de realm
2. Debe aparecer **"lab"** además de **"master"**
3. Seleccionar el realm **"lab"**

> Si el realm "lab" no aparece, importar manualmente:
> 1. Ir a la esquina superior izquierda → **Create realm**
> 2. Click en **Browse** → seleccionar `realm-export.json`
> 3. Click en **Create**

### 4.3 Verificar clientes OAuth2

1. En el realm "lab", ir a **Clients**
2. Deben aparecer 3 clientes:
   - **gitea** — Para el repositorio Git
   - **grafana** — Para los dashboards
   - **portainer** — Para gestión Docker

### 4.4 Verificar roles

1. Ir a **Realm roles**
2. Deben existir:
   - `admin` — Administrador de la plataforma
   - `developer` — Desarrollador
   - `viewer` — Solo lectura

### 4.5 Verificar grupos

1. Ir a **Groups**
2. Deben existir:
   - `engineering` (con rol `developer`)
   - `operations` (con rol `admin`)

### 4.6 Crear usuarios de prueba

#### Usuario Empleado (acceso completo):

1. Ir a **Users → Create new user**
2. Datos:
   - **Username:** `empleado1`
   - **Email:** `empleado1@lab.local`
   - **Email verified:** ✅
   - **First name:** `Juan`
   - **Last name:** `Pérez`
3. Click **Create**
4. Ir a la pestaña **Credentials**:
   - Click **Set password**
   - **Password:** `Empleado1_2026!`
   - **Temporary:** OFF (desmarcar para no forzar cambio)
   - Click **Save**
5. Ir a la pestaña **Role mapping**:
   - Click **Assign role**
   - Seleccionar `admin` y `developer`
   - Click **Assign**
6. Ir a la pestaña **Groups**:
   - Click **Join group**
   - Seleccionar `engineering`
   - Click **Join**

#### Usuario Invitado (sin acceso interno):

> ℹ️ Los invitados NO necesitan usuario en Keycloak.
> Solo acceden al Portal Público (portal.lab) sin autenticación.
> Los servicios internos (intranet.lab) solo están disponibles para empleados.

### 4.7 Obtener los Client Secrets

Necesitarás estos valores para configurar Gitea y Grafana:

#### Secret de Gitea:
1. Ir a **Clients → gitea**
2. Pestaña **Credentials**
3. Copiar el **Client secret** (o usar el del realm-export: `gitea-client-secret-change-me-2026`)

#### Secret de Grafana:
1. Ir a **Clients → grafana**
2. Pestaña **Credentials**
3. Copiar el **Client secret** (o usar el del realm-export: `grafana-client-secret-change-me-2026`)

> ⚠️ En producción, regenera estos secrets desde Keycloak y actualiza las
> configuraciones correspondientes.

**✅ Keycloak está configurado.**

---

## Fase 5: Configurar Gitea (Git + SSO)

### 5.1 Primer acceso

```
http://git.lab
```

La primera vez muestra un formulario de configuración inicial. Los valores del `.env` ya están aplicados, pero verifica:

- **Database Type:** PostgreSQL
- **Host:** postgres:5432
- **Database Name:** gitea
- **Site Title:** Enterprise Lab Git

Click **Install Gitea** (si aparece el formulario).

### 5.2 Crear cuenta administrador

Si el formulario de instalación lo pide:
- **Username:** `gitadmin`
- **Password:** Una contraseña segura
- **Email:** `gitadmin@lab.local`

### 5.3 Configurar OAuth2 con Keycloak

1. Login como administrador
2. Ir a **Site Administration** (icono de herramienta arriba a la derecha)
3. Ir a **Identity & Access → Authentication Sources**
4. Click **Add Authentication Source**
5. Configurar:

| Campo | Valor |
|---|---|
| **Authentication Type** | OAuth2 |
| **Authentication Name** | keycloak |
| **OAuth2 Provider** | OpenID Connect |
| **Client ID** | `gitea` |
| **Client Secret** | `gitea-client-secret-change-me-2026` (o el que copiaste) |
| **OpenID Connect Auto Discovery URL** | `http://auth.lab/realms/lab/.well-known/openid-configuration` |
| **Additional Scopes** | `openid profile email` |
| **Required Claim Name** | (dejar vacío) |
| **Required Claim Value** | (dejar vacío) |
| **Group Claim Name** | `groups` |
| **Admin Group** | `operations` |
| **Restrict to Group Members** | (dejar vacío, o marcar si quieres restringir) |

6. Click **Add Authentication Source**

### 5.4 Probar login SSO

1. Cerrar sesión de Gitea
2. En la página de login, debe aparecer el botón **"Sign in with keycloak"**
3. Click → Redirige a Keycloak → Login con `empleado1` / `Empleado1_2026!`
4. Keycloak redirige de vuelta a Gitea → Sesión iniciada

**✅ Gitea está configurado con SSO.**

---

## Fase 6: Configurar Grafana (Dashboards + SSO)

### 6.1 Primer acceso

```
http://grafana.lab
```

- **Usuario:** `admin`
- **Contraseña:** El valor de `GF_SECURITY_ADMIN_PASSWORD` en tu `.env`

### 6.2 Verificar Datasource

1. Ir a **Connections → Data sources**
2. Debe aparecer **Prometheus** (auto-provisioned)
3. Click en Prometheus → **Test** → Debe decir "Data source is working"

### 6.3 Verificar Dashboard

1. Ir a **Dashboards**
2. Buscar la carpeta **Lab Platform**
3. Abrir **Node Exporter — Server Overview**
4. Debes ver paneles de CPU, RAM, Disco y Red con datos en tiempo real

### 6.4 Configurar OAuth2 con Keycloak (opcional)

Para login SSO en Grafana, agregar estas variables al servicio `grafana` en `docker-compose.yml`:

```bash
# Detener Grafana
docker compose stop grafana

# Editar docker-compose.yml y agregar estas variables al servicio grafana:
nano docker-compose.yml
```

Agregar en la sección `environment` de `grafana`:

```yaml
      GF_AUTH_GENERIC_OAUTH_ENABLED: "true"
      GF_AUTH_GENERIC_OAUTH_NAME: "Keycloak SSO"
      GF_AUTH_GENERIC_OAUTH_CLIENT_ID: "grafana"
      GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET: "grafana-client-secret-change-me-2026"
      GF_AUTH_GENERIC_OAUTH_SCOPES: "openid profile email roles"
      GF_AUTH_GENERIC_OAUTH_AUTH_URL: "http://auth.lab/realms/lab/protocol/openid-connect/auth"
      GF_AUTH_GENERIC_OAUTH_TOKEN_URL: "http://keycloak:8080/realms/lab/protocol/openid-connect/token"
      GF_AUTH_GENERIC_OAUTH_API_URL: "http://keycloak:8080/realms/lab/protocol/openid-connect/userinfo"
      GF_AUTH_GENERIC_OAUTH_ROLE_ATTRIBUTE_PATH: "contains(roles[*], 'admin') && 'Admin' || contains(roles[*], 'developer') && 'Editor' || 'Viewer'"
      GF_AUTH_GENERIC_OAUTH_ALLOW_ASSIGN_GRAFANA_ADMIN: "true"
      GF_AUTH_SIGNOUT_REDIRECT_URL: "http://auth.lab/realms/lab/protocol/openid-connect/logout?post_logout_redirect_uri=http%3A%2F%2Fgrafana.lab%2Flogin&client_id=grafana"
```

> ⚠️ **IMPORTANTE — URLs internas vs externas:**
> - `AUTH_URL` usa `auth.lab` → Esta URL la ve el **navegador del usuario** (debe resolver por DNS)
> - `TOKEN_URL` y `API_URL` usan `keycloak:8080` → Estas las usa **Grafana internamente** (Docker DNS)

```bash
# Reiniciar Grafana
docker compose up -d grafana
```

### 6.5 Probar SSO en Grafana

1. Ir a `http://grafana.lab`
2. Debe aparecer botón **"Sign in with Keycloak SSO"**
3. Click → Login con `empleado1` → Redirige de vuelta a Grafana

**✅ Grafana está configurado.**

---

## Fase 7: Configurar Portainer (Docker Management)

### 7.1 Primer acceso

```
http://portainer.lab
```

### 7.2 Crear cuenta administrador

La primera vez pide crear un admin:
- **Username:** `admin`
- **Password:** Una contraseña segura (mínimo 12 caracteres)

### 7.3 Seleccionar entorno

1. Seleccionar **"Get Started"** o **"Local"**
2. Portainer detecta automáticamente el Docker Engine local

### 7.4 Verificar contenedores

1. Ir a **Home → local → Containers**
2. Deben aparecer los 12 contenedores del lab
3. Todos deben estar en estado **Running** (verde)

### 7.5 Verificar stacks

1. Ir a **Stacks**
2. Debe aparecer el stack **lab** con todos los servicios

**✅ Portainer está configurado.**

---

## Fase 8: Configurar WireGuard VPN

### 8.1 Acceder a la UI

```
http://vpn.lab
```

- **Contraseña:** La que usaste para generar el hash en el `.env`

### 8.2 Crear peer para la laptop (empleado)

1. Click **"+ New"** o **"New Client"**
2. **Name:** `laptop-juan`
3. Click **Create**
4. Descargar el archivo de configuración `.conf` o escanear el QR

### 8.3 Instalar WireGuard en la laptop

**Windows/Mac:**
1. Descargar WireGuard desde https://www.wireguard.com/install/
2. Importar el archivo `.conf` descargado
3. Activar el túnel

**Linux:**
```bash
sudo apt install wireguard
sudo cp laptop-juan.conf /etc/wireguard/wg0.conf
sudo wg-quick up wg0
```

### 8.4 Crear peer para celular (invitado con VPN)

1. Click **"+ New"**
2. **Name:** `celular-invitado`
3. Click **Create**
4. Escanear el QR desde la app WireGuard del celular

**Android/iOS:**
1. Instalar app **WireGuard** desde Play Store / App Store
2. Escanear el código QR mostrado en la UI
3. Activar la conexión

### 8.5 Verificar conectividad VPN

Desde el dispositivo conectado por VPN:
```bash
# Verificar que alcanza el servidor
ping 192.168.1.100

# Verificar resolución DNS (si DNS apunta al servidor)
nslookup auth.lab 192.168.1.100
```

**✅ WireGuard VPN está configurado.**

---

## Fase 9: Configurar Prometheus (Métricas)

### 9.1 Acceder a Prometheus

```
http://prometheus.lab
```

### 9.2 Verificar targets

1. Ir a **Status → Targets**
2. Todos los targets deben estar en estado **UP** (verde):
   - `prometheus` — Self-monitoring
   - `node-exporter` — Métricas del host
   - `traefik` — Métricas del proxy
   - `keycloak` — Métricas de identidad
   - `gitea` — Métricas del Git
   - `grafana` — Métricas de dashboards

> ⚠️ Si algún target dice **DOWN**, verificar:
> - Que el servicio está corriendo: `docker compose ps`
> - Que comparten red: revisar redes en `docker-compose.yml`
> - Que la ruta `/metrics` está habilitada

### 9.3 Probar una consulta

1. En la página principal de Prometheus
2. En el campo de query, escribir: `up`
3. Click **Execute**
4. Debe mostrar todos los targets con valor `1`

**✅ Prometheus está configurado.**

---

## Fase 10: Configurar Clientes (DNS)

Para que los dispositivos de la red resuelvan los dominios `.lab`, deben usar
el servidor como DNS.

### Opción A: Configurar en el Router (recomendado)

1. Acceder al panel del router (generalmente `192.168.1.1`)
2. Ir a configuración DHCP
3. Cambiar **DNS primario** a `192.168.1.100`
4. DNS secundario: `1.1.1.1` o `8.8.8.8`
5. Guardar y reiniciar dispositivos para que tomen el nuevo DNS

### Opción B: Configurar por dispositivo

#### Windows (Laptop del empleado):
1. **Panel de Control → Centro de redes → Cambiar configuración del adaptador**
2. Click derecho en tu conexión → **Propiedades**
3. Seleccionar **Protocolo de Internet versión 4 (TCP/IPv4)** → **Propiedades**
4. Seleccionar **Usar las siguientes direcciones de servidor DNS:**
   - DNS preferido: `192.168.1.100`
   - DNS alternativo: `1.1.1.1`
5. **Aceptar** y cerrar

Verificar desde CMD:
```cmd
nslookup auth.lab
nslookup portal.lab
```

#### Android (Celulares invitados):
1. **Configuración → WiFi → Tu red → Avanzado**
2. **Configuración IP:** Estática
3. **DNS 1:** `192.168.1.100`
4. **DNS 2:** `1.1.1.1`
5. Guardar

#### iOS (iPhone):
1. **Ajustes → WiFi → (i) junto a tu red**
2. **Configurar DNS → Manual**
3. Eliminar servidores existentes
4. Agregar: `192.168.1.100`
5. Agregar: `1.1.1.1`
6. Guardar

#### Linux/Mac:
```bash
# Temporal (se pierde al reiniciar)
sudo resolvectl dns enp0s3 192.168.1.100

# Permanente en Linux (Netplan)
sudo nano /etc/netplan/01-netcfg.yaml
# Agregar bajo nameservers:
#   addresses: [192.168.1.100, 1.1.1.1]
sudo netplan apply
```

**✅ Clientes configurados.**

---

## Fase 11: Prueba Completa del Ecosistema

> Ejecutar todas estas pruebas desde la **laptop del empleado**
> después de configurar el DNS a `192.168.1.100`.

### 11.1 Prueba de DNS

Abrir terminal/CMD:

```bash
# Todos deben resolver a 192.168.1.100
nslookup auth.lab
nslookup git.lab
nslookup grafana.lab
nslookup prometheus.lab
nslookup portainer.lab
nslookup intranet.lab
nslookup portal.lab
nslookup adguard.lab
nslookup vpn.lab

# Internet también debe funcionar
nslookup google.com
```

**✅ Resultado esperado:** Todos resuelven a `192.168.1.100`. Google resuelve a una IP pública.

---

### 11.2 Prueba de Portal Público (Sistema Externo)

1. Abrir navegador → `http://portal.lab`
2. **Verificar:**
   - ✅ La página carga sin pedir login
   - ✅ Muestra "Portal Público" con acceso libre
   - ✅ Muestra los niveles de acceso (público vs privado)
   - ✅ Sección WiFi para invitados visible
   - ✅ Link "Empleados →" lleva a `auth.lab`

---

### 11.3 Prueba de Sistema Interno (Intranet)

1. Abrir navegador → `http://intranet.lab`
2. **Verificar:**
   - ✅ La página carga con diseño oscuro
   - ✅ Muestra "Sistema Interno" con badge "Acceso Restringido"
   - ✅ Muestra aviso de que invitados NO tienen acceso
   - ✅ Links a todos los servicios internos funcionan
   - ✅ Link al Portal Público funciona

---

### 11.4 Prueba de Keycloak (SSO)

1. Abrir navegador → `http://auth.lab`
2. **Verificar:**
   - ✅ Página de login de Keycloak carga
   - ✅ Login con `admin` / contraseña funciona
   - ✅ El realm "lab" existe con clientes, roles y grupos
3. Cerrar sesión admin
4. Login con `empleado1` / `Empleado1_2026!`
5. **Verificar:**
   - ✅ Login exitoso
   - ✅ Perfil muestra nombre y email correctos

---

### 11.5 Prueba de Gitea (SSO)

1. Abrir navegador → `http://git.lab`
2. Click **"Sign in with keycloak"**
3. **Verificar:**
   - ✅ Redirige a Keycloak para login
   - ✅ Login con `empleado1` funciona
   - ✅ Redirige de vuelta a Gitea con sesión activa
4. Crear un repositorio de prueba:
   - Click **"+"** → **New Repository**
   - Name: `test-repo`
   - Click **Create Repository**
5. **Verificar:**
   - ✅ Repositorio creado exitosamente
   - ✅ URL: `http://git.lab/empleado1/test-repo`

---

### 11.6 Prueba de Grafana (Dashboards)

1. Abrir navegador → `http://grafana.lab`
2. Login con admin o SSO
3. **Verificar:**
   - ✅ Login exitoso
   - ✅ Ir a Dashboards → Lab Platform → Node Exporter
   - ✅ Los paneles muestran datos:
     - CPU Usage (gauge con porcentaje)
     - Memory Usage (gauge con porcentaje)
     - Disk Usage (gauge con porcentaje)
     - Uptime (tiempo desde el último boot)
     - Gráficas de CPU, Load, Memory, Swap, Disk I/O, Network

---

### 11.7 Prueba de Prometheus (Métricas)

1. Abrir navegador → `http://prometheus.lab`
2. **Verificar:**
   - ✅ UI de Prometheus carga
   - ✅ Status → Targets: todos los targets están **UP**
   - ✅ Query `up` retorna todos con valor 1
   - ✅ Query `node_memory_MemTotal_bytes` retorna la RAM total (~16 GB)

---

### 11.8 Prueba de AdGuard Home (DNS)

1. Abrir navegador → `http://adguard.lab`
2. **Verificar:**
   - ✅ Dashboard muestra estadísticas de DNS
   - ✅ Queries procesados (debe haber varias ya)
   - ✅ Filtros → Reescrituras DNS: todos los dominios .lab listados

---

### 11.9 Prueba de Portainer (Docker)

1. Abrir navegador → `http://portainer.lab`
2. **Verificar:**
   - ✅ Login exitoso
   - ✅ Home → local: muestra el entorno Docker
   - ✅ Containers: 12 contenedores en estado Running
   - ✅ Volumes: todos los volúmenes lab_* listados
   - ✅ Networks: 5 redes lab_* listadas

---

### 11.10 Prueba de WireGuard VPN

1. Abrir navegador → `http://vpn.lab`
2. **Verificar:**
   - ✅ Login exitoso
   - ✅ Peers creados visibles
3. Desde un celular conectado por VPN:
   - ✅ `portal.lab` carga en el navegador
   - ✅ Ping a `192.168.1.100` funciona

---

### 11.11 Prueba de Resiliencia Offline

1. **Desconectar el cable de Internet** del router/servidor
2. Esperar 30 segundos
3. **Verificar desde la laptop:**
   - ✅ `http://portal.lab` sigue cargando
   - ✅ `http://intranet.lab` sigue cargando
   - ✅ `http://auth.lab` sigue cargando (login funciona)
   - ✅ `http://git.lab` sigue funcionando
   - ✅ `http://grafana.lab` sigue mostrando métricas
   - ✅ Resolución DNS `.lab` sigue funcionando
   - ❌ `google.com` NO resuelve (esperado, sin Internet)
4. **Reconectar Internet**
5. ✅ `google.com` vuelve a resolver

---

### 11.12 Prueba de Reinicio del Servidor

```bash
# Desde SSH en el servidor:
sudo reboot
```

1. Esperar 2-3 minutos a que el servidor arranque
2. **Verificar desde la laptop:**
   - ✅ DNS resuelve `.lab` (puede tardar ~1 minuto)
   - ✅ `http://portal.lab` carga
   - ✅ `http://intranet.lab` carga
   - ✅ Todos los servicios vuelven a estar online
3. **Verificar desde el servidor:**
```bash
docker compose ps
# Todos los contenedores deben estar "Up (healthy)"
```

---

### 11.13 Prueba de Backup

```bash
# Desde el servidor:
cd /opt/lab-platform
sudo ./backups/scripts/backup.sh

# Verificar que se creó el backup
ls -lh /opt/lab-backups/
```

**✅ Debe mostrar un archivo `lab-backup-XXXXXXXX_XXXXXX.tar.gz` con su `.sha256`**

---

### 11.14 Prueba de Acceso por Roles

| Acción | Empleado (`empleado1`) | Invitado (sin cuenta) |
|---|---|---|
| Acceder a `portal.lab` | ✅ SÍ | ✅ SÍ |
| Acceder a `intranet.lab` | ✅ SÍ (ve los links) | ✅ Ve la página (sin datos sensibles) |
| Login en `auth.lab` | ✅ SÍ | ❌ NO (no tiene cuenta) |
| Login en `git.lab` vía SSO | ✅ SÍ | ❌ NO |
| Login en `grafana.lab` vía SSO | ✅ SÍ | ❌ NO |
| Login en `portainer.lab` | ✅ SÍ (admin) | ❌ NO |
| Crear peer VPN | ✅ SÍ (admin) | ❌ NO |

---

## Resumen de Credenciales

| Servicio | URL | Usuario | Contraseña |
|---|---|---|---|
| Keycloak Admin | http://auth.lab | `admin` | (ver `.env` → `KC_ADMIN_PASSWORD`) |
| Keycloak User | http://auth.lab | `empleado1` | `Empleado1_2026!` |
| Grafana | http://grafana.lab | `admin` | (ver `.env` → `GF_SECURITY_ADMIN_PASSWORD`) |
| Gitea | http://git.lab | `gitadmin` | (creado en Fase 5) |
| Portainer | http://portainer.lab | `admin` | (creado en Fase 7) |
| AdGuard Home | http://adguard.lab | `admin` | (hash en AdGuardHome.yaml) |
| WireGuard | http://vpn.lab | — | (hash en `.env`) |
| PostgreSQL | — (solo interno) | `labadmin` | (ver `.env` → `POSTGRES_PASSWORD`) |

---

## ✅ Checklist Final

- [ ] DNS resuelve todos los dominios `.lab`
- [ ] Portal Público accesible sin autenticación
- [ ] Sistema Interno muestra restricción de acceso
- [ ] Keycloak funciona con realm "lab"
- [ ] Usuarios creados con roles y grupos
- [ ] Gitea login vía SSO funciona
- [ ] Grafana muestra dashboards con datos
- [ ] Prometheus tiene todos los targets UP
- [ ] Portainer muestra 12 contenedores
- [ ] AdGuard Home resuelve y bloquea
- [ ] WireGuard VPN funcional con peer
- [ ] Sistema funciona sin Internet
- [ ] Sistema sobrevive reinicio del servidor
- [ ] Backup se ejecuta correctamente

**🎉 ¡Plataforma Enterprise Lab completamente operativa!**
