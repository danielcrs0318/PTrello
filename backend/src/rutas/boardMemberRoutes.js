/**
 * Rutas de miembros de tablero
 * Define los endpoints para compartir tableros y gestionar miembros
 * Todas las rutas requieren autenticación JWT
 * @module rutas/boardMemberRoutes
 */

const express = require('express');
const router = express.Router();
const { shareBoard, listMembers, removeMember, updateMemberRole } = require('../controladores/boardMemberController');
const passport = require('passport');

// Aplicar middleware de autenticación a todas las rutas
const requireAuth = passport.authenticate('jwt', { session: false });

// Compartir tablero (invitar miembro)
router.post('/:boardId/share', requireAuth, shareBoard);

// Listar miembros del tablero
router.get('/:boardId/members', requireAuth, listMembers);

// Remover miembro del tablero
router.delete('/:boardId/members/:memberId', requireAuth, removeMember);

// Actualizar rol de miembro
router.put('/:boardId/members/:memberId', requireAuth, updateMemberRole);

module.exports = router;
