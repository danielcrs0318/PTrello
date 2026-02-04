import { useState } from 'react';
import { TextField, Button, Box, Typography, LinearProgress, Alert, InputAdornment, IconButton } from '@mui/material';
import { CheckCircle, Cancel, Visibility, VisibilityOff } from '@mui/icons-material';
import { apiClient } from '../services/api';
import { useTheme } from '../providers/ThemeProvider';

export const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
    const { isDark } = useTheme();
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Calcular la fuerza de la contraseña
    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 15;
        if (/[a-z]/.test(password)) strength += 15;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
        return Math.min(strength, 100);
    };

    const passwordStrength = calculatePasswordStrength(formData.password);

    const getStrengthColor = () => {
        if (passwordStrength < 40) return '#ef4444';
        if (passwordStrength < 70) return '#f59e0b';
        return '#22c55e';
    };

    const getStrengthText = () => {
        if (passwordStrength < 40) return 'Débil';
        if (passwordStrength < 70) return 'Media';
        return 'Fuerte';
    };

    const passwordRequirements = [
        { text: 'Al menos 8 caracteres', met: formData.password.length >= 8 },
        { text: 'Una letra minúscula', met: /[a-z]/.test(formData.password) },
        { text: 'Una letra mayúscula', met: /[A-Z]/.test(formData.password) },
        { text: 'Un número', met: /[0-9]/.test(formData.password) },
        { text: 'Un carácter especial', met: /[^a-zA-Z0-9]/.test(formData.password) },
    ];

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validaciones
        if (!formData.displayName || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Todos los campos son obligatorios');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setIsLoading(true);

        try {
            const response = await apiClient.post('/auth/register', {
                displayName: formData.displayName,
                email: formData.email,
                password: formData.password,
            });

            // Mostrar mensaje de éxito brevemente
            setSuccess(true);
            
            // Esperar un momento para que el usuario vea el mensaje, luego redirigir
            setTimeout(() => {
                // Llamar callback de éxito con los datos
                onSuccess?.(response.data);
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al registrar usuario');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    ¡Registro exitoso! Redirigiendo al dashboard...
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    fullWidth
                    label="Nombre completo"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    required
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: isDark ? '#22272b' : '#ffffff',
                            color: isDark ? 'white' : '#172b4d',
                            '& fieldset': { borderColor: isDark ? '#3a4149' : '#dfe1e6' },
                            '&:hover fieldset': { borderColor: '#579dff' },
                            '&.Mui-focused fieldset': { borderColor: '#579dff' },
                        },
                        '& .MuiOutlinedInput-input': {
                            color: isDark ? 'white' : '#172b4d',
                            '&:-webkit-autofill': {
                                WebkitBoxShadow: isDark ? '0 0 0 100px #22272b inset' : '0 0 0 100px #ffffff inset',
                                WebkitTextFillColor: isDark ? 'white' : '#172b4d',
                                caretColor: isDark ? 'white' : '#172b4d',
                            },
                        },
                        '& .MuiInputLabel-root': { color: isDark ? '#9fadbc' : '#5e6c84' },
                    }}
                />

                <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: isDark ? '#22272b' : '#ffffff',
                            color: isDark ? 'white' : '#172b4d',
                            '& fieldset': { borderColor: isDark ? '#3a4149' : '#dfe1e6' },
                            '&:hover fieldset': { borderColor: '#579dff' },
                            '&.Mui-focused fieldset': { borderColor: '#579dff' },
                        },
                        '& .MuiOutlinedInput-input': {
                            color: isDark ? 'white' : '#172b4d',
                            '&:-webkit-autofill': {
                                WebkitBoxShadow: isDark ? '0 0 0 100px #22272b inset' : '0 0 0 100px #ffffff inset',
                                WebkitTextFillColor: isDark ? 'white' : '#172b4d',
                                caretColor: isDark ? 'white' : '#172b4d',
                            },
                        },
                        '& .MuiInputLabel-root': { color: isDark ? '#9fadbc' : '#5e6c84' },
                    }}
                />

                <TextField
                    fullWidth
                    label="Contraseña"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                    sx={{ color: isDark ? '#9fadbc' : '#5e6c84' }}
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: isDark ? '#22272b' : '#ffffff',
                            color: isDark ? 'white' : '#172b4d',
                            '& fieldset': { borderColor: isDark ? '#3a4149' : '#dfe1e6' },
                            '&:hover fieldset': { borderColor: '#579dff' },
                            '&.Mui-focused fieldset': { borderColor: '#579dff' },
                        },
                        '& .MuiOutlinedInput-input': {
                            color: isDark ? 'white' : '#172b4d',
                            '&:-webkit-autofill': {
                                WebkitBoxShadow: isDark ? '0 0 0 100px #22272b inset' : '0 0 0 100px #ffffff inset',
                                WebkitTextFillColor: isDark ? 'white' : '#172b4d',
                                caretColor: isDark ? 'white' : '#172b4d',
                            },
                        },
                        '& .MuiInputLabel-root': { color: isDark ? '#9fadbc' : '#5e6c84' },
                    }}
                />

            {formData.password && (
                <Box sx={{ mt: 1, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" sx={{ color: '#9fadbc' }}>
                            Seguridad de la contraseña:
                        </Typography>
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                color: getStrengthColor(),
                                fontWeight: 'bold'
                            }}
                        >
                            {getStrengthText()}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={passwordStrength}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: '#1d2125',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: getStrengthColor(),
                                transition: 'all 0.3s ease',
                            }
                        }}
                    />
                    <Box sx={{ mt: 1.5 }}>
                        {passwordRequirements.map((req, index) => (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                {req.met ? (
                                    <CheckCircle sx={{ fontSize: 16, color: '#22c55e' }} />
                                ) : (
                                    <Cancel sx={{ fontSize: 16, color: '#ef4444' }} />
                                )}
                                <Typography 
                                    variant="caption" 
                                    sx={{ color: req.met ? '#9fadbc' : '#6b7280' }}
                                >
                                    {req.text}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

                <TextField
                    fullWidth
                    label="Confirmar contraseña"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    error={Boolean(formData.confirmPassword && formData.password !== formData.confirmPassword)}
                    helperText={
                        formData.confirmPassword && formData.password !== formData.confirmPassword
                            ? 'Las contraseñas no coinciden'
                            : ''
                    }
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    edge="end"
                                    sx={{ color: isDark ? '#9fadbc' : '#5e6c84' }}
                                >
                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: isDark ? '#22272b' : '#ffffff',
                            color: isDark ? 'white' : '#172b4d',
                            '& fieldset': { borderColor: isDark ? '#3a4149' : '#dfe1e6' },
                            '&:hover fieldset': { borderColor: '#579dff' },
                            '&.Mui-focused fieldset': { borderColor: '#579dff' },
                        },
                        '& .MuiOutlinedInput-input': {
                            color: isDark ? 'white' : '#172b4d',
                            '&:-webkit-autofill': {
                                WebkitBoxShadow: isDark ? '0 0 0 100px #22272b inset' : '0 0 0 100px #ffffff inset',
                                WebkitTextFillColor: isDark ? 'white' : '#172b4d',
                                caretColor: isDark ? 'white' : '#172b4d',
                            },
                        },
                        '& .MuiInputLabel-root': { color: isDark ? '#9fadbc' : '#5e6c84' },
                        '& .MuiFormHelperText-root': { color: '#ef4444' },
                    }}
                />
            </Box>

            <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{
                    mt: 3,
                    mb: 2,
                    bgcolor: '#579dff',
                    color: 'white',
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                        bgcolor: '#85b8ff',
                    },
                    '&:disabled': {
                        bgcolor: '#3a4149',
                        color: '#9fadbc',
                    }
                }}
            >
                {isLoading ? 'Registrando...' : 'Registrarse'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#9fadbc' }}>
                    ¿Ya tienes una cuenta?{' '}
                    <span
                        onClick={onSwitchToLogin}
                        style={{
                            color: '#579dff',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        Inicia sesión
                    </span>
                </Typography>
            </Box>
        </Box>
    );
};
