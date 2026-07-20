# Nike Enterprise Platform

> Plataforma self-hosted completa para laboratorio empresarial sobre Ubuntu Server 24.04 LTS.  
> 100% open source. 100% offline-capable. Docker Compose.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Ubuntu Server 24.04 LTS                      │
│                    Intel i5-10400F | 16 GB RAM                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────── TRAEFIK (Reverse Proxy) ───────────────────┐ │
│  │  :80 HTTP  ←→  *.lab domains                                  │ │
│  │  :443 HTTPS (preparado)                                       │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│  ┌──── frontend ────┐  ┌── backend ──┐  ┌── monitoring ──┐       │
│  │ AdGuard  :53 DNS  │  │ PostgreSQL  │  │ Prometheus     │       │
│  │ Intranet          │  │ Keycloak    │  │ Grafana        │       │
│  │ Portal            │  │ Gitea       │  │ Node Exporter  │       │
│  │ Portainer         │  └─────────────┘  └────────────────┘       │
│  └───────────────────┘                                             │
│  ┌── identity ──┐  ┌──── vpn ────┐                                │
│  │ Keycloak     │  │ WireGuard   │                                │
│  │ Traefik      │  │ :51820/udp  │                                │
│  └──────────────┘  └─────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Requisitos Previos

### Hardware Mínimo

- CPU: 4 cores (Intel i5 o equivalente)
- RAM: 16 GB
- Disco: 50 GB libres (SSD recomendado)
- Red: 1 interfaz ethernet

### Software Necesario

- Ubuntu Server 24.04 LTS (instalación mínima)
- Docker Engine 27.x+
- Docker Compose v2.x+ (incluido con Docker Engine)
- Git

---

## Guía de Instalación Paso a Paso

### Paso 1: Instalar Docker Engine

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y ca-certificates curl gnupg lsb-release

# Añadir repositorio oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalación
docker --version
docker compose version
```

### Paso 2: Configurar IP Estática

```bash
# Editar configuración de Netplan
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp0s3: # Cambiar al nombre de tu interfaz (ip a)
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 127.0.0.1 # Apuntar a AdGuard local
          - 1.1.1.1 # Fallback
```

```bash
sudo netplan apply
```

### Paso 3: Clonar/Copiar el Proyecto

```bash
# Opción A: Si tienes el repositorio
cd /opt
sudo git clone <URL_DEL_REPO> nike-platform
cd nike-platform

# Opción B: Copiar directamente los archivos
sudo mkdir -p /opt/nike-platform
sudo cp -r . /opt/nike-platform/
cd /opt/nike-platform
```

### Paso 4: Configurar el Entorno (Recomendado)

Recomendamos utilizar el script de configuración automática para preparar el archivo `.env` y asegurar todos los permisos en un solo comando:

```bash
# Dar permisos de ejecución
chmod +x setup.sh

# Ejecutar el asistente de configuración
sudo ./setup.sh
```

**Este script se encarga de:**

1. Autodetectar la dirección IP local primaria de tu servidor.
2. Copiar `.env.example` a `.env` de forma segura.
3. Ofrecerte autogenerar contraseñas aleatorias seguras o escribir las tuyas.
4. Generar automáticamente los hashes Bcrypt de las contraseñas de AdGuard y WireGuard (escapando el carácter `$` a `$$` para evitar fallos en Docker Compose).
5. Asignar los permisos ejecutables correctos a todos los scripts del sistema (`backups/scripts/*.sh` y `postgres/*.sh`).

---

#### Opción Alternativa: Configuración Manual

Si prefieres realizar el aprovisionamiento de variables a mano:

1. **Copiar y Editar el archivo de entorno:**

   ```bash
   cp .env.example .env
   nano .env
   ```

   _Modifica variables críticas: `SERVER_IP`, `POSTGRES_PASSWORD`, `KC_ADMIN_PASSWORD`, `GF_SECURITY_ADMIN_PASSWORD`, `WG_HOST`._

2. **Generar hash para WireGuard:**

   ```bash
   docker run --rm ghcr.io/wg-easy/wg-easy wgpw 'TU_PASSWORD'
   ```

   _Duplicar cada '$' por '$$' al pegarlo en `WGEASY_PASSWORD_HASH` en el `.env`._

3. **Generar hash de contraseña para AdGuard:**

   ```bash
   sudo apt install -y apache2-utils
   htpasswd -nbB admin 'TU_PASSWORD' | cut -d: -f2
   ```

   _Pegar en `ADGUARD_PASSWORD_HASH` en el `.env`._

4. **Hacer scripts ejecutables:**

   ```bash
   chmod +x backups/scripts/backup.sh
   chmod +x backups/scripts/restore.sh
   chmod +x postgres/init-databases.sh
   ```

### Paso 5: Desplegar la Plataforma

```bash
# Levantar todo (primera vez descarga imágenes ~3-5 GB)
docker compose up -d

# Verificar estado
docker compose ps

# Ver logs en tiempo real
docker compose logs -f
```

### Paso 8: Configurar DNS en los Clientes

**Opción A — Router (recomendado para toda la red):**

- Configurar el DNS primario del router DHCP a `192.168.1.100`

**Opción B — Por dispositivo:**

_Linux/Mac:_

```bash
# Temporal
sudo resolvectl dns enp0s3 192.168.1.100

# Permanente: editar /etc/netplan/ o /etc/resolv.conf
```

_Windows:_

1. Panel de control → Redes → Propiedades del adaptador
2. IPv4 → DNS preferido: `192.168.1.100`

_Android/iOS:_

1. Configuración WiFi → Red actual → Avanzado
2. DNS: `192.168.1.100`

### Paso 9: Verificación Post-Instalación

```bash
# Verificar DNS
dig @192.168.1.100 auth.nike.com
dig @192.168.1.100 git.nike.com

# Verificar servicios HTTP
curl -s -o /dev/null -w "%{http_code}" -H "Host: auth.nike.com" http://192.168.1.100
curl -s -o /dev/null -w "%{http_code}" -H "Host: git.nike.com" http://192.168.1.100
curl -s -o /dev/null -w "%{http_code}" -H "Host: grafana.nike.com" http://192.168.1.100
curl -s -o /dev/null -w "%{http_code}" -H "Host: intranet.nike.com" http://192.168.1.100
curl -s -o /dev/null -w "%{http_code}" -H "Host: portal.nike.com" http://192.168.1.100

# Verificar healthchecks
docker compose ps --format "table {{.Name}}\t{{.Status}}"

# Verificar targets de Prometheus
curl -s http://prometheus.nike.com/api/v1/targets | grep -c '"health":"up"'
```

---

## Acceso a Servicios

| Servicio   | URL                        | Credenciales por defecto |
| ---------- | -------------------------- | ------------------------ |
| Intranet   | http://intranet.nike.com   | Keycloak SSO             |
| Portal     | http://portal.nike.com     | Sin auth                 |
| Keycloak   | http://auth.nike.com       | `admin` / (ver .env)     |
| Gitea      | http://git.nike.com        | Registrarse o SSO        |
| Grafana    | http://grafana.nike.com    | `admin` / (ver .env)     |
| Prometheus | http://prometheus.nike.com | Sin auth                 |
| Portainer  | http://portainer.nike.com  | Setup inicial            |
| AdGuard    | http://adguard.nike.com    | `admin` / (ver .env)     |
| WireGuard  | http://vpn.nike.com        | Password hash (ver .env) |

---

## Estructura del Proyecto

```
topicos/
├── docker-compose.yml
├── .env
├── .env.example
├── README.md
├── docs/
│   ├── actualizacion.md
│   ├── recuperacion.md
│   ├── seguridad-checklist.md
│   └── backup-restore.md
├── traefik/
│   ├── traefik.yml
│   └── dynamic/
│       └── middlewares.yml
├── adguard/
│   └── conf/
│       └── AdGuardHome.yaml
├── postgres/
│   └── init-databases.sh
├── keycloak/
│   └── realm-export.json
├── prometheus/
│   └── prometheus.yml
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml
│   │   └── dashboards/
│   │       └── dashboards.yml
│   └── dashboards/
│       └── node-exporter.json
├── intranet/
│   └── html/
│       └── index.html
├── portal/
│   └── html/
│       └── index.html
└── backups/
    └── scripts/
        ├── backup.sh
        └── restore.sh
```

---

## Comandos Útiles

```bash
# Estado de todos los servicios
docker compose ps

# Reiniciar un servicio específico
docker compose restart keycloak

# Ver logs de un servicio
docker compose logs -f grafana

# Actualizar imágenes
docker compose pull
docker compose up -d

# Backup
sudo ./backups/scripts/backup.sh

# Restore
sudo ./backups/scripts/restore.sh /opt/nike-backups/nike-backup-XXXXXXXX_XXXXXX.tar.gz

# Detener todo
docker compose down

# Detener todo Y eliminar volúmenes (⚠️ DESTRUYE DATOS)
docker compose down -v
```

---

## Documentación Adicional

- [⭐ Guía de Configuración Completa](docs/guia-configuracion-completa.md) — **EMPEZAR AQUÍ**
- [Guía de Actualización](docs/actualizacion.md)
- [Guía de Recuperación ante Fallos](docs/recuperacion.md)
- [Checklist de Seguridad](docs/seguridad-checklist.md)
- [Estrategia de Backup/Restore](docs/backup-restore.md)

---

## Licencia

Todos los componentes utilizados son open source bajo sus respectivas licencias.
Este proyecto de configuración está bajo la licencia MIT.

=================================================================
RESUMEN DE CREDENCIALES CONFIGURADAS  
=================================================================
IP del Servidor: 192.168.2.102
PostgreSQL User: nikeadmin
PostgreSQL Pass: XeipEhz2JOAYXMmEnOz1CA
Keycloak Admin Pass: 0RTrjS1GrkNmQgXfUiNyA
Grafana Admin Pass: NXA0af3S3A9z5kfXFspOw
Portainer Admin Pass: X4ZSal8NOYhN7rcduxbyAw
AdGuard Home User: admin
AdGuard Home Pass: oPTdwAbrzW3maWX
WireGuard VPN Pass: Ksyi1LwSEvntIccR
Gitea User: gitadmin
Gitea Pass: 3h4DdHIrG4Wd8fyY

IP del Servidor: 192.168.2.102
PostgreSQL: nikeadmin / dI75bBAZprAtYAgeOuXORA
Keycloak Admin: admin / A8TeMV7cP3akeKhEdOIUVg
Grafana Admin: admin / h33YausOfRGD1ckmyfOOg
Portainer Admin: admin / 6YKHxpcTjglzdUU6p9REA
AdGuard Home: admin / 6KYgmQmyXwseaGI
WireGuard VPN: admin / KizCDwt9WPX05l55
