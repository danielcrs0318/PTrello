/**
 * Rutas de calendario
 * Devuelve eventos pendientes de tareas y subtareas
 * @module rutas/calendarRoutes
 */

const { Router } = require('express');
const passport = require('passport');

const { getPendingCalendarEvents } = require('../controladores/calendarController');

const router = Router();

router.get(
    '/pending',
    passport.authenticate('jwt', { session: false }),
    getPendingCalendarEvents,
);

module.exports = router;
