/**
 * Rutas de tableros
 * Define los endpoints para la gestión de tableros y tareas
 * Todas las rutas requieren autenticación JWT
 * @module rutas/boardRoutes
 */

const { Router } = require('express');
const { body } = require('express-validator');
const passport = require('passport');

const {
    createBoard,
    listBoards,
    getBoard,
    updateBoard,
    deleteBoard,
    createColumn,
    updateColumn,
    deleteColumn,
} = require('../controladores/boardController');
const {
    createTask,
} = require('../controladores/taskController');

const router = Router();

router.post(
    '/',
    passport.authenticate('jwt', { session: false }),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre del tablero es obligatorio.')
        .isLength({ min: 3 })
        .withMessage('El nombre debe tener al menos 3 caracteres.'),
    body('description')
        .optional({ nullable: true })
        .isLength({ max: 500 })
        .withMessage('La descripción debe tener como máximo 500 caracteres.'),
    createBoard,
);

router.get(
    '/',
    passport.authenticate('jwt', { session: false }),
    listBoards,
);

router.get(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    getBoard,
);

router.put(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 3 })
        .withMessage('El nombre debe tener al menos 3 caracteres.'),
    body('description')
        .optional({ nullable: true })
        .isLength({ max: 500 })
        .withMessage('La descripción debe tener como máximo 500 caracteres.'),
    body('backgroundColor')
        .optional({ nullable: true })
        .isString()
        .withMessage('El color de fondo debe ser una cadena válida.'),
    updateBoard,
);

router.delete(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    deleteBoard,
);

router.post(
    '/:boardId/tasks',
    passport.authenticate('jwt', { session: false }),
    body('title')
        .trim()
        .notEmpty()
        .withMessage('El título de la tarea es obligatorio.'),
    body('description')
        .optional({ nullable: true })
        .isLength({ max: 1000 })
        .withMessage('La descripción debe tener como máximo 1000 caracteres.'),
    body('dueDate')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('La fecha límite debe tener un formato ISO8601 válido.'),
    body('columnId')
        .optional({ nullable: true })
        .isUUID()
        .withMessage('La columna indicada no es válida.'),
    body('assigneeIds')
        .optional()
        .isArray()
        .withMessage('Los responsables deben enviarse en una lista.'),
    body('assigneeIds.*')
        .optional()
        .isUUID()
        .withMessage('El responsable indicado no es válido.'),
    createTask,
);

// Rutas de columnas
router.post(
    '/:boardId/columns',
    passport.authenticate('jwt', { session: false }),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre de la columna es obligatorio.')
        .isLength({ min: 1, max: 100 })
        .withMessage('El nombre debe tener entre 1 y 100 caracteres.'),
    createColumn,
);

router.put(
    '/columns/:columnId',
    passport.authenticate('jwt', { session: false }),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre de la columna es obligatorio.')
        .isLength({ min: 1, max: 100 })
        .withMessage('El nombre debe tener entre 1 y 100 caracteres.'),
    updateColumn,
);

router.delete(
    '/columns/:columnId',
    passport.authenticate('jwt', { session: false }),
    deleteColumn,
);

module.exports = router;
