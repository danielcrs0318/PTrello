# 🚀 Guía de Despliegue - PTrello

## Arquitectura de Despliegue

```
Servidor Ubuntu (App)          Servidor BD (Separado)
├── Frontend (Nginx:80)   ◄──  SQL Server (1433)
└── Backend (Node:3000)
```

## 📋 Pre-requisitos

### Servidor de Base de Datos
- [ ] Windows/Linux Server con SQL Server instalado
- [ ] Puerto 1433 abierto para conexiones remotas
- [ ] Firewall configurado para permitir IP del servidor de aplicación
- [ ] Usuario de BD creado con permisos necesarios
- [ ] Base de datos `ptrello_prod` creada

### Servidor Ubuntu (Aplicación)
- [ ] Ubuntu 20.04/22.04 LTS
- [ ] Docker y Docker Compose instalados
- [ ] Git instalado
- [ ] Dominio apuntando al servidor (opcional pero recomendado)
- [ ] Certificado SSL (Let's Encrypt recomendado)
- [ ] Puertos abiertos: 80, 443, 3000

---

## 🔧 Paso 1: Configurar Servidor de Base de Datos

### En SQL Server (Servidor de BD):

```sql
-- Crear base de datos
CREATE DATABASE ptrello_prod;
GO

-- Crear usuario para la aplicación
USE ptrello_prod;
CREATE LOGIN ptrello_user WITH PASSWORD = 'TU_PASSWORD_SEGURO_AQUI';
CREATE USER ptrello_user FOR LOGIN ptrello_user;

-- Dar permisos
ALTER ROLE db_owner ADD MEMBER ptrello_user;
GO
```

### Configurar Firewall (SQL Server):

**Windows Server:**
```powershell
# Abrir puerto 1433
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow

# Agregar IP específica del servidor de aplicación (recomendado)
New-NetFirewallRule -DisplayName "SQL Server from App" -Direction Inbound -Protocol TCP -LocalPort 1433 -RemoteAddress IP_DEL_SERVIDOR_UBUNTU -Action Allow
```

**Verificar conectividad desde el servidor Ubuntu:**
```bash
# Instalar herramientas
sudo apt install telnet

# Probar conexión
telnet IP_SERVIDOR_BD 1433
# Si conecta, verás pantalla en blanco = éxito
```

---

## 🐳 Paso 2: Configurar Servidor Ubuntu (Aplicación)

### 2.1 Instalar Docker y Docker Compose

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose-plugin

# Verificar instalación
docker --version
docker compose version
```

### 2.2 Clonar Repositorio

```bash
# Crear directorio para la aplicación
mkdir -p /opt/ptrello
cd /opt/ptrello

# Clonar (reemplaza con tu repositorio)
git clone https://github.com/TU_USUARIO/PTrello.git .

# O si ya clonaste en otra ubicación, mueve el proyecto aquí
```

### 2.3 Crear Archivos de Configuración

**Crear `.env.production`:**
```bash
cd /opt/ptrello
nano .env.production
```

**Contenido del `.env.production`:**
```env
# Base de Datos (Servidor Separado)
DB_HOST=IP_O_HOSTNAME_DEL_SERVIDOR_BD
DB_NAME=ptrello_prod
DB_USER=ptrello_user
DB_PASSWORD=TU_PASSWORD_SEGURO_AQUI
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_CERT=false

# JWT
JWT_SECRET=GENERA_UN_SECRET_SEGURO_AQUI_32_CHARS_MINIMO

# Backend
PORT=3000
NODE_ENV=production

# CORS - Dominio de tu aplicación
CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com

# Google OAuth (Configurar en Google Cloud Console)
GOOGLE_CLIENT_ID=tu_client_id_de_google
GOOGLE_CLIENT_SECRET=tu_client_secret_de_google
GOOGLE_CALLBACK_URL=https://tudominio.com/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=https://tudominio.com/auth/callback

# Frontend
VITE_API_URL=https://tudominio.com
```

**Generar JWT_SECRET seguro:**
```bash
# Generar secret aleatorio
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.4 Configurar Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto o seleccionar existente
3. Activar "Google+ API"
4. Ir a "Credenciales" → "Crear credenciales" → "ID de cliente OAuth"
5. Tipo: Aplicación web
6. URIs de redireccionamiento autorizados:
   - `https://tudominio.com/auth/google/callback`
7. Copiar Client ID y Client Secret al `.env.production`

---

## 🚢 Paso 3: Desplegar con Docker Compose

### 3.1 Construir Imágenes

```bash
cd /opt/ptrello

# Construir imágenes de producción
docker compose -f docker-compose.prod.yml build
```

### 3.2 Iniciar Servicios

```bash
# Iniciar en modo detached (background)
docker compose -f docker-compose.prod.yml up -d

# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Ver estado de contenedores
docker compose -f docker-compose.prod.yml ps
```

### 3.3 Verificar Servicios

```bash
# Backend (debe responder)
curl http://localhost:3000/health

# Frontend (debe servir HTML)
curl http://localhost:80
```

---

## 🔒 Paso 4: Configurar Nginx y SSL (Opcional pero Recomendado)

### 4.1 Instalar Nginx como Proxy Reverso

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 4.2 Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/ptrello
```

**Contenido:**
```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Auth endpoints
    location /auth {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Activar sitio:**
```bash
sudo ln -s /etc/nginx/sites-available/ptrello /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4.3 Instalar Certificado SSL

```bash
# Obtener certificado Let's Encrypt
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Renovación automática (ya configurado)
sudo certbot renew --dry-run
```

---

## 🔄 Paso 5: Configurar Actualizaciones Automáticas

### 5.1 Script de Actualización

```bash
sudo nano /opt/ptrello/deploy.sh
```

**Contenido:**
```bash
#!/bin/bash
set -e

echo "🚀 Iniciando despliegue de PTrello..."

cd /opt/ptrello

# Pull últimos cambios
echo "📥 Descargando cambios de Git..."
git pull origin main

# Reconstruir imágenes
echo "🔨 Construyendo imágenes Docker..."
docker compose -f docker-compose.prod.yml build

# Detener servicios
echo "⏸️  Deteniendo servicios..."
docker compose -f docker-compose.prod.yml down

# Iniciar servicios actualizados
echo "▶️  Iniciando servicios..."
docker compose -f docker-compose.prod.yml up -d

# Limpiar imágenes antiguas
echo "🧹 Limpiando imágenes antiguas..."
docker image prune -f

echo "✅ Despliegue completado exitosamente!"
```

**Dar permisos:**
```bash
chmod +x /opt/ptrello/deploy.sh
```

### 5.2 Webhook de GitHub (Opcional)

Para despliegue automático al hacer push:

1. Instalar webhook listener:
```bash
npm install -g webhook
```

2. Crear configuración webhook (ver documentación completa)

---

## 📊 Paso 6: Monitoreo y Logs

### Ver Logs en Vivo

```bash
# Todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Solo backend
docker compose -f docker-compose.prod.yml logs -f backend

# Solo frontend
docker compose -f docker-compose.prod.yml logs -f frontend

# Últimas 100 líneas
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Ver Logs de Errores

```bash
# Backend error logs (dentro del contenedor)
docker compose -f docker-compose.prod.yml exec backend cat logs/error.log

# Backend access logs
docker compose -f docker-compose.prod.yml exec backend cat logs/access.log
```

### Consultar ErrorLog en Base de Datos

```bash
# Conectarse al contenedor backend
docker compose -f docker-compose.prod.yml exec backend sh

# Dentro del contenedor, ejecutar el script de test
node test-error-logging.js
```

### Monitoreo de Recursos

```bash
# Ver uso de recursos de contenedores
docker stats

# Espacio en disco
df -h

# Memoria del sistema
free -h
```

---

## 🔧 Mantenimiento

### Reiniciar Servicios

```bash
# Reiniciar todos
docker compose -f docker-compose.prod.yml restart

# Reiniciar solo backend
docker compose -f docker-compose.prod.yml restart backend

# Reiniciar solo frontend
docker compose -f docker-compose.prod.yml restart frontend
```

### Detener/Iniciar Servicios

```bash
# Detener
docker compose -f docker-compose.prod.yml down

# Iniciar
docker compose -f docker-compose.prod.yml up -d
```

### Actualizar Manualmente

```bash
cd /opt/ptrello
./deploy.sh
```

### Limpiar Espacio en Disco

```bash
# Eliminar imágenes sin usar
docker image prune -a

# Eliminar volúmenes sin usar
docker volume prune

# Limpiar todo (CUIDADO: elimina datos no persistentes)
docker system prune -a --volumes
```

### Backup de Base de Datos

**Desde el servidor de BD (SQL Server):**
```sql
-- Backup manual
BACKUP DATABASE ptrello_prod
TO DISK = 'C:\Backups\ptrello_prod_backup.bak'
WITH COMPRESSION;
```

**Backup automatizado (SQL Server Agent):**
1. Crear job en SQL Server Agent
2. Programar ejecución diaria
3. Configurar retención de backups

---

## 🐛 Troubleshooting

### Backend no se conecta a la BD

```bash
# Verificar conectividad desde contenedor
docker compose -f docker-compose.prod.yml exec backend sh
ping IP_SERVIDOR_BD

# Verificar variables de entorno
docker compose -f docker-compose.prod.yml exec backend env | grep DB
```

### Frontend no carga

```bash
# Ver logs de frontend
docker compose -f docker-compose.prod.yml logs frontend

# Verificar que Nginx esté corriendo
curl http://localhost:80
```

### Google OAuth no funciona

1. Verificar GOOGLE_CALLBACK_URL coincida con dominio configurado en Google Console
2. Verificar dominio esté en "Orígenes autorizados"
3. Verificar certificado SSL válido

### Ver errores en tiempo real

```bash
# Terminal 1: Backend logs
docker compose -f docker-compose.prod.yml logs -f backend

# Terminal 2: Frontend logs
docker compose -f docker-compose.prod.yml logs -f frontend
```

---

## 📱 Paso 7: Verificación Post-Despliegue

### Checklist de Verificación:

- [ ] Backend responde en `https://tudominio.com/api/health`
- [ ] Frontend carga en `https://tudominio.com`
- [ ] Login funciona
- [ ] Registro de usuarios funciona
- [ ] Google OAuth funciona
- [ ] Creación de tableros funciona
- [ ] Subida de imágenes funciona
- [ ] Notificaciones funcionan
- [ ] Calendario funciona
- [ ] Logs se guardan en base de datos (tabla error_logs)

### Pruebas de Carga:

```bash
# Instalar herramienta de pruebas
sudo apt install apache2-utils

# Prueba simple (100 requests)
ab -n 100 -c 10 https://tudominio.com/
```

---

## 🔐 Seguridad

### Checklist de Seguridad:

- [ ] Firewall configurado (ufw)
- [ ] Solo puertos 80/443 abiertos al público
- [ ] Puerto 3000 cerrado al público (solo localhost)
- [ ] Base de datos solo accesible desde IP del servidor de aplicación
- [ ] Certificado SSL válido
- [ ] Variables de entorno no expuestas
- [ ] JWT_SECRET único y seguro (32+ caracteres)
- [ ] Contraseñas de BD seguras
- [ ] Backups configurados

### Configurar Firewall:

```bash
# Instalar UFW
sudo apt install ufw

# Configuración básica
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activar
sudo ufw enable

# Ver estado
sudo ufw status
```

---

## 📚 Recursos Adicionales

- [Documentación Docker](https://docs.docker.com/)
- [Documentación Docker Compose](https://docs.docker.com/compose/)
- [Guía Nginx](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [SQL Server en Linux](https://learn.microsoft.com/en-us/sql/linux/)

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs: `docker compose -f docker-compose.prod.yml logs`
2. Verifica conectividad de BD
3. Revisa variables de entorno
4. Consulta la tabla error_logs en la base de datos

