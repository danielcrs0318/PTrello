import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MoreHoriz, FilterList, ArrowBack, Star, PersonAdd, Menu as MenuIcon, Palette, DarkMode, LightMode, Edit, Delete, GitHub } from '@mui/icons-material';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider, Popover, Box, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';

import { BoardView } from '../components/BoardView.jsx';
import { ShareBoardModal } from '../components/ShareBoardModal.jsx';
import { FilterModal } from '../components/FilterModal.jsx';
import { NotificationBell } from '../components/NotificationBell.jsx';
import { useAuthContext } from '../providers/AuthProvider.jsx';
import { useTheme } from '../providers/ThemeProvider';
import { apiClient } from '../services/api.js';

const backgroundOptions = [
    { name: 'Azul Océano', value: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)' },
    { name: 'Cielo', value: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)' },
    { name: 'Verde Esmeralda', value: 'linear-gradient(135deg, #065f46 0%, #059669 100%)' },
    { name: 'Morado Espacial', value: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)' },
    { name: 'Rosa Atardecer', value: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)' },
    { name: 'Naranja Fuego', value: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)' },
    { name: 'Gris Oscuro', value: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)' },
    { name: 'Índigo Profundo', value: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 100%)' },
];

export const BoardPage = () => {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const { isDark, toggleTheme, colors } = useTheme();
    const [boardInfo, setBoardInfo] = useState(null);
    const [backgroundColor, setBackgroundColor] = useState('linear-gradient(135deg, #0c4a6e 0%, #075985 100%)');
    const [isOwner, setIsOwner] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [filters, setFilters] = useState(null);
    const [editBoardOpen, setEditBoardOpen] = useState(false);
    const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
    const [editedBoardName, setEditedBoardName] = useState('');
    const { user, signOut } = useAuthContext();
    const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
    const [boardMenuAnchorEl, setBoardMenuAnchorEl] = useState(null);
    const [colorAnchorEl, setColorAnchorEl] = useState(null);
    const userMenuOpen = Boolean(userMenuAnchorEl);
    const boardMenuOpen = Boolean(boardMenuAnchorEl);
    const colorOpen = Boolean(colorAnchorEl);

    const handleBoardReady = async ({ board }) => {
        setBoardInfo(board);
        if (board.backgroundColor) {
            setBackgroundColor(board.backgroundColor);
        }
        if (board.ownerId && user?.id) {
            setIsOwner(board.ownerId === user.id);
        }
    };

    useEffect(() => {
        if (boardInfo?.ownerId && user?.id) {
            setIsOwner(boardInfo.ownerId === user.id);
        }
    }, [boardInfo?.ownerId, user?.id]);

    const handleUserMenuOpen = (event) => {
        setUserMenuAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setUserMenuAnchorEl(null);
    };

    const handleBoardMenuOpen = (event) => {
        setBoardMenuAnchorEl(event.currentTarget);
    };

    const handleBoardMenuClose = () => {
        setBoardMenuAnchorEl(null);
    };

    const handleLogout = () => {
        handleUserMenuClose();
        signOut();
    };

    const handleColorMenuOpen = (event) => {
        setColorAnchorEl(event.currentTarget);
    };

    const handleColorMenuClose = () => {
        setColorAnchorEl(null);
    };

    const handleBackgroundChange = async (newBackground) => {
        try {
            await apiClient.put(`/boards/${boardId}`, {
                backgroundColor: newBackground
            });
            setBackgroundColor(newBackground);
            handleColorMenuClose();
        } catch (error) {
            console.error('Error al actualizar el color de fondo:', error);
        }
    };

    const handleEditBoard = () => {
        setEditedBoardName(boardInfo?.name || '');
        setEditBoardOpen(true);
    };

    const handleSaveBoardName = async () => {
        if (!editedBoardName.trim()) return;
        
        try {
            await apiClient.put(`/boards/${boardId}`, {
                name: editedBoardName
            });
            setBoardInfo({ ...boardInfo, name: editedBoardName });
            setEditBoardOpen(false);
        } catch (error) {
            console.error('Error al actualizar el nombre del tablero:', error);
        }
    };

    const handleDeleteBoard = async () => {
        try {
            await apiClient.delete(`/boards/${boardId}`);
            navigate('/');
        } catch (error) {
            console.error('Error al eliminar el tablero:', error);
        }
    };

    return (
        <div 
            className="min-h-screen flex flex-col"
            style={{
                background: backgroundColor
            }}
        >
            {/* Header */}
            <div className="bg-black/20 backdrop-blur-sm">
                <div className="px-2 sm:px-4 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                        {/* Botón de retroceder */}
                        <button
                            onClick={() => navigate('/')}
                            className="text-white/90 hover:bg-white/20 p-1.5 rounded transition-colors flex-shrink-0"
                            title="Volver al inicio"
                        >
                            <ArrowBack sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        </button>
                        
                        {/* Nombre del tablero */}
                        <h1 className="text-white font-bold text-sm sm:text-base md:text-lg px-2 py-1 hover:bg-white/10 rounded transition-colors truncate max-w-[150px] sm:max-w-none">
                            {boardInfo?.name || 'Tablero'}
                        </h1>

                        {/* Botones de editar y eliminar (solo propietario) - Ocultos en móviles pequeños */}
                        {isOwner && (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={handleEditBoard}
                                    sx={{ 
                                        color: 'white', 
                                        opacity: 0.8, 
                                        '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' },
                                        display: { xs: 'none', sm: 'inline-flex' }
                                    }}
                                    title="Editar nombre del tablero"
                                >
                                    <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => setDeleteBoardOpen(true)}
                                    sx={{ 
                                        color: '#ef4444', 
                                        opacity: 0.8, 
                                        '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' },
                                        display: { xs: 'none', sm: 'inline-flex' }
                                    }}
                                    title="Eliminar tablero"
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            </>
                        )}

                        {/* Botón de favorito - Oculto en móviles pequeños */}
                        <button className="text-white/70 hover:text-yellow-400 hover:bg-white/10 p-1.5 rounded transition-colors hidden sm:inline-flex">
                            <Star fontSize="small" />
                        </button>

                        {/* Botón compartir - solo para propietario */}
                        {isOwner && (
                            <button 
                                onClick={() => setShareModalOpen(true)}
                                className="hidden md:flex items-center gap-1 text-white/90 hover:bg-white/20 px-3 py-1.5 rounded transition-colors text-sm"
                            >
                                <PersonAdd fontSize="small" />
                                <span>Compartir</span>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                        {/* Botón cambiar fondo */}
                        <button 
                            onClick={handleColorMenuOpen}
                            className="text-white/90 hover:bg-white/10 p-1.5 rounded transition-colors flex-shrink-0"
                            title="Cambiar fondo"
                        >
                            <Palette sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        </button>
                        
                        {/* Botón cambio de tema */}
                        <IconButton
                            onClick={toggleTheme}
                            size="small"
                            className="text-white/90 hover:bg-white/10 flex-shrink-0"
                            sx={{ p: { xs: '6px', sm: '8px' } }}
                            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        >
                            {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                        </IconButton>
                        
                        {/* Botón filtro */}
                        <button 
                            onClick={() => setFilterModalOpen(true)}
                            className="text-white/90 hover:bg-white/10 p-1.5 sm:p-2 rounded transition-colors"
                            title="Filtrar tareas"
                        >
                            <FilterList fontSize="small" />
                        </button>
                        
                        {/* Campanita de notificaciones */}
                        <NotificationBell />
                        
                        {/* Avatar del usuario con menú */}
                        {user && (
                            <>
                                <button
                                    onClick={handleUserMenuOpen}
                                    className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:ring-2 hover:ring-white/30 transition-all flex-shrink-0"
                                    title={user.displayName}
                                >
                                    <span className="text-white text-xs sm:text-sm font-semibold">
                                        {user.displayName?.charAt(0) || 'U'}
                                    </span>
                                </button>
                                
                                <Menu
                                    anchorEl={userMenuAnchorEl}
                                    open={userMenuOpen}
                                    onClose={handleUserMenuClose}
                                    PaperProps={{
                                        sx: {
                                            bgcolor: colors.bg.modal,
                                            color: colors.text.primary,
                                            minWidth: 200,
                                            mt: 1,
                                            border: `1px solid ${colors.border.primary}`,
                                        }
                                    }}
                                >
                                    <MenuItem disabled sx={{ opacity: '1 !important', color: colors.text.primary }}>
                                        <div className="py-1">
                                            <div className="font-semibold text-sm">{user.displayName}</div>
                                            <div className="text-xs" style={{ color: colors.text.secondary }}>{user.email}</div>
                                        </div>
                                    </MenuItem>
                                    <Divider sx={{ borderColor: colors.border.primary }} />
                                    <MenuItem onClick={handleLogout} sx={{ color: colors.text.primary, '&:hover': { bgcolor: colors.bg.hover } }}>
                                        <ListItemText>Cerrar sesión</ListItemText>
                                    </MenuItem>
                                </Menu>
                            </>
                        )}
                        
                        {/* Menú adicional (para futuras opciones) */}
                        <IconButton 
                            onClick={handleBoardMenuOpen}
                            size="small"
                            className="text-white/90 hover:bg-white/10"
                            title="Más opciones"
                        >
                            <MoreHoriz fontSize="small" />
                        </IconButton>
                        
                        {/* Menú de opciones del tablero (vacío por ahora, para futuras funcionalidades) */}
                        <Menu
                            anchorEl={boardMenuAnchorEl}
                            open={boardMenuOpen}
                            onClose={handleBoardMenuClose}
                            PaperProps={{
                                sx: {
                                    bgcolor: colors.bg.modal,
                                    color: colors.text.primary,
                                    minWidth: 200,
                                    mt: 1,
                                    border: `1px solid ${colors.border.primary}`,
                                }
                            }}
                        >
                            <MenuItem disabled sx={{ color: colors.text.secondary }}>
                                <ListItemText>Próximamente más opciones...</ListItemText>
                            </MenuItem>
                        </Menu>
                    </div>
                </div>
            </div>

            {/* Board Content */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 sm:p-4">
                <BoardView
                    boardId={boardId}
                    onBoardReady={handleBoardReady}
                    filters={filters}
                    isOwner={isOwner}
                />
            </div>

            {/* Footer */}
            <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 py-1.5 mt-auto">
                <div className="max-w-screen-2xl mx-auto px-4 flex flex-row items-center justify-center gap-1.5">
                    <span className="text-white/60 text-sm">
                        Desarrollado por <span className="text-white/90 font-semibold">Daniel Molina</span>
                    </span>
                    <a
                        href="https://github.com/danielcrs0318"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded transition-all hover:scale-105 bg-white/10 hover:bg-white/20"
                        style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                        }}
                    >
                        <GitHub sx={{ fontSize: 18 }} />
                        <span className="text-sm font-medium">GitHub</span>
                    </a>
                </div>
            </footer>

            {/* Modal de compartir */}
            <ShareBoardModal
                open={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                boardId={boardId}
                isOwner={isOwner}
            />

            {/* Modal de filtros */}
            <FilterModal
                open={filterModalOpen}
                onClose={() => setFilterModalOpen(false)}
                onApplyFilters={setFilters}
            />

            {/* Popover para seleccionar fondo */}
            <Popover
                open={colorOpen}
                anchorEl={colorAnchorEl}
                onClose={handleColorMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: {
                        bgcolor: colors.bg.modal,
                        color: colors.text.primary,
                        p: 2,
                        maxWidth: { xs: 280, sm: 320 },
                        border: `1px solid ${colors.border.primary}`,
                    }
                }}
            >
                <Typography variant="subtitle2" sx={{ mb: 2, color: colors.text.secondary }}>
                    Selecciona un fondo
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
                    {backgroundOptions.map((option) => (
                        <Button
                            key={option.name}
                            onClick={() => handleBackgroundChange(option.value)}
                            sx={{
                                height: { xs: 60, sm: 80 },
                                background: option.value,
                                border: backgroundColor === option.value ? `3px solid ${colors.button.primary}` : 'none',
                                borderRadius: 2,
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                },
                                transition: 'all 0.2s',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    bgcolor: 'rgba(0,0,0,0.5)',
                                    py: 0.5,
                                    px: 1,
                                }}
                            >
                                <Typography variant="caption" sx={{ color: 'white', fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                                    {option.name}
                                </Typography>
                            </Box>
                        </Button>
                    ))}
                </Box>
            </Popover>
            
            {/* Diálogo para editar nombre del tablero */}
            <Dialog 
                open={editBoardOpen} 
                onClose={() => setEditBoardOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: colors.bg.modal,
                        color: colors.text.primary,
                        minWidth: 400,
                    }
                }}
            >
                <DialogTitle sx={{ color: colors.text.primary }}>Editar nombre del tablero</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        margin="dense"
                        label="Nombre del tablero"
                        value={editedBoardName}
                        onChange={(e) => setEditedBoardName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleSaveBoardName();
                            }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: colors.text.primary,
                                '& fieldset': { borderColor: colors.border.primary },
                                '&:hover fieldset': { borderColor: colors.button.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.button.primary },
                            },
                            '& .MuiInputLabel-root': { color: colors.text.secondary },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button 
                        onClick={() => setEditBoardOpen(false)}
                        sx={{ color: colors.text.secondary }}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSaveBoardName} 
                        variant="contained"
                        disabled={!editedBoardName.trim()}
                        sx={{ 
                            bgcolor: colors.button.primary,
                            '&:hover': { bgcolor: colors.button.hover },
                        }}
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Diálogo de confirmación para eliminar tablero */}
            <Dialog 
                open={deleteBoardOpen} 
                onClose={() => setDeleteBoardOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: colors.bg.modal,
                        color: colors.text.primary,
                        minWidth: 400,
                    }
                }}
            >
                <DialogTitle sx={{ color: colors.text.primary }}>Eliminar tablero</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: colors.text.secondary }}>
                        ¿Estás seguro de que deseas eliminar el tablero "{boardInfo?.name}"? 
                        Esta acción no se puede deshacer y se eliminarán todas las tareas y subtareas.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button 
                        onClick={() => setDeleteBoardOpen(false)}
                        sx={{ color: colors.text.secondary }}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleDeleteBoard} 
                        variant="contained"
                        sx={{ 
                            bgcolor: '#ef4444',
                            '&:hover': { bgcolor: '#dc2626' },
                        }}
                    >
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};
