/**
 * Modelo de Tarea
 * Representa una tarea dentro de una columna de un tablero
 * @module modelos/Task
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

/**
 * Definición del modelo Task
 * @typedef {Object} Task
 * @property {string} id - UUID generado automáticamente
 * @property {string} title - Título de la tarea (obligatorio)
 * @property {string} description - Descripción de la tarea (opcional)
 * @property {Date} dueDate - Fecha de vencimiento (opcional)
 * @property {string} color - Color de la tarea (opcional)
 * @property {string} columnId - ID de la columna a la que pertenece (clave foránea)
 * @property {string} assigneeId - ID del usuario asignado (clave foránea, opcional)
 * @property {Date} notificationSentAt - Fecha en que se envió la notificación (opcional)
 */
const Task = sequelize.define('tasks', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    color: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
    notificationSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        field: 'notification_sent_at',
    },
});

module.exports = Task;
