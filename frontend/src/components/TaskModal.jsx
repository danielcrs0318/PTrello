import { useState, useEffect, useRef } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    IconButton, 
    TextField, 
    Checkbox, 
    Avatar,
    List, 
    ListItem, 
    ListItemButton, 
    ListItemIcon, 
    ListItemText,
    ListSubheader,
    LinearProgress,
    Box,
    Typography,
    Popover,
    Button,
    Chip,
    Menu,
    MenuItem,
    InputAdornment,
    DialogActions
} from '@mui/material';
import { Close, Add, CheckBox, CheckBoxOutlineBlank, Delete, CalendarMonth, Palette, Edit, DescriptionOutlined, MoreVert, Check, Search, Photo, Groups } from '@mui/icons-material';
import { StaticDateTimePicker } from '@mui/x-date-pickers/StaticDateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { apiClient } from '../services/api';

dayjs.locale('es');

export const TaskModal = ({ open, onClose, task, onTaskUpdate, boardId, isOwner }) => {
    const [subtasks, setSubtasks] = useState(task?.subtasks || []);
    const [description, setDescription] = useState(task?.description || '');
    const [savingDescription, setSavingDescription] = useState(false);
    const [taskCompleted, setTaskCompleted] = useState(task?.completed ?? false);
    const [taskAssigneeIds, setTaskAssigneeIds] = useState(task?.assignees?.map((assignee) => assignee.id) || []);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task?.title || '');
    const [savingTitle, setSavingTitle] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingTask, setDeletingTask] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [colorAnchorEl, setColorAnchorEl] = useState(null);
    const [dateAnchorEl, setDateAnchorEl] = useState(null);
    const [selectedSubtask, setSelectedSubtask] = useState(null);
    const [editingSubtaskId, setEditingSubtaskId] = useState(null);
    const [editedSubtaskTitle, setEditedSubtaskTitle] = useState('');
    const [editedSubtaskDescription, setEditedSubtaskDescription] = useState('');
    const [editedSubtaskAssigneeIds, setEditedSubtaskAssigneeIds] = useState([]);
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [subtaskAssigneeSearch, setSubtaskAssigneeSearch] = useState('');
    const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
    const [subtaskAssigneeMenuOpen, setSubtaskAssigneeMenuOpen] = useState(false);
    const [taskImages, setTaskImages] = useState([]);
    const [subtaskImages, setSubtaskImages] = useState({});
    const [uploadingTaskImages, setUploadingTaskImages] = useState(false);
    const [uploadingSubtaskImages, setUploadingSubtaskImages] = useState({});
    const taskUploadInputRef = useRef(null);
    const subtaskUploadInputRef = useRef(null);
    const [subtaskUploadTarget, setSubtaskUploadTarget] = useState(null);
    const [tempDate, setTempDate] = useState(null);
    const [subtaskMenuAnchorEl, setSubtaskMenuAnchorEl] = useState(null);
    const [subtaskMenuTarget, setSubtaskMenuTarget] = useState(null);

    const isAnchorValid = (anchor) => Boolean(anchor && anchor.isConnected);

    const colors = [
        { name: 'Sin color', value: null },
        { name: 'Verde', value: '#4ade80' },
        { name: 'Amarillo', value: '#fbbf24' },
        { name: 'Naranja', value: '#fb923c' },
        { name: 'Rojo', value: '#ef4444' },
        { name: 'Morado', value: '#a78bfa' },
        { name: 'Azul', value: '#60a5fa' },
        { name: 'Rosa', value: '#f472b6' },
    ];

    // Sincronizar subtasks cuando cambie el task
    useEffect(() => {
        if (task?.subtasks) {
            setSubtasks(task.subtasks);
        }
        setDescription(task?.description || '');
        setTaskCompleted(task?.completed ?? false);
        setTaskAssigneeIds(task?.assignees?.map((assignee) => assignee.id) || []);
        setEditedTitle(task?.title || '');
        setIsEditingTitle(false);
        setTaskImages([]);
        setSubtaskImages({});
    }, [task]);

    useEffect(() => {
        if (!open) {
            setColorAnchorEl(null);
            setDateAnchorEl(null);
            setSelectedSubtask(null);
        }
    }, [open]);

    useEffect(() => {
        if (!open || !task || !boardId) return;

        const fetchTaskImages = async () => {
            try {
                const response = await apiClient.get(`/projects/${boardId}/tasks/${task.id}/images`);
                setTaskImages(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Error al cargar imágenes de tarea:', error);
            }
        };

        const fetchSubtaskImages = async () => {
            const nextMap = {};
            await Promise.all((task.subtasks || []).map(async (subtask) => {
                try {
                    const response = await apiClient.get(`/projects/${boardId}/tasks/${task.id}/subtasks/${subtask.id}/images`);
                    nextMap[subtask.id] = Array.isArray(response.data) ? response.data : [];
                } catch (error) {
                    console.error('Error al cargar imágenes de subtarea:', error);
                }
            }));
            setSubtaskImages(nextMap);
        };

        fetchTaskImages();
        fetchSubtaskImages();
    }, [open, task, boardId]);

    useEffect(() => {
        if (!open || !boardId) return;

        const fetchMembers = async () => {
            setMembersLoading(true);
            try {
                const response = await apiClient.get(`/board-members/${boardId}/members`);
                const owner = response.data.owner ? [{
                    id: response.data.owner.id,
                    displayName: response.data.owner.displayName,
                    email: response.data.owner.email,
                    avatarUrl: response.data.owner.avatarUrl,
                    role: 'owner',
                }] : [];
                const membersList = (response.data.members || []).map((m) => ({
                    id: m.user.id,
                    displayName: m.user.displayName,
                    email: m.user.email,
                    avatarUrl: m.user.avatarUrl,
                    role: m.role,
                }));
                setMembers([...owner, ...membersList]);
            } catch (error) {
                console.error('Error al cargar miembros del tablero:', error);
            } finally {
                setMembersLoading(false);
            }
        };

        fetchMembers();
    }, [open, boardId]);

    const handleTaskAssigneeChange = async (event) => {
        if (!task) return;
        if (!isOwner) return;
        const nextAssignees = Array.isArray(event.target.value) ? event.target.value : [];
        setTaskAssigneeIds(nextAssignees);

        try {
            await apiClient.put(`/tasks/${task.id}`, {
                assigneeIds: nextAssignees,
            });
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al asignar responsable:', error);
        }
    };

    const handleStartEditTitle = () => {
        setEditedTitle(task?.title || '');
        setIsEditingTitle(true);
    };

    const handleSaveTitle = async () => {
        if (!task) return;
        const trimmed = editedTitle.trim();
        if (!trimmed) {
            return;
        }

        if (trimmed === task.title) {
            setIsEditingTitle(false);
            return;
        }

        setSavingTitle(true);
        try {
            await apiClient.put(`/tasks/${task.id}`, { title: trimmed });
            setIsEditingTitle(false);
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al actualizar título de tarea:', error);
        } finally {
            setSavingTitle(false);
        }
    };

    const handleCancelEditTitle = () => {
        setIsEditingTitle(false);
        setEditedTitle(task?.title || '');
    };

    const handleDeleteTask = async () => {
        if (!task) return;
        setDeletingTask(true);
        try {
            await apiClient.delete(`/tasks/${task.id}`);
            setDeleteDialogOpen(false);
            onClose?.();
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al eliminar tarea:', error);
        } finally {
            setDeletingTask(false);
        }
    };

    const canToggleTaskComplete = () => {
        const total = (task?.subtasks || []).length;
        if (total === 0) return true;
        const completed = (task?.subtasks || []).filter((st) => st.completed).length;
        return completed === total || taskCompleted;
    };

    const handleToggleTaskComplete = async () => {
        if (!task) return;
        if (!canToggleTaskComplete()) return;

        const nextCompleted = !taskCompleted;
        setTaskCompleted(nextCompleted);

        try {
            await apiClient.put(`/tasks/${task.id}`, {
                completed: nextCompleted,
            });
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al actualizar estado de tarea:', error);
            setTaskCompleted(!nextCompleted);
        }
    };

    const handleSaveDescription = async () => {
        if (!task) return;
        const trimmed = description.trim();
        const nextDescription = trimmed.length ? trimmed : null;

        if ((task.description || '') === (nextDescription || '')) {
            return;
        }

        setSavingDescription(true);
        try {
            await apiClient.put(`/tasks/${task.id}`, {
                description: nextDescription,
            });
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al actualizar descripción:', error);
        } finally {
            setSavingDescription(false);
        }
    };

    const completedCount = subtasks.filter(st => st.completed).length;
    const totalCount = subtasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleCreateSubtask = async () => {
        if (!newSubtaskTitle.trim() || isCreating) return;

        setIsCreating(true);
        try {
            const response = await apiClient.post(`/tasks/${task.id}/subtasks`, {
                title: newSubtaskTitle,
            });
            setSubtasks([...subtasks, response.data]);
            setNewSubtaskTitle('');
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al crear subtarea:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleSubtask = async (subtask) => {
        try {
            const response = await apiClient.put(`/tasks/subtasks/${subtask.id}`, {
                completed: !subtask.completed,
            });
            setSubtasks((current) => current.map(st => 
                st.id === subtask.id ? response.data : st
            ));
            onTaskUpdate?.({
                type: 'subtask-updated',
                taskId: task?.id,
                subtask: response.data,
            });
        } catch (error) {
            console.error('Error al actualizar subtarea:', error);
        }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        try {
            await apiClient.delete(`/tasks/subtasks/${subtaskId}`);
            setSubtasks(subtasks.filter(st => st.id !== subtaskId));
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al eliminar subtarea:', error);
        }
    };

    const handleStartEditSubtask = (subtask) => {
        setEditingSubtaskId(subtask.id);
        setEditedSubtaskTitle(subtask.title);
        setEditedSubtaskDescription(subtask.description || '');
        setEditedSubtaskAssigneeIds(subtask.assignees?.map((assignee) => assignee.id) || []);
    };

    const handleSaveSubtaskDetails = async (subtaskId) => {
        if (!editedSubtaskTitle.trim()) {
            return;
        }

        try {
            const payload = {
                title: editedSubtaskTitle,
                description: editedSubtaskDescription.trim() || null,
            };

            if (isOwner) {
                payload.assigneeIds = editedSubtaskAssigneeIds;
            }

            const response = await apiClient.put(`/tasks/subtasks/${subtaskId}`, payload);
            setSubtasks(subtasks.map(st => 
                st.id === subtaskId ? response.data : st
            ));
            setEditingSubtaskId(null);
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al actualizar subtarea:', error);
        }
    };

    const handleCancelEditSubtask = () => {
        setEditingSubtaskId(null);
        setEditedSubtaskTitle('');
        setEditedSubtaskDescription('');
        setEditedSubtaskAssigneeIds([]);
    };

    const handleColorClick = (event, subtask) => {
        event.stopPropagation();
        setSelectedSubtask(subtask);
        const anchor = subtaskMenuAnchorEl || event.currentTarget;
        setColorAnchorEl(anchor);
    };

    const handleDateClick = (event, subtask) => {
        event.stopPropagation();
        setSelectedSubtask(subtask);
        setTempDate(subtask.dueDate ? dayjs(subtask.dueDate) : dayjs());
        const anchor = subtaskMenuAnchorEl || event.currentTarget;
        setDateAnchorEl(anchor);
    };

    const handleSubtaskMenuOpen = (event, subtask) => {
        event.stopPropagation();
        setSubtaskMenuAnchorEl(event.currentTarget);
        setSubtaskMenuTarget(subtask);
    };

    const handleSubtaskMenuClose = () => {
        setSubtaskMenuAnchorEl(null);
        setSubtaskMenuTarget(null);
    };

    const handleColorSelect = async (color) => {
        if (!selectedSubtask) return;
        try {
            const response = await apiClient.put(`/tasks/subtasks/${selectedSubtask.id}`, {
                color: color,
            });
            setSubtasks(subtasks.map(st => 
                st.id === selectedSubtask.id ? response.data : st
            ));
            onTaskUpdate?.();
            setColorAnchorEl(null);
            setSelectedSubtask(null);
        } catch (error) {
            console.error('Error al actualizar color:', error);
        }
    };

    const handleDateAccept = async () => {
        if (!selectedSubtask || !tempDate) return;

        try {
            const response = await apiClient.put(`/tasks/subtasks/${selectedSubtask.id}`, {
                dueDate: tempDate.toISOString(),
            });
            setSubtasks(subtasks.map(st => 
                st.id === selectedSubtask.id ? response.data : st
            ));
            setDateAnchorEl(null);
            setSelectedSubtask(null);
            setTempDate(null);
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al actualizar fecha:', error);
        }
    };

    const handleDateCancel = () => {
        setDateAnchorEl(null);
        setSelectedSubtask(null);
        setTempDate(null);
    };

    const handleDateClear = async () => {
        if (!selectedSubtask) return;

        try {
            const response = await apiClient.put(`/tasks/subtasks/${selectedSubtask.id}`, {
                dueDate: null,
            });
            setSubtasks(subtasks.map(st => 
                st.id === selectedSubtask.id ? response.data : st
            ));
            setDateAnchorEl(null);
            setSelectedSubtask(null);
            setTempDate(null);
            onTaskUpdate?.();
        } catch (error) {
            console.error('Error al limpiar fecha:', error);
        }
    };

    const resolveMemberName = (memberId) => (
        members.find((member) => member.id === memberId)?.displayName || 'Usuario'
    );

    const renderAssigneeValue = (selected) => {
        const selectedList = Array.isArray(selected) ? selected : [selected].filter(Boolean);
        if (selectedList.length === 0) {
            return 'Sin asignar';
        }
        return selectedList.map(resolveMemberName).join(', ');
    };

    const handleUploadTaskImages = async (files) => {
        if (!task || !boardId || !files?.length) return;
        setUploadingTaskImages(true);
        try {
            const formData = new FormData();
            Array.from(files).forEach((file) => formData.append('images', file));
            const response = await apiClient.post(
                `/projects/${boardId}/tasks/${task.id}/images`,
                formData,
            );
            const uploaded = response.data?.images || [];
            setTaskImages((current) => [...current, ...uploaded]);
        } catch (error) {
            console.error('Error al subir imágenes de tarea:', error);
            console.error('Detalle backend:', error?.response?.data);
        } finally {
            setUploadingTaskImages(false);
        }
    };

    const handleUploadSubtaskImages = async (subtaskId, files) => {
        if (!task || !boardId || !subtaskId || !files?.length) return;
        setUploadingSubtaskImages((prev) => ({ ...prev, [subtaskId]: true }));
        try {
            const formData = new FormData();
            Array.from(files).forEach((file) => formData.append('images', file));
            const response = await apiClient.post(
                `/projects/${boardId}/tasks/${task.id}/subtasks/${subtaskId}/images`,
                formData,
            );
            const uploaded = response.data?.images || [];
            setSubtaskImages((current) => ({
                ...current,
                [subtaskId]: [...(current[subtaskId] || []), ...uploaded],
            }));
        } catch (error) {
            console.error('Error al subir imágenes de subtarea:', error);
            console.error('Detalle backend:', error?.response?.data);
        } finally {
            setUploadingSubtaskImages((prev) => ({ ...prev, [subtaskId]: false }));
        }
    };

    const handleTriggerSubtaskUpload = (subtaskId) => {
        setSubtaskUploadTarget(subtaskId);
        if (subtaskUploadInputRef.current) {
            subtaskUploadInputRef.current.click();
        }
    };

    const handleDeleteImage = async (imageId, scope, subtaskId) => {
        if (!imageId) return;
        try {
            await apiClient.delete(`/images/${imageId}`);
            if (scope === 'task') {
                setTaskImages((current) => current.filter((img) => img.id !== imageId));
                return;
            }
            if (scope === 'subtask' && subtaskId) {
                setSubtaskImages((current) => ({
                    ...current,
                    [subtaskId]: (current[subtaskId] || []).filter((img) => img.id !== imageId),
                }));
            }
        } catch (error) {
            console.error('Error al eliminar imagen:', error);
        }
    };

    const filterMembers = (query) => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return members;
        return members.filter((member) => {
            const name = member.displayName?.toLowerCase() || '';
            const email = member.email?.toLowerCase() || '';
            return name.includes(normalizedQuery) || email.includes(normalizedQuery);
        });
    };

    const taskAssigneeOptions = filterMembers(assigneeSearch);
    const subtaskAssigneeOptions = filterMembers(subtaskAssigneeSearch);

    if (!task) return null;

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={window.innerWidth < 640} // fullScreen en móviles
            PaperProps={{
                sx: {
                    bgcolor: '#282e33',
                    color: 'white',
                    minHeight: { xs: '100vh', sm: '400px' },
                    m: { xs: 0, sm: 2 },
                }
            }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: 1,
                pb: 1,
                px: { xs: 2, sm: 3 },
                pt: { xs: 2, sm: 2 }
            }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {isEditingTitle ? (
                        <TextField
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSaveTitle();
                                } else if (e.key === 'Escape') {
                                    handleCancelEditTitle();
                                }
                            }}
                            onBlur={handleSaveTitle}
                            size="small"
                            autoFocus
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: '#1d2125',
                                    color: 'white',
                                    '& fieldset': { borderColor: '#3a4149' },
                                    '&:hover fieldset': { borderColor: '#579dff' },
                                    '&.Mui-focused fieldset': { borderColor: '#579dff' },
                                },
                            }}
                        />
                    ) : (
                        <Typography variant="h6" component="div" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.title}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {isEditingTitle ? (
                        <IconButton onClick={handleSaveTitle} sx={{ color: '#4ade80' }} disabled={savingTitle} title="Guardar">
                            <Check />
                        </IconButton>
                    ) : (
                        <IconButton onClick={handleStartEditTitle} sx={{ color: '#9fadbc' }} title="Editar tarea">
                            <Edit />
                        </IconButton>
                    )}
                    <IconButton onClick={() => setDeleteDialogOpen(true)} sx={{ color: '#ef4444' }} title="Eliminar tarea">
                        <Delete />
                    </IconButton>
                    <IconButton onClick={onClose} sx={{ color: 'white' }} title="Cerrar">
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            
            <DialogContent sx={{ pt: 2, px: { xs: 2, sm: 3 } }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Checkbox
                        checked={taskCompleted}
                        onChange={handleToggleTaskComplete}
                        disabled={!canToggleTaskComplete()}
                        sx={{
                            color: '#9fadbc',
                            '&.Mui-checked': { color: '#4ade80' },
                            '&.Mui-disabled': { color: '#5b6470' },
                        }}
                    />
                    <Typography variant="body2" sx={{ color: taskCompleted ? '#4ade80' : '#9fadbc' }}>
                        Marcar tarea como terminada
                    </Typography>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ color: '#9fadbc', mb: 1 }}>
                        Responsable
                    </Typography>
                    <TextField
                        select
                        fullWidth
                        size="small"
                        value={taskAssigneeIds}
                        onChange={handleTaskAssigneeChange}
                        disabled={membersLoading || !isOwner}
                        SelectProps={{
                            multiple: true,
                            renderValue: renderAssigneeValue,
                            open: assigneeMenuOpen,
                            onOpen: () => setAssigneeMenuOpen(true),
                            MenuProps: {
                                disableAutoFocusItem: true,
                                PaperProps: {
                                    sx: {
                                        bgcolor: '#1f2428',
                                        color: 'white',
                                        border: '1px solid #2f353c',
                                        mt: 1,
                                        minWidth: 300,
                                    },
                                },
                                MenuListProps: {
                                    dense: true,
                                    sx: { py: 0 },
                                },
                                onClose: () => {
                                    setAssigneeMenuOpen(false);
                                    setAssigneeSearch('');
                                },
                            },
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#22272b',
                                color: '#b6c2cf',
                                '& fieldset': { borderColor: '#3c434a' },
                                '&:hover fieldset': { borderColor: '#579dff' },
                                '&.Mui-focused fieldset': { borderColor: '#579dff' },
                            },
                        }}
                    >
                        <ListSubheader
                            component="div"
                            disableSticky
                            sx={{
                                bgcolor: '#1f2428',
                                color: '#9fadbc',
                                px: 2,
                                py: 1.5,
                                borderBottom: '1px solid #2f353c',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ color: '#b6c2cf' }}>
                                    Miembros
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => setAssigneeMenuOpen(false)}
                                    sx={{ color: '#9fadbc', '&:hover': { color: '#ffffff' } }}
                                    title="Cerrar"
                                >
                                    <Close fontSize="small" />
                                </IconButton>
                            </Box>
                            <TextField
                                size="small"
                                placeholder="Buscar miembros"
                                value={assigneeSearch}
                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                fullWidth
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search sx={{ color: '#9fadbc' }} fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: '#22272b',
                                        color: '#b6c2cf',
                                        '& fieldset': { borderColor: '#3a4149' },
                                        '&:hover fieldset': { borderColor: '#579dff' },
                                        '&.Mui-focused fieldset': { borderColor: '#579dff' },
                                    },
                                    '& .MuiOutlinedInput-input': {
                                        py: 0.8,
                                    },
                                }}
                            />
                        </ListSubheader>
                        {taskAssigneeOptions.map((member) => (
                            <MenuItem
                                key={member.id}
                                value={member.id}
                                sx={{
                                    gap: 1,
                                    py: 1,
                                    '&.Mui-selected': { bgcolor: 'rgba(88,166,255,0.12)' },
                                    '&.Mui-selected:hover': { bgcolor: 'rgba(88,166,255,0.18)' },
                                }}
                            >
                                <Checkbox
                                    checked={taskAssigneeIds.includes(member.id)}
                                    sx={{ color: '#9fadbc', '&.Mui-checked': { color: '#4ade80' } }}
                                />
                                <Avatar
                                    src={member.avatarUrl}
                                    sx={{ bgcolor: '#667eea', width: 28, height: 28, fontSize: '0.75rem' }}
                                >
                                    {member.displayName?.charAt(0) || 'U'}
                                </Avatar>
                                <ListItemText
                                    primary={member.displayName}
                                    secondary={member.email}
                                    sx={{
                                        '& .MuiListItemText-primary': { color: 'white', fontSize: '0.9rem' },
                                        '& .MuiListItemText-secondary': { color: '#9fadbc', fontSize: '0.75rem' },
                                    }}
                                />
                            </MenuItem>
                        ))}
                        {!membersLoading && taskAssigneeOptions.length === 0 && (
                            <MenuItem disabled sx={{ opacity: 0.7 }}>
                                <ListItemText primary="No se encontraron miembros" />
                            </MenuItem>
                        )}
                    </TextField>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ color: '#9fadbc', mb: 1 }}>
                        Descripción
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="Agrega una descripción..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#22272b',
                                color: '#b6c2cf',
                                '& fieldset': { borderColor: '#3c434a' },
                                '&:hover fieldset': { borderColor: '#579dff' },
                                '&.Mui-focused fieldset': { borderColor: '#579dff' },
                            },
                            '& .MuiOutlinedInput-input': {
                                color: '#b6c2cf',
                            },
                        }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button
                            onClick={handleSaveDescription}
                            disabled={savingDescription || (task?.description || '') === description.trim()}
                            variant="contained"
                            sx={{
                                bgcolor: '#579dff',
                                '&:hover': { bgcolor: '#85b8ff' },
                                '&:disabled': { bgcolor: '#3c434a', color: '#9fadbc' },
                                textTransform: 'none',
                                fontWeight: 600,
                            }}
                        >
                            {savingDescription ? 'Guardando...' : 'Guardar descripción'}
                        </Button>
                    </Box>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ color: '#9fadbc', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Photo fontSize="small" />
                        Imágenes de la tarea
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                        {taskImages.length === 0 && (
                            <Typography variant="caption" sx={{ color: '#9fadbc' }}>
                                Sin imágenes cargadas.
                            </Typography>
                        )}
                        {taskImages.map((image) => (
                            <Box
                                key={image.id}
                                sx={{
                                    position: 'relative',
                                    width: 96,
                                    height: 72,
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    border: '1px solid #3a4149',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(image.imageUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        padding: 0,
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <img
                                        src={image.imageUrl}
                                        alt={image.imageName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                </button>
                                <IconButton
                                    size="small"
                                    onClick={() => handleDeleteImage(image.id, 'task')}
                                    sx={{ position: 'absolute', top: 2, right: 2, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                                >
                                    <Delete fontSize="inherit" />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                    <Button
                        variant="outlined"
                        disabled={uploadingTaskImages}
                        onClick={() => taskUploadInputRef.current?.click()}
                        sx={{
                            color: '#b6c2cf',
                            borderColor: '#3c434a',
                            textTransform: 'none',
                            '&:hover': { borderColor: '#579dff', color: 'white' },
                        }}
                    >
                        {uploadingTaskImages ? 'Subiendo...' : 'Subir imágenes'}
                    </Button>
                    <input
                        ref={taskUploadInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        multiple
                        hidden
                        onChange={(e) => {
                            handleUploadTaskImages(e.target.files);
                            e.target.value = '';
                        }}
                    />
                </Box>

                {/* Sección de subtareas */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: '#9fadbc', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckBox fontSize="small" />
                            Lista de tareas
                        </Typography>
                        {totalCount > 0 && (
                            <Typography variant="caption" sx={{ color: '#9fadbc' }}>
                                {completedCount}/{totalCount}
                            </Typography>
                        )}
                    </Box>

                    {totalCount > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <LinearProgress 
                                variant="determinate" 
                                value={progress} 
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: '#1d2125',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: progress === 100 ? '#4ade80' : '#579dff',
                                    }
                                }}
                            />
                        </Box>
                    )}

                    <List sx={{ p: 0 }}>
                        {subtasks.map((subtask) => (
                            <ListItem
                                key={subtask.id}
                                sx={{
                                    bgcolor: '#22272b',
                                    borderRadius: 1,
                                    mb: 1,
                                    p: 0,
                                    borderLeft: subtask.color ? `4px solid ${subtask.color}` : 'none',
                                    '&:hover .action-buttons': {
                                        opacity: 1,
                                    }
                                }}
                                secondaryAction={
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleSubtaskMenuOpen(e, subtask)}
                                        sx={{ color: '#9fadbc', '&:hover': { color: '#579dff' } }}
                                        title="Opciones"
                                    >
                                        <MoreVert fontSize="small" />
                                    </IconButton>
                                }
                            >
                                <ListItemButton 
                                    onClick={() => {
                                        if (editingSubtaskId !== subtask.id) {
                                            handleToggleSubtask(subtask);
                                        }
                                    }} 
                                    sx={{ 
                                        py: 1,
                                        '&:hover': {
                                            bgcolor: '#2c333a',
                                        }
                                    }}
                                    disableRipple={false}
                                >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <Checkbox
                                            checked={subtask.completed}
                                            tabIndex={-1}
                                            disableRipple
                                            icon={<CheckBoxOutlineBlank sx={{ color: '#9fadbc' }} />}
                                            checkedIcon={<CheckBox sx={{ color: '#4ade80' }} />}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {editingSubtaskId === subtask.id ? (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Edit fontSize="small" style={{ color: '#9fadbc' }} />
                                                            <Typography variant="caption" sx={{ color: '#9fadbc', fontWeight: 600 }}>
                                                                Título
                                                            </Typography>
                                                        </Box>
                                                        <TextField
                                                            value={editedSubtaskTitle}
                                                            onChange={(e) => setEditedSubtaskTitle(e.target.value)}
                                                            autoFocus
                                                            size="small"
                                                            sx={{
                                                                '& .MuiOutlinedInput-root': {
                                                                    bgcolor: '#1d2125',
                                                                    color: 'white',
                                                                    '& fieldset': { borderColor: '#3a4149' },
                                                                    '&:hover fieldset': { borderColor: '#579dff' },
                                                                    '&.Mui-focused fieldset': { borderColor: '#579dff' },
                                                                },
                                                            }}
                                                        />
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <DescriptionOutlined fontSize="small" style={{ color: '#9fadbc' }} />
                                                            <Typography variant="caption" sx={{ color: '#9fadbc', fontWeight: 600 }}>
                                                                Descripción
                                                            </Typography>
                                                        </Box>
                                                        <TextField
                                                            value={editedSubtaskDescription}
                                                            onChange={(e) => setEditedSubtaskDescription(e.target.value)}
                                                            placeholder="Descripción (opcional)"
                                                            size="small"
                                                            multiline
                                                            minRows={2}
                                                            sx={{
                                                                '& .MuiOutlinedInput-root': {
                                                                    bgcolor: '#1d2125',
                                                                    color: 'white',
                                                                    '& fieldset': { borderColor: '#3a4149' },
                                                                    '&:hover fieldset': { borderColor: '#579dff' },
                                                                    '&.Mui-focused fieldset': { borderColor: '#579dff' },
                                                                },
                                                            }}
                                                        />
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <CheckBox fontSize="small" style={{ color: '#9fadbc' }} />
                                                            <Typography variant="caption" sx={{ color: '#9fadbc', fontWeight: 600 }}>
                                                                Responsable
                                                            </Typography>
                                                        </Box>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            value={editedSubtaskAssigneeIds}
                                                            onChange={(e) => setEditedSubtaskAssigneeIds(Array.isArray(e.target.value) ? e.target.value : [])}
                                                            disabled={!isOwner}
                                                            SelectProps={{
                                                                multiple: true,
                                                                renderValue: renderAssigneeValue,
                                                                open: subtaskAssigneeMenuOpen,
                                                                onOpen: () => setSubtaskAssigneeMenuOpen(true),
                                                                MenuProps: {
                                                                    disableAutoFocusItem: true,
                                                                    PaperProps: {
                                                                        sx: {
                                                                            bgcolor: '#1f2428',
                                                                            color: 'white',
                                                                            border: '1px solid #2f353c',
                                                                            mt: 1,
                                                                            minWidth: 280,
                                                                        },
                                                                    },
                                                                    MenuListProps: {
                                                                        dense: true,
                                                                        sx: { py: 0 },
                                                                    },
                                                                    onClose: () => {
                                                                        setSubtaskAssigneeMenuOpen(false);
                                                                        setSubtaskAssigneeSearch('');
                                                                    },
                                                                },
                                                            }}
                                                            sx={{
                                                                '& .MuiOutlinedInput-root': {
                                                                    bgcolor: '#1d2125',
                                                                    color: 'white',
                                                                    '& fieldset': { borderColor: '#3a4149' },
                                                                    '&:hover fieldset': { borderColor: '#579dff' },
                                                                    '&.Mui-focused fieldset': { borderColor: '#579dff' },
                                                                },
                                                            }}
                                                        >
                                                            <ListSubheader
                                                                component="div"
                                                                disableSticky
                                                                sx={{
                                                                    bgcolor: '#1f2428',
                                                                    color: '#9fadbc',
                                                                    px: 2,
                                                                    py: 1.5,
                                                                    borderBottom: '1px solid #2f353c',
                                                                }}
                                                            >
                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                                    <Typography variant="subtitle2" sx={{ color: '#b6c2cf' }}>
                                                                        Miembros
                                                                    </Typography>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => setSubtaskAssigneeMenuOpen(false)}
                                                                        sx={{ color: '#9fadbc', '&:hover': { color: '#ffffff' } }}
                                                                        title="Cerrar"
                                                                    >
                                                                        <Close fontSize="small" />
                                                                    </IconButton>
                                                                </Box>
                                                                <TextField
                                                                    size="small"
                                                                    placeholder="Buscar miembros"
                                                                    value={subtaskAssigneeSearch}
                                                                    onChange={(e) => setSubtaskAssigneeSearch(e.target.value)}
                                                                    fullWidth
                                                                    InputProps={{
                                                                        startAdornment: (
                                                                            <InputAdornment position="start">
                                                                                <Search sx={{ color: '#9fadbc' }} fontSize="small" />
                                                                            </InputAdornment>
                                                                        ),
                                                                    }}
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            bgcolor: '#22272b',
                                                                            color: '#b6c2cf',
                                                                            '& fieldset': { borderColor: '#3a4149' },
                                                                            '&:hover fieldset': { borderColor: '#579dff' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#579dff' },
                                                                        },
                                                                        '& .MuiOutlinedInput-input': {
                                                                            py: 0.8,
                                                                        },
                                                                    }}
                                                                />
                                                            </ListSubheader>
                                                            {subtaskAssigneeOptions.map((member) => (
                                                                <MenuItem
                                                                    key={member.id}
                                                                    value={member.id}
                                                                    sx={{
                                                                        gap: 1,
                                                                        py: 1,
                                                                        '&.Mui-selected': { bgcolor: 'rgba(88,166,255,0.12)' },
                                                                        '&.Mui-selected:hover': { bgcolor: 'rgba(88,166,255,0.18)' },
                                                                    }}
                                                                >
                                                                    <Checkbox
                                                                        checked={editedSubtaskAssigneeIds.includes(member.id)}
                                                                        sx={{ color: '#9fadbc', '&.Mui-checked': { color: '#4ade80' } }}
                                                                    />
                                                                    <Avatar
                                                                        src={member.avatarUrl}
                                                                        sx={{ bgcolor: '#667eea', width: 26, height: 26, fontSize: '0.7rem' }}
                                                                    >
                                                                        {member.displayName?.charAt(0) || 'U'}
                                                                    </Avatar>
                                                                    <ListItemText
                                                                        primary={member.displayName}
                                                                        secondary={member.email}
                                                                        sx={{
                                                                            '& .MuiListItemText-primary': { color: 'white', fontSize: '0.85rem' },
                                                                            '& .MuiListItemText-secondary': { color: '#9fadbc', fontSize: '0.7rem' },
                                                                        }}
                                                                    />
                                                                </MenuItem>
                                                            ))}
                                                            {subtaskAssigneeOptions.length === 0 && (
                                                                <MenuItem disabled sx={{ opacity: 0.7 }}>
                                                                    <ListItemText primary="No se encontraron miembros" />
                                                                </MenuItem>
                                                            )}
                                                        </TextField>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Photo fontSize="small" style={{ color: '#9fadbc' }} />
                                                                <Typography variant="caption" sx={{ color: '#9fadbc', fontWeight: 600 }}>
                                                                    Imágenes de subtarea
                                                                </Typography>
                                                            </Box>
                                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                                {(subtaskImages[subtask.id] || []).length === 0 && (
                                                                    <Typography variant="caption" sx={{ color: '#9fadbc' }}>
                                                                        Sin imágenes cargadas.
                                                                    </Typography>
                                                                )}
                                                                {(subtaskImages[subtask.id] || []).map((image) => (
                                                                    <Box
                                                                        key={image.id}
                                                                        sx={{
                                                                            position: 'relative',
                                                                            width: 88,
                                                                            height: 64,
                                                                            borderRadius: 1,
                                                                            overflow: 'hidden',
                                                                            border: '1px solid #3a4149',
                                                                        }}
                                                                    >
                                                                        <img
                                                                            src={image.imageUrl}
                                                                            alt={image.imageName}
                                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                        />
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleDeleteImage(image.id, 'subtask', subtask.id)}
                                                                            sx={{ position: 'absolute', top: 2, right: 2, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                                                                        >
                                                                            <Delete fontSize="inherit" />
                                                                        </IconButton>
                                                                    </Box>
                                                                ))}
                                                            </Box>
                                                            <Button
                                                                variant="outlined"
                                                                component="label"
                                                                disabled={uploadingSubtaskImages[subtask.id]}
                                                                sx={{
                                                                    color: '#b6c2cf',
                                                                    borderColor: '#3c434a',
                                                                    textTransform: 'none',
                                                                    '&:hover': { borderColor: '#579dff', color: 'white' },
                                                                    alignSelf: 'flex-start',
                                                                }}
                                                            >
                                                                {uploadingSubtaskImages[subtask.id] ? 'Subiendo...' : 'Subir imágenes'}
                                                                <input
                                                                    type="file"
                                                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                                                    multiple
                                                                    hidden
                                                                    onChange={(e) => {
                                                                        handleUploadSubtaskImages(subtask.id, e.target.files);
                                                                        e.target.value = '';
                                                                    }}
                                                                />
                                                            </Button>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                onClick={() => handleSaveSubtaskDetails(subtask.id)}
                                                                sx={{
                                                                    bgcolor: '#579dff',
                                                                    '&:hover': { bgcolor: '#85b8ff' },
                                                                    textTransform: 'none',
                                                                }}
                                                            >
                                                                Guardar
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                onClick={handleCancelEditSubtask}
                                                                sx={{
                                                                    color: '#9fadbc',
                                                                    textTransform: 'none',
                                                                }}
                                                            >
                                                                Cancelar
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                        <span 
                                                            style={{
                                                                textDecoration: subtask.completed ? 'line-through' : 'none',
                                                                color: subtask.completed ? '#9fadbc' : 'white',
                                                                cursor: 'text',
                                                            }}
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStartEditSubtask(subtask);
                                                            }}
                                                        >
                                                            {subtask.title}
                                                        </span>
                                                        {subtask.description && (
                                                            <span style={{ color: '#9fadbc', fontSize: '0.75rem' }}>
                                                                {subtask.description}
                                                            </span>
                                                        )}
                                                        {subtask.assignees?.length > 0 && (
                                                            <span style={{ color: '#9fadbc', fontSize: '0.7rem' }}>
                                                                Responsables: {subtask.assignees.map((assignee) => assignee.displayName).join(', ')}
                                                            </span>
                                                        )}
                                                        {uploadingSubtaskImages[subtask.id] && (
                                                            <Typography variant="caption" sx={{ color: '#9fadbc', mt: 0.5 }}>
                                                                Subiendo imagen...
                                                            </Typography>
                                                        )}
                                                        {(subtaskImages[subtask.id] || []).length > 0 && (
                                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                                                {(subtaskImages[subtask.id] || []).map((image) => (
                                                                    <Box
                                                                        key={image.id}
                                                                        sx={{
                                                                            position: 'relative',
                                                                            width: 84,
                                                                            height: 64,
                                                                            borderRadius: 1,
                                                                            overflow: 'hidden',
                                                                            border: '1px solid #3a4149',
                                                                        }}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.open(image.imageUrl, '_blank', 'noopener,noreferrer');
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                padding: 0,
                                                                                border: 'none',
                                                                                background: 'transparent',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                        >
                                                                            <img
                                                                                src={image.imageUrl}
                                                                                alt={image.imageName}
                                                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                                            />
                                                                        </button>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteImage(image.id, 'subtask', subtask.id);
                                                                            }}
                                                                            sx={{
                                                                                position: 'absolute',
                                                                                top: 2,
                                                                                right: 2,
                                                                                color: 'white',
                                                                                bgcolor: 'rgba(0,0,0,0.5)',
                                                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                                                                            }}
                                                                        >
                                                                            <Delete fontSize="inherit" />
                                                                        </IconButton>
                                                                    </Box>
                                                                ))}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                )}
                                                {subtask.dueDate && (
                                                    <Chip 
                                                        label={dayjs(subtask.dueDate).format('DD/MM/YYYY HH:mm')}
                                                        size="small"
                                                        icon={<CalendarMonth />}
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.7rem',
                                                            bgcolor: dayjs(subtask.dueDate).isBefore(dayjs()) ? '#ef444480' : '#579dff40',
                                                            color: dayjs(subtask.dueDate).isBefore(dayjs()) ? '#ef4444' : '#579dff',
                                                            '& .MuiChip-icon': { fontSize: '0.9rem' },
                                                            alignSelf: 'flex-start'
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    {/* Campo para agregar nueva subtarea */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Añadir un elemento"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleCreateSubtask();
                                }
                            }}
                            disabled={isCreating}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: '#22272b',
                                    color: 'white',
                                    '& fieldset': {
                                        borderColor: '#3a4149',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#579dff',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#579dff',
                                    },
                                },
                                '& input::placeholder': {
                                    color: '#9fadbc',
                                    opacity: 1,
                                }
                            }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <IconButton
                                onClick={handleCreateSubtask}
                                disabled={!newSubtaskTitle.trim() || isCreating}
                                sx={{
                                    bgcolor: '#579dff',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: '#85b8ff',
                                    },
                                    '&:disabled': {
                                        bgcolor: '#3a4149',
                                        color: '#9fadbc',
                                    }
                                }}
                            >
                                <Add />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            {/* Popover para seleccionar color */}
            <Popover
                open={isAnchorValid(colorAnchorEl)}
                anchorEl={isAnchorValid(colorAnchorEl) ? colorAnchorEl : null}
                onClose={() => {
                    setColorAnchorEl(null);
                    setSelectedSubtask(null);
                }}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        bgcolor: '#282e33',
                        p: 2,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        maxWidth: 200,
                    }
                }}
            >
                {colors.map((color) => (
                    <Button
                        key={color.name}
                        onClick={() => handleColorSelect(color.value)}
                        sx={{
                            minWidth: 0,
                            width: 40,
                            height: 40,
                            bgcolor: color.value || '#22272b',
                            border: color.value ? 'none' : '2px dashed #9fadbc',
                            '&:hover': {
                                bgcolor: color.value || '#2c333a',
                                transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s',
                        }}
                        title={color.name}
                    />
                ))}
            </Popover>

            {/* Popover para seleccionar fecha */}
            <Popover
                open={isAnchorValid(dateAnchorEl)}
                anchorEl={isAnchorValid(dateAnchorEl) ? dateAnchorEl : null}
                onClose={() => {
                    setDateAnchorEl(null);
                    setSelectedSubtask(null);
                }}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        bgcolor: '#282e33',
                        p: 0,
                    }
                }}
            >
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <Box sx={{ bgcolor: '#282e33' }}>
                        <StaticDateTimePicker
                            value={tempDate}
                            onChange={(newValue) => setTempDate(newValue)}
                            sx={{
                                bgcolor: '#282e33',
                                '& .MuiPickersCalendarHeader-root': {
                                    color: 'white',
                                },
                                '& .MuiPickersDay-root': {
                                    color: 'white',
                                    '&.Mui-selected': {
                                        bgcolor: '#579dff',
                                    },
                                },
                                '& .MuiTypography-root': {
                                    color: 'white',
                                },
                                '& .MuiPickersYear-yearButton': {
                                    color: 'white',
                                },
                                '& .MuiClock-pin': {
                                    bgcolor: '#579dff',
                                },
                                '& .MuiClockPointer-root': {
                                    bgcolor: '#579dff',
                                },
                                '& .MuiClockPointer-thumb': {
                                    bgcolor: '#579dff',
                                    borderColor: '#579dff',
                                },
                                '& .MuiClockNumber-root': {
                                    color: 'white',
                                },
                                '& .MuiSvgIcon-root': {
                                    color: '#9fadbc',
                                },
                            }}
                        />
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            p: 2,
                            borderTop: '1px solid #3a4149',
                            bgcolor: '#282e33',
                        }}>
                            <Button
                                onClick={handleDateClear}
                                sx={{
                                    color: '#9fadbc',
                                    '&:hover': { bgcolor: '#3a4149' },
                                }}
                            >
                                Limpiar
                            </Button>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    onClick={handleDateCancel}
                                    sx={{
                                        color: '#9fadbc',
                                        '&:hover': { bgcolor: '#3a4149' },
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleDateAccept}
                                    variant="contained"
                                    sx={{
                                        bgcolor: '#579dff',
                                        '&:hover': { bgcolor: '#4c8fe0' },
                                    }}
                                >
                                    Aceptar
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </LocalizationProvider>
            </Popover>

            {/* Menú de opciones de subtarea */}
            <Menu
                anchorEl={subtaskMenuAnchorEl}
                open={Boolean(subtaskMenuAnchorEl)}
                onClose={handleSubtaskMenuClose}
                PaperProps={{
                    sx: {
                        bgcolor: '#282e33',
                        color: 'white',
                        minWidth: 180,
                    }
                }}
            >
                <MenuItem
                    onClick={() => {
                        if (subtaskMenuTarget) {
                            handleStartEditSubtask(subtaskMenuTarget);
                        }
                        handleSubtaskMenuClose();
                    }}
                >
                    <Edit fontSize="small" style={{ marginRight: 8 }} /> Editar
                </MenuItem>
                <MenuItem
                    onClick={(e) => {
                        if (subtaskMenuTarget) {
                            handleStartEditSubtask(subtaskMenuTarget);
                        }
                        handleSubtaskMenuClose();
                    }}
                >
                    <DescriptionOutlined fontSize="small" style={{ marginRight: 8 }} /> Descripción
                </MenuItem>
                {isOwner && (
                    <MenuItem
                        onClick={() => {
                            if (subtaskMenuTarget) {
                                handleStartEditSubtask(subtaskMenuTarget);
                            }
                            handleSubtaskMenuClose();
                        }}
                    >
                        <Groups fontSize="small" style={{ marginRight: 8 }} /> Responsable
                    </MenuItem>
                )}
                <MenuItem
                    onClick={(e) => {
                        if (subtaskMenuTarget) {
                            handleColorClick(e, subtaskMenuTarget);
                        }
                        handleSubtaskMenuClose();
                    }}
                >
                    <Palette fontSize="small" style={{ marginRight: 8 }} /> Color
                </MenuItem>
                <MenuItem
                    onClick={(e) => {
                        if (subtaskMenuTarget) {
                            handleDateClick(e, subtaskMenuTarget);
                        }
                        handleSubtaskMenuClose();
                    }}
                >
                    <CalendarMonth fontSize="small" style={{ marginRight: 8 }} /> Fecha
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (subtaskMenuTarget) {
                            handleTriggerSubtaskUpload(subtaskMenuTarget.id);
                        }
                        handleSubtaskMenuClose();
                    }}
                >
                    <Photo fontSize="small" style={{ marginRight: 8 }} /> Imagen
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (subtaskMenuTarget) {
                            handleDeleteSubtask(subtaskMenuTarget.id);
                        }
                        handleSubtaskMenuClose();
                    }}
                    sx={{ color: '#ef4444' }}
                >
                    <Delete fontSize="small" style={{ marginRight: 8 }} /> Eliminar
                </MenuItem>
            </Menu>

            <input
                ref={subtaskUploadInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                multiple
                hidden
                onChange={(e) => {
                    if (subtaskUploadTarget) {
                        handleUploadSubtaskImages(subtaskUploadTarget, e.target.files);
                    }
                    e.target.value = '';
                }}
            />

            {/* Diálogo de confirmación para eliminar tarea */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deletingTask && setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: '#282e33',
                        color: 'white',
                        minWidth: 360,
                    }
                }}
            >
                <DialogTitle>Eliminar tarea</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: '#9fadbc' }}>
                        ¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        sx={{ color: '#9fadbc' }}
                        disabled={deletingTask}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDeleteTask}
                        variant="contained"
                        disabled={deletingTask}
                        sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
                    >
                        {deletingTask ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};
