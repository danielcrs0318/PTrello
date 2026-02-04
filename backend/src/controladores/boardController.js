/**
 * Controlador de tableros
 * Maneja todas las operaciones CRUD de tableros y sus columnas
 * @module controladores/boardController
 */

const { validationResult } = require('express-validator');

const {
    sequelize,
    Board,
    Column,
    Task,
    User,
    Subtask,
    BoardMember,
} = require('../configuraciones/initModels');

/**
 * Columnas por defecto que se crean al inicializar un tablero
 * @constant {Array<Object>}
 */
const DEFAULT_COLUMNS = [
    { name: 'Por hacer', position: 1 },
    { name: 'En proceso', position: 2 },
    { name: 'Finalizado', position: 3 },
];

/**
 * Ordena el contenido de un tablero de forma jerárquica
 * - Columnas por posición ascendente
 * - Tareas por fecha de creación
 * - Subtareas por posición
 * @param {Object} board - Objeto tablero con columnas, tareas y subtareas
 * @returns {Object} Tablero ordenado
 */
const sortBoardPayload = (board) => {
    if (!board) {
        return board;
    }

    const sortedBoard = board;
    if (sortedBoard.columns) {
        sortedBoard.columns.sort((a, b) => a.position - b.position);
        sortedBoard.columns.forEach((column) => {
            if (column.tasks) {
                column.tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                // Ordenar subtareas por posición
                column.tasks.forEach((task) => {
                    if (task.subtasks) {
                        task.subtasks.sort((a, b) => a.position - b.position);
                    }
                });
            }
        });
    }

    return sortedBoard;
};

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
 * Crea un nuevo tablero con columnas por defecto
 * @param {Object} req - Request con nombre y descripción en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con el tablero creado (status 201) o error
 */
const createBoard = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        handleValidation(req);

        const { name, description } = req.body;
        const board = await Board.create({
            name,
            description,
            ownerId: req.user.id,
        }, { transaction });

        const columns = DEFAULT_COLUMNS.map((column) => ({
            ...column,
            boardId: board.id,
        }));

        await Column.bulkCreate(columns, { transaction });
        await transaction.commit();

        const persistedBoard = await Board.findByPk(board.id, {
            include: [
                {
                    model: Column,
                    as: 'columns',
                    include: [
                        {
                            model: Task,
                            as: 'tasks',
                            include: [
                                {
                                    model: User,
                                    as: 'assignees',
                                    attributes: ['id', 'displayName', 'email', 'avatarUrl'],
                                    through: { attributes: [] },
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
                            ],
                        },
                    ],
                },
            ],
            order: [
                [{ model: Column, as: 'columns' }, 'position', 'ASC'],
                [{ model: Column, as: 'columns' }, { model: Task, as: 'tasks' }, 'createdAt', 'ASC'],
                [{ model: Column, as: 'columns' }, { model: Task, as: 'tasks' }, { model: Subtask, as: 'subtasks' }, 'position', 'ASC'],
            ],
        });

        return res.status(201).json(sortBoardPayload(persistedBoard.toJSON()));
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible crear el tablero en este momento.',
            ...payload,
        });
    }
};

/**
 * Lista todos los tableros del usuario autenticado
 * Incluye tableros propios y tableros compartidos
 * @param {Object} req - Request con usuario autenticado
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con array de tableros del usuario
 */
const listBoards = async (req, res) => {
    try {
        const userId = req.user.id;

        // Obtener tableros propios
            const ownedBoards = await Board.findAll({
                where: { ownerId: userId },
                attributes: ['id', 'name', 'description', 'backgroundColor', 'ownerId', 'createdAt', 'updatedAt'],
                order: [['updatedAt', 'DESC']],
            });

        // Obtener tableros compartidos
            const sharedBoardMembers = await BoardMember.findAll({
                where: { userId },
                include: [
                    {
                        model: Board,
                        as: 'board',
                        attributes: ['id', 'name', 'description', 'backgroundColor', 'ownerId', 'createdAt', 'updatedAt'],
                    },
                ],
                order: [['createdAt', 'DESC']],
            });

        // Extraer los tableros de los miembros compartidos
        const sharedBoards = sharedBoardMembers
            .map(member => member.board)
            .filter(board => board !== null);

        // Combinar tableros propios y compartidos
        const allBoards = [...ownedBoards, ...sharedBoards];

            const payload = allBoards.map((board) => ({
                ...board.toJSON(),
                isOwner: board.ownerId === userId,
            }));
        
        return res.json(payload);
    } catch (error) {
        console.error('Error en listBoards:', error);
        return res.status(500).json({
            mensaje: 'No se pudieron obtener los tableros.',
            error: error.message,
        });
    }
};

/**
 * Obtiene un tablero específico por ID
 * Verifica que el usuario sea propietario o miembro del tablero
 * @param {Object} req - Request con id del tablero en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con el tablero completo o error 404/403
 */
const getBoard = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Buscar el tablero sin restricción de propietario
        const board = await Board.findOne({
            where: { id },
            include: [
                {
                    model: Column,
                    as: 'columns',
                    include: [
                        {
                            model: Task,
                            as: 'tasks',
                            include: [
                                {
                                    model: User,
                                    as: 'assignees',
                                    attributes: ['id', 'displayName', 'email', 'avatarUrl'],
                                    through: { attributes: [] },
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
                            ],
                        },
                    ],
                },
            ],
            order: [
                [{ model: Column, as: 'columns' }, 'position', 'ASC'],
                [{ model: Column, as: 'columns' }, { model: Task, as: 'tasks' }, 'createdAt', 'ASC'],
                [{ model: Column, as: 'columns' }, { model: Task, as: 'tasks' }, { model: Subtask, as: 'subtasks' }, 'position', 'ASC'],
            ],
        });

        if (!board) {
            return res.status(404).json({ mensaje: 'Tablero no encontrado.' });
        }

        // Verificar si el usuario tiene acceso (es propietario o miembro)
        const isOwner = board.ownerId === userId;
        const isMember = await BoardMember.findOne({
            where: { boardId: id, userId }
        });

        if (!isOwner && !isMember) {
            return res.status(403).json({ mensaje: 'No tienes acceso a este tablero.' });
        }

        return res.json(sortBoardPayload(board.toJSON()));
    } catch (error) {
        return res.status(500).json({
            mensaje: 'No fue posible recuperar el tablero solicitado.',
            error: error.message,
        });
    }
};

/**
 * Actualiza un tablero existente
 * Solo propietarios y miembros con rol "editor" pueden actualizar
 * @param {Object} req - Request con id en params y datos a actualizar en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con el tablero actualizado o error
 */
const updateBoard = async (req, res) => {
    try {
        handleValidation(req);

        const { id } = req.params;
        const { name, description, backgroundColor } = req.body;
        const userId = req.user.id;

        // Buscar el tablero
        const board = await Board.findByPk(id);

        if (!board) {
            return res.status(404).json({ mensaje: 'Tablero no encontrado.' });
        }

        // Verificar permisos: propietario o editor
        const isOwner = board.ownerId === userId;
        const member = await BoardMember.findOne({
            where: { boardId: id, userId }
        });

        const canEdit = isOwner || (member && member.role === 'editor');

        if (!canEdit) {
            return res.status(403).json({ mensaje: 'No tienes permisos para editar este tablero.' });
        }

        const updates = {};
        if (typeof name === 'string') {
            updates.name = name;
        }
        if (description !== undefined) {
            updates.description = description;
        }
        if (backgroundColor !== undefined) {
            updates.backgroundColor = backgroundColor;
        }

        await board.update(updates);

        return res.json(board);
    } catch (error) {
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible actualizar el tablero.',
            ...payload,
        });
    }
};

/**
 * Elimina un tablero de forma permanente
 * Solo el propietario del tablero puede eliminarlo
 * @param {Object} req - Request con id del tablero en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con mensaje de confirmación o error
 */
const deleteBoard = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Buscar el tablero
        const board = await Board.findByPk(id);

        if (!board) {
            return res.status(404).json({ mensaje: 'Tablero no encontrado.' });
        }

        // Verificar que el usuario es el propietario
        if (board.ownerId !== userId) {
            return res.status(403).json({ mensaje: 'Solo el propietario puede eliminar el tablero.' });
        }

        // Eliminar el tablero (las columnas, tareas y subtareas se eliminan en cascada)
        await board.destroy();

        return res.json({ mensaje: 'Tablero eliminado correctamente.' });
    } catch (error) {
        return res.status(500).json({
            mensaje: 'No fue posible eliminar el tablero.',
            error: error.message,
        });
    }
};

/**
 * Crea una nueva columna en un tablero
 * @param {Object} req - Request con boardId en params y name en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con la columna creada (status 201) o error
 */
const createColumn = async (req, res) => {
    try {
        handleValidation(req);
        
        const { boardId } = req.params;
        const { name } = req.body;
        const userId = req.user.id;

        // Verificar que el tablero existe
        const board = await Board.findByPk(boardId);

        if (!board) {
            return res.status(404).json({ mensaje: 'Tablero no encontrado.' });
        }

        // Verificar que el usuario es el propietario o miembro
        if (board.ownerId !== userId) {
            const member = await BoardMember.findOne({
                where: { boardId, userId },
            });
            
            if (!member) {
                return res.status(403).json({ mensaje: 'No tienes acceso a este tablero.' });
            }
        }

        // Obtener la posición máxima actual
        const maxPosition = await Column.max('position', {
            where: { boardId },
        }) || 0;

        // Crear la nueva columna
        const column = await Column.create({
            name,
            boardId,
            position: maxPosition + 1,
        });

        return res.status(201).json(column);
    } catch (error) {
        console.error('Error al crear columna:', error);
        return res.status(500).json({
            mensaje: 'No fue posible crear la columna.',
            error: error.message,
        });
    }
};

/**
 * Actualiza el nombre de una columna
 * @param {Object} req - Request con columnId en params y name en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con la columna actualizada o error
 */
const updateColumn = async (req, res) => {
    try {
        handleValidation(req);
        
        const { columnId } = req.params;
        const { name } = req.body;
        const userId = req.user.id;

        // Buscar la columna con su tablero
        const column = await Column.findByPk(columnId, {
            include: [{
                model: Board,
                as: 'board',
            }],
        });

        if (!column) {
            return res.status(404).json({ mensaje: 'Columna no encontrada.' });
        }

        // Verificar que el usuario tiene acceso
        const board = column.board;
        if (board.ownerId !== userId) {
            const member = await BoardMember.findOne({
                where: { boardId: board.id, userId },
            });
            
            if (!member) {
                return res.status(403).json({ mensaje: 'No tienes acceso a este tablero.' });
            }
        }

        // Actualizar la columna
        column.name = name;
        await column.save();

        return res.json(column);
    } catch (error) {
        console.error('Error al actualizar columna:', error);
        return res.status(500).json({
            mensaje: 'No fue posible actualizar la columna.',
            error: error.message,
        });
    }
};

/**
 * Elimina una columna y todas sus tareas
 * @param {Object} req - Request con columnId en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con mensaje de éxito o error
 */
const deleteColumn = async (req, res) => {
    try {
        const { columnId } = req.params;
        const userId = req.user.id;

        // Buscar la columna con su tablero
        const column = await Column.findByPk(columnId, {
            include: [{
                model: Board,
                as: 'board',
            }],
        });

        if (!column) {
            return res.status(404).json({ mensaje: 'Columna no encontrada.' });
        }

        // Verificar que el usuario tiene acceso
        const board = column.board;
        if (board.ownerId !== userId) {
            const member = await BoardMember.findOne({
                where: { boardId: board.id, userId },
            });
            
            if (!member) {
                return res.status(403).json({ mensaje: 'No tienes acceso a este tablero.' });
            }
        }

        // Eliminar la columna (las tareas y subtareas se eliminan en cascada)
        await column.destroy();

        return res.json({ mensaje: 'Columna eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar columna:', error);
        return res.status(500).json({
            mensaje: 'No fue posible eliminar la columna.',
            error: error.message,
        });
    }
};

module.exports = {
    createBoard,
    listBoards,
    getBoard,
    updateBoard,
    deleteBoard,
    createColumn,
    updateColumn,
    deleteColumn,
};
