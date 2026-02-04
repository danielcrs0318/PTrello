/**
 * Modelo de PIN de recuperación de contraseña
 * @module modelos/PasswordResetPin
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

const PasswordResetPin = sequelize.define('password_reset_pins', {
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
    pinHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'pin_hash',
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
    },
    attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'used_at',
    },
}, {
    timestamps: true,
    underscored: true,
    tableName: 'password_reset_pins',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['expires_at'] },
    ],
});

module.exports = PasswordResetPin;
