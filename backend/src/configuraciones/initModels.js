/**
 * Módulo de inicialización de modelos Sequelize
 * Define todas las relaciones entre los modelos de la base de datos
 * @module configuraciones/initModels
 */

const sequelize = require('./sequelize');
const User = require('../modelos/User');
const Board = require('../modelos/Board');
const Column = require('../modelos/Column');
const Task = require('../modelos/Task');
const Subtask = require('../modelos/Subtask');
const BoardMember = require('../modelos/BoardMember');
const Notification = require('../modelos/Notification');
const PasswordResetPin = require('../modelos/PasswordResetPin');
const TaskAssignee = require('../modelos/TaskAssignee');
const SubtaskAssignee = require('../modelos/SubtaskAssignee');
const Image = require('../modelos/Image');
const ErrorLog = require('../modelos/ErrorLog');

let initialized = false;

/**
 * Inicializa todos los modelos y sus relaciones
 * Solo se ejecuta una vez para evitar redefinir relaciones
 * 
 * Relaciones definidas:
 * - User -> Board (uno a muchos): Un usuario puede tener muchos tableros
 * - Board -> Column (uno a muchos): Un tablero puede tener muchas columnas
 * - Column -> Task (uno a muchos): Una columna puede tener muchas tareas
 * - Task -> Subtask (uno a muchos): Una tarea puede tener muchas subtareas
 * - User <-> Board (muchos a muchos): Usuarios pueden ser miembros de tableros
 * - User -> Task (uno a muchos): Un usuario puede ser asignado a muchas tareas
 * - User -> Notification (uno a muchos): Un usuario puede tener muchas notificaciones
 * - Board -> Notification (uno a muchos): Un tablero puede generar muchas notificaciones
 */
const initModels = () => {
    if (initialized) {
        return;
    }

    User.hasMany(Board, {
        as: 'ownedBoards',
        foreignKey: { name: 'ownerId', allowNull: false },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
    });
    Board.belongsTo(User, {
        as: 'owner',
        foreignKey: { name: 'ownerId', allowNull: false },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
    });

    Board.hasMany(Column, {
        as: 'columns',
        foreignKey: { name: 'boardId', allowNull: false },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    Column.belongsTo(Board, {
        as: 'board',
        foreignKey: { name: 'boardId', allowNull: false },
    });

    Column.hasMany(Task, {
        as: 'tasks',
        foreignKey: { name: 'columnId', allowNull: false },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    Task.belongsTo(Column, {
        as: 'column',
        foreignKey: { name: 'columnId', allowNull: false },
    });

    User.hasMany(Task, {
        as: 'assignedTasks',
        foreignKey: { name: 'assigneeId', allowNull: true },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    });
    Task.belongsTo(User, {
        as: 'assignee',
        foreignKey: { name: 'assigneeId', allowNull: true },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    });

    Task.belongsToMany(User, {
        through: TaskAssignee,
        as: 'assignees',
        foreignKey: { name: 'taskId', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        otherKey: { name: 'userId', onDelete: 'NO ACTION', onUpdate: 'CASCADE' },
    });
    User.belongsToMany(Task, {
        through: TaskAssignee,
        as: 'assignedTasksMulti',
        foreignKey: { name: 'userId', onDelete: 'NO ACTION', onUpdate: 'CASCADE' },
        otherKey: { name: 'taskId', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    });

    Task.hasMany(Subtask, {
        as: 'subtasks',
        foreignKey: { name: 'taskId', allowNull: false },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    Subtask.belongsTo(Task, {
        as: 'task',
        foreignKey: { name: 'taskId', allowNull: false },
    });

    User.hasMany(Subtask, {
        as: 'assignedSubtasks',
        foreignKey: { name: 'assigneeId', allowNull: true },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    });
    Subtask.belongsTo(User, {
        as: 'assignee',
        foreignKey: { name: 'assigneeId', allowNull: true },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    });

    Subtask.belongsToMany(User, {
        through: SubtaskAssignee,
        as: 'assignees',
        foreignKey: { name: 'subtaskId', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        otherKey: { name: 'userId', onDelete: 'NO ACTION', onUpdate: 'CASCADE' },
    });
    User.belongsToMany(Subtask, {
        through: SubtaskAssignee,
        as: 'assignedSubtasksMulti',
        foreignKey: { name: 'userId', onDelete: 'NO ACTION', onUpdate: 'CASCADE' },
        otherKey: { name: 'subtaskId', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    });


    // Relaciones de BoardMember
    Board.belongsToMany(User, {
        through: BoardMember,
        as: 'members',
        foreignKey: 'boardId',
        otherKey: 'userId',
    });
    User.belongsToMany(Board, {
        through: BoardMember,
        as: 'sharedBoards',
        foreignKey: 'userId',
        otherKey: 'boardId',
    });

    BoardMember.belongsTo(Board, {
        as: 'board',
        foreignKey: 'boardId',
    });
    BoardMember.belongsTo(User, {
        as: 'user',
        foreignKey: 'userId',
    });

    // Relaciones de Notification
    User.hasMany(Notification, {
        as: 'notifications',
        foreignKey: 'userId',
        onDelete: 'CASCADE',
    });
    Notification.belongsTo(User, {
        as: 'user',
        foreignKey: 'userId',
    });

    Board.hasMany(Notification, {
        as: 'notifications',
        foreignKey: 'boardId',
        onDelete: 'CASCADE',
    });
    Notification.belongsTo(Board, {
        as: 'board',
        foreignKey: 'boardId',
    });

    User.hasMany(Notification, {
        as: 'sentInvitations',
        foreignKey: 'inviterId',
        onDelete: 'NO ACTION',
    });
    Notification.belongsTo(User, {
        as: 'inviter',
        foreignKey: 'inviterId',
    });

    User.hasMany(PasswordResetPin, {
        as: 'passwordResetPins',
        foreignKey: 'userId',
        onDelete: 'CASCADE',
    });
    PasswordResetPin.belongsTo(User, {
        as: 'user',
        foreignKey: 'userId',
    });

    // Relaciones de ErrorLog
    User.hasMany(ErrorLog, {
        as: 'errorLogs',
        foreignKey: 'userId',
        onDelete: 'SET NULL',
    });
    ErrorLog.belongsTo(User, {
        as: 'user',
        foreignKey: 'userId',
    });

    initialized = true;
};

module.exports = {
    initModels,
    sequelize,
    User,
    Board,
    Column,
    Task,
    Subtask,
    BoardMember,
    Notification,
    PasswordResetPin,
    TaskAssignee,
    SubtaskAssignee,
    Image,
    ErrorLog,
};
