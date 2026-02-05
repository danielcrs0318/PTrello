/**
 * Rutas de imágenes para tareas y subtareas.
 * @module rutas/imageRoutes
 */

const { Router } = require('express');
const passport = require('passport');
const multer = require('multer');
const { param } = require('express-validator');

const {
    uploadTaskImages,
    uploadSubtaskImages,
    deleteImage,
    listTaskImages,
    listSubtaskImages,
} = require('../controladores/imageController');
const { isMimeAllowed, getAllowedImageExtensions } = require('../servicios/imageStorage');

const router = Router();
const requireAuth = passport.authenticate('jwt', { session: false });

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!isMimeAllowed(file.mimetype)) {
            const allowedList = getAllowedImageExtensions().map((ext) => `.${ext}`).join(', ');
            return cb(new Error(`Tipo de imagen no permitido. Se aceptan: ${allowedList}`));
        }
        return cb(null, true);
    },
});

const handleMulterError = (err, _req, res, next) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            mensaje: 'Imagen demasiado grande. Máximo 15 MB por archivo.',
            error: err.message,
        });
    }
    return res.status(400).json({
        mensaje: 'Error al procesar archivos.',
        error: err.message,
    });
};

router.post(
    '/projects/:projectId/tasks/:taskId/images',
    requireAuth,
    param('projectId').isUUID().withMessage('Proyecto inválido.'),
    param('taskId').isUUID().withMessage('Tarea inválida.'),
    upload.array('images', 10),
    handleMulterError,
    uploadTaskImages,
);

router.get(
    '/projects/:projectId/tasks/:taskId/images',
    requireAuth,
    param('projectId').isUUID().withMessage('Proyecto inválido.'),
    param('taskId').isUUID().withMessage('Tarea inválida.'),
    listTaskImages,
);

router.post(
    '/projects/:projectId/tasks/:taskId/subtasks/:subtaskId/images',
    requireAuth,
    param('projectId').isUUID().withMessage('Proyecto inválido.'),
    param('taskId').isUUID().withMessage('Tarea inválida.'),
    param('subtaskId').isUUID().withMessage('Subtarea inválida.'),
    upload.array('images', 10),
    handleMulterError,
    uploadSubtaskImages,
);

router.get(
    '/projects/:projectId/tasks/:taskId/subtasks/:subtaskId/images',
    requireAuth,
    param('projectId').isUUID().withMessage('Proyecto inválido.'),
    param('taskId').isUUID().withMessage('Tarea inválida.'),
    param('subtaskId').isUUID().withMessage('Subtarea inválida.'),
    listSubtaskImages,
);

router.delete(
    '/images/:imageId',
    requireAuth,
    param('imageId').isInt().withMessage('Identificador de imagen inválido.'),
    deleteImage,
);

module.exports = router;
