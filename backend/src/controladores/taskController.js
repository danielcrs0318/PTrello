/**
 * Controlador de tareas
 * Maneja todas las operaciones CRUD de tareas y subtareas
 * @module controladores/taskController
 */

const { validationResult } = require('express-validator');

const {
    sequelize,
    Board,
    Column,
    Task,
    Subtask,
    BoardMember,
    User,
} = require('../configuraciones/initModels');

/**
 * Valida los resultados de express-validator
 * @param {Object} req - Objeto request de Express
 * @throws {Error} Error con status 400 y detalles de validación si hay errores
 */
const handleValidation = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formatted = errors.array().map((error) => ({
            campo: error.param,
            mensaje: error.msg,
        }));
        const validationError = new Error('Solicitud inválida');
        validationError.status = 400;
        validationError.details = formatted;
        throw validationError;
    }
};

/**
 * Verifica que un usuario sea propietario de un tablero
 * @param {string} boardId - UUID del tablero
 * @param {string} userId - UUID del usuario
 * @param {Object} transaction - Transacción de Sequelize
 * @returns {Promise<Object>} Objeto Board si el usuario es propietario
 * @throws {Error} Error 404 si el tablero no existe o el usuario no es propietario
 */
const assertBoardOwnership = async (boardId, userId, transaction) => {
    const board = await Board.findOne({
        where: { id: boardId, ownerId: userId },
        transaction,
    });

    if (!board) {
        const notFound = new Error('Tablero no encontrado.');
        notFound.status = 404;
        throw notFound;
    }

    return board;
};

const assertAssigneesInBoard = async (boardId, assigneeIds = []) => {
    if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) {
        return;
    }

    const board = await Board.findByPk(boardId, { attributes: ['id', 'ownerId'] });
    if (!board) {
        const error = new Error('Tablero no encontrado.');
        error.status = 404;
        throw error;
    }

    const uniqueIds = [...new Set(assigneeIds)];
    const invalidIds = uniqueIds.filter((assigneeId) => assigneeId !== board.ownerId);
    if (invalidIds.length === 0) {
        return;
    }

    const members = await BoardMember.findAll({
        where: { boardId, userId: invalidIds },
        attributes: ['userId'],
    });

    if (members.length !== invalidIds.length) {
        const error = new Error('Al menos un responsable no pertenece al tablero.');
        error.status = 400;
        throw error;
    }
};

const assertBoardOwnerAccess = async (boardId, userId) => {
    const board = await Board.findByPk(boardId, { attributes: ['id', 'ownerId'] });
    if (!board) {
        const error = new Error('Tablero no encontrado.');
        error.status = 404;
        throw error;
    }

    if (board.ownerId !== userId) {
        const error = new Error('Solo el propietario del tablero puede asignar responsables.');
        error.status = 403;
        throw error;
    }

    return board;
};

const assertBoardEditorAccess = async (boardId, userId) => {
    const board = await Board.findByPk(boardId, { attributes: ['id', 'ownerId'] });
    if (!board) {
        const error = new Error('Tablero no encontrado.');
        error.status = 404;
        throw error;
    }

    if (board.ownerId === userId) {
        return { board, role: 'owner' };
    }

    const member = await BoardMember.findOne({ where: { boardId, userId } });
    if (!member || member.role !== 'editor') {
        const error = new Error('No tienes permisos para modificar esta tarea.');
        error.status = 403;
        throw error;
    }

    return { board, role: member.role };
};

/**
 * Crea una nueva tarea en un tablero
 * @param {Object} req - Request con boardId en params y datos de tarea en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con la tarea creada (status 201) o error
 */
const createTask = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        handleValidation(req);

        const { boardId } = req.params;
        const { title, description, dueDate, columnId, completed, assigneeIds } = req.body;

        const board = await assertBoardOwnership(boardId, req.user.id, transaction);

        const targetColumn = columnId
            ? await Column.findOne({ where: { id: columnId, boardId: board.id }, transaction })
            : await Column.findOne({ where: { boardId: board.id }, order: [['position', 'ASC']], transaction });

        if (!targetColumn) {
            const error = new Error('No existe una columna válida para agregar la tarea.');
            error.status = 400;
            throw error;
        }

        if (assigneeIds !== undefined) {
            await assertAssigneesInBoard(board.id, assigneeIds);
        }

        const task = await Task.create({
            title,
            description,
            dueDate,
            completed: typeof completed === 'boolean' ? completed : false,
            columnId: targetColumn.id,
        }, { transaction });

        if (assigneeIds !== undefined) {
            await task.setAssignees(assigneeIds, { transaction });
        }

        await transaction.commit();

        const persistedTask = await Task.findByPk(task.id, {
            include: [
                {
                    model: Column,
                    as: 'column',
                    attributes: ['id', 'name', 'position', 'boardId'],
                },
                {
                    model: Subtask,
                    as: 'subtasks',
                    attributes: ['id', 'title', 'description', 'completed', 'position', 'color', 'dueDate'],
                    include: [
                        {
                            model: User,
                            as: 'assignees',
                            attributes: ['id', 'displayName', 'email', 'avatarUrl'],
                            through: { attributes: [] },
                        },
                    ],
                },
                {
                    model: User,
                    as: 'assignees',
                    attributes: ['id', 'displayName', 'email', 'avatarUrl'],
                    through: { attributes: [] },
                },
            ],
        });

        return res.status(201).json(persistedTask);
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible crear la tarea.',
            ...payload,
        });
    }
};

/**
 * Actualiza una tarea existente
 * Permite cambiar título, descripción, fecha de vencimiento, columna y color
 * @param {Object} req - Request con id de tarea en params y datos a actualizar en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con la tarea actualizada o error
 */
const updateTask = async (req, res) => {
    try {
        handleValidation(req);

        const { id } = req.params;
        const { title, description, dueDate, columnId, color, completed, assigneeIds } = req.body;

        const task = await Task.findByPk(id, {
            include: [
                {
                    model: Column,
                    as: 'column',
                    include: [
                        {
                            model: Board,
                            as: 'board',
                            attributes: ['id', 'ownerId'],
                        },
                    ],
                },
            ],
        });

        if (!task) {
            return res.status(404).json({ mensaje: 'Tarea no encontrada.' });
        }

        await assertBoardEditorAccess(task.column.boardId, req.user.id);

        const updates = {};
        if (typeof title === 'string') {
            updates.title = title;
        }
        if (typeof description === 'string' || description === null) {
            updates.description = description;
        }
        if (dueDate !== undefined) {
            updates.dueDate = dueDate;
        }
        if (typeof completed === 'boolean') {
            updates.completed = completed;
        }
        if (color !== undefined) {
            updates.color = color;
        }
        if (assigneeIds !== undefined) {
            await assertBoardOwnerAccess(task.column.boardId, req.user.id);
            await assertAssigneesInBoard(task.column.boardId, assigneeIds);
        }

        if (columnId && columnId !== task.columnId) {
            const targetColumn = await Column.findOne({
                where: {
                    id: columnId,
                    boardId: task.column.boardId,
                },
            });

            if (!targetColumn) {
                return res.status(400).json({ mensaje: 'La columna destino no es válida.' });
            }

            updates.columnId = targetColumn.id;
        }

        await task.update(updates);

        if (assigneeIds !== undefined) {
            await task.setAssignees(assigneeIds);
        }

        const updatedTask = await Task.findByPk(task.id, {
            include: [
                {
                    model: Column,
                    as: 'column',
                    attributes: ['id', 'name', 'position', 'boardId'],
                },
                {
                    model: Subtask,
                    as: 'subtasks',
                    attributes: ['id', 'title', 'description', 'completed', 'position', 'color', 'dueDate'],
                    include: [
                        {
                            model: User,
                            as: 'assignees',
                            attributes: ['id', 'displayName', 'email', 'avatarUrl'],
                            through: { attributes: [] },
                        },
                    ],
                },
                {
                    model: User,
                    as: 'assignees',
                    attributes: ['id', 'displayName', 'email', 'avatarUrl'],
                    through: { attributes: [] },
                },
            ],
        });

        return res.json(updatedTask);
    } catch (error) {
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible actualizar la tarea.',
            ...payload,
        });
    }
};

/**
 * Crea una nueva subtarea dentro de una tarea
 * La posición se calcula automáticamente como la última
 * @param {Object} req - Request con taskId en params y title en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con la subtarea creada (status 201) o error
 */
const createSubtask = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        handleValidation(req);

        const { taskId } = req.params;
        const { title, description, assigneeIds } = req.body;

        const task = await Task.findByPk(taskId, {
            include: [
                {
                    model: Column,
                    as: 'column',
                    include: [
                        {
                            model: Board,
                            as: 'board',
                            attributes: ['id', 'ownerId'],
                        },
                    ],
                },
            ],
            transaction,
        });

        if (!task) {
            const error = new Error('Tarea no encontrada.');
            error.status = 404;
            throw error;
        }

        await assertBoardEditorAccess(task.column.boardId, req.user.id);

        const maxPosition = await Subtask.max('position', {
            where: { taskId },
            transaction,
        }) || 0;

        if (assigneeIds !== undefined) {
            await assertBoardOwnerAccess(task.column.boardId, req.user.id);
            await assertAssigneesInBoard(task.column.boardId, assigneeIds);
        }

        const subtask = await Subtask.create({
            title,
            description: description || null,
            taskId,
            position: maxPosition + 1,
            completed: false,
        }, { transaction });

        if (assigneeIds !== undefined) {
            await subtask.setAssignees(assigneeIds, { transaction });
        }

        await transaction.commit();

        const persistedSubtask = await Subtask.findByPk(subtask.id, {
            attributes: ['id', 'title', 'description', 'completed', 'position', 'color', 'dueDate'],
            include: [
                {
                    model: User,
                    as: 'assignees',
                    attributes: ['id', 'displayName', 'email', 'avatarUrl'],
                    through: { attributes: [] },
                },
            ],
        });

        return res.status(201).json(persistedSubtask);
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible crear la subtarea.',
            ...payload,
        });
    }
};

/**
 * Actualiza una subtarea existente
 * Permite cambiar título, estado de completado, color y fecha de vencimiento
 * @param {Object} req - Request con id de subtarea en params y datos a actualizar en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con la subtarea actualizada o error
 */
const updateSubtask = async (req, res) => {
    try {
        handleValidation(req);

        const { id } = req.params;
        const { title, description, completed, color, dueDate, assigneeIds } = req.body;

        const subtask = await Subtask.findByPk(id, {
            include: [
                {
                    model: Task,
                    as: 'task',
                    include: [
                        {
                            model: Column,
                            as: 'column',
                            include: [
                                {
                                    model: Board,
                                    as: 'board',
                                    attributes: ['id', 'ownerId'],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        if (!subtask) {
            return res.status(404).json({ mensaje: 'Subtarea no encontrada.' });
        }

        await assertBoardEditorAccess(subtask.task.column.boardId, req.user.id);

        const updates = {};
        if (typeof title === 'string') {
            updates.title = title;
        }
        if (typeof description === 'string' || description === null) {
            updates.description = description;
        }
        if (typeof completed === 'boolean') {
            updates.completed = completed;
        }
        if (color !== undefined) {
            updates.color = color;
        }
        if (dueDate !== undefined) {
            updates.dueDate = dueDate;
        }
        if (assigneeIds !== undefined) {
            await assertBoardOwnerAccess(subtask.task.column.boardId, req.user.id);
            await assertAssigneesInBoard(subtask.task.column.boardId, assigneeIds);
        }

        await subtask.update(updates);

        if (assigneeIds !== undefined) {
            await subtask.setAssignees(assigneeIds);
        }

        const updatedSubtask = await Subtask.findByPk(subtask.id, {
            attributes: ['id', 'title', 'description', 'completed', 'position', 'color', 'dueDate'],
            include: [
                {
                    model: User,
                    as: 'assignees',
                    attributes: ['id', 'displayName', 'email', 'avatarUrl'],
                    through: { attributes: [] },
                },
            ],
        });

        return res.json(updatedSubtask);
    } catch (error) {
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible actualizar la subtarea.',
            ...payload,
        });
    }
};

/**
 * Elimina una subtarea de forma permanente
 * Solo el propietario del tablero puede eliminar subtareas
 * @param {Object} req - Request con id de subtarea en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con mensaje de confirmación o error
 */
const deleteSubtask = async (req, res) => {
    try {
        const { id } = req.params;

        const subtask = await Subtask.findByPk(id, {
            include: [
                {
                    model: Task,
                    as: 'task',
                    include: [
                        {
                            model: Column,
                            as: 'column',
                            include: [
                                {
                                    model: Board,
                                    as: 'board',
                                    attributes: ['id', 'ownerId'],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        if (!subtask) {
            return res.status(404).json({ mensaje: 'Subtarea no encontrada.' });
        }

        await assertBoardEditorAccess(subtask.task.column.boardId, req.user.id);

        await subtask.destroy();

        return res.json({ mensaje: 'Subtarea eliminada correctamente.' });
    } catch (error) {
        return res.status(500).json({
            mensaje: 'No fue posible eliminar la subtarea.',
            error: error.message,
        });
    }
};

/**
 * Elimina una tarea de forma permanente
 * Solo el propietario del tablero puede eliminar la tarea
 * @param {Object} req - Request con id de tarea en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con mensaje de confirmación o error
 */
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findByPk(id, {
            include: [
                {
                    model: Column,
                    as: 'column',
                    include: [
                        {
                            model: Board,
                            as: 'board',
                            attributes: ['id', 'ownerId'],
                        },
                    ],
                },
            ],
        });

        if (!task) {
            return res.status(404).json({ mensaje: 'Tarea no encontrada.' });
        }

        if (task.column.board.ownerId !== req.user.id) {
            return res.status(403).json({ mensaje: 'No tienes permisos para eliminar esta tarea.' });
        }

        await task.destroy();

        return res.json({ mensaje: 'Tarea eliminada correctamente.' });
    } catch (error) {
        return res.status(500).json({
            mensaje: 'No fue posible eliminar la tarea.',
            error: error.message,
        });
    }
};

module.exports = {
    createTask,
    updateTask,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    deleteTask,
};
