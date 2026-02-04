# Backend - PTrello (SprintFlow)

Backend de la aplicación PTrello, un sistema de gestión de proyectos tipo Kanban.

## 📋 Descripción

API RESTful construida con Node.js y Express que proporciona funcionalidades para:
- Autenticación con Google OAuth 2.0
- Gestión de tableros Kanban
- Gestión de tareas y subtareas
- Sistema de notificaciones
- Colaboración entre usuarios
- Notificaciones por email para fechas de vencimiento

## 🏗️ Arquitectura

```
backend/
├── src/
│   ├── configuraciones/     # Configuración de la aplicación
│   │   ├── initModels.js   # Inicialización de modelos y relaciones
│   │   ├── passport.js     # Estrategias de autenticación
│   │   └── sequelize.js    # Configuración de ORM
│   ├── controladores/      # Lógica de negocio
│   │   ├── authController.js
│   │   ├── boardController.js
│   │   ├── boardMemberController.js
│   │   ├── notificationController.js
│   │   └── taskController.js
│   ├── modelos/            # Modelos de datos (Sequelize)
│   │   ├── Board.js
│   │   ├── BoardMember.js
│   │   ├── Column.js
│   │   ├── Notification.js
│   │   ├── Subtask.js
│   │   ├── Task.js
│   │   └── User.js
│   ├── rutas/              # Definición de endpoints
│   │   ├── authRoutes.js
│   │   ├── boardMemberRoutes.js
│   │   ├── boardRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── taskRoutes.js
│   ├── servicios/          # Servicios externos
│   │   ├── emailService.js           # Envío de emails con Resend
│   │   └── notificationScheduler.js  # Cron job para notificaciones
│   └── index.js            # Punto de entrada
└── package.json
```

## 🚀 Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **Sequelize** - ORM para SQL Server
- **SQL Server** - Base de datos
- **Passport.js** - Autenticación (Google OAuth, JWT)
- **Resend** - Servicio de emails
- **node-cron** - Programación de tareas

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno (ver .env.example)
cp .env.example .env

# Ejecutar migraciones (si aplica)
node migrateBoardMembers.js
node migrateNotifications.js

# Iniciar servidor en desarrollo
npm run dev

# Iniciar servidor en producción
npm start
```

## ⚙️ Variables de Entorno

```env
# Base de datos
DB_NAME=nombre_base_datos
DB_USER=usuario
DB_PASSWORD=contraseña
DB_HOST=localhost
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_CERT=true

# Autenticación
JWT_SECRET=tu_secreto_jwt
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_CALLBACK_URL=/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=http://localhost:5173/auth/callback

# CORS
CORS_ORIGINS=http://localhost:5173

# Email
RESEND_API_KEY=tu_api_key_resend

# Servidor
PORT=3000
NODE_ENV=development
```

## 🔐 Autenticación

El sistema utiliza dos estrategias de autenticación:

### Google OAuth 2.0
- Flujo de autenticación con Google
- Creación/actualización automática de usuarios
- Redirección al frontend con token JWT

### JWT (JSON Web Tokens)
- Tokens con expiración de 12 horas
- Verificación en cada request protegido
- Payload incluye: id, email, nombre

## 📚 Documentación de Código

Todo el código está documentado con **JSDoc**:

```javascript
/**
 * Crea un nuevo tablero con columnas por defecto
 * @param {Object} req - Request con nombre y descripción en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con el tablero creado (status 201) o error
 */
const createBoard = async (req, res) => {
  // ...
}
```

## 🔗 Endpoints Principales

### Autenticación
- `GET /auth/google` - Iniciar OAuth con Google
- `GET /auth/google/callback` - Callback de Google
- `GET /auth/me` - Obtener perfil actual

### Tableros
- `POST /boards` - Crear tablero
- `GET /boards` - Listar tableros del usuario
- `GET /boards/:id` - Obtener tablero específico
- `PUT /boards/:id` - Actualizar tablero

### Tareas
- `POST /boards/:boardId/tasks` - Crear tarea
- `PUT /tasks/:id` - Actualizar tarea
- `POST /tasks/:taskId/subtasks` - Crear subtarea
- `PUT /tasks/subtasks/:id` - Actualizar subtarea
- `DELETE /tasks/subtasks/:id` - Eliminar subtarea

### Notificaciones
- `GET /notifications` - Listar notificaciones
- `GET /notifications/unread-count` - Contar no leídas
- `PUT /notifications/:id/read` - Marcar como leída
- `POST /notifications/:id/accept` - Aceptar invitación
- `POST /notifications/:id/reject` - Rechazar invitación

### Miembros
- `POST /board-members/:boardId/share` - Compartir tablero
- `GET /board-members/:boardId/members` - Listar miembros
- `DELETE /board-members/:boardId/members/:memberId` - Remover miembro
- `PUT /board-members/:boardId/members/:memberId` - Actualizar rol

## 🔔 Sistema de Notificaciones

### Notificaciones por Email
- Recordatorios de subtareas próximas a vencer (24 horas antes)
- Invitaciones a tableros compartidos
- Plantillas HTML responsivas

### Programador de Tareas
- Cron job que se ejecuta cada hora
- Verifica subtareas con vencimiento en las próximas 24 horas
- Envía emails automáticamente a los propietarios

## 🗄️ Modelo de Datos

### Relaciones Principales
- `User` → `Board` (1:N) - Un usuario puede tener muchos tableros
- `Board` → `Column` (1:N) - Un tablero tiene muchas columnas
- `Column` → `Task` (1:N) - Una columna tiene muchas tareas
- `Task` → `Subtask` (1:N) - Una tarea tiene muchas subtareas
- `User` ↔ `Board` (N:M) - Relación de tableros compartidos
- `User` → `Task` (1:N) - Usuario asignado a tareas

## 🔒 Permisos y Roles

### Roles de Tablero
- **Owner (Propietario)**: Control total del tablero
- **Editor**: Puede crear y editar tareas
- **Lector**: Solo puede ver el tablero

### Validación de Permisos
- Todos los endpoints verifican autenticación JWT
- Los controladores validan permisos específicos por acción
- Propietarios pueden compartir y gestionar miembros

## 🧪 Testing y Desarrollo

```bash
# Ejecutar en modo desarrollo (con nodemon)
npm run dev

# Verificar notificaciones manualmente
POST /notifications/check

# Enviar email de prueba
POST /notifications/test
```

## 📝 Buenas Prácticas Implementadas

✅ Documentación JSDoc completa
✅ Separación de responsabilidades (MVC)
✅ Validación de datos con express-validator
✅ Manejo centralizado de errores
✅ Transacciones para operaciones críticas
✅ Logging en desarrollo
✅ Variables de entorno para configuración
✅ Código modular y reutilizable

## 🤝 Contribución

Para agregar nuevas funcionalidades:
1. Documentar con JSDoc
2. Validar datos de entrada
3. Manejar errores apropiadamente
4. Mantener consistencia en respuestas JSON
5. Actualizar esta documentación

## 📄 Licencia

Este proyecto es parte de una práctica profesional.
