/**
 * Punto de entrada principal de la aplicación backend
 * Configura Express, middlewares, rutas y conexión a base de datos
 * @module index
 */

require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

// Configuraciones y servicios
const passport = require('./configuraciones/passport');
const { initModels, sequelize } = require('./configuraciones/initModels');
const { startNotificationScheduler } = require('./servicios/notificationScheduler');

const authRoutes = require('./rutas/authRoutes');
const boardRoutes = require('./rutas/boardRoutes');
const taskRoutes = require('./rutas/taskRoutes');
const notificationRoutes = require('./rutas/notificationRoutes');
const boardMemberRoutes = require('./rutas/boardMemberRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : '*';

app.use(corsOrigins === '*'
    ? cors()
    : cors({ origin: corsOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(passport.initialize());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/boards', boardRoutes);
app.use('/tasks', taskRoutes);
app.use('/notifications', notificationRoutes);
app.use('/board-members', boardMemberRoutes);

app.use((_req, res) => res.status(404).json({ mensaje: 'Recurso no encontrado.' }));

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
        process.exit(1);
    }
};

start();
