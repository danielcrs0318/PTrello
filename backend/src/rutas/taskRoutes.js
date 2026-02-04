/**
 * Rutas de tareas y subtareas
 * Define los endpoints para la gestión de tareas y subtareas
 * Todas las rutas requieren autenticación JWT
 * @module rutas/taskRoutes
 */

const { Router } = require('express');
const { body, param } = require('express-validator');
const passport = require('passport');

const {
    updateTask,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    deleteTask,
} = require('../controladores/taskController');

const router = Router();

router.put(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    param('id').isUUID().withMessage('Identificador de tarea inválido.'),
    body('title').optional().isString().isLength({ min: 1 }).withMessage('El título debe ser válido.'),
    body('description')
        .optional({ nullable: true })
        .isLength({ max: 1000 })
        .withMessage('La descripción debe tener como máximo 1000 caracteres.'),
    body('dueDate')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('La fecha límite debe tener un formato ISO8601 válido.'),
    body('completed')
        .optional()
        .isBoolean()
        .withMessage('El estado debe ser un valor booleano.'),
    body('assigneeIds')
        .optional()
        .isArray()
        .withMessage('Los responsables deben enviarse en una lista.'),
    body('assigneeIds.*')
        .optional()
        .isUUID()
        .withMessage('El responsable indicado no es válido.'),
    body('columnId')
        .optional({ nullable: true })
        .isUUID()
        .withMessage('La columna indicada no es válida.'),
    updateTask,
);

router.delete(
    '/:id',
    passport.authenticate('jwt', { session: false }),
    param('id').isUUID().withMessage('Identificador de tarea inválido.'),
    deleteTask,
);

// Rutas para subtareas
router.post(
    '/:taskId/subtasks',
    passport.authenticate('jwt', { session: false }),
    param('taskId').isUUID().withMessage('Identificador de tarea inválido.'),
    body('title').isString().isLength({ min: 1 }).withMessage('El título es requerido.'),
    body('description')
        .optional({ nullable: true })
        .isLength({ max: 1000 })
        .withMessage('La descripción debe tener como máximo 1000 caracteres.'),
    body('assigneeIds')
        .optional()
        .isArray()
        .withMessage('Los responsables deben enviarse en una lista.'),
    body('assigneeIds.*')
        .optional()
        .isUUID()
        .withMessage('El responsable indicado no es válido.'),
    createSubtask,
);

router.put(
    '/subtasks/:id',
    passport.authenticate('jwt', { session: false }),
    param('id').isUUID().withMessage('Identificador de subtarea inválido.'),
    body('title').optional().isString().isLength({ min: 1 }).withMessage('El título debe ser válido.'),
    body('description')
        .optional({ nullable: true })
        .isLength({ max: 1000 })
        .withMessage('La descripción debe tener como máximo 1000 caracteres.'),
    body('completed').optional().isBoolean().withMessage('El estado debe ser un valor booleano.'),
    body('assigneeIds')
        .optional()
        .isArray()
        .withMessage('Los responsables deben enviarse en una lista.'),
    body('assigneeIds.*')
        .optional()
        .isUUID()
        .withMessage('El responsable indicado no es válido.'),
    updateSubtask,
);

router.delete(
    '/subtasks/:id',
    passport.authenticate('jwt', { session: false }),
    param('id').isUUID().withMessage('Identificador de subtarea inválido.'),
    deleteSubtask,
);

module.exports = router;
