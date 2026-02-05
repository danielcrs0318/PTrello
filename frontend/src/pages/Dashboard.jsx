import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dashboard as DashboardIcon, ViewKanban, Add, Person, Close, Search, DarkMode, LightMode, GitHub, CalendarMonth } from '@mui/icons-material';
import { Menu, MenuItem, ListItemText, Divider, IconButton } from '@mui/material';

import { CreateBoardForm } from '../components/CreateBoardForm.jsx';
import { BoardList } from '../components/BoardList.jsx';
import { NotificationBell } from '../components/NotificationBell.jsx';
import { apiClient } from '../services/api.js';
import { useAuthContext } from '../providers/AuthProvider.jsx';
import { useTheme } from '../providers/ThemeProvider.jsx';

export const Dashboard = () => {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const { user, signOut } = useAuthContext();
    const { isDark, toggleTheme, colors } = useTheme();
    const open = Boolean(anchorEl);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        signOut();
    };

    const handleSendDailySummary = async () => {
        handleMenuClose();
        try {
            const response = await apiClient.post('/notifications/daily-summary');
            alert('✅ Resumen diario enviado. Revisa tu correo y la consola del backend.');
            console.log('Resultado:', response.data);
        } catch (error) {
            console.error('Error al enviar resumen:', error);
            alert('❌ Error al enviar resumen: ' + error.message);
        }
    };
    const fetchBoards = useCallback(async () => {
        setRefreshing(true);
        try {
            const response = await apiClient.get('/boards');
            setBoards(response.data);
        } catch (error) {
            console.error('No fue posible cargar los tableros:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchBoards();
    }, [fetchBoards]);

    const handleBoardCreated = (board) => {
        setBoards((prev) => [...prev, board]);
        navigate(`/boards/${board.id}`);
    };

    const filteredBoards = boards.filter(board => 
        board.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.bg.primary }}>
                <div className="text-lg" style={{ color: colors.text.primary }}>Cargando tableros…</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.bg.primary }}>
            {/* Navbar */}
            <nav className="border-b px-3 sm:px-4 py-2" style={{ backgroundColor: colors.bg.primary, borderColor: colors.border.primary }}>
                <div className="flex items-center justify-between max-w-screen-2xl mx-auto gap-2">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-base sm:text-lg">S</span>
                            </div>
                            <span className="font-bold text-base sm:text-lg hidden sm:block truncate" style={{ color: colors.text.primary }}>SprintFlow</span>
                        </div>
                        <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm" style={{ color: colors.text.primary, backgroundColor: 'transparent' }} onMouseEnter={(e) => e.target.style.backgroundColor = colors.bg.hover} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                            <DashboardIcon fontSize="small" />
                            <span>Tableros</span>
                        </button>
                        <button
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm"
                            style={{ color: colors.text.primary, backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = colors.bg.hover}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            onClick={() => navigate('/calendar')}
                        >
                            <CalendarMonth fontSize="small" />
                            <span>Calendario</span>
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded transition-colors text-sm font-medium"
                            style={{ backgroundColor: colors.button.primary, color: '#ffffff' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = colors.button.hover}
                            onMouseLeave={(e) => e.target.style.backgroundColor = colors.button.primary}
                        >
                            <Add fontSize="small" />
                            <span className="hidden sm:inline">Crear</span>
                        </button>
                        
                        {/* Botón de cambio de tema */}
                        <IconButton
                            onClick={toggleTheme}
                            size="small"
                            className="w-8 h-8"
                            sx={{ color: colors.text.primary }}
                            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        >
                            {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                        </IconButton>
                        
                        {/* Campanita de notificaciones */}
                        <NotificationBell />
                        
                        {user && (
                            <>
                                <button
                                    onClick={handleMenuOpen}
                                    className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center cursor-pointer hover:ring-2 transition-all flex-shrink-0"
                                    style={{ '--tw-ring-color': isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }}
                                    title={user.displayName}
                                >
                                    <span className="text-white text-xs sm:text-sm font-semibold">
                                        {user.displayName?.charAt(0) || 'U'}
                                    </span>
                                </button>
                                
                                <Menu
                                    anchorEl={anchorEl}
                                    open={open}
                                    onClose={handleMenuClose}
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
                                    <MenuItem 
                                        onClick={handleSendDailySummary} 
                                        sx={{ 
                                            color: colors.text.primary,
                                            '&:hover': { bgcolor: colors.bg.hover } 
                                        }}
                                    >
                                        <ListItemText>Enviar resumen diario</ListItemText>
                                    </MenuItem>
                                    <MenuItem 
                                        onClick={handleLogout} 
                                        sx={{ 
                                            color: colors.text.primary,
                                            '&:hover': { bgcolor: colors.bg.hover } 
                                        }}
                                    >
                                        <ListItemText>Cerrar sesión</ListItemText>
                                    </MenuItem>
                                </Menu>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full">
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h1 className="text-xl sm:text-2xl font-semibold" style={{ color: colors.text.primary }}>Tableros</h1>
                    </div>
                    
                    {/* Campo de búsqueda */}
                    <div className="relative max-w-md">
                        <Search 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2" 
                            fontSize="small" 
                            style={{ color: colors.text.secondary }}
                        />
                        <input
                            type="text"
                            placeholder="Buscar tableros..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg pl-10 pr-4 py-2 sm:py-2.5 focus:outline-none transition-colors text-sm sm:text-base"
                            style={{
                                backgroundColor: colors.input.bg,
                                color: colors.text.primary,
                                border: `1px solid ${colors.input.border}`,
                            }}
                            onFocus={(e) => e.target.style.borderColor = colors.input.focus}
                            onBlur={(e) => e.target.style.borderColor = colors.input.border}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                                style={{ color: colors.text.secondary }}
                                onMouseEnter={(e) => e.target.style.color = colors.text.primary}
                                onMouseLeave={(e) => e.target.style.color = colors.text.secondary}
                            >
                                <Close fontSize="small" />
                            </button>
                        )}
                    </div>
                </div>

                <BoardList
                    boards={filteredBoards}
                    refreshing={refreshing}
                    onRefresh={fetchBoards}
                    onOpenBoard={(id) => navigate(`/boards/${id}`)}
                />
            </div>

            {/* Create Board Modal */}
            {showModal && (
                <div 
                    className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 z-50" 
                    onClick={() => setShowModal(false)}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
                >
                    <div 
                        className="rounded-lg shadow-2xl max-w-md w-full p-4 sm:p-6 relative" 
                        onClick={(e) => e.stopPropagation()}
                        style={{ backgroundColor: colors.bg.modal }}
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-3 sm:top-4 right-3 sm:right-4 transition-colors"
                            style={{ color: colors.text.secondary }}
                            onMouseEnter={(e) => e.target.style.color = colors.text.primary}
                            onMouseLeave={(e) => e.target.style.color = colors.text.secondary}
                        >
                            <Close fontSize="small" />
                        </button>
                        <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6" style={{ color: colors.text.primary }}>Crear tablero</h3>
                        <CreateBoardForm onBoardCreated={(board) => {
                            handleBoardCreated(board);
                            setShowModal(false);
                        }} />
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t py-1.5 mt-auto" style={{ borderColor: colors.border.primary }}>
                <div className="max-w-screen-2xl mx-auto px-4 flex flex-row items-center justify-center gap-1.5">
                    <span style={{ color: colors.text.secondary }} className="text-sm">
                        Desarrollado por <span style={{ color: colors.text.primary }} className="font-semibold">Daniel Molina</span>
                    </span>
                    <a
                        href="https://github.com/danielcrs0318"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded transition-all hover:scale-105"
                        style={{
                            color: colors.text.secondary,
                            backgroundColor: colors.bg.hover
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = colors.text.primary;
                            e.currentTarget.style.backgroundColor = isDark ? '#3a4149' : '#e5e7eb';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = colors.text.secondary;
                            e.currentTarget.style.backgroundColor = colors.bg.hover;
                        }}
                    >
                        <GitHub sx={{ fontSize: 18 }} />
                        <span className="text-sm font-medium">GitHub</span>
                    </a>
                </div>
            </footer>
        </div>
    );
};
