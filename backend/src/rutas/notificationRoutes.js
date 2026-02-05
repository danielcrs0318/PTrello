/**
 * Rutas de notificaciones
 * Define los endpoints para la gestión de notificaciones y verificación de fechas
 * Todas las rutas requieren autenticación JWT
 * @module rutas/notificationRoutes
 */

const express = require('express');
const passport = require('passport');
const { checkDueDates, sendDailyReports, sendPendingReports } = require('../servicios/notificationScheduler');
const { sendDueDateNotification } = require('../servicios/emailService');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    acceptInvitation,
    rejectInvitation,
    deleteNotification,
} = require('../controladores/notificationController');

const router = express.Router();

// Middleware de autenticación
const requireAuth = passport.authenticate('jwt', { session: false });

// ==================== RUTAS DE GESTIÓN DE NOTIFICACIONES ====================

// Obtener notificaciones del usuario
router.get('/', requireAuth, getNotifications);

// Contar notificaciones no leídas
router.get('/unread-count', requireAuth, getUnreadCount);

// Marcar todas como leídas
router.put('/mark-all-read', requireAuth, markAllAsRead);

// Marcar notificación como leída
router.put('/:notificationId/read', requireAuth, markAsRead);

// Aceptar invitación
router.post('/:notificationId/accept', requireAuth, acceptInvitation);

// Rechazar invitación
router.post('/:notificationId/reject', requireAuth, rejectInvitation);

// Eliminar notificación
router.delete('/:notificationId', requireAuth, deleteNotification);

// ==================== RUTAS DE VERIFICACIÓN Y PRUEBAS ====================

/**
 * POST /notifications/check
 * Ejecuta manualmente la verificación de fechas de vencimiento
 */
router.post(
    '/check',
    requireAuth,
    async (req, res) => {
        try {
            await checkDueDates();
            return res.json({
                mensaje: 'Verificación de notificaciones completada',
                success: true
            });
        } catch (error) {
            return res.status(500).json({
                mensaje: 'Error al verificar notificaciones',
                error: error.message
            });
        }
    }
);

/**
 * POST /notifications/daily-report
 * Envía manualmente el resumen diario a todos los usuarios
 */
router.post(
    '/daily-report',
    requireAuth,
    async (req, res) => {
        try {
            await sendDailyReports();
            return res.json({
                mensaje: 'Resumen diario enviado manualmente',
                success: true
            });
        } catch (error) {
            return res.status(500).json({
                mensaje: 'Error al enviar el resumen diario',
                error: error.message
            });
        }
    }
);

/**
 * POST /notifications/test
 * Envía un email de prueba
 */
router.post(
    '/test',
    requireAuth,
    async (req, res) => {
        try {
            const result = await sendDueDateNotification({
                to: req.user.email,
                boardName: 'Tablero de Prueba',
                taskTitle: 'Tarea de Prueba',
                subtaskTitle: 'Subtarea de Prueba',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Mañana
            });

            return res.json({
                mensaje: 'Email de prueba enviado',
                ...result
            });
        } catch (error) {
            return res.status(500).json({
                mensaje: 'Error al enviar email de prueba',
                error: error.message
            });
        }
    }
);

/**
 * POST /notifications/reset-subtask/:subtaskId
 * Resetea el estado de notificación de una subtarea para poder reenviarla
 */
router.post(
    '/reset-subtask/:subtaskId',
    requireAuth,
    async (req, res) => {
        try {
            const { Subtask } = require('../configuraciones/initModels');
            const { subtaskId } = req.params;
            
            const subtask = await Subtask.findByPk(subtaskId);
            
            if (!subtask) {
                return res.status(404).json({ mensaje: 'Subtarea no encontrada' });
            }
            
            subtask.notificationSentAt = null;
            await subtask.save();
            
            console.log(`Notificación reseteada para subtarea "${subtask.title}" (ID: ${subtaskId})`);
            
            return res.json({
                mensaje: 'Estado de notificación reseteado',
                success: true,
                subtask: {
                    id: subtask.id,
                    title: subtask.title,
                    dueDate: subtask.dueDate,
                    notificationSentAt: subtask.notificationSentAt
                }
            });
        } catch (error) {
            return res.status(500).json({
                mensaje: 'Error al resetear notificación',
                error: error.message
            });
        }
    }
);

/**
 * POST /notifications/daily-summary
 * Ejecuta manualmente el envío de resúmenes diarios
 */
router.post(
    '/daily-summary',
    requireAuth,
    async (req, res) => {
        try {
            await sendDailyReports();
            return res.json({
                mensaje: 'Resúmenes diarios enviados',
                success: true
            });
        } catch (error) {
            return res.status(500).json({
                mensaje: 'Error al enviar resúmenes diarios',
                error: error.message
            });
        }
    }
);

            /**
             * POST /notifications/pending-report
             * Envía manualmente el resumen de pendientes a los usuarios
             */
            router.post(
                '/pending-report',
                requireAuth,
                async (_req, res) => {
                    try {
                        await sendPendingReports();
                        return res.json({
                            mensaje: 'Resumen de pendientes enviado manualmente',
                            success: true
                        });
                    } catch (error) {
                        return res.status(500).json({
                            mensaje: 'Error al enviar el resumen de pendientes',
                            error: error.message
                        });
                    }
                }
            );
module.exports = router;
