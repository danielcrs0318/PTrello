/**
 * Servicio programador de notificaciones
 * Verifica periódicamente subtareas próximas a vencer y envía emails
 * @module servicios/notificationScheduler
 */

const cron = require('node-cron');
const { Subtask, Task, Column, Board, User, BoardMember } = require('../configuraciones/initModels');
const { sendDueDateNotification, sendDailySummary } = require('./emailService');
const { Op } = require('sequelize');

/**
 * Verifica las subtareas que están próximas a vencer y envía notificaciones
 * Busca subtareas no completadas con vencimiento en las próximas 24 horas
 * @returns {Promise<void>}
 */
async function checkDueDates() {
    try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 horas para tener margen

        console.log('\n========================================');
        console.log('Verificando subtareas próximas a vencer...');
        console.log(`   Hora actual: ${now.toLocaleString('es-ES')} (${now.toISOString()})`);
        console.log(`   Rango hasta: ${tomorrow.toLocaleString('es-ES')} (${tomorrow.toISOString()})`);

        // Primero, buscar TODAS las subtareas no completadas con dueDate para depuración
        const allSubtasks = await Subtask.findAll({
            where: {
                completed: false,
                dueDate: { [Op.not]: null }
            },
            attributes: ['id', 'title', 'dueDate', 'notificationSentAt', 'completed']
        });

        console.log(`\nTotal de subtareas no completadas con fecha: ${allSubtasks.length}`);
        allSubtasks.forEach(st => {
            const dueDate = new Date(st.dueDate);
            const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
            console.log(`   - "${st.title}": vence ${dueDate.toLocaleString('es-ES')} (en ${hoursUntilDue.toFixed(1)} horas) - Notificada: ${st.notificationSentAt ? 'Sí' : 'No'}`);
        });

        // Buscar subtareas no completadas con fecha de vencimiento en las próximas 25 horas
        const upcomingSubtasks = await Subtask.findAll({
            where: {
                completed: false,
                dueDate: {
                    [Op.and]: [
                        { [Op.gte]: now },      // Mayor o igual a ahora
                        { [Op.lte]: tomorrow }  // Menor o igual a mañana
                    ]
                },
                // Solo subtareas que aún no han sido notificadas
                // o que fueron notificadas hace más de 23 horas
                [Op.or]: [
                    { notificationSentAt: null },
                    { notificationSentAt: { [Op.lt]: new Date(now.getTime() - 23 * 60 * 60 * 1000) } }
                ]
            },
            include: [
                {
                    model: Task,
                    as: 'task',
                    attributes: ['id', 'title'],
                    include: [
                        {
                            model: Column,
                            as: 'column',
                            attributes: ['id', 'name'],
                            include: [
                                {
                                    model: Board,
                                    as: 'board',
                                    attributes: ['id', 'name', 'ownerId'],
                                    include: [
                                        {
                                            model: User,
                                            as: 'owner',
                                            attributes: ['id', 'email', 'displayName']
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        console.log(`Encontradas ${upcomingSubtasks.length} subtareas próximas a vencer`);

        if (upcomingSubtasks.length === 0) {
            console.log('No hay subtareas próximas a vencer en este momento');
            console.log('========================================\n');
            return;
        }

        // Enviar notificación para cada subtarea
        let sentCount = 0;
        let errorCount = 0;

        for (const subtask of upcomingSubtasks) {
            try {
                const owner = subtask.task.column.board.owner;

                if (!owner || !owner.email) {
                    console.log(`  Subtarea "${subtask.title}": No se encontró email del propietario`);
                    errorCount++;
                    continue;
                }

                console.log(`Enviando notificación:`);
                console.log(`   Subtarea: "${subtask.title}"`);
                console.log(`   Tarea: "${subtask.task.title}"`);
                console.log(`   Tablero: "${subtask.task.column.board.name}"`);
                console.log(`   Destinatario: ${owner.email}`);
                console.log(`   Vencimiento: ${new Date(subtask.dueDate).toLocaleString('es-ES')}`);

                const result = await sendDueDateNotification({
                    to: owner.email,
                    boardName: subtask.task.column.board.name,
                    taskTitle: subtask.task.title,
                    subtaskTitle: subtask.title,
                    dueDate: subtask.dueDate
                });

                if (result.success) {
                    // Marcar como notificada
                    subtask.notificationSentAt = new Date();
                    await subtask.save();
                    sentCount++;
                    console.log(`   ✅ Notificación enviada exitosamente (ID: ${result.messageId})`);
                } else {
                    errorCount++;
                    console.log(`   ❌ Error: ${result.error}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`   Error enviando notificación para subtarea ${subtask.id}:`, error.message);
            }
        }

        console.log('\nResumen:');
        console.log(`   Enviadas: ${sentCount}`);
        console.log(`   Errores: ${errorCount}`);
        console.log(`   Total procesadas: ${upcomingSubtasks.length}`);
        console.log('========================================\n');
    } catch (error) {
        console.error('Error verificando fechas de vencimiento:', error);
    }
}

/**
 * Genera y envía el resumen diario de actividad a todos los usuarios
 * Se ejecuta a las 8:00 PM todos los días
 * @returns {Promise<void>}
 */
async function sendDailyReports() {
    try {
        console.log('\n========================================');
        console.log('Generando resúmenes diarios de actividad...');
        console.log(`   Fecha: ${new Date().toLocaleString('es-ES')}`);

        // Obtener todos los usuarios que son dueños de tableros
        const users = await User.findAll({
            include: [{
                model: Board,
                as: 'ownedBoards',
                attributes: ['id', 'name']
            }],
            where: {
                '$ownedBoards.id$': { [Op.not]: null }
            }
        });

        console.log(`Usuarios con tableros encontrados: ${users.length}`);

        let sentCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                if (!user.email) {
                    console.log(`  Usuario sin email (ID: ${user.id})`);
                    errorCount++;
                    continue;
                }

                // Obtener resumen de todos los tableros del usuario
                const boardsSummary = [];

                for (const board of user.ownedBoards) {
                    // Obtener todas las columnas del tablero con sus tareas
                    const columns = await Column.findAll({
                        where: { boardId: board.id },
                        include: [{
                            model: Task,
                            as: 'tasks',
                            include: [{
                                model: Subtask,
                                as: 'subtasks',
                                include: [
                                    {
                                        model: User,
                                        as: 'assignees',
                                        attributes: ['id', 'displayName', 'email'],
                                        through: { attributes: [] }
                                    },
                                    {
                                        model: User,
                                        as: 'assignee',
                                        attributes: ['id', 'displayName', 'email']
                                    }
                                ]
                            }]
                        }],
                        order: [['position', 'ASC']]
                    });

                    // Clasificar tareas según su estado
                    let completed = 0;
                    let inProgress = 0;
                    let pending = 0;
                    let completedSubtasks = 0;
                    const completedSubtasksBy = new Map();

                    columns.forEach(column => {
                        const columnNameLower = column.name.toLowerCase();
                        
                        column.tasks.forEach(task => {
                            // Determinar el estado basado en el nombre de la columna
                            if (columnNameLower.includes('finalizado') || 
                                columnNameLower.includes('completado') || 
                                columnNameLower.includes('hecho') ||
                                columnNameLower.includes('done')) {
                                completed++;
                            } else if (columnNameLower.includes('progreso') || 
                                       columnNameLower.includes('proceso') ||
                                       columnNameLower.includes('trabajando') ||
                                       columnNameLower.includes('progress') ||
                                       columnNameLower.includes('doing')) {
                                inProgress++;
                            } else {
                                pending++;
                            }

                            task.subtasks.forEach(subtask => {
                                if (!subtask.completed) return;
                                completedSubtasks++;

                                const assignees = Array.isArray(subtask.assignees) && subtask.assignees.length > 0
                                    ? subtask.assignees
                                    : (subtask.assignee ? [subtask.assignee] : []);

                                if (assignees.length === 0) {
                                    const current = completedSubtasksBy.get('Sin responsable') || 0;
                                    completedSubtasksBy.set('Sin responsable', current + 1);
                                    return;
                                }

                                assignees.forEach(assignee => {
                                    const name = assignee.displayName || assignee.email || 'Sin responsable';
                                    const current = completedSubtasksBy.get(name) || 0;
                                    completedSubtasksBy.set(name, current + 1);
                                });
                            });
                        });
                    });

                    // Solo incluir tableros con actividad
                    if (completed > 0 || inProgress > 0 || pending > 0) {
                        boardsSummary.push({
                            name: board.name,
                            completed,
                            inProgress,
                            pending,
                            completedSubtasks,
                            completedSubtasksBy: Array.from(completedSubtasksBy.entries()).map(([name, count]) => ({
                                name,
                                count
                            }))
                        });
                    }
                }

                // Solo enviar si hay actividad
                if (boardsSummary.length > 0) {
                    console.log(`Enviando resumen a: ${user.email}`);
                    console.log(`   Tableros con actividad: ${boardsSummary.length}`);

                    const result = await sendDailySummary({
                        to: user.email,
                        userName: user.displayName || 'Usuario',
                        boardsSummary
                    });

                    if (result.success) {
                        sentCount++;
                        console.log(`   Resumen enviado exitosamente (ID: ${result.messageId})`);
                    } else {
                        errorCount++;
                        console.log(`   Error: ${result.error}`);
                    }
                } else {
                    console.log(`  ${user.email}: Sin actividad para reportar`);
                }
            } catch (error) {
                errorCount++;
                console.error(`   Error generando resumen para usuario ${user.id}:`, error.message);
            }
        }

        console.log('\nResumen:');
        console.log(`   Enviados: ${sentCount}`);
        console.log(`   Errores: ${errorCount}`);
        console.log(`   Total procesados: ${users.length}`);
        console.log('========================================\n');
    } catch (error) {
        console.error('Error generando resúmenes diarios:', error);
    }
}

/**
 * Inicia el programador de notificaciones
 * Configura un cron job que se ejecuta cada 5 minutos
 * @returns {void}
 */
function startNotificationScheduler() {
    // Ejecutar cada 5 minutos - verificación de fechas de vencimiento
    cron.schedule('*/5 * * * *', () => {
        console.log('Ejecutando verificación programada de fechas de vencimiento');
        checkDueDates();
    });

    // Ejecutar todos los días a las 8:00 PM - resumen diario
    cron.schedule('0 20 * * *', () => {
        console.log('Ejecutando envío de resúmenes diarios (8:00 PM)');
        sendDailyReports();
    });

    console.log('Programador de notificaciones iniciado:');
    console.log('  - Verificación de vencimientos: cada 5 minutos');
    console.log('  - Resumen diario: todos los días a las 8:00 PM');

    // Ejecutar inmediatamente una vez al iniciar para verificar
    console.log('Ejecutando verificación inicial...');
    setTimeout(() => checkDueDates(), 3000); // Esperar 3 segundos después de que el servidor inicie
}

module.exports = {
    startNotificationScheduler,
    checkDueDates,
    sendDailyReports
};
