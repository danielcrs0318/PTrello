/**
 * Modelo de relación TaskAssignee (muchos a muchos)
 * @module modelos/TaskAssignee
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../configuraciones/sequelize');

const TaskAssignee = sequelize.define('task_assignees', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    taskId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'task_id',
        references: {
            model: 'tasks',
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
    tableName: 'task_assignees',
    indexes: [
        { unique: true, fields: ['task_id', 'user_id'] },
    ],
});

module.exports = TaskAssignee;
