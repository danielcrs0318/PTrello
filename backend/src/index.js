/**
 * Punto de entrada principal de la aplicación backend
 * Configura Express, middlewares, rutas y conexión a base de datos
 * @module index
 */

require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Configuraciones y servicios
const passport = require('./configuraciones/passport');
const { initModels, sequelize, ErrorLog } = require('./configuraciones/initModels');
const { startNotificationScheduler } = require('./servicios/notificationScheduler');

const authRoutes = require('./rutas/authRoutes');
const boardRoutes = require('./rutas/boardRoutes');
const taskRoutes = require('./rutas/taskRoutes');
const notificationRoutes = require('./rutas/notificationRoutes');
const boardMemberRoutes = require('./rutas/boardMemberRoutes');
const imageRoutes = require('./rutas/imageRoutes');
const calendarRoutes = require('./rutas/calendarRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const logsDir = path.join(__dirname, '..', 'logs');
const errorLogPath = path.join(logsDir, 'error.log');
const accessLogPath = path.join(logsDir, 'access.log');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(accessLogPath, { flags: 'a' });

/**
 * Función helper para guardar errores tanto en archivo como en base de datos
 * @param {Error|string} error - El error a guardar
 * @param {Object} options - Opciones adicionales para el logging
 * @param {string} options.httpMethod - Método HTTP de la petición
 * @param {string} options.url - URL donde ocurrió el error
 * @param {string} options.ipAddress - Dirección IP del cliente
 * @param {string} options.userId - ID del usuario autenticado
 * @param {string} options.userAgent - User agent del navegador
 * @param {number} options.statusCode - Código de estado HTTP
 * @param {string} options.requestBody - Cuerpo de la petición
 */
const logError = async (error, options = {}) => {
    const message = error?.message || String(error);
    const stackTrace = error?.stack || null;
    const line = `[${new Date().toISOString()}] ${stackTrace || message}\n`;
    
    // Guardar en archivo
    fs.appendFile(errorLogPath, line, () => {});
    
    // Intentar guardar en base de datos
    try {
        await ErrorLog.create({
            message: message.substring(0, 1000), // Limitar longitud del mensaje
            stackTrace,
            httpMethod: options.httpMethod || null,
            url: options.url ? options.url.substring(0, 2000) : null,
            ipAddress: options.ipAddress || null,
            userId: options.userId || null,
            userAgent: options.userAgent ? options.userAgent.substring(0, 500) : null,
            statusCode: options.statusCode || 500,
            requestBody: options.requestBody ? JSON.stringify(options.requestBody).substring(0, 5000) : null,
        });
    } catch (dbError) {
        // Si falla el guardado en BD, al menos lo registramos en el archivo
        console.error('Error guardando en base de datos de errores:', dbError.message);
    }
};

const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : '*';

app.use(corsOrigins === '*'
    ? cors()
    : cors({ origin: corsOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json());
app.use(passport.initialize());
app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/boards', boardRoutes);
app.use('/tasks', taskRoutes);
app.use('/notifications', notificationRoutes);
app.use('/board-members', boardMemberRoutes);
app.use('/calendar', calendarRoutes);
app.use('/', imageRoutes);

app.use((_req, res) => res.status(404).json({ mensaje: 'Recurso no encontrado.' }));

app.use((err, req, res, _next) => {
    // Extraer información de la petición
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.get('user-agent') || null;
    const httpMethod = req.method;
    const url = req.originalUrl || req.url;
    const requestBody = req.body && Object.keys(req.body).length > 0 ? req.body : null;
    
    // Guardar error en archivo y BD
    logError(err, {
        httpMethod,
        url,
        ipAddress,
        userId,
        userAgent,
        statusCode: err.statusCode || 500,
        requestBody,
    });
    
    res.status(err.statusCode || 500).json({ mensaje: 'Error interno del servidor.' });
});

/**
 * Función principal que inicia el servidor
 * - Inicializa los modelos de Sequelize
 * - Autentica la conexión a la base de datos
 * - Sincroniza los modelos
 * - Inicia el programador de notificaciones
 * - Levanta el servidor Express
 */
const start = async () => {
    try {
        initModels();
        await sequelize.authenticate();
        // Sincronizar solo los modelos que no son board_members (evitar conflictos)
        await sequelize.sync({ alter: false });

        // Iniciar el programador de notificaciones
        startNotificationScheduler();

        app.listen(PORT, () => {
            console.log(`Servidor escuchando en el puerto ${PORT}`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        if (error?.parent?.errors?.length) {
            const mensajes = error.parent.errors
                .map((err) => err?.message)
                .filter(Boolean);
            if (mensajes.length) {
                console.error('Detalles del error SQL Server:', mensajes);
            }
        }
        logError(error);
        process.exit(1);
    }
};

start();

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    logError(reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    logError(error);
    process.exit(1);
});
