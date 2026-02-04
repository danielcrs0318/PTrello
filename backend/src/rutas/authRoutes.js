/**
 * Rutas de autenticación
 * Maneja las rutas de autenticación con Google OAuth y JWT
 * @module rutas/authRoutes
 */

const { Router } = require('express');
const passport = require('passport');

const {
    googleCallback,
    googleFailure,
    currentProfile,
    register,
    login,
    requestPasswordReset,
    confirmPasswordReset,
} = require('../controladores/authController');

const router = Router();

router.get('/google', (req, res, next) => {
    const { returnTo } = req.query;
    let state;

    if (returnTo) {
        try {
            state = Buffer.from(JSON.stringify({ returnTo }), 'utf8').toString('base64');
        } catch (error) {
            console.warn('No fue posible serializar el parámetro returnTo recibido:', error.message);
        }
    }

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        prompt: 'select_account',
        state,
    })(req, res, next);
});

router.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/auth/google/failure',
    }),
    googleCallback,
);

router.get('/google/failure', googleFailure);

router.get(
    '/me',
    passport.authenticate('jwt', { session: false }),
    currentProfile,
);

router.post('/register', register);

router.post('/login', login);

router.post('/password-reset/request', requestPasswordReset);

router.post('/password-reset/confirm', confirmPasswordReset);

module.exports = router;
