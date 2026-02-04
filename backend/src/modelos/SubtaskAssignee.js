/**
 * Modelo de relación SubtaskAssignee (muchos a muchos)
 * @module modelos/SubtaskAssignee
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

const SubtaskAssignee = sequelize.define('subtask_assignees', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    subtaskId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'subtask_id',
        references: {
            model: 'subtasks',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
    },
}, {
    timestamps: true,
    underscored: true,
    tableName: 'subtask_assignees',
    indexes: [
        { unique: true, fields: ['subtask_id', 'user_id'] },
    ],
});

module.exports = SubtaskAssignee;
