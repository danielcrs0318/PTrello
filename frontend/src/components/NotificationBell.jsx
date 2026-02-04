import { useState, useEffect } from 'react';
import {
    IconButton,
    Badge,
    Popover,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
    Box,
    Button,
    Divider,
    CircularProgress,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Check,
    Close,
    Delete,
    PersonAdd,
} from '@mui/icons-material';
import { apiClient } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../providers/ThemeProvider';

export const NotificationBell = ({ anchorEl: externalAnchorEl, open: externalOpen, onClose: externalOnClose, hideButton = false }) => {
    const { colors } = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const isControlled = externalAnchorEl !== undefined || externalOpen !== undefined;
    const open = isControlled ? Boolean(externalOpen) : Boolean(anchorEl);
    const resolvedAnchorEl = isControlled ? externalAnchorEl : anchorEl;


    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open]);

    const fetchUnreadCount = async () => {
        try {
            const response = await apiClient.get('/notifications/unread-count');
            setUnreadCount(response.data.count);
        } catch (error) {
            console.error('Error al obtener contador de notificaciones:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error('Error al obtener notificaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClick = (event) => {
        if (hideButton) return;
        setAnchorEl(event.currentTarget);
        fetchNotifications();
    };

    const handleClose = () => {
        if (isControlled) {
            externalOnClose?.();
            return;
        }
        setAnchorEl(null);
    };

    const handleAccept = async (notificationId) => {
        try {
            await apiClient.post(`/notifications/${notificationId}/accept`);
            fetchNotifications();
            fetchUnreadCount();
            // Recargar la página para mostrar el nuevo tablero
            window.location.reload();
        } catch (error) {
            console.error('Error al aceptar invitación:', error);
            alert('Error al aceptar la invitación');
        }
    };

    const handleReject = async (notificationId) => {
        try {
            await apiClient.post(`/notifications/${notificationId}/reject`);
            fetchNotifications();
            fetchUnreadCount();
        } catch (error) {
            console.error('Error al rechazar invitación:', error);
            alert('Error al rechazar la invitación');
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await apiClient.delete(`/notifications/${notificationId}`);
            fetchNotifications();
            fetchUnreadCount();
        } catch (error) {
            console.error('Error al eliminar notificación:', error);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await apiClient.put(`/notifications/${notificationId}/read`);
            fetchNotifications();
            fetchUnreadCount();
        } catch (error) {
            console.error('Error al marcar como leída:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiClient.put('/notifications/mark-all-read');
            fetchNotifications();
            fetchUnreadCount();
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'board_invitation':
                return <PersonAdd />;
            default:
                return <NotificationsIcon />;
        }
    };

    const formatDate = (date) => {
        try {
            return format(new Date(date), "d 'de' MMMM, HH:mm", { locale: es });
        } catch {
            return '';
        }
    };

    return (
        <>
            {!hideButton && (
                <IconButton
                    onClick={handleClick}
                    size="small"
                    sx={{ color: colors.text.primary }}
                >
                    <Badge badgeContent={unreadCount} color="error">
                        <NotificationsIcon />
                    </Badge>
                </IconButton>
            )}

            <Popover
                open={open}
                anchorEl={resolvedAnchorEl}
                onClose={handleClose}
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
                        width: { xs: 320, sm: 400 }, 
                        maxHeight: 600,
                        bgcolor: colors.bg.modal,
                        color: colors.text.primary,
                        border: `1px solid ${colors.border.primary}`,
                    },
                }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" style={{ color: colors.text.primary }}>Notificaciones</Typography>
                    {unreadCount > 0 && (
                        <Button 
                            size="small" 
                            onClick={handleMarkAllAsRead}
                            sx={{ color: colors.button.primary }}
                        >
                            Marcar todas como leídas
                        </Button>
                    )}
                </Box>
                <Divider sx={{ borderColor: colors.border.primary }} />

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress sx={{ color: colors.button.primary }} />
                    </Box>
                ) : notifications.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography style={{ color: colors.text.secondary }}>
                            No tienes notificaciones
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ p: 0, maxHeight: 500, overflow: 'auto' }}>
                        {notifications.map((notification, index) => (
                            <Box key={notification.id}>
                                <ListItem
                                    sx={{
                                        bgcolor: notification.isRead ? 'transparent' : colors.bg.hover,
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        py: 2,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: colors.button.primary }}>
                                                {getNotificationIcon(notification.type)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="subtitle2" fontWeight="bold" style={{ color: colors.text.primary }}>
                                                {notification.title}
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5 }} style={{ color: colors.text.secondary }}>
                                                {notification.message}
                                            </Typography>
                                            {notification.board && (
                                                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: colors.button.primary }}>
                                                    Tablero: {notification.board.name}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }} style={{ color: colors.text.secondary }}>
                                                {formatDate(notification.createdAt)}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Botones de acción para invitaciones pendientes */}
                                    {notification.type === 'board_invitation' && notification.status === 'pending' && (
                                        <Box sx={{ display: 'flex', gap: 1, mt: 2, ml: { xs: 0, sm: 7 }, flexWrap: 'wrap' }}>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<Check />}
                                                onClick={() => handleAccept(notification.id)}
                                                sx={{ 
                                                    bgcolor: colors.button.primary,
                                                    '&:hover': { bgcolor: colors.button.hover }
                                                }}
                                            >
                                                Aceptar
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                startIcon={<Close />}
                                                onClick={() => handleReject(notification.id)}
                                                sx={{ 
                                                    borderColor: 'error.main',
                                                    color: 'error.main'
                                                }}
                                            >
                                                Rechazar
                                            </Button>
                                        </Box>
                                    )}

                                    {/* Estado de invitación */}
                                    {notification.type === 'board_invitation' && notification.status !== 'pending' && (
                                        <Box sx={{ ml: { xs: 0, sm: 7 }, mt: 1 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: notification.status === 'accepted' ? 'success.main' : 'error.main',
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                {notification.status === 'accepted' ? '✓ Aceptada' : '✗ Rechazada'}
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Botones de acciones generales */}
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1, ml: { xs: 0, sm: 7 } }}>
                                        {!notification.isRead && (
                                            <Button
                                                size="small"
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                sx={{ color: colors.text.secondary }}
                                            >
                                                Marcar como leída
                                            </Button>
                                        )}
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDelete(notification.id)}
                                            color="error"
                                        >
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </ListItem>
                                {index < notifications.length - 1 && <Divider sx={{ borderColor: colors.border.primary }} />}
                            </Box>
                        ))}
                    </List>
                )}
            </Popover>
        </>
    );
};
