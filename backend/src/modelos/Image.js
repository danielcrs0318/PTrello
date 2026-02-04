/**
 * Modelo de Imagen
 * Guarda metadata de imágenes asociadas a tareas o subtareas.
 * @module modelos/Image
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

const Image = sequelize.define('images', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    entityType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'entity_type',
    },
    entityId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'entity_id',
    },
    imageName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'image_name',
    },
    imageUrl: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'image_url',
    },
    storagePath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'storage_path',
    },
    uploadedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'uploaded_by',
    },
    uploadedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'uploaded_at',
    },
}, {
    timestamps: false,
    underscored: true,
    tableName: 'images',
});

module.exports = Image;
