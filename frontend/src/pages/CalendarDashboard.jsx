import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowBack, EventAvailable, Refresh } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

import { apiClient } from '../services/api.js';
import { useTheme } from '../providers/ThemeProvider.jsx';

export const CalendarDashboard = () => {
    const navigate = useNavigate();
    const { colors } = useTheme();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/calendar/pending');
            setEvents(response.data?.events || []);
        } catch (err) {
            console.error('Error al cargar eventos del calendario:', err);
            setError('No fue posible cargar los eventos del calendario.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const stats = useMemo(() => {
        const tasks = events.filter((event) => event.extendedProps?.type === 'task').length;
        const subtasks = events.filter((event) => event.extendedProps?.type === 'subtask').length;
        return { tasks, subtasks, total: events.length };
    }, [events]);

    const calendarStyleVars = {
        '--calendar-bg': colors.bg.primary,
        '--calendar-border': colors.border.primary,
        '--calendar-secondary-bg': colors.bg.secondary,
        '--calendar-text': colors.text.primary,
        '--calendar-text-secondary': colors.text.secondary,
        '--calendar-today-bg': colors.bg.tertiary,
        '--calendar-button-bg': colors.button.secondary,
        '--calendar-button-hover': colors.button.secondaryHover,
        '--calendar-button-text': colors.text.primary,
        '--calendar-button-border': colors.border.secondary,
    };

    const renderEventContent = (eventInfo) => {
        const { event } = eventInfo;
        const { boardName, columnName, type } = event.extendedProps || {};
        return (
            <div className="fc-event-custom">
                <div className="fc-event-title">{event.title}</div>
                <div className="fc-event-meta">{boardName} • {columnName}</div>
                <div className="fc-event-badge">{type === 'subtask' ? 'Subtarea' : 'Tarea'}</div>
            </div>
        );
    };

    const handleEventClick = (info) => {
        const { boardId, taskId, subtaskId, type } = info.event.extendedProps || {};
        if (!boardId) return;

        const search = new URLSearchParams();
        if (taskId) {
            search.set('taskId', taskId);
        }
        if (type === 'subtask' && subtaskId) {
            search.set('subtaskId', subtaskId);
        }

        const query = search.toString();
        navigate(query ? `/boards/${boardId}?${query}` : `/boards/${boardId}`);
    };

    const handleEventMouseEnter = (info) => {
        info.el.classList.add('fc-event-hover');
    };

    const handleEventMouseLeave = (info) => {
        info.el.classList.remove('fc-event-hover');
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.bg.primary }}>
            <header className="border-b" style={{ borderColor: colors.border.primary }}>
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <IconButton
                            onClick={() => navigate('/')}
                            size="small"
                            sx={{ color: colors.text.primary, border: `1px solid ${colors.border.primary}` }}
                        >
                            <ArrowBack fontSize="small" />
                        </IconButton>
                        <div>
                            <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-2" style={{ color: colors.text.primary }}>
                                <EventAvailable fontSize="small" /> Calendario de vencimientos
                            </h1>
                            <p className="text-sm" style={{ color: colors.text.secondary }}>
                                Visualiza tareas y subtareas pendientes en tus tableros.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-xs sm:text-sm" style={{ color: colors.text.secondary }}>
                            {stats.total} eventos · {stats.tasks} tareas · {stats.subtasks} subtareas
                        </div>
                        <IconButton
                            onClick={loadEvents}
                            size="small"
                            sx={{ color: colors.text.primary, border: `1px solid ${colors.border.primary}` }}
                            title="Actualizar"
                        >
                            <Refresh fontSize="small" />
                        </IconButton>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-4 md:px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full min-h-[320px]" style={{ color: colors.text.primary }}>
                        Cargando calendario…
                    </div>
                ) : error ? (
                    <div className="rounded-lg border p-4 text-sm" style={{ borderColor: colors.border.primary, color: colors.text.primary, backgroundColor: colors.bg.secondary }}>
                        {error}
                    </div>
                ) : (
                    <div className="calendar-root rounded-lg border p-2 sm:p-4" style={{ ...calendarStyleVars, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary }}>
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                            }}
                            events={events}
                            eventContent={renderEventContent}
                            eventClick={handleEventClick}
                            eventMouseEnter={handleEventMouseEnter}
                            eventMouseLeave={handleEventMouseLeave}
                            height="auto"
                            dayMaxEventRows={3}
                            nowIndicator
                            expandRows
                            locale="es"
                        />
                    </div>
                )}
            </main>
        </div>
    );
};
