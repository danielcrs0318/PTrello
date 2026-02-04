import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthContext } from '../providers/AuthProvider.jsx';

const parseParams = (search, hash) => {
    const fromSearch = new URLSearchParams(search);
    const fromHash = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

    const token = fromSearch.get('token') || fromHash.get('token');
    const profile = fromSearch.get('user') || fromHash.get('user');

    return { token, profile };
};

export const AuthCallback = () => {
    const navigate = useNavigate();
    const { search, hash } = useLocation();
    const { setToken, setUser } = useAuthContext();

    useEffect(() => {
        const { token, profile } = parseParams(search, hash);

        if (token) {
            setToken(token);
        }

        if (profile) {
            try {
                const parsed = JSON.parse(profile);
                setUser(parsed);
            } catch (error) {
                console.warn('No fue posible interpretar el perfil entregado por el backend:', error);
            }
        }

        navigate('/', { replace: true });
    }, [search, hash, setToken, setUser, navigate]);

    return (
        <div className="min-h-screen p-12 flex items-center justify-center">
            <div className="bg-slate-900/80 border border-slate-700/30 rounded-2xl p-7 shadow-2xl">Finalizando autenticación...</div>
        </div>
    );
};
