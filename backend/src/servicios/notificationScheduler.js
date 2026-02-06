/**
 * Servicio programador de notificaciones
 * Verifica periódicamente subtareas próximas a vencer y envía emails
 * @module servicios/notificationScheduler
 */

const cron = require('node-cron');
const { Subtask, Task, Column, Board, User, BoardMember } = require('../configuraciones/initModels');
const { sendDueDateNotification, sendDailySummary, sendPendingSummary } = require('./emailService');
const { Op } = require('sequelize');

const IN_PROGRESS_KEYWORDS = ['progreso', 'proceso', 'trabajando', 'progress', 'doing'];

const isInProgressColumn = (columnName = '') => {
    const normalized = columnName.toLowerCase();
    return IN_PROGRESS_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

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
                        { [Op.gte]: now },
                        { [Op.lte]: tomorrow },
                    ],
                },
                [Op.or]: [
                    { notificationSentAt: null },
                    { notificationSentAt: { [Op.lt]: new Date(now.getTime() - 23 * 60 * 60 * 1000) } },
                ],
            },
            include: [
                {
                    model: Task,
                    as: 'task',
                    attributes: ['id', 'title', 'description', 'dueDate', 'color'],
                    include: [
                        {
                            model: User,
                            as: 'assignees',
                            attributes: ['id', 'displayName', 'email'],
                            through: { attributes: [] },
                        },
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
                                            attributes: ['id', 'email', 'displayName'],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: User,
                    as: 'assignees',
                    attributes: ['id', 'displayName', 'email'],
                    through: { attributes: [] },
                },
            ],
        });

        // Buscar tareas principales en progreso con fecha de vencimiento próxima
        const upcomingTasks = await Task.findAll({
            where: {
                completed: false,
                dueDate: {
                    [Op.and]: [
                        { [Op.gte]: now },
                        { [Op.lte]: tomorrow },
                    ],
                },
                [Op.or]: [
                    { notificationSentAt: null },
                    { notificationSentAt: { [Op.lt]: new Date(now.getTime() - 23 * 60 * 60 * 1000) } },
                ],
            },
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
                                    attributes: ['id', 'email', 'displayName'],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: User,
                    as: 'assignees',
                    attributes: ['id', 'displayName', 'email'],
                    through: { attributes: [] },
                },
            ],
        });

        const upcomingTasksInProgress = upcomingTasks.filter((task) =>
            isInProgressColumn(task.column?.name)
        );

        console.log(`Encontradas ${upcomingSubtasks.length} subtareas próximas a vencer`);
        console.log(`Encontradas ${upcomingTasksInProgress.length} tareas en progreso próximas a vencer`);

        if (upcomingSubtasks.length === 0 && upcomingTasksInProgress.length === 0) {
            console.log('No hay tareas o subtareas próximas a vencer en este momento');
            console.log('========================================\n');
            return;
        }

        // Agrupar por destinatario (responsables y propietario) para enviar un solo correo por usuario
        const recipientsMap = new Map();

        const ensureRecipientEntry = (user) => {
            if (!user || !user.email) {
                return null;
            }

            const key = user.email.toLowerCase();
            if (!recipientsMap.has(key)) {
                recipientsMap.set(key, {
                    user,
                    boards: new Map(),
                    subtaskIds: [],
                    taskIds: [],
                });
            }

            return recipientsMap.get(key);
        };

        const ensureBoardEntry = (recipientEntry, board) => {
            if (!recipientEntry.boards.has(board.id)) {
                recipientEntry.boards.set(board.id, {
                    name: board.name,
                    tasks: new Map(),
                });
            }

            return recipientEntry.boards.get(board.id);
        };

        const ensureTaskEntry = (boardEntry, task, column) => {
            if (!boardEntry.tasks.has(task.id)) {
                const taskAssigneeNames = (Array.isArray(task.assignees) ? task.assignees : [])
                    .map((assignee) => assignee.displayName || assignee.email)
                    .filter(Boolean);

                boardEntry.tasks.set(task.id, {
                    id: task.id,
                    title: task.title,
                    description: task.description || null,
                    dueDate: task.dueDate || null,
                    color: task.color || null,
                    assignees: taskAssigneeNames,
                    subtasks: [],
                    column: column?.name || null,
                    _subtaskIds: new Set(),
                });
            }

            return boardEntry.tasks.get(task.id);
        };

        upcomingSubtasks.forEach((subtask) => {
            const board = subtask.task.column.board;
            const task = subtask.task;
            const column = subtask.task.column;
            const owner = board.owner;

            const subtaskAssignees = Array.isArray(subtask.assignees) && subtask.assignees.length > 0
                ? subtask.assignees
                : (subtask.assignee ? [subtask.assignee] : []);
            const subtaskAssigneeNames = subtaskAssignees
                .map((assignee) => assignee.displayName || assignee.email)
                .filter(Boolean);

            const recipients = [owner, ...subtaskAssignees].filter(Boolean);
            recipients.forEach((recipient) => {
                const recipientEntry = ensureRecipientEntry(recipient);
                if (!recipientEntry) {
                    return;
                }

                const boardEntry = ensureBoardEntry(recipientEntry, board);
                const taskEntry = ensureTaskEntry(boardEntry, task, column);

                if (!taskEntry._subtaskIds.has(subtask.id)) {
                    taskEntry.subtasks.push({
                        title: subtask.title,
                        description: subtask.description || null,
                        dueDate: subtask.dueDate || null,
                        color: subtask.color || null,
                        assignees: subtaskAssigneeNames,
                    });
                    taskEntry._subtaskIds.add(subtask.id);
                }

                recipientEntry.subtaskIds.push(subtask.id);
            });
        });

        upcomingTasksInProgress.forEach((task) => {
            const board = task.column.board;
            const column = task.column;
            const owner = board.owner;
            const taskAssignees = Array.isArray(task.assignees) ? task.assignees : [];
            const recipients = [owner, ...taskAssignees].filter(Boolean);

            recipients.forEach((recipient) => {
                const recipientEntry = ensureRecipientEntry(recipient);
                if (!recipientEntry) {
                    return;
                }

                const boardEntry = ensureBoardEntry(recipientEntry, board);
                const taskEntry = ensureTaskEntry(boardEntry, task, column);

                taskEntry.dueDate = taskEntry.dueDate || task.dueDate || null;
                taskEntry.description = taskEntry.description || task.description || null;
                taskEntry.color = taskEntry.color || task.color || null;
                taskEntry.column = taskEntry.column || column.name;

                recipientEntry.taskIds.push(task.id);
            });
        });

        let sentCount = 0;
        let errorCount = 0;

        for (const entry of recipientsMap.values()) {
            try {
                const boardsSummary = Array.from(entry.boards.values()).map((boardEntry) => ({
                    name: boardEntry.name,
                    tasks: Array.from(boardEntry.tasks.values()).map(({ _subtaskIds, ...taskEntry }) => taskEntry),
                }));

                console.log(`Enviando resumen de vencimientos a: ${entry.user.email}`);
                console.log(`   Tableros incluidos: ${boardsSummary.length}`);

                const result = await sendPendingSummary({
                    to: entry.user.email,
                    userName: entry.user.displayName || 'Usuario',
                    boardsSummary,
                });

                if (result.success) {
                    await Subtask.update(
                        { notificationSentAt: new Date() },
                        { where: { id: { [Op.in]: entry.subtaskIds } } }
                    );
                    if (entry.taskIds.length > 0) {
                        await Task.update(
                            { notificationSentAt: new Date() },
                            { where: { id: { [Op.in]: entry.taskIds } } }
                        );
                    }
                    sentCount++;
                    console.log(`   ✅ Resumen enviado exitosamente (ID: ${result.messageId})`);
                } else {
                    errorCount++;
                    console.log(`   ❌ Error: ${result.error}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`   Error enviando resumen para ${entry.user.email}:`, error.message);
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
                attributes: ['id', 'name'],
                required: true,
            }],
            distinct: true,
            subQuery: false,
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
                            },
                            {
                                model: User,
                                as: 'assignees',
                                attributes: ['id', 'displayName', 'email'],
                                through: { attributes: [] }
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
                    const tasksSummary = [];
                    const columnsSummary = [];

                    columns.forEach(column => {
                        const columnNameLower = column.name.toLowerCase();
                        const columnTasks = [];

                        column.tasks.forEach(task => {
                            const taskAssignees = Array.isArray(task.assignees) && task.assignees.length > 0
                                ? task.assignees
                                : [];
                            const taskAssigneeNames = taskAssignees.map((assignee) => assignee.displayName || assignee.email).filter(Boolean);

                            const subtasksSummary = (task.subtasks || []).map((subtask) => {
                                const assignees = Array.isArray(subtask.assignees) && subtask.assignees.length > 0
                                    ? subtask.assignees
                                    : (subtask.assignee ? [subtask.assignee] : []);
                                const assigneeNames = assignees.map((assignee) => assignee.displayName || assignee.email).filter(Boolean);

                                return {
                                    title: subtask.title,
                                    description: subtask.description || null,
                                    dueDate: subtask.dueDate || null,
                                    color: subtask.color || null,
                                    completed: subtask.completed,
                                    assignees: assigneeNames,
                                };
                            });

                            tasksSummary.push({
                                title: task.title,
                                description: task.description || null,
                                dueDate: task.dueDate || null,
                                color: task.color || null,
                                assignees: taskAssigneeNames,
                                subtasks: subtasksSummary,
                                column: column.name,
                            });

                            columnTasks.push({
                                title: task.title,
                                description: task.description || null,
                                dueDate: task.dueDate || null,
                                color: task.color || null,
                                assignees: taskAssigneeNames,
                                subtasks: subtasksSummary,
                            });

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

                        columnsSummary.push({
                            name: column.name,
                            tasks: columnTasks,
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
                            })),
                            tasksSummary,
                            columnsSummary,
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
 * Genera y envía el resumen de tareas y subtareas pendientes
 * @returns {Promise<void>}
 */
async function sendPendingReports() {
    try {
        console.log('\n========================================');
        console.log('Generando resumen de pendientes...');
        console.log(`   Fecha: ${new Date().toLocaleString('es-ES')}`);

        const users = await User.findAll({
            include: [{
                model: Board,
                as: 'ownedBoards',
                attributes: ['id', 'name'],
                required: true,
            }],
            distinct: true,
            subQuery: false,
        });

        let sentCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                if (!user.email) {
                    console.log(`  Usuario sin email (ID: ${user.id})`);
                    errorCount++;
                    continue;
                }

                const boardsSummary = [];

                for (const board of user.ownedBoards) {
                    const columns = await Column.findAll({
                        where: { boardId: board.id },
                        include: [{
                            model: Task,
                            as: 'tasks',
                            include: [
                                {
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
                                },
                                {
                                    model: User,
                                    as: 'assignees',
                                    attributes: ['id', 'displayName', 'email'],
                                    through: { attributes: [] }
                                }
                            ]
                        }],
                        order: [['position', 'ASC']]
                    });

                    const pendingTasks = [];

                    columns.forEach((column) => {
                        (column.tasks || []).forEach((task) => {
                            const pendingSubtasks = (task.subtasks || []).filter((subtask) => !subtask.completed)
                                .map((subtask) => {
                                    const assignees = Array.isArray(subtask.assignees) && subtask.assignees.length > 0
                                        ? subtask.assignees
                                        : (subtask.assignee ? [subtask.assignee] : []);
                                    const assigneeNames = assignees
                                        .map((assignee) => assignee.displayName || assignee.email)
                                        .filter(Boolean);

                                    return {
                                        title: subtask.title,
                                        description: subtask.description || null,
                                        dueDate: subtask.dueDate || null,
                                        color: subtask.color || null,
                                        assignees: assigneeNames,
                                    };
                                });

                            const isTaskPending = task.completed === false;
                            const hasPendingSubtasks = pendingSubtasks.length > 0;

                            if (!isTaskPending && !hasPendingSubtasks) {
                                return;
                            }

                            const taskAssignees = Array.isArray(task.assignees) && task.assignees.length > 0
                                ? task.assignees
                                : [];
                            const taskAssigneeNames = taskAssignees
                                .map((assignee) => assignee.displayName || assignee.email)
                                .filter(Boolean);

                            pendingTasks.push({
                                title: task.title,
                                description: task.description || null,
                                dueDate: task.dueDate || null,
                                color: task.color || null,
                                assignees: taskAssigneeNames,
                                subtasks: pendingSubtasks,
                                column: column.name,
                            });
                        });
                    });

                    if (pendingTasks.length > 0) {
                        boardsSummary.push({
                            name: board.name,
                            tasks: pendingTasks,
                        });
                    }
                }

                if (boardsSummary.length > 0) {
                    console.log(`Enviando pendientes a: ${user.email}`);
                    const result = await sendPendingSummary({
                        to: user.email,
                        userName: user.displayName || 'Usuario',
                        boardsSummary,
                    });

                    if (result.success) {
                        sentCount++;
                        console.log(`   Resumen enviado exitosamente (ID: ${result.messageId})`);
                    } else {
                        errorCount++;
                        console.log(`   Error: ${result.error}`);
                    }
                } else {
                    console.log(`  ${user.email}: Sin pendientes para reportar`);
                }
            } catch (error) {
                errorCount++;
                console.error(`   Error generando pendientes para usuario ${user.id}:`, error.message);
            }
        }

        console.log('\nResumen:');
        console.log(`   Enviados: ${sentCount}`);
        console.log(`   Errores: ${errorCount}`);
        console.log(`   Total procesados: ${users.length}`);
        console.log('========================================\n');
    } catch (error) {
        console.error('Error generando resumen de pendientes:', error);
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
    sendDailyReports,
    sendPendingReports
};
