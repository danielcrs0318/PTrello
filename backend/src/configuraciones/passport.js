/**
 * Configuración de estrategias de autenticación con Passport.js
 * Implementa autenticación OAuth2 con Google y JWT
 * @module configuraciones/passport
 */

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
require('dotenv').config();

const { User } = require('./initModels');

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL = '/auth/google/callback',
    JWT_SECRET,
} = process.env;

if (!JWT_SECRET) {
    console.warn('JWT_SECRET is not defined. JWT authentication will fail until it is configured.');
}

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth environment variables are missing. Google login will not function until configured.');
}

passport.use(new GoogleStrategy(
    {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
        try {
            const primaryEmail = profile.emails?.[0]?.value;
            const avatarUrl = profile.photos?.[0]?.value;

            const [user, created] = await User.findOrCreate({
                where: { googleId: profile.id },
                defaults: {
                    email: primaryEmail,
                    displayName: profile.displayName,
                    avatarUrl,
                },
            });

            if (!created) {
                const updates = {};
                if (primaryEmail && user.email !== primaryEmail) {
                    updates.email = primaryEmail;
                }
                if (profile.displayName && user.displayName !== profile.displayName) {
                    updates.displayName = profile.displayName;
                }
                if (avatarUrl && user.avatarUrl !== avatarUrl) {
                    updates.avatarUrl = avatarUrl;
                }
                if (Object.keys(updates).length > 0) {
                    await user.update(updates);
                }
            }

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

passport.use(new JwtStrategy(
    {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET,
    },
    async (payload, done) => {
        try {
            if (!payload?.sub) {
                return done(null, false);
            }

            const user = await User.findByPk(payload.sub);
            if (!user) {
                return done(null, false);
            }

            return done(null, user);
        } catch (error) {
            return done(error, false);
        }
    }
));

module.exports = passport;
