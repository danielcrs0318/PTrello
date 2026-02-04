/**
 * Controlador de notificaciones
 * Maneja notificaciones de usuarios, incluyendo invitaciones a tableros
 * @module controladores/notificationController
 */

const { Notification, Board, User, BoardMember } = require('../configuraciones/initModels');

/**
 * Lista las notificaciones del usuario autenticado
 * @param {Object} req - Request con query param opcional unreadOnly
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con array de notificaciones
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { unreadOnly } = req.query;

        const where = { userId };
        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const notifications = await Notification.findAll({
            where,
            include: [
                {
                    model: Board,
                    as: 'board',
                    attributes: ['id', 'name', 'backgroundColor'],
                },
                {
                    model: User,
                    as: 'inviter',
                    attributes: ['id', 'displayName', 'email', 'avatarUrl'],
                }
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(notifications);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ mensaje: 'Error al obtener notificaciones' });
    }
};

/**
 * Cuenta las notificaciones no leídas del usuario
 * @param {Object} req - Request con usuario autenticado
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con el conteo de notificaciones no leídas
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await Notification.count({
            where: {
                userId,
                isRead: false,
            },
        });

        res.json({ count });
    } catch (error) {
        console.error('Error al contar notificaciones:', error);
        res.status(500).json({ mensaje: 'Error al contar notificaciones' });
    }
};

/**
 * Marca una notificación específica como leída
 * @param {Object} req - Request con notificationId en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con la notificación actualizada o error
 */
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const notification = await Notification.findOne({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            return res.status(404).json({ mensaje: 'Notificación no encontrada' });
        }

        await notification.update({ isRead: true });

        res.json(notification);
    } catch (error) {
        console.error('Error al marcar notificación:', error);
        res.status(500).json({ mensaje: 'Error al marcar notificación' });
    }
};

/**
 * Marca todas las notificaciones del usuario como leídas
 * @param {Object} req - Request con usuario autenticado
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con mensaje de confirmación
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await Notification.update(
            { isRead: true },
            { where: { userId, isRead: false } }
        );

        res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('Error al marcar todas las notificaciones:', error);
        res.status(500).json({ mensaje: 'Error al marcar todas las notificaciones' });
    }
};

/**
 * Acepta una invitación a un tablero
 * Crea la membresía y actualiza el estado de la notificación
 * @param {Object} req - Request con notificationId en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con confirmación, notificación y tablero
 */
const acceptInvitation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const notification = await Notification.findOne({
            where: {
                id: notificationId,
                userId,
                type: 'board_invitation',
                status: 'pending',
            },
        });

        if (!notification) {
            return res.status(404).json({ mensaje: 'Invitación no encontrada o ya procesada' });
        }

        // Verificar que el tablero existe
        const board = await Board.findByPk(notification.boardId);
        if (!board) {
            return res.status(404).json({ mensaje: 'Tablero no encontrado' });
        }

        // Verificar si ya es miembro
        const existingMember = await BoardMember.findOne({
            where: {
                boardId: notification.boardId,
                userId,
            },
        });

        if (!existingMember) {
            // Crear el miembro
            await BoardMember.create({
                boardId: notification.boardId,
                userId,
                role: notification.role || 'lector',
            });
        }

        // Actualizar notificación
        await notification.update({
            status: 'accepted',
            isRead: true,
        });

        res.json({
            mensaje: 'Invitación aceptada',
            notification,
            board,
        });
    } catch (error) {
        console.error('Error al aceptar invitación:', error);
        res.status(500).json({ mensaje: 'Error al aceptar invitación' });
    }
};

/**
 * Rechaza una invitación a un tablero
 * Elimina la membresía si existe y actualiza el estado de la notificación
 * @param {Object} req - Request con notificationId en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con confirmación y notificación actualizada
 */
const rejectInvitation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const notification = await Notification.findOne({
            where: {
                id: notificationId,
                userId,
                type: 'board_invitation',
                status: 'pending',
            },
        });

        if (!notification) {
            return res.status(404).json({ mensaje: 'Invitación no encontrada o ya procesada' });
        }

        // Eliminar el miembro si existe
        await BoardMember.destroy({
            where: {
                boardId: notification.boardId,
                userId,
            },
        });

        // Actualizar notificación
        await notification.update({
            status: 'rejected',
            isRead: true,
        });

        res.json({
            mensaje: 'Invitación rechazada',
            notification,
        });
    } catch (error) {
        console.error('Error al rechazar invitación:', error);
        res.status(500).json({ mensaje: 'Error al rechazar invitación' });
    }
};

/**
 * Elimina una notificación de forma permanente
 * @param {Object} req - Request con notificationId en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con mensaje de confirmación o error
 */
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const notification = await Notification.findOne({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            return res.status(404).json({ mensaje: 'Notificación no encontrada' });
        }

        await notification.destroy();

        res.json({ mensaje: 'Notificación eliminada' });
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ mensaje: 'Error al eliminar notificación' });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    acceptInvitation,
    rejectInvitation,
    deleteNotification,
};
