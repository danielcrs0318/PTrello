/**
 * Controlador de miembros de tablero
 * Maneja la gestión de miembros y permisos de tableros compartidos
 * @module controladores/boardMemberController
 */

const { Board, BoardMember, User, Notification } = require('../configuraciones/initModels');
const { sendBoardInvitation } = require('../servicios/emailService');

/**
 * Comparte un tablero con un usuario enviando una invitación
 * Solo el propietario del tablero puede compartirlo
 * @param {Object} req - Request con boardId en params y email/role en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con la notificación de invitación creada (status 201) o error
 */
const shareBoard = async (req, res) => {
    try {
        const { boardId } = req.params;
        const { email, role = 'lector' } = req.body;
        const userId = req.user.id;

        if (!email || !['editor', 'lector'].includes(role)) {
            return res.status(400).json({ mensaje: 'Email y rol válido son requeridos' });
        }

        // Verificar que el tablero existe y el usuario es el propietario
        const board = await Board.findOne({
            where: { id: boardId, ownerId: userId }
        });

        if (!board) {
            return res.status(404).json({ mensaje: 'Tablero no encontrado o no tienes permisos' });
        }

        // Buscar el usuario a invitar
        const invitedUser = await User.findOne({ where: { email } });

        if (!invitedUser) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado con ese email' });
        }

        // Verificar que no sea el propietario
        if (invitedUser.id === userId) {
            return res.status(400).json({ mensaje: 'No puedes agregarte a ti mismo' });
        }

        // Verificar si ya es miembro
        const existingMember = await BoardMember.findOne({
            where: { boardId, userId: invitedUser.id }
        });

        if (existingMember) {
            return res.status(400).json({ mensaje: 'Este usuario ya es miembro del tablero' });
        }

        // Obtener información del propietario
        const owner = await User.findByPk(userId);

        // Crear notificación para el usuario invitado
        const notification = await Notification.create({
            userId: invitedUser.id,
            type: 'board_invitation',
            title: `Invitación a "${board.name}"`,
            message: `${owner.displayName} te ha invitado a colaborar en el tablero "${board.name}" como ${role === 'editor' ? 'Editor' : 'Lector'}.`,
            boardId,
            inviterId: userId,
            role,
            isRead: false,
            status: 'pending',
        });

        // Enviar email de notificación
        try {
            await sendBoardInvitation({
                to: invitedUser.email,
                boardName: board.name,
                inviterName: owner.displayName,
                role: role === 'editor' ? 'Editor' : 'Lector',
            });
        } catch (emailError) {
            console.error('Error al enviar email de invitación:', emailError);
            // No fallar si el email no se envía
        }

        // Retornar la notificación creada
        const notificationWithDetails = await Notification.findOne({
            where: { id: notification.id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'email', 'displayName', 'avatarUrl']
                },
                {
                    model: Board,
                    as: 'board',
                    attributes: ['id', 'name', 'backgroundColor']
                }
            ]
        });

        res.status(201).json({
            mensaje: 'Invitación enviada exitosamente',
            notification: notificationWithDetails,
        });
    } catch (error) {
        console.error('Error al compartir tablero:', error);
        res.status(500).json({ mensaje: 'Error al compartir tablero' });
    }
};

/**
 * Lista todos los miembros de un tablero
 * Incluye al propietario y todos los miembros con sus roles
 * @param {Object} req - Request con boardId en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con propietario y array de miembros
 */
const listMembers = async (req, res) => {
    try {
        const { boardId } = req.params;
        const userId = req.user.id;

        // Verificar que el usuario tiene acceso al tablero
        const board = await Board.findOne({
            where: { id: boardId },
        });

        if (!board) {
            return res.status(404).json({ mensaje: 'Tablero no encontrado' });
        }

        // Verificar si es propietario o miembro
        const isOwner = board.ownerId === userId;
        const isMember = await BoardMember.findOne({
            where: { boardId, userId }
        });

        if (!isOwner && !isMember) {
            return res.status(403).json({ mensaje: 'No tienes acceso a este tablero' });
        }

        // Obtener miembros
        const members = await BoardMember.findAll({
            where: { boardId },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'email', 'displayName', 'avatarUrl']
            }],
            order: [['createdAt', 'ASC']]
        });

        // Incluir al propietario
        const owner = await User.findByPk(board.ownerId, {
            attributes: ['id', 'email', 'displayName', 'avatarUrl']
        });

        res.json({
            owner: {
                ...owner.toJSON(),
                role: 'owner',
                isOwner: true,
            },
            members: members.map(m => ({
                id: m.id,
                role: m.role,
                invitedAt: m.invitedAt,
                user: m.user,
                isOwner: false,
            }))
        });
    } catch (error) {
        console.error('Error al listar miembros:', error);
        res.status(500).json({ mensaje: 'Error al listar miembros' });
    }
};

/**
 * Elimina un miembro de un tablero
 * Solo el propietario del tablero puede remover miembros
 * @param {Object} req - Request con boardId y memberId en params
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con mensaje de confirmación o error
 */
const removeMember = async (req, res) => {
    try {
        const { boardId, memberId } = req.params;
        const userId = req.user.id;

        // Verificar que el tablero existe y el usuario es el propietario
        const board = await Board.findOne({
            where: { id: boardId, ownerId: userId }
        });

        if (!board) {
            return res.status(404).json({ mensaje: 'Tablero no encontrado o no tienes permisos' });
        }

        // Buscar y eliminar el miembro
        const member = await BoardMember.findOne({
            where: { id: memberId, boardId }
        });

        if (!member) {
            return res.status(404).json({ mensaje: 'Miembro no encontrado' });
        }

        await member.destroy();

        res.json({ mensaje: 'Miembro removido exitosamente' });
    } catch (error) {
        console.error('Error al remover miembro:', error);
        res.status(500).json({ mensaje: 'Error al remover miembro' });
    }
};

/**
 * Actualiza el rol de un miembro del tablero
 * Solo el propietario puede cambiar roles
 * @param {Object} req - Request con boardId y memberId en params, role en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con el miembro actualizado o error
 */
const updateMemberRole = async (req, res) => {
    try {
        const { boardId, memberId } = req.params;
        const { role } = req.body;
        const userId = req.user.id;

        if (!['editor', 'lector'].includes(role)) {
            return res.status(400).json({ mensaje: 'Rol inválido' });
        }

        // Verificar que el tablero existe y el usuario es el propietario
        const board = await Board.findOne({
            where: { id: boardId, ownerId: userId }
        });

        if (!board) {
            return res.status(404).json({ mensaje: 'Tablero no encontrado o no tienes permisos' });
        }

        // Buscar y actualizar el miembro
        const member = await BoardMember.findOne({
            where: { id: memberId, boardId }
        });

        if (!member) {
            return res.status(404).json({ mensaje: 'Miembro no encontrado' });
        }

        member.role = role;
        await member.save();

        const memberWithUser = await BoardMember.findOne({
            where: { id: member.id },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'email', 'displayName', 'avatarUrl']
            }]
        });

        res.json(memberWithUser);
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        res.status(500).json({ mensaje: 'Error al actualizar rol' });
    }
};

module.exports = {
    shareBoard,
    listMembers,
    removeMember,
    updateMemberRole,
};
