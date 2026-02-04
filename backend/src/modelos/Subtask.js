/**
 * Modelo de Subtarea
 * Representa una subtarea dentro de una tarea
 * @module modelos/Subtask
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

/**
 * Definición del modelo Subtask
 * @typedef {Object} Subtask
 * @property {string} id - UUID generado automáticamente
 * @property {string} title - Título de la subtarea (obligatorio)
 * @property {boolean} completed - Estado de completado (por defecto false)
 * @property {number} position - Posición de la subtarea dentro de la tarea (por defecto 0)
 * @property {string} color - Color de la subtarea (opcional)
 * @property {Date} dueDate - Fecha de vencimiento (opcional)
 * @property {Date} notificationSentAt - Fecha en que se envió la notificación de recordatorio (opcional)
 * @property {string} taskId - ID de la tarea a la que pertenece (clave foránea)
 */
const Subtask = sequelize.define('subtasks', {
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
    completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    position: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    color: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    assigneeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'assignee_id',
    },
    notificationSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
    },
});

module.exports = Subtask;
