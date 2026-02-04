import { useState } from 'react';
import { useAuthContext } from '../providers/AuthProvider.jsx';
import { useTheme } from '../providers/ThemeProvider';
import { Google, LightMode, DarkMode, Visibility, VisibilityOff } from '@mui/icons-material';
import { IconButton, TextField, Button, Alert, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, Select, MenuItem } from '@mui/material';
import { RegisterForm } from './RegisterForm.jsx';
import { apiClient } from '../services/api.js';

export const LoginScreen = () => {
    const { startGoogleLogin, signIn } = useAuthContext();
    const { isDark, toggleTheme, colors } = useTheme();
    const [showRegister, setShowRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const [resetStep, setResetStep] = useState('request');
    const [resetEmail, setResetEmail] = useState('');
    const [resetDigits, setResetDigits] = useState(6);
    const [resetPin, setResetPin] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirm, setResetConfirm] = useState('');
    const [resetError, setResetError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!email || !password) {
            setError('Email y contraseña son requeridos');
            return;
        }

        setIsLoading(true);

        try {
            const response = await apiClient.post('/auth/login', {
                email,
                password,
            });

            // Autenticar usuario
            signIn(response.data.user, response.data.token);
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSuccess = (data) => {
        signIn(data.user, data.token);
    };

    const handleOpenReset = () => {
        setResetOpen(true);
        setResetStep('request');
        setResetEmail('');
        setResetPin('');
        setResetPassword('');
        setResetConfirm('');
        setResetError('');
        setResetSuccess('');
        setResetDigits(6);
    };

    const handleRequestReset = async () => {
        setResetError('');
        setResetSuccess('');

        if (!resetEmail) {
            setResetError('Debes ingresar tu email.');
            return;
        }

        setResetLoading(true);
        try {
            await apiClient.post('/auth/password-reset/request', {
                email: resetEmail,
                digits: resetDigits,
            });
            setResetSuccess('Si el email existe, enviamos un PIN de recuperación.');
            setResetStep('confirm');
        } catch (err) {
            setResetError(err.response?.data?.mensaje || 'No fue posible enviar el PIN.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleConfirmReset = async () => {
        setResetError('');
        setResetSuccess('');

        if (!resetEmail || !resetPin || !resetPassword || !resetConfirm) {
            setResetError('Completa todos los campos.');
            return;
        }

        if (resetPassword !== resetConfirm) {
            setResetError('Las contraseñas no coinciden.');
            return;
        }

        if (resetPassword.length < 8) {
            setResetError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setResetLoading(true);
        try {
            await apiClient.post('/auth/password-reset/confirm', {
                email: resetEmail,
                pin: resetPin,
                newPassword: resetPassword,
            });
            setResetSuccess('Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
        } catch (err) {
            setResetError(err.response?.data?.mensaje || 'No fue posible actualizar la contraseña.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center relative"
            style={{ 
                background: isDark 
                    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
                    : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)'
            }}
        >
            {/* Botón de cambio de tema en la esquina superior derecha */}
            <div className="absolute top-4 right-4">
                <IconButton
                    onClick={toggleTheme}
                    size="medium"
                    sx={{ 
                        bgcolor: colors.bg.modal,
                        color: colors.text.primary,
                        '&:hover': { bgcolor: colors.bg.hover }
                    }}
                    title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                    {isDark ? <LightMode /> : <DarkMode />}
                </IconButton>
            </div>

            <div className="w-full max-w-md mx-4">
                <div 
                    className="backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8"
                    style={{ 
                        backgroundColor: colors.bg.modal,
                        border: `1px solid ${colors.border.primary}`,
                    }}
                >
                    <div className="flex items-center gap-2 mb-6 sm:mb-8">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg sm:text-xl">S</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.text.primary }}>SprintFlow</h1>
                    </div>
                    
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: colors.text.primary }}>
                        {showRegister ? 'Registrarse' : 'Iniciar sesión'}
                    </h2>
                    <p className="mb-6 sm:mb-8 text-sm sm:text-base" style={{ color: colors.text.secondary }}>Gestiona tus proyectos con tableros Kanban</p>
                    
                    {showRegister ? (
                        <RegisterForm 
                            onSuccess={handleRegisterSuccess}
                            onSwitchToLogin={() => setShowRegister(false)}
                        />
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={startGoogleLogin}
                                className="w-full font-semibold py-3 sm:py-3.5 px-4 sm:px-6 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl text-sm sm:text-base"
                                style={{
                                    backgroundColor: isDark ? '#ffffff' : '#f8fafc',
                                    color: '#1f2937',
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = isDark ? '#f3f4f6' : '#f1f5f9'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = isDark ? '#ffffff' : '#f8fafc'}
                            >
                                <Google className="text-blue-600" />
                                <span>Continuar con Google</span>
                            </button>
                            
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t" style={{ borderColor: colors.border.primary }}></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span 
                                        className="px-4" 
                                        style={{ 
                                            backgroundColor: colors.bg.modal,
                                            color: colors.text.secondary 
                                        }}
                                    >
                                        o
                                    </span>
                                </div>
                            </div>
                            
                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                            )}
                            
                            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                                <TextField
                                    fullWidth
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError('');
                                    }}
                                    required
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: colors.input.bg,
                                            color: colors.text.primary,
                                            '& fieldset': { borderColor: colors.input.border },
                                            '&:hover fieldset': { borderColor: colors.button.primary },
                                            '&.Mui-focused fieldset': { borderColor: colors.button.primary },
                                        },
                                    }}
                                />
                                <TextField
                                    fullWidth
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    required
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                    sx={{ color: colors.text.secondary }}
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: colors.input.bg,
                                            color: colors.text.primary,
                                            '& fieldset': { borderColor: colors.input.border },
                                            '&:hover fieldset': { borderColor: colors.button.primary },
                                            '&.Mui-focused fieldset': { borderColor: colors.button.primary },
                                        },
                                    }}
                                />
                                
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    disabled={isLoading}
                                    sx={{
                                        bgcolor: colors.button.primary,
                                        color: 'white',
                                        py: 1.5,
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        '&:hover': {
                                            bgcolor: colors.button.hover,
                                        },
                                        '&:disabled': {
                                            bgcolor: colors.input.border,
                                            color: colors.text.secondary,
                                        }
                                    }}
                                >
                                    {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                                </Button>
                            </form>
                            
                            <p className="text-center text-xs sm:text-sm mt-4 sm:mt-6" style={{ color: colors.text.secondary }}>
                                ¿No tienes una cuenta?{' '}
                                <span 
                                    onClick={() => setShowRegister(true)}
                                    className="cursor-pointer"
                                    style={{ color: colors.button.primary, textDecoration: 'underline' }}
                                    onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                                >
                                    Regístrate
                                </span>
                            </p>
                            <p className="text-center text-xs sm:text-sm mt-2" style={{ color: colors.text.secondary }}>
                                <span
                                    onClick={handleOpenReset}
                                    className="cursor-pointer"
                                    style={{ color: colors.button.primary, textDecoration: 'underline' }}
                                    onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                                >
                                    ¿Olvidaste tu contraseña?
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <Dialog
                open={resetOpen}
                onClose={() => setResetOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: colors.bg.modal,
                        color: colors.text.primary,
                        minWidth: { xs: 320, sm: 420 },
                    }
                }}
            >
                <DialogTitle sx={{ color: colors.text.primary }}>
                    Recuperar contraseña
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {resetError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {resetError}
                        </Alert>
                    )}
                    {resetSuccess && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {resetSuccess}
                        </Alert>
                    )}

                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: colors.input.bg,
                                color: colors.text.primary,
                                '& fieldset': { borderColor: colors.input.border },
                                '&:hover fieldset': { borderColor: colors.button.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.button.primary },
                            },
                            '& .MuiInputLabel-root': { color: colors.text.secondary },
                        }}
                    />

                    {resetStep === 'request' && (
                        <FormControl fullWidth sx={{ mb: 1 }}>
                            <Select
                                value={resetDigits}
                                onChange={(e) => setResetDigits(Number(e.target.value))}
                                sx={{
                                    bgcolor: colors.input.bg,
                                    color: colors.text.primary,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.input.border },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.button.primary },
                                }}
                            >
                                <MenuItem value={4}>PIN de 4 dígitos</MenuItem>
                                <MenuItem value={6}>PIN de 6 dígitos</MenuItem>
                            </Select>
                        </FormControl>
                    )}

                    {resetStep === 'confirm' && (
                        <>
                            <TextField
                                fullWidth
                                label="PIN"
                                value={resetPin}
                                onChange={(e) => setResetPin(e.target.value)}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: colors.input.bg,
                                        color: colors.text.primary,
                                        '& fieldset': { borderColor: colors.input.border },
                                        '&:hover fieldset': { borderColor: colors.button.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.button.primary },
                                    },
                                    '& .MuiInputLabel-root': { color: colors.text.secondary },
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Nueva contraseña"
                                type="password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: colors.input.bg,
                                        color: colors.text.primary,
                                        '& fieldset': { borderColor: colors.input.border },
                                        '&:hover fieldset': { borderColor: colors.button.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.button.primary },
                                    },
                                    '& .MuiInputLabel-root': { color: colors.text.secondary },
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Confirmar contraseña"
                                type="password"
                                value={resetConfirm}
                                onChange={(e) => setResetConfirm(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: colors.input.bg,
                                        color: colors.text.primary,
                                        '& fieldset': { borderColor: colors.input.border },
                                        '&:hover fieldset': { borderColor: colors.button.primary },
                                        '&.Mui-focused fieldset': { borderColor: colors.button.primary },
                                    },
                                    '& .MuiInputLabel-root': { color: colors.text.secondary },
                                }}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setResetOpen(false)} sx={{ color: colors.text.secondary }}>
                        Cerrar
                    </Button>
                    {resetStep === 'request' ? (
                        <Button
                            onClick={handleRequestReset}
                            variant="contained"
                            disabled={resetLoading}
                            sx={{ bgcolor: colors.button.primary, '&:hover': { bgcolor: colors.button.hover } }}
                        >
                            Enviar PIN
                        </Button>
                    ) : (
                        <Button
                            onClick={handleConfirmReset}
                            variant="contained"
                            disabled={resetLoading}
                            sx={{ bgcolor: colors.button.primary, '&:hover': { bgcolor: colors.button.hover } }}
                        >
                            Cambiar contraseña
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </div>
    );
};
