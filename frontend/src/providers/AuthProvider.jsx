import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../services/api.js';

const TOKEN_STORAGE_KEY = 'sprintflow_token';
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(Boolean(token));

    useEffect(() => {
        if (!token) {
            delete apiClient.defaults.headers.common.Authorization;
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setUser(null);
            setLoading(false);
            return undefined;
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
        localStorage.setItem(TOKEN_STORAGE_KEY, token);

        const controller = new AbortController();
        setLoading(true);

        apiClient
            .get('/auth/me', {
                signal: controller.signal,
            })
            .then((response) => setUser(response.data.user))
            .catch((error) => {
                // Ignorar errores de cancelación (causados por React Strict Mode en desarrollo)
                if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
                    return;
                }
                
                console.error('No fue posible obtener el perfil autenticado:', error);
                setToken(null);
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [token]);

    useEffect(() => {
        const interceptorId = apiClient.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error?.response?.status === 401) {
                    setToken(null);
                    setUser(null);
                    navigate('/login', { replace: true });
                }
                return Promise.reject(error);
            },
        );

        return () => {
            apiClient.interceptors.response.eject(interceptorId);
        };
    }, [navigate]);

    const signOut = useCallback(() => {
        setToken(null);
        setUser(null);
        navigate('/', { replace: true });
    }, [navigate]);

    const startGoogleLogin = useCallback(() => {
        const origin = window.location.origin;
        const returnTo = `${origin}/auth/callback`;
        const search = new URLSearchParams({ returnTo }).toString();
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${apiBase}/auth/google?${search}`;
    }, []);

    const signIn = useCallback((userData, userToken) => {
        setToken(userToken);
        setUser(userData);
        navigate('/', { replace: true });
    }, [navigate]);

    const value = useMemo(
        () => ({ token, user, loading, setToken, setUser, signOut, startGoogleLogin, signIn }),
        [token, user, loading, setToken, setUser, signOut, startGoogleLogin, signIn],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext debe usarse dentro de un AuthProvider');
    }
    return context;
};
