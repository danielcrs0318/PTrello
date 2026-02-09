/**
 * Modelo de Registro de Errores
 * Representa un error ocurrido en la aplicación con toda su información de contexto
 * @module modelos/ErrorLog
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

/**
 * Definición del modelo ErrorLog
 * @typedef {Object} ErrorLog
 * @property {string} id - UUID generado automáticamente
 * @property {string} message - Mensaje del error (obligatorio)
 * @property {text} stackTrace - Stack trace completo del error (opcional)
 * @property {string} httpMethod - Método HTTP de la petición (GET, POST, etc.) (opcional)
 * @property {string} url - URL donde ocurrió el error (opcional)
 * @property {string} ipAddress - Dirección IP del cliente (opcional)
 * @property {string} userId - ID del usuario autenticado (opcional)
 * @property {string} userAgent - User agent del navegador (opcional)
 * @property {integer} statusCode - Código de estado HTTP (opcional)
 * @property {text} requestBody - Cuerpo de la petición HTTP (opcional, JSON string)
 * @property {text} additionalInfo - Información adicional en formato JSON (opcional)
 * @property {date} createdAt - Fecha y hora de creación
 * @property {date} updatedAt - Fecha y hora de última actualización
 */
const ErrorLog = sequelize.define('error_logs', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    message: {
        type: DataTypes.STRING(1000),
        allowNull: false,
    },
    stackTrace: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    httpMethod: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    url: {
        type: DataTypes.STRING(2000),
        allowNull: true,
    },
    ipAddress: {
        type: DataTypes.STRING(45), // Para soportar IPv6
        allowNull: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    statusCode: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 500,
    },
    requestBody: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    additionalInfo: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['createdAt'],
        },
        {
            fields: ['userId'],
        },
        {
            fields: ['httpMethod'],
        },
        {
            fields: ['statusCode'],
        },
    ],
});

module.exports = ErrorLog;
