import { useState, useEffect } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    IconButton, 
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Chip,
    Divider,
    Alert
} from '@mui/material';
import { Close, PersonAdd, Delete, Edit } from '@mui/icons-material';
import { apiClient } from '../services/api';

export const ShareBoardModal = ({ open, onClose, boardId, isOwner }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('lector');
    const [members, setMembers] = useState({ owner: null, members: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (open && boardId) {
            fetchMembers();
        }
    }, [open, boardId]);

    const fetchMembers = async () => {
        try {
            const response = await apiClient.get(`/board-members/${boardId}/members`);
            setMembers(response.data);
        } catch (error) {
            console.error('Error al cargar miembros:', error);
        }
    };

    const handleShare = async () => {
        if (!email.trim()) {
            setError('Por favor ingresa un email');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await apiClient.post(`/board-members/${boardId}/share`, { email, role });
            setSuccess(`Invitación enviada a ${email}`);
            setEmail('');
            setRole('lector');
            fetchMembers();
        } catch (error) {
            setError(error.response?.data?.mensaje || 'Error al enviar invitación');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('¿Estás seguro de remover este miembro?')) return;

        try {
            await apiClient.delete(`/board-members/${boardId}/members/${memberId}`);
            fetchMembers();
        } catch (error) {
            setError(error.response?.data?.mensaje || 'Error al remover miembro');
        }
    };

    const handleUpdateRole = async (memberId, newRole) => {
        try {
            await apiClient.put(`/board-members/${boardId}/members/${memberId}`, { role: newRole });
            fetchMembers();
        } catch (error) {
            setError(error.response?.data?.mensaje || 'Error al actualizar rol');
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#282e33',
                    color: 'white',
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography variant="h6" component="div">
                    Compartir tablero
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <Close />
                </IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ pt: 2 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                {isOwner && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ color: '#9fadbc', mb: 2 }}>
                            Invitar por email
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="email@ejemplo.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: '#22272b',
                                        color: 'white',
                                        '& fieldset': { borderColor: '#3a4149' },
                                        '&:hover fieldset': { borderColor: '#579dff' },
                                        '&.Mui-focused fieldset': { borderColor: '#579dff' },
                                    },
                                    '& input::placeholder': { color: '#9fadbc', opacity: 1 }
                                }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel sx={{ color: '#9fadbc' }}>Rol</InputLabel>
                                <Select
                                    value={role}
                                    label="Rol"
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={loading}
                                    sx={{
                                        bgcolor: '#22272b',
                                        color: 'white',
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3a4149' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#579dff' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#579dff' },
                                        '& .MuiSvgIcon-root': { color: 'white' }
                                    }}
                                    MenuProps={{
                                        PaperProps: {
                                            sx: { bgcolor: '#282e33', color: 'white' }
                                        }
                                    }}
                                >
                                    <MenuItem value="lector">Lector</MenuItem>
                                    <MenuItem value="editor">Editor</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                onClick={handleShare}
                                disabled={loading || !email.trim()}
                                startIcon={<PersonAdd />}
                                sx={{
                                    bgcolor: '#579dff',
                                    '&:hover': { bgcolor: '#85b8ff' },
                                    '&:disabled': { bgcolor: '#3a4149', color: '#9fadbc' }
                                }}
                            >
                                Invitar
                            </Button>
                        </Box>
                    </Box>
                )}

                <Divider sx={{ borderColor: '#3a4149', my: 2 }} />

                <Typography variant="subtitle2" sx={{ color: '#9fadbc', mb: 2 }}>
                    Miembros del tablero
                </Typography>

                <List sx={{ p: 0 }}>
                    {/* Propietario */}
                    {members.owner && (
                        <ListItem
                            sx={{
                                bgcolor: '#22272b',
                                borderRadius: 1,
                                mb: 1,
                                p: 2,
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar 
                                    src={members.owner.avatarUrl}
                                    sx={{ bgcolor: '#667eea' }}
                                >
                                    {members.owner.displayName?.charAt(0) || 'U'}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <span>{members.owner.displayName}</span>
                                        <Chip 
                                            label="Propietario" 
                                            size="small"
                                            sx={{ 
                                                bgcolor: '#4ade80', 
                                                color: '#000',
                                                fontWeight: 'bold',
                                                height: 20,
                                                fontSize: '0.7rem'
                                            }}
                                        />
                                    </Box>
                                }
                                secondary={members.owner.email}
                                sx={{
                                    '& .MuiListItemText-primary': { color: 'white' },
                                    '& .MuiListItemText-secondary': { color: '#9fadbc' }
                                }}
                            />
                        </ListItem>
                    )}

                    {/* Miembros */}
                    {members.members.map((member) => (
                        <ListItem
                            key={member.id}
                            sx={{
                                bgcolor: '#22272b',
                                borderRadius: 1,
                                mb: 1,
                                p: 2,
                            }}
                            secondaryAction={
                                isOwner && (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <FormControl size="small" sx={{ minWidth: 100 }}>
                                            <Select
                                                value={member.role}
                                                onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                                sx={{
                                                    bgcolor: '#1d2125',
                                                    color: 'white',
                                                    height: 32,
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3a4149' },
                                                    '& .MuiSvgIcon-root': { color: 'white' }
                                                }}
                                                MenuProps={{
                                                    PaperProps: {
                                                        sx: { bgcolor: '#282e33', color: 'white' }
                                                    }
                                                }}
                                            >
                                                <MenuItem value="lector">Lector</MenuItem>
                                                <MenuItem value="editor">Editor</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleRemoveMember(member.id)}
                                            sx={{ color: '#9fadbc', '&:hover': { color: '#ef4444' } }}
                                        >
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>
                                )
                            }
                        >
                            <ListItemAvatar>
                                <Avatar 
                                    src={member.user.avatarUrl}
                                    sx={{ bgcolor: '#7c3aed' }}
                                >
                                    {member.user.displayName?.charAt(0) || 'U'}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <span>{member.user.displayName}</span>
                                        {!isOwner && (
                                            <Chip 
                                                label={member.role === 'editor' ? 'Editor' : 'Lector'} 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: member.role === 'editor' ? '#3b82f6' : '#f59e0b', 
                                                    color: 'white',
                                                    height: 20,
                                                    fontSize: '0.7rem'
                                                }}
                                            />
                                        )}
                                    </Box>
                                }
                                secondary={member.user.email}
                                sx={{
                                    '& .MuiListItemText-primary': { color: 'white' },
                                    '& .MuiListItemText-secondary': { color: '#9fadbc' }
                                }}
                            />
                        </ListItem>
                    ))}
                </List>

                {members.members.length === 0 && (
                    <Typography 
                        variant="body2" 
                        sx={{ color: '#9fadbc', textAlign: 'center', py: 2 }}
                    >
                        No hay miembros adicionales en este tablero
                    </Typography>
                )}
            </DialogContent>
        </Dialog>
    );
};
