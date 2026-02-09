/**
 * Rutas de prueba para el sistema de logging de errores
 * NOTA: Estas rutas son solo para desarrollo/testing
 * Eliminar antes de ir a producción
 */

const express = require('express');
const router = express.Router();

// Endpoint para generar un error intencionalmente
router.get('/test-error', (_req, _res, next) => {
    // Crear un error de prueba
    const testError = new Error('Este es un error de prueba generado intencionalmente');
    testError.statusCode = 500;
    next(testError);
});

// Endpoint para generar un error de tipo Error de JS estándar
router.get('/test-error-throw', (_req, _res) => {
    throw new Error('Error lanzado intencionalmente para probar catch global');
});

// Endpoint para generar una promesa rechazada (unhandled rejection)
router.get('/test-unhandled-rejection', (_req, res) => {
    // Enviar respuesta inmediatamente
    res.json({ mensaje: 'Generando unhandled rejection...' });
    
    // Crear una promesa rechazada que no se maneja
    setTimeout(() => {
        Promise.reject(new Error('Promesa rechazada intencionalmente para prueba'));
    }, 100);
});

// Endpoint para probar error de validación
router.post('/test-validation-error', (req, res, next) => {
    if (!req.body.campo_requerido) {
        const error = new Error('Campo requerido no proporcionado');
        error.statusCode = 400;
        return next(error);
    }
    res.json({ mensaje: 'OK' });
});

// Endpoint para ver estadísticas de errores
router.get('/test-error-stats', async (_req, res, next) => {
    try {
        const { ErrorLog } = require('../configuraciones/initModels');
        const { fn, col } = require('sequelize');
        
        // Contar errores
        const totalErrors = await ErrorLog.count();
        
        // Últimos 10 errores (usar raw para obtener nombres de columna directos)
        const recentErrors = await ErrorLog.findAll({
            limit: 10,
            order: [['created_at', 'DESC']],
            attributes: ['id', 'message', 'http_method', 'url', 'status_code', 'created_at'],
            raw: true,
        });
        
        // Errores por método HTTP
        const errorsByMethod = await ErrorLog.findAll({
            attributes: [
                'http_method',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['http_method'],
            raw: true,
        });
        
        // Errores por código de estado
        const errorsByStatus = await ErrorLog.findAll({
            attributes: [
                'status_code',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['status_code'],
            raw: true,
        });
        
        res.json({
            total: totalErrors,
            porMetodoHTTP: errorsByMethod,
            porCodigoEstado: errorsByStatus,
            ultimosErrores: recentErrors,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
