/**
 * Controlador de autenticación
 * Maneja el flujo de autenticación con Google OAuth y generación de tokens JWT
 * @module controladores/authController
 */

const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const { User, PasswordResetPin } = require('../configuraciones/initModels');
const { sendPasswordResetPin } = require('../servicios/emailService');
require('dotenv').config();

const {
    JWT_SECRET,
    GOOGLE_SUCCESS_REDIRECT,
    CORS_ORIGINS,
} = process.env;

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Usuario para el que se genera el token
 * @param {string} user.id - ID del usuario
 * @param {string} user.email - Email del usuario
 * @param {string} user.displayName - Nombre visible del usuario
 * @returns {string} Token JWT firmado con expiración de 12 horas
 * @throws {Error} Si JWT_SECRET no está configurado
 */
const createToken = (user) => {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured.');
    }

    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            name: user.displayName,
        },
        JWT_SECRET,
        { expiresIn: '12h' },
    );
};

/**
 * Mapea un objeto usuario a un formato seguro para el cliente
 * Elimina información sensible antes de enviar al frontend
 * @param {Object} user - Usuario de la base de datos
 * @returns {Object} Usuario con solo datos públicos
 */
const mapUser = (user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
});

/**
 * Decodifica el parámetro state enviado en el flujo OAuth
 * @param {string} value - String codificado en base64
 * @returns {Object} Objeto decodificado o un objeto vacío si falla
 */
const decodeState = (value) => {
    if (!value) {
        return {};
    }
    try {
        const parsed = Buffer.from(value, 'base64').toString('utf8');
        return JSON.parse(parsed);
    } catch (error) {
        console.warn('No fue posible decodificar el parámetro state recibido de Google:', error);
        return {};
    }
};

const allowedRedirectOrigins = (CORS_ORIGINS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((set, entry) => {
        try {
            const url = new URL(entry);
            set.add(url.origin);
        } catch (_error) {
            // ignore invalid entry
        }
        return set;
    }, new Set());

/**
 * Selecciona una URL de redirección válida después del login
 * Verifica que la URL esté en la lista de orígenes permitidos
 * @param {string} stateValue - Valor del parámetro state codificado
 * @returns {URL|null} URL válida de redirección o null
 */
const pickRedirectTarget = (stateValue) => {
    const candidates = [];
    const state = decodeState(stateValue);

    if (state.returnTo) {
        candidates.push(state.returnTo);
    }
    if (GOOGLE_SUCCESS_REDIRECT) {
        candidates.push(GOOGLE_SUCCESS_REDIRECT);
    }

    for (const candidate of candidates) {
        try {
            const url = new URL(candidate);
            if (allowedRedirectOrigins.size === 0 || allowedRedirectOrigins.has(url.origin)) {
                return url;
            }
        } catch (error) {
            console.warn('Se ignoró un redirect inválido proporcionado tras el login:', candidate, error.message);
        }
    }

    return null;
};

/**
 * Callback handler para el flujo de autenticación de Google
 * @param {Object} req - Objeto request de Express con usuario autenticado
 * @param {Object} res - Objeto response de Express
 * @returns {Object} JSON con token y usuario, o redirección al frontend
 */
const googleCallback = (req, res) => {
    try {
        const token = createToken(req.user);
        const safeUser = mapUser(req.user);
        const redirectTarget = pickRedirectTarget(req.query.state);

        if (redirectTarget) {
            redirectTarget.searchParams.set('token', token);
            redirectTarget.searchParams.set('user', JSON.stringify(safeUser));
            return res.redirect(redirectTarget.toString());
        }

        return res.json({
            token,
            user: safeUser,
        });
    } catch (error) {
        return res.status(500).json({
            message: 'No fue posible completar el inicio de sesión.',
            error: error.message,
        });
    }
};

/**
 * Handler para cuando falla la autenticación con Google
 * @param {Object} _req - Objeto request de Express (no utilizado)
 * @param {Object} res - Objeto response de Express
 * @returns {Object} JSON con mensaje de error y código 401
 */
const googleFailure = (_req, res) => res.status(401).json({
    message: 'La autenticación con Google fue cancelada o falló.',
});

/**
 * Retorna el perfil del usuario autenticado actual
 * @param {Object} req - Objeto request de Express con usuario en req.user
 * @param {Object} res - Objeto response de Express
 * @returns {Object} JSON con información del usuario
 */
const currentProfile = (req, res) => res.json({
    user: mapUser(req.user),
});

/**
 * Registra un nuevo usuario con email y contraseña
 * @param {Object} req - Request con email, password y displayName en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con token y usuario o error
 */
const register = async (req, res) => {
    try {
        const { email, password, displayName } = req.body;

        // Validar que todos los campos estén presentes
        if (!email || !password || !displayName) {
            return res.status(400).json({
                mensaje: 'Email, contraseña y nombre son requeridos'
            });
        }

        // Validar longitud de contraseña
        if (password.length < 8) {
            return res.status(400).json({
                mensaje: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({
                mensaje: 'El email ya está registrado'
            });
        }

        // Hashear la contraseña
        const hashedPassword = await argon2.hash(password);

        // Crear el usuario
        const user = await User.create({
            email,
            password: hashedPassword,
            displayName,
            googleId: null,
            avatarUrl: null,
        });

        // Generar token
        const token = createToken(user);

        return res.status(201).json({
            token,
            user: mapUser(user),
        });
    } catch (error) {
        console.error('Error en registro:', error);
        return res.status(500).json({
            mensaje: 'Error al registrar usuario',
            error: error.message,
        });
    }
};

/**
 * Inicia sesión con email y contraseña
 * @param {Object} req - Request con email y password en body
 * @param {Object} res - Response de Express
 * @returns {Object} JSON con token y usuario o error
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar que los campos estén presentes
        if (!email || !password) {
            return res.status(400).json({
                mensaje: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario por email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                mensaje: 'Credenciales inválidas'
            });
        }

        // Verificar que el usuario tenga contraseña (no solo Google)
        if (!user.password) {
            return res.status(401).json({
                mensaje: 'Este email está registrado con Google. Por favor inicia sesión con Google.'
            });
        }

        // Verificar contraseña
        const isValidPassword = await argon2.verify(user.password, password);
        if (!isValidPassword) {
            return res.status(401).json({
                mensaje: 'Credenciales inválidas'
            });
        }

        // Generar token
        const token = createToken(user);

        return res.json({
            token,
            user: mapUser(user),
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({
            mensaje: 'Error al iniciar sesión',
            error: error.message,
        });
    }
};

const generatePin = (digits) => {
    const length = digits === 4 ? 4 : 6;
    const max = Math.pow(10, length);
    const pin = Math.floor(Math.random() * max).toString().padStart(length, '0');
    return pin;
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email, digits } = req.body;

        if (!email) {
            return res.status(400).json({ mensaje: 'El email es requerido.' });
        }

        if (digits && ![4, 6].includes(Number(digits))) {
            return res.status(400).json({ mensaje: 'El PIN debe ser de 4 o 6 dígitos.' });
        }

        const user = await User.findOne({ where: { email } });

        // Responder siempre OK para no filtrar si el email existe
        if (!user) {
            return res.json({ mensaje: 'Si el email existe, enviaremos un PIN de recuperación.' });
        }

        await PasswordResetPin.update(
            { usedAt: new Date() },
            { where: { userId: user.id, usedAt: null } }
        );

        const pin = generatePin(Number(digits));
        const pinHash = await argon2.hash(pin);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await PasswordResetPin.create({
            userId: user.id,
            pinHash,
            expiresAt,
            attempts: 0,
            usedAt: null,
        });

        await sendPasswordResetPin({
            to: user.email,
            displayName: user.displayName,
            pin,
            expiresInMinutes: 10,
        });

        return res.json({ mensaje: 'Si el email existe, enviaremos un PIN de recuperación.' });
    } catch (error) {
        console.error('Error solicitando recuperación de contraseña:', error);
        return res.status(500).json({ mensaje: 'No fue posible enviar el PIN de recuperación.' });
    }
};

const confirmPasswordReset = async (req, res) => {
    try {
        const { email, pin, newPassword } = req.body;

        if (!email || !pin || !newPassword) {
            return res.status(400).json({ mensaje: 'Email, PIN y nueva contraseña son requeridos.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ mensaje: 'PIN inválido o expirado.' });
        }

        const reset = await PasswordResetPin.findOne({
            where: {
                userId: user.id,
                usedAt: null,
            },
            order: [['createdAt', 'DESC']],
        });

        if (!reset || reset.expiresAt < new Date()) {
            return res.status(400).json({ mensaje: 'PIN inválido o expirado.' });
        }

        if (reset.attempts >= 5) {
            await reset.update({ usedAt: new Date() });
            return res.status(400).json({ mensaje: 'PIN inválido o expirado.' });
        }

        const isValidPin = await argon2.verify(reset.pinHash, String(pin));
        if (!isValidPin) {
            await reset.update({ attempts: reset.attempts + 1 });
            return res.status(400).json({ mensaje: 'PIN inválido o expirado.' });
        }

        const newHash = await argon2.hash(newPassword);
        await user.update({ password: newHash });
        await reset.update({ usedAt: new Date() });

        return res.json({ mensaje: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error confirmando recuperación de contraseña:', error);
        return res.status(500).json({ mensaje: 'No fue posible actualizar la contraseña.' });
    }
};

module.exports = {
    googleCallback,
    googleFailure,
    currentProfile,
    register,
    login,
    requestPasswordReset,
    confirmPasswordReset,
};
