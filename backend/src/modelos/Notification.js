/**
 * Modelo de Notificación
 * Representa notificaciones del sistema, principalmente invitaciones a tableros
 * @module modelos/Notification
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

/**
 * Definición del modelo Notification
 * @typedef {Object} Notification
 * @property {string} id - UUID generado automáticamente
 * @property {string} userId - ID del usuario que recibe la notificación (obligatorio)
 * @property {('board_invitation'|'task_assigned'|'due_date_reminder')} type - Tipo de notificación
 * @property {string} title - Título de la notificación (obligatorio)
 * @property {string} message - Mensaje de la notificación (opcional)
 * @property {string} boardId - ID del tablero relacionado (opcional)
 * @property {string} inviterId - ID del usuario que envió la invitación (opcional)
 * @property {('editor'|'lector')} role - Rol asignado en caso de invitación a tablero (opcional)
 * @property {boolean} isRead - Indica si la notificación ha sido leída (por defecto false)
 * @property {('pending'|'accepted'|'rejected')} status - Estado de la notificación
 */
const Notification = sequelize.define('notifications', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
    },
    type: {
        type: DataTypes.ENUM('board_invitation', 'task_assigned', 'due_date_reminder'),
        allowNull: false,
        defaultValue: 'board_invitation',
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    boardId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'board_id',
    },
    inviterId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'inviter_id',
    },
    role: {
        type: DataTypes.ENUM('editor', 'lector'),
        allowNull: true,
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_read',
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
    },
}, {
    timestamps: true,
    underscored: true,
    tableName: 'notifications',
});

module.exports = Notification;
