/**
 * Modelo de Usuario
 * Representa un usuario autenticado con Google OAuth
 * @module modelos/User
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

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
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    displayName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    indexes: [
        {
            unique: true,
            fields: ['google_id'],
        },
        {
            unique: true,
            fields: ['email'],
        },
    ],
});

module.exports = User;
