import { useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

/**
 * Hook para mostrar notificaciones toast
 * @returns {Object} - { showToast, ToastComponent }
 */
export const useToast = () => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('info');

    const showToast = useCallback((msg, type = 'info') => {
        setMessage(msg);
        setSeverity(type);
        setOpen(true);
    }, []);

    const handleClose = useCallback((event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    }, []);

    const ToastComponent = () => (
        <Snackbar
            open={open}
            autoHideDuration={4000}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
                {message}
            </Alert>
        </Snackbar>
    );

    return { showToast, ToastComponent };
};
