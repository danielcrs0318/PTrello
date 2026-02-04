/**
 * Modelo de Tablero
 * Representa un tablero tipo Kanban con columnas y tareas
 * @module modelos/Board
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

/**
 * Definición del modelo Board
 * @typedef {Object} Board
 * @property {string} id - UUID generado automáticamente
 * @property {string} name - Nombre del tablero (obligatorio)
 * @property {string} description - Descripción del tablero (opcional)
 * @property {string} backgroundColor - Color de fondo del tablero (opcional)
 * @property {string} ownerId - ID del usuario propietario (clave foránea)
 */
const Board = sequelize.define('boards', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    backgroundColor: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
    },
});

module.exports = Board;
