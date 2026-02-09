# Sistema de Logging de Errores y CI/CD

## 📋 Resumen de Implementación

Se ha implementado un sistema completo de logging de errores que guarda la información tanto en archivos como en una base de datos relacional, además de workflows de GitHub Actions para validación continua.

---

## 🗄️ Sistema de Logging de Errores en Base de Datos

### Modelo ErrorLog

Se creó el modelo `ErrorLog` que guarda información completa sobre cada error que ocurre en la aplicación:

**Campos de la tabla `error_logs`:**
- `id` (UUID): Identificador único del error
- `message` (string): Mensaje del error (hasta 1000 caracteres)
- `stackTrace` (text): Stack trace completo del error
- `httpMethod` (string): Método HTTP (GET, POST, PUT, DELETE, etc.)
- `url` (string): URL donde ocurrió el error (hasta 2000 caracteres)
- `ipAddress` (string): Dirección IP del cliente (soporta IPv4 e IPv6)
- `userId` (UUID): ID del usuario autenticado (si aplica)
- `userAgent` (string): User agent del navegador (hasta 500 caracteres)
- `statusCode` (integer): Código de estado HTTP (default: 500)
- `requestBody` (text): Cuerpo de la petición en formato JSON
- `createdAt` (datetime): Fecha y hora de creación del error
- `updatedAt` (datetime): Fecha y hora de última actualización

**Índices creados:**
- Por fecha de creación (`createdAt`)
- Por usuario (`userId`)
- Por método HTTP (`httpMethod`)
- Por código de estado (`statusCode`)

### Integración

Los errores se guardan automáticamente en:
1. **Archivo** (`backend/logs/error.log`): Para debugging rápido
2. **Base de datos**: Para análisis histórico y estadísticas

### Ubicaciones de captura de errores:

1. **Middleware de Express** (líneas 65-85 de `index.js`):
   - Captura errores en peticiones HTTP
   - Guarda información completa de la request
   - Extrae usuario autenticado si existe

2. **Errors en inicio del servidor** (líneas 100-108 de `index.js`):
   - Captura errores durante la inicialización
   - Registra problemas de conexión a base de datos

3. **Unhandled Promise Rejections** (líneas 112-115 de `index.js`):
   - Captura promesas rechazadas no manejadas

4. **Uncaught Exceptions** (líneas 117-121 de `index.js`):
   - Captura excepciones no controladas

### Función Helper: `logError(error, options)`

```javascript
logError(error, {
  httpMethod: 'POST',
  url: '/api/boards',
  ipAddress: '192.168.1.1',
  userId: 'user-uuid',
  userAgent: 'Mozilla/5.0...',
  statusCode: 500,
  requestBody: { name: 'Mi Tablero' }
});
```

---

## 🔄 GitHub Actions - CI/CD

Se implementaron dos workflows de validación continua:

### 1. Workflow Principal: `ci.yml`

**Triggers:**
- Push a ramas `main` o `master`
- Pull requests a ramas `main` o `master`
- Ejecución manual desde GitHub

**Jobs:**

#### 🔧 `test-backend`
- ✅ Instala dependencias del backend
- ✅ Verifica sintaxis de archivos JavaScript
- ✅ Valida estructura de directorios
- ✅ Ejecuta tests (si existen)
- ✅ Verifica archivo .env.example

#### 🎨 `test-frontend`
- ✅ Instala dependencias del frontend
- ✅ Construye la aplicación con Vite
- ✅ Verifica que el build se generó correctamente
- ✅ Valida estructura de archivos
- ✅ Sube artefacto del build (disponible por 7 días)

#### 🐳 `test-docker`
- ✅ Construye 4 imágenes Docker:
  - Backend Dev (`Dockerfile.dev`)
  - Backend Prod (`Dockerfile.prod`)
  - Frontend Dev (`Dockerfile.dev`)
  - Frontend Prod (`Dockerfile.prod`)
- ✅ Usa cache de GitHub para optimizar builds

#### 📦 `test-docker-compose`
- ✅ Valida `docker-compose.local.yml`
- ✅ Valida `docker-compose.prod.yml`

#### 📊 `summary`
- ✅ Muestra resumen de todos los tests
- ✅ Indica si el proyecto está listo para despliegue

### 2. Workflow Docker Build: `docker-build.yml`

**Triggers:**
- Push a ramas `main` o `master` (solo si hay cambios en archivos relevantes)
- Ejecución manual desde GitHub

**Se ejecuta solo si hay cambios en:**
- `backend/**`
- `frontend/**`
- `docker-compose*.yml`
- Archivos de workflow

**Jobs:**
- Construye todas las imágenes Docker (dev y prod)
- Valida archivos Docker Compose
- Usa cache para optimizar tiempos de build

---

## 📝 Archivos Modificados/Creados

### Nuevos archivos:
1. `backend/src/modelos/ErrorLog.js` - Modelo Sequelize para errores
2. `backend/logs/.gitkeep` - Mantiene carpeta logs en git
3. `.github/workflows/ci.yml` - Workflow principal de CI (actualizado)
4. `.github/workflows/docker-build.yml` - Workflow de Docker (actualizado)
5. `ERROR_LOGGING_CI.md` - Esta documentación

### Archivos modificados:
1. `backend/src/index.js` - Sistema de logging dual
2. `backend/src/configuraciones/initModels.js` - Registro de ErrorLog
3. `.gitignore` - Ignora archivos de log pero mantiene estructura

---

## 🚀 Cómo Usar

### Ver errores en la base de datos

Puedes consultar los errores guardados con SQL:

```sql
-- Últimos 10 errores
SELECT TOP 10 
    id,
    message,
    httpMethod,
    url,
    statusCode,
    createdAt
FROM error_logs
ORDER BY createdAt DESC;

-- Errores por código de estado
SELECT 
    statusCode,
    COUNT(*) as total
FROM error_logs
GROUP BY statusCode
ORDER BY total DESC;

-- Errores de un usuario específico
SELECT * 
FROM error_logs 
WHERE userId = 'user-uuid'
ORDER BY createdAt DESC;

-- Errores por URL
SELECT 
    url,
    COUNT(*) as total
FROM error_logs
GROUP BY url
ORDER BY total DESC;
```

### Ver status de GitHub Actions

1. Ve a tu repositorio en GitHub
2. Click en la pestaña "Actions"
3. Verás el historial de ejecuciones de los workflows
4. Click en cualquier ejecución para ver detalles

### Ejecutar GitHub Actions manualmente

1. Ve a "Actions" en GitHub
2. Selecciona el workflow "CI - Validación Continua" o "Docker Build"
3. Click en "Run workflow"
4. Selecciona la rama y ejecuta

---

## 🔍 Consultas Útiles para Análisis de Errores

### Dashboard de errores (últimas 24 horas)
```sql
SELECT 
    DATEPART(hour, createdAt) as hora,
    COUNT(*) as total_errores
FROM error_logs
WHERE createdAt >= DATEADD(hour, -24, GETDATE())
GROUP BY DATEPART(hour, createdAt)
ORDER BY hora;
```

### Top 10 errores más comunes
```sql
SELECT TOP 10
    message,
    COUNT(*) as ocurrencias,
    MAX(createdAt) as ultima_vez
FROM error_logs
GROUP BY message
ORDER BY ocurrencias DESC;
```

### Errores por endpoint
```sql
SELECT 
    httpMethod,
    url,
    COUNT(*) as total,
    AVG(CAST(statusCode as float)) as codigo_promedio
FROM error_logs
WHERE url IS NOT NULL
GROUP BY httpMethod, url
ORDER BY total DESC;
```

---

## 🛠️ Próximos Pasos Recomendados

1. **Crear endpoint API para consultar errores:**
   - GET `/api/errors` - Lista de errores con paginación
   - GET `/api/errors/stats` - Estadísticas de errores

2. **Dashboard de monitoreo:**
   - Crear página en el frontend para visualizar errores
   - Gráficas de errores por tiempo
   - Alertas cuando hay muchos errores

3. **Notificaciones:**
   - Enviar email cuando hay errores críticos
   - Integración con Slack/Discord

4. **Limpieza automática:**
   - Job cron para eliminar errores antiguos (>30 días)
   - Archivar errores importantes

5. **GitHub Actions:**
   - Agregar notificaciones a Slack cuando fallen los workflows
   - Agregar deploy automático si pasan todos los tests

---

## 📈 Beneficios de esta Implementación

✅ **Trazabilidad completa** de errores  
✅ **Análisis histórico** para identificar patrones  
✅ **Información contextual** rica (usuario, IP, request)  
✅ **Validación automática** con cada push  
✅ **Detección temprana** de problemas  
✅ **Documentación** de la salud del sistema  

---

## 🆘 Troubleshooting

### La tabla error_logs no existe

```bash
# Ejecutar migración manual si es necesario
cd backend
npm run dev # O iniciar el servidor para que Sequelize cree la tabla
```

### GitHub Actions fallan

1. Revisa el log específico en la pestaña Actions
2. Asegúrate de que `package-lock.json` existe en backend y frontend
3. Verifica que los Dockerfiles existan

### No se guardan errores en BD

1. Verifica la conexión a la base de datos
2. Revisa los logs del servidor
3. Asegúrate de que el modelo ErrorLog esté importado correctamente

---

**Fecha de implementación:** Febrero 2026  
**Autor:** Sistema de logging automático PTrello
