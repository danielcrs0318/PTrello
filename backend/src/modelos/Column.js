/**
 * Modelo de Columna
 * Representa una columna dentro de un tablero (ej: "Por hacer", "En proceso")
 * @module modelos/Column
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

/**
 * Definición del modelo Column
 * @typedef {Object} Column
 * @property {string} id - UUID generado automáticamente
 * @property {string} name - Nombre de la columna (obligatorio)
 * @property {number} position - Posición de la columna en el tablero (obligatorio)
 * @property {string} boardId - ID del tablero al que pertenece (clave foránea)
 */
const Column = sequelize.define('columns', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    position: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

module.exports = Column;
