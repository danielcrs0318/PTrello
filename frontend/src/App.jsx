import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuthContext } from './providers/AuthProvider.jsx';
import { AuthCallback } from './pages/AuthCallback.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { BoardPage } from './pages/BoardPage.jsx';
import { LoginScreen } from './components/LoginScreen.jsx';

const ProtectedRoute = ({ children }) => {
    const { token, loading } = useAuthContext();

    if (loading) {
        return (
            <div className="main-content">
                <div className="card">Validando sesión...</div>
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

const LoginRoute = ({ children }) => {
    const { token } = useAuthContext();
    if (token) {
        return <Navigate to="/" replace />;
    }
    return children;
};

export default function App() {
    return (
        <Routes>
            <Route
                path="/"
                element={(
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/boards/:boardId"
                element={(
                    <ProtectedRoute>
                        <BoardPage />
                    </ProtectedRoute>
                )}
            />
            <Route
                path="/login"
                element={(
                    <LoginRoute>
                        <LoginScreen />
                    </LoginRoute>
                )}
            />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
