# Guía de Documentación JSDoc - Backend PTrello

Esta guía establece las convenciones para documentar el código del backend usando JSDoc.

## 📘 Principios Generales

- **Toda función/método público debe estar documentado**
- **Los módulos deben tener un encabezado descriptivo**
- **Usar español para descripciones** (consistente con el código)
- **Ser claro y conciso** - evitar explicaciones obvias
- **Incluir tipos de datos** usando la notación JSDoc

## 🏷️ Estructura de Documentación

### 1. Encabezado de Módulo

Cada archivo debe comenzar con:

```javascript
/**
 * Breve descripción del módulo
 * Descripción adicional si es necesario (opcional)
 * @module ruta/nombreModulo
 */
```

**Ejemplo:**
```javascript
/**
 * Controlador de tableros
 * Maneja todas las operaciones CRUD de tableros y sus columnas
 * @module controladores/boardController
 */
```

### 2. Documentación de Funciones

Estructura completa:

```javascript
/**
 * Descripción de lo que hace la función
 * Detalles adicionales si son necesarios
 * @param {tipo} nombreParam - Descripción del parámetro
 * @param {tipo} nombreParam2 - Descripción del parámetro
 * @returns {tipo} Descripción de lo que retorna
 * @throws {Error} Cuándo lanza errores (opcional)
 */
const miFuncion = (nombreParam, nombreParam2) => {
  // ...
}
```

**Ejemplo:**
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

### 3. Documentación de Modelos

Para modelos Sequelize:

```javascript
/**
 * Modelo de [Entidad]
 * Descripción del propósito del modelo
 * @module modelos/NombreModelo
 */

/**
 * Definición del modelo [Entidad]
 * @typedef {Object} NombreModelo
 * @property {tipo} nombrePropiedad - Descripción
 * @property {tipo} otraPropiedad - Descripción
 */
const NombreModelo = sequelize.define('tabla', {
  // ...
});
```

**Ejemplo:**
```javascript
/**
 * Modelo de Tablero
 * Representa un tablero tipo Kanban con columnas y tareas
 * @module modelos/Board
 */

/**
 * Definición del modelo Board
 * @typedef {Object} Board
 * @property {string} id - UUID generado automáticamente
 * @property {string} name - Nombre del tablero (obligatorio)
 * @property {string} description - Descripción del tablero (opcional)
 */
const Board = sequelize.define('boards', {
  // ...
});
```

### 4. Documentación de Constantes

```javascript
/**
 * Descripción de la constante
 * @constant {tipo}
 */
const MI_CONSTANTE = valor;
```

**Ejemplo:**
```javascript
/**
 * Columnas por defecto que se crean al inicializar un tablero
 * @constant {Array<Object>}
 */
const DEFAULT_COLUMNS = [
  { name: 'Por hacer', position: 1 },
  { name: 'En proceso', position: 2 },
  { name: 'Finalizado', position: 3 },
];
```

## 📝 Tipos de Datos Comunes

### Tipos Básicos
```javascript
@param {string} - Cadena de texto
@param {number} - Número
@param {boolean} - Booleano
@param {Array} - Array genérico
@param {Object} - Objeto genérico
@param {Function} - Función
@param {Date} - Fecha
@param {null} - Null
@param {undefined} - Undefined
@param {*} - Cualquier tipo
```

### Tipos Específicos de Express
```javascript
@param {Object} req - Objeto request de Express
@param {Object} res - Objeto response de Express
@param {Function} next - Middleware next de Express
```

### Tipos de Sequelize
```javascript
@param {Object} transaction - Transacción de Sequelize
@returns {Promise<Object>} - Promesa que resuelve a un modelo
```

### Tipos Opcionales
```javascript
@param {string} [parametroOpcional] - Parámetro opcional
@param {string} [nombre='default'] - Con valor por defecto
```

### Tipos Múltiples
```javascript
@param {string|null} - String o null
@param {('editor'|'lector')} - Enum de valores específicos
```

### Objetos Complejos
```javascript
@param {Object} options - Opciones de configuración
@param {string} options.email - Email del usuario
@param {number} options.edad - Edad del usuario
```

### Arrays Tipados
```javascript
@returns {Array<string>} - Array de strings
@returns {Array<Object>} - Array de objetos
```

## 🎯 Patrones Comunes

### Controladores de Express

```javascript
/**
 * [Acción] [entidad]
 * Descripción adicional de la lógica
 * @param {Object} req - Request con [detalles de qué espera en params/body/query]
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con [descripción de respuesta exitosa] o error
 */
const nombreControlador = async (req, res) => {
  // ...
}
```

### Funciones de Validación

```javascript
/**
 * Valida [qué valida]
 * @param {tipo} parametro - Descripción
 * @throws {Error} Error con status [código] si [condición de error]
 * @returns {tipo} [Qué retorna si es válido]
 */
const validarAlgo = (parametro) => {
  // ...
}
```

### Servicios

```javascript
/**
 * [Acción que realiza el servicio]
 * @param {Object} options - Opciones del servicio
 * @param {tipo} options.campo1 - Descripción
 * @param {tipo} options.campo2 - Descripción
 * @returns {Promise<Object>} Resultado con success y [datos] o error
 */
async function nombreServicio({ campo1, campo2 }) {
  // ...
}
```

## ✅ Ejemplos Completos

### Módulo de Controlador
```javascript
/**
 * Controlador de autenticación
 * Maneja el flujo de autenticación con Google OAuth y generación de tokens JWT
 * @module controladores/authController
 */

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Usuario para el que se genera el token
 * @param {string} user.id - ID del usuario
 * @param {string} user.email - Email del usuario
 * @param {string} user.displayName - Nombre visible del usuario
 * @returns {string} Token JWT firmado con expiración de 12 horas
 * @throws {Error} Si JWT_SECRET no está configurado
 */
const createToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return jwt.sign({ /* ... */ }, JWT_SECRET, { expiresIn: '12h' });
};

/**
 * Callback handler para el flujo de autenticación de Google
 * @param {Object} req - Objeto request de Express con usuario autenticado
 * @param {Object} res - Objeto response de Express
 * @returns {Object} JSON con token y usuario, o redirección al frontend
 */
const googleCallback = (req, res) => {
  // ...
};
```

### Módulo de Modelo
```javascript
/**
 * Modelo de Usuario
 * Representa un usuario autenticado con Google OAuth
 * @module modelos/User
 */

/**
 * Definición del modelo User
 * @typedef {Object} User
 * @property {string} id - UUID generado automáticamente
 * @property {string} googleId - ID de Google OAuth (único, obligatorio)
 * @property {string} email - Email del usuario (único, obligatorio)
 * @property {string} displayName - Nombre visible del usuario (obligatorio)
 * @property {string} avatarUrl - URL del avatar del usuario (opcional)
 */
const User = sequelize.define('users', {
  // ...
});
```

### Módulo de Servicio
```javascript
/**
 * Servicio de envío de correos electrónicos
 * Utiliza Resend para enviar notificaciones por email
 * @module servicios/emailService
 */

/**
 * Envía un email de notificación sobre una subtarea próxima a vencer
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.boardName - Nombre del tablero
 * @param {string} options.taskTitle - Título de la tarea
 * @param {string} options.subtaskTitle - Título de la subtarea
 * @param {Date} options.dueDate - Fecha de vencimiento
 * @returns {Promise<Object>} Resultado del envío con success y messageId o error
 */
async function sendDueDateNotification({ to, boardName, taskTitle, subtaskTitle, dueDate }) {
  // ...
}
```

## ❌ Qué Evitar

### ❌ Documentación Obvia
```javascript
/**
 * Obtiene el usuario
 * @param {string} id - El id
 * @returns {Object} El usuario
 */
const getUser = (id) => { /* ... */ }
```

### ✅ Mejor
```javascript
/**
 * Busca un usuario por su ID en la base de datos
 * @param {string} id - UUID del usuario
 * @returns {Promise<Object>} Objeto usuario con todos sus datos o null si no existe
 */
const getUser = (id) => { /* ... */ }
```

### ❌ Sin Tipos
```javascript
/**
 * Crea un tablero
 * @param req
 * @param res
 */
```

### ✅ Mejor
```javascript
/**
 * Crea un nuevo tablero con columnas por defecto
 * @param {Object} req - Request con nombre y descripción en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con el tablero creado (status 201) o error
 */
```

## 🔧 Herramientas

### Generación de Documentación
Para generar documentación HTML:
```bash
npm install --save-dev jsdoc
npx jsdoc -c jsdoc.json
```

### Configuración jsdoc.json
```json
{
  "source": {
    "include": ["src"],
    "includePattern": ".js$"
  },
  "opts": {
    "destination": "./docs",
    "recurse": true
  }
}
```

### Validación en VS Code
JSDoc se valida automáticamente en VS Code. Para habilitar verificación de tipos:
```javascript
// @ts-check
```

## 📚 Referencias

- [JSDoc Official Documentation](https://jsdoc.app/)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html#jsdoc)

## 🎓 Checklist de Revisión

Antes de hacer commit, verifica que:

- [ ] Todos los módulos tienen encabezado @module
- [ ] Todas las funciones públicas están documentadas
- [ ] Todos los parámetros tienen tipo y descripción
- [ ] Los returns están documentados
- [ ] Los tipos complejos usan @typedef
- [ ] Las descripciones son claras y útiles (no obvias)
- [ ] Se usa español de forma consistente
- [ ] Los ejemplos de código funcionan
