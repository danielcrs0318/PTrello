import { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Add, Close, MoreHoriz, Edit, Delete } from '@mui/icons-material';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

import { TaskCard } from './TaskCard.jsx';

export const Column = memo(({ column, tasks, columnProgress, onCreateTask, onTaskClick, onUpdateColumn, onDeleteColumn }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
        data: {
            type: 'column',
            columnId: column.id,
        },
    });

    const [composerOpen, setComposerOpen] = useState(false);
    const [form, setForm] = useState({ title: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    
    // Estados para el menú y dialogs
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [newColumnName, setNewColumnName] = useState(column.name);
    const [editError, setEditError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.title.trim()) {
            setError('La tarea necesita un título.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await onCreateTask(column.id, {
                title: form.title,
                description: form.description || null,
            });
            setForm({ title: '', description: '' });
            setComposerOpen(false);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleMenuOpen = (event) => {
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleEditClick = () => {
        setNewColumnName(column.name);
        setEditError('');
        setEditDialogOpen(true);
        handleMenuClose();
    };

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
        handleMenuClose();
    };

    const handleEditSave = async () => {
        if (!newColumnName.trim()) {
            setEditError('El nombre no puede estar vacío');
            return;
        }

        try {
            await onUpdateColumn(column.id, newColumnName.trim());
            setEditDialogOpen(false);
            setEditError('');
        } catch (error) {
            setEditError(error.response?.data?.mensaje || 'Error al actualizar el nombre');
        }
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        try {
            await onDeleteColumn(column.id);
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error('Error al eliminar columna:', error);
            alert(error.response?.data?.mensaje || 'Error al eliminar la columna');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div
            ref={setNodeRef}
            className="flex-shrink-0 w-full sm:w-[272px] md:w-[280px] lg:w-[300px] flex flex-col h-full"
        >
            <div className="bg-[#101204] rounded-xl flex flex-col max-h-[calc(100vh-100px)] sm:max-h-[calc(100vh-120px)]">
                {/* Encabezado de columna */}
                <div className="px-3 py-2.5 flex items-center justify-between">
                    <h3 className="text-white font-semibold text-sm sm:text-base truncate">{column.name}</h3>
                    <IconButton 
                        size="small" 
                        onClick={handleMenuOpen}
                        sx={{ 
                            color: 'rgba(255,255,255,0.7)', 
                            '&:hover': { 
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.1)' 
                            } 
                        }}
                    >
                        <MoreHoriz fontSize="small" />
                    </IconButton>
                </div>

                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={handleMenuClose}
                    PaperProps={{
                        sx: {
                            bgcolor: '#282e33',
                            color: 'white',
                            minWidth: 180,
                        }
                    }}
                >
                    <MenuItem onClick={handleEditClick}>
                        <ListItemIcon>
                            <Edit fontSize="small" sx={{ color: '#9fadbc' }} />
                        </ListItemIcon>
                        <ListItemText>Editar nombre</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleDeleteClick} sx={{ '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                        <ListItemIcon>
                            <Delete fontSize="small" sx={{ color: '#ef4444' }} />
                        </ListItemIcon>
                        <ListItemText sx={{ color: '#ef4444' }}>Eliminar lista</ListItemText>
                    </MenuItem>
                </Menu>

                {/* Lista de tareas */}
                <SortableContext
                    id={column.id}
                    items={tasks.map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className={`flex-1 overflow-y-auto px-2 pb-2 space-y-2 ${isOver ? 'bg-white/5' : ''}`}>
                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                columnId={column.id}
                                onTaskClick={onTaskClick}
                            />
                        ))}
                        {tasks.length === 0 && !composerOpen && (
                            <div className="text-gray-500 text-xs text-center py-4">
                                Sin tarjetas
                            </div>
                        )}
                    </div>
                </SortableContext>

                {/* Composer / Botón agregar */}
                <div className="px-2 pb-2">
                    {composerOpen ? (
                        <form onSubmit={handleSubmit} className="space-y-2">
                            <textarea
                                name="title"
                                placeholder="Introducir un título para esta tarjeta…"
                                value={form.title}
                                onChange={handleChange}
                                disabled={submitting}
                                autoFocus
                                rows={3}
                                className="w-full bg-[#22272b] border-none rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#579dff] resize-none shadow-md"
                            />
                            <textarea
                                name="description"
                                placeholder="Descripción (opcional)"
                                value={form.description}
                                onChange={handleChange}
                                disabled={submitting}
                                rows={2}
                                className="w-full bg-[#1d2125] border border-[#3c434a] rounded-lg px-3 py-2 text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#579dff] resize-none"
                            />
                            {error && <span className="text-red-400 text-xs block px-1">{error}</span>}
                            <div className="flex items-center gap-2">
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="bg-[#579dff] hover:bg-[#85b8ff] text-white text-sm font-medium px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Agregando…' : 'Añadir tarjeta'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setComposerOpen(false);
                                        setForm({ title: '', description: '' });
                                        setError(null);
                                    }}
                                    className="text-gray-400 hover:text-white p-1 transition-colors"
                                >
                                    <Close fontSize="small" />
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button 
                            type="button" 
                            onClick={() => setComposerOpen(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-colors text-sm"
                        >
                            <Add fontSize="small" />
                            <span>Añadir una tarjeta</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Dialog para editar nombre */}
            <Dialog 
                open={editDialogOpen} 
                onClose={() => !submitting && setEditDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#282e33',
                        color: 'white',
                    }
                }}
            >
                <DialogTitle>Editar nombre de la lista</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        value={newColumnName}
                        onChange={(e) => {
                            setNewColumnName(e.target.value);
                            setEditError('');
                        }}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleEditSave();
                            }
                        }}
                        error={Boolean(editError)}
                        helperText={editError}
                        sx={{
                            mt: 2,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#22272b',
                                color: 'white',
                                '& fieldset': { borderColor: '#3a4149' },
                                '&:hover fieldset': { borderColor: '#579dff' },
                                '&.Mui-focused fieldset': { borderColor: '#579dff' },
                            },
                            '& .MuiFormHelperText-root': { color: '#ef4444' },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button 
                        onClick={() => setEditDialogOpen(false)}
                        sx={{ color: '#9fadbc' }}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleEditSave}
                        variant="contained"
                        sx={{ 
                            bgcolor: '#579dff',
                            '&:hover': { bgcolor: '#4c8adb' }
                        }}
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog para confirmar eliminación */}
            <Dialog 
                open={deleteDialogOpen} 
                onClose={() => !isDeleting && setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: '#282e33',
                        color: 'white',
                    }
                }}
            >
                <DialogTitle>¿Eliminar lista?</DialogTitle>
                <DialogContent>
                    <p className="text-gray-300">
                        ¿Estás seguro de que deseas eliminar la lista <strong>"{column.name}"</strong>?
                    </p>
                    {tasks.length > 0 && (
                        <p className="text-yellow-500 mt-3 text-sm">
                            ⚠️ Esta lista contiene {tasks.length} tarjeta{tasks.length !== 1 ? 's' : ''}. 
                            Todas las tarjetas y sus subtareas serán eliminadas permanentemente.
                        </p>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button 
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={isDeleting}
                        sx={{ color: '#9fadbc' }}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleDeleteConfirm}
                        disabled={isDeleting}
                        variant="contained"
                        sx={{ 
                            bgcolor: '#ef4444',
                            '&:hover': { bgcolor: '#dc2626' },
                            '&:disabled': { bgcolor: '#9fadbc' }
                        }}
                    >
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
});
