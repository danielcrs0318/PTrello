import { useState } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    IconButton,
    FormControlLabel,
    Checkbox,
    Button,
    Box,
    Typography,
    Divider,
    Chip
} from '@mui/material';
import { Close, FilterList, ClearAll } from '@mui/icons-material';

export const FilterModal = ({ open, onClose, onApplyFilters }) => {
    const [filters, setFilters] = useState({
        showCompleted: true,
        showIncomplete: true,
        hasSubtasks: false,
        hasDueDate: false,
        overdue: false,
    });

    const handleFilterChange = (filterName) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: !prev[filterName]
        }));
    };

    const handleApply = () => {
        onApplyFilters(filters);
        onClose();
    };

    const handleClearAll = () => {
        const clearedFilters = {
            showCompleted: true,
            showIncomplete: true,
            hasSubtasks: false,
            hasDueDate: false,
            overdue: false,
        };
        setFilters(clearedFilters);
        onApplyFilters(clearedFilters);
    };

    const activeFiltersCount = Object.entries(filters).filter(
        ([key, value]) => {
            if (key === 'showCompleted' || key === 'showIncomplete') return false;
            return value === true;
        }
    ).length;

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#282e33',
                    color: 'white',
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterList fontSize="small" />
                    <Typography variant="h6" component="div">
                        Filtros
                    </Typography>
                    {activeFiltersCount > 0 && (
                        <Chip 
                            label={activeFiltersCount} 
                            size="small"
                            sx={{ 
                                bgcolor: '#579dff', 
                                color: 'white',
                                height: 20,
                                fontSize: '0.7rem'
                            }}
                        />
                    )}
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <Close />
                </IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ pt: 2 }}>
                {/* Estado de tareas */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ color: '#9fadbc', mb: 1.5 }}>
                        Estado de tareas
                    </Typography>
                    <Box sx={{ bgcolor: '#22272b', borderRadius: 1, p: 1.5 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filters.showCompleted}
                                    onChange={() => handleFilterChange('showCompleted')}
                                    sx={{
                                        color: '#9fadbc',
                                        '&.Mui-checked': { color: '#4ade80' }
                                    }}
                                />
                            }
                            label="Mostrar completadas"
                            sx={{ 
                                color: 'white',
                                '& .MuiFormControlLabel-label': { fontSize: '0.95rem' }
                            }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filters.showIncomplete}
                                    onChange={() => handleFilterChange('showIncomplete')}
                                    sx={{
                                        color: '#9fadbc',
                                        '&.Mui-checked': { color: '#579dff' }
                                    }}
                                />
                            }
                            label="Mostrar incompletas"
                            sx={{ 
                                color: 'white',
                                '& .MuiFormControlLabel-label': { fontSize: '0.95rem' }
                            }}
                        />
                    </Box>
                </Box>

                <Divider sx={{ borderColor: '#3a4149', my: 2 }} />

                {/* Características */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ color: '#9fadbc', mb: 1.5 }}>
                        Características
                    </Typography>
                    <Box sx={{ bgcolor: '#22272b', borderRadius: 1, p: 1.5 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filters.hasSubtasks}
                                    onChange={() => handleFilterChange('hasSubtasks')}
                                    sx={{
                                        color: '#9fadbc',
                                        '&.Mui-checked': { color: '#579dff' }
                                    }}
                                />
                            }
                            label="Con subtareas"
                            sx={{ 
                                color: 'white',
                                '& .MuiFormControlLabel-label': { fontSize: '0.95rem' }
                            }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filters.hasDueDate}
                                    onChange={() => handleFilterChange('hasDueDate')}
                                    sx={{
                                        color: '#9fadbc',
                                        '&.Mui-checked': { color: '#579dff' }
                                    }}
                                />
                            }
                            label="Con fecha de vencimiento"
                            sx={{ 
                                color: 'white',
                                '& .MuiFormControlLabel-label': { fontSize: '0.95rem' }
                            }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filters.overdue}
                                    onChange={() => handleFilterChange('overdue')}
                                    sx={{
                                        color: '#9fadbc',
                                        '&.Mui-checked': { color: '#ef4444' }
                                    }}
                                />
                            }
                            label="Vencidas"
                            sx={{ 
                                color: 'white',
                                '& .MuiFormControlLabel-label': { fontSize: '0.95rem' }
                            }}
                        />
                    </Box>
                </Box>

                <Divider sx={{ borderColor: '#3a4149', my: 2 }} />

                {/* Botones de acción */}
                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleClearAll}
                        startIcon={<ClearAll />}
                        sx={{
                            borderColor: '#3a4149',
                            color: '#9fadbc',
                            '&:hover': {
                                borderColor: '#579dff',
                                color: 'white',
                                bgcolor: 'transparent'
                            }
                        }}
                    >
                        Limpiar
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleApply}
                        sx={{
                            bgcolor: '#579dff',
                            '&:hover': { bgcolor: '#85b8ff' }
                        }}
                    >
                        Aplicar
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};
