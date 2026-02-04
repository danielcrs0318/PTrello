/**
 * Modelo de Miembro de Tablero
 * Representa la relación muchos-a-muchos entre usuarios y tableros compartidos
 * @module modelos/BoardMember
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

/**
 * Definición del modelo BoardMember
 * @typedef {Object} BoardMember
 * @property {string} id - UUID generado automáticamente
 * @property {string} boardId - ID del tablero (obligatorio)
 * @property {string} userId - ID del usuario (obligatorio)
 * @property {('editor'|'lector')} role - Rol del miembro en el tablero
 * @property {Date} invitedAt - Fecha de invitación
 */
const BoardMember = sequelize.define('board_members', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    boardId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'board_id',
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
    },
    role: {
        type: DataTypes.ENUM('editor', 'lector'),
        allowNull: false,
        defaultValue: 'lector',
    },
    invitedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'invited_at',
    },
}, {
    timestamps: true,
    underscored: true,
    tableName: 'board_members',
});

module.exports = BoardMember;
