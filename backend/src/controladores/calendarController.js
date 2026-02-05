/**
 * Controlador del calendario
 * Devuelve eventos pendientes de tareas y subtareas con fecha de vencimiento
 * @module controladores/calendarController
 */

const { Op } = require('sequelize');

const {
    Board,
    BoardMember,
    Column,
    Task,
    Subtask,
} = require('../configuraciones/initModels');

const buildCalendarEvents = (boards) => {
    const events = [];

    boards.forEach((board) => {
        const boardData = board.get({ plain: true });
        const boardColor = boardData.backgroundColor || '#3b82f6';

        (boardData.columns || []).forEach((column) => {
            const columnName = column.name;

            (column.tasks || []).forEach((task) => {
                if (task.dueDate && !task.completed) {
                    events.push({
                        id: `task-${task.id}`,
                        title: task.title,
                        start: new Date(task.dueDate).toISOString(),
                        allDay: false,
                        backgroundColor: task.color || boardColor,
                        borderColor: task.color || boardColor,
                        extendedProps: {
                            type: 'task',
                            boardId: boardData.id,
                            boardName: boardData.name,
                            columnId: column.id,
                            columnName,
                            taskId: task.id,
                        },
                    });
                }

                (task.subtasks || []).forEach((subtask) => {
                    if (subtask.dueDate && !subtask.completed) {
                        events.push({
                            id: `subtask-${subtask.id}`,
                            title: subtask.title,
                            start: new Date(subtask.dueDate).toISOString(),
                            allDay: false,
                            backgroundColor: subtask.color || task.color || boardColor,
                            borderColor: subtask.color || task.color || boardColor,
                            extendedProps: {
                                type: 'subtask',
                                boardId: boardData.id,
                                boardName: boardData.name,
                                columnId: column.id,
                                columnName,
                                taskId: task.id,
                                taskTitle: task.title,
                                subtaskId: subtask.id,
                            },
                        });
                    }
                });
            });
        });
    });

    events.sort((a, b) => new Date(a.start) - new Date(b.start));
    return events;
};

const getPendingCalendarEvents = async (req, res) => {
    try {
        const userId = req.user.id;

        const memberRows = await BoardMember.findAll({
            where: { userId },
            attributes: ['boardId'],
        });

        const sharedBoardIds = memberRows.map((member) => member.boardId);
        const whereClause = sharedBoardIds.length
            ? { [Op.or]: [{ ownerId: userId }, { id: { [Op.in]: sharedBoardIds } }] }
            : { ownerId: userId };

        const boards = await Board.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'backgroundColor'],
            include: [
                {
                    model: Column,
                    as: 'columns',
                    attributes: ['id', 'name', 'position'],
                    required: false,
                    include: [
                        {
                            model: Task,
                            as: 'tasks',
                            attributes: ['id', 'title', 'dueDate', 'completed', 'color'],
                            required: false,
                            include: [
                                {
                                    model: Subtask,
                                    as: 'subtasks',
                                    attributes: ['id', 'title', 'dueDate', 'completed', 'color'],
                                    required: false,
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        const events = buildCalendarEvents(boards);
        return res.json({ events });
    } catch (error) {
        console.error('Error al cargar eventos del calendario:', error);
        return res.status(500).json({
            mensaje: 'No se pudieron obtener los eventos del calendario.',
            error: error.message,
        });
    }
};

module.exports = {
    getPendingCalendarEvents,
};
