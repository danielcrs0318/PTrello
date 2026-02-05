import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCorners,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Add, Close } from '@mui/icons-material';

import { apiClient } from '../services/api.js';
import { Column } from './Column.jsx';
import { TaskCard } from './TaskCard.jsx';
import { TaskModal } from './TaskModal.jsx';
import { useToast } from '../hooks/useToast.jsx';

const normaliseTask = (task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    completed: task.completed ?? false,
    columnId: task.columnId,
    assignees: task.assignees || [],
    subtasks: task.subtasks || [],
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
});

const mapTasks = (columns = []) => columns.reduce((acc, column) => {
    acc[column.id] = (column.tasks || []).map(normaliseTask);
    return acc;
}, {});

const normaliseColumns = (columns = []) => columns.map((column) => ({
    id: column.id,
    name: column.name,
    position: column.position,
}));

const computeMetrics = (columns, tasksByColumn) => {
    const total = columns.reduce((acc, column) => acc + (tasksByColumn[column.id]?.length || 0), 0);
    const maxPosition = columns.reduce((max, column) => Math.max(max, column.position || 0), 0) || 1;
    const done = columns
        .filter((column) => (column.position || 0) === maxPosition)
        .reduce((acc, column) => acc + (tasksByColumn[column.id]?.length || 0), 0);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const columnProgress = columns.reduce((acc, column) => {
        if (maxPosition <= 1) {
            acc[column.id] = 0;
        } else {
            const scaled = ((column.position - 1) / (maxPosition - 1)) * 100;
            acc[column.id] = Math.round(Math.min(Math.max(scaled, 0), 100));
        }
        return acc;
    }, {});

    return {
        total,
        done,
        percent,
        columnProgress,
    };
};

export const BoardView = ({ boardId, onBoardReady, filters, isOwner, initialTaskId, initialSubtaskId, onInitialTaskHandled }) => {
    const navigate = useNavigate();
    const [boardInfo, setBoardInfo] = useState(null);
    const [canEdit, setCanEdit] = useState(true);
    const [columns, setColumns] = useState([]);
    const [tasksByColumn, setTasksByColumn] = useState({});
    const [filteredTasksByColumn, setFilteredTasksByColumn] = useState({});
    const [metrics, setMetrics] = useState({ total: 0, done: 0, percent: 0, columnProgress: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTask, setActiveTask] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreatingColumn, setIsCreatingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const dragOriginRef = useRef(null);
    const initialTaskOpenedRef = useRef(false);
    const { showToast, ToastComponent } = useToast();

    useEffect(() => {
        initialTaskOpenedRef.current = false;
    }, [initialTaskId, boardId]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const notifyBoardReady = useCallback((info, currentMetrics) => {
        if (info) {
            onBoardReady?.({ board: info, metrics: currentMetrics });
        }
    }, [onBoardReady]);

    useEffect(() => {
        let cancelled = false;

        const fetchBoard = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiClient.get(`/boards/${boardId}`);
                if (cancelled) {
                    return;
                }

                const info = {
                    id: response.data.id,
                    name: response.data.name,
                    description: response.data.description,
                    backgroundColor: response.data.backgroundColor,
                    ownerId: response.data.ownerId,
                    canEdit: response.data.canEdit ?? false,
                    memberRole: response.data.memberRole ?? null,
                };
                const normalisedColumns = normaliseColumns(response.data.columns);
                const initialTasks = mapTasks(response.data.columns);
                const computedMetrics = computeMetrics(normalisedColumns, initialTasks);

                setBoardInfo(info);
                setColumns(normalisedColumns);
                setTasksByColumn(initialTasks);
                setMetrics(computedMetrics);
                setCanEdit(info.canEdit ?? false);
                notifyBoardReady(info, computedMetrics);
            } catch (requestError) {
                if (!cancelled) {
                    console.error('No fue posible obtener el tablero seleccionado:', requestError);

                    // Si es un error 403, el usuario no tiene acceso al tablero
                    if (requestError.response?.status === 403) {
                        setError('No tienes acceso a este tablero.');
                        // Redirigir al dashboard después de 2 segundos
                        setTimeout(() => {
                            navigate('/', { replace: true });
                        }, 2000);
                    } else if (requestError.response?.status === 404) {
                        setError('El tablero no existe.');
                        setTimeout(() => {
                            navigate('/', { replace: true });
                        }, 2000);
                    } else {
                        setError('No fue posible cargar el tablero.');
                    }
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchBoard();

        return () => {
            cancelled = true;
        };
    }, [boardId]);

    useEffect(() => {
        if (!initialTaskId || initialTaskOpenedRef.current || loading) return;

        const foundTask = Object.values(tasksByColumn)
            .flat()
            .find((task) => task.id === initialTaskId);

        if (foundTask) {
            setSelectedTask(foundTask);
            setIsModalOpen(true);
            initialTaskOpenedRef.current = true;
            onInitialTaskHandled?.();
        }
    }, [initialTaskId, tasksByColumn, loading, onInitialTaskHandled]);

    // Aplicar filtros
    useEffect(() => {
        if (!filters) {
            setFilteredTasksByColumn(tasksByColumn);
            return;
        }

        const filtered = {};
        Object.keys(tasksByColumn).forEach(columnId => {
            const tasks = tasksByColumn[columnId] || [];
            filtered[columnId] = tasks.filter(task => {
                // Filtro de estado completo/incompleto (basado en subtareas)
                const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                const isCompleted = hasSubtasks
                    ? task.subtasks.every(st => st.completed)
                    : false;

                if (isCompleted && !filters.showCompleted) return false;
                if (!isCompleted && !filters.showIncomplete) return false;

                // Filtro de características
                if (filters.hasSubtasks && !hasSubtasks) return false;

                // Verificar si alguna subtarea tiene fecha de vencimiento
                const hasDueDate = task.subtasks?.some(st => st.dueDate);
                if (filters.hasDueDate && !hasDueDate) return false;

                // Filtro de vencidas
                if (filters.overdue) {
                    const now = new Date();
                    const hasOverdueSubtask = task.subtasks?.some(st =>
                        st.dueDate && new Date(st.dueDate) < now && !st.completed
                    );
                    if (!hasOverdueSubtask) return false;
                }

                return true;
            });
        });

        setFilteredTasksByColumn(filtered);
    }, [filters, tasksByColumn]);

    const updateTasksState = useCallback((updater) => {
        setTasksByColumn((currentMap) => {
            const nextMap = updater(currentMap);
            const computedMetrics = computeMetrics(columns, nextMap);
            setMetrics(computedMetrics);
            return nextMap;
        });
    }, [columns]);

    const findColumnIdByTaskId = useCallback((map, taskId) => (
        Object.keys(map).find((columnId) => (map[columnId] || []).some((task) => task.id === taskId))
    ), []);

    const handleCreateTask = async (columnId, payload) => {
        if (!canEdit) {
            throw new Error('No tienes permisos para crear tareas en este tablero.');
        }
        try {
            const response = await apiClient.post(`/boards/${boardId}/tasks`, {
                ...payload,
                columnId,
            });

            const task = normaliseTask(response.data);

            updateTasksState((currentMap) => ({
                ...currentMap,
                [columnId]: [...(currentMap[columnId] || []), task],
            }));

            return task;
        } catch (requestError) {
            const message = requestError.response?.data?.mensaje || 'No fue posible crear la tarea.';
            throw new Error(message);
        }
    };

    const handleDragStart = (event) => {
        if (!canEdit) {
            showToast('No tienes permisos para mover tareas en este tablero.', 'warning');
            return;
        }
        const { active } = event;
        if (active.data.current?.type === 'task') {
            const columnProgress = metrics.columnProgress?.[active.data.current.columnId] ?? 0;
            setActiveTask({ ...active.data.current.task, progress: columnProgress });
            dragOriginRef.current = active.data.current.columnId || null;
        }
    };

    const handleTaskClick = (task) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };


    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedTask(null);
    };

    const handleTaskUpdate = async (payload) => {
        if (payload?.type === 'subtask-updated' && payload.taskId && payload.subtask) {
            updateTasksState((currentMap) => {
                const columnId = findColumnIdByTaskId(currentMap, payload.taskId);
                if (!columnId) {
                    return currentMap;
                }

                const nextTasks = (currentMap[columnId] || []).map((task) => {
                    const nextSubtasks = (task.subtasks || []).map((st) =>
                        st.id === payload.subtask.id ? payload.subtask : st
                    );
                    return { ...task, subtasks: nextSubtasks };
                });

                return {
                    ...currentMap,
                    [columnId]: nextTasks,
                };
            });

            setSelectedTask((current) => {
                if (!current || current.id !== payload.taskId) return current;
                const nextSubtasks = (current.subtasks || []).map((st) =>
                    st.id === payload.subtask.id ? payload.subtask : st
                );
                return { ...current, subtasks: nextSubtasks };
            });

            return;
        }

        try {
            const response = await apiClient.get(`/boards/${boardId}`);
            const normalisedColumns = normaliseColumns(response.data.columns);
            const updatedTasks = mapTasks(response.data.columns);
            const computedMetrics = computeMetrics(normalisedColumns, updatedTasks);

            setColumns(normalisedColumns);
            setTasksByColumn(updatedTasks);
            setMetrics(computedMetrics);

            if (selectedTask) {
                const updatedTask = response.data.columns
                    .flatMap(col => col.tasks)
                    .find(t => t.id === selectedTask.id);
                if (updatedTask) {
                    setSelectedTask(normaliseTask(updatedTask));
                }
            }
        } catch (error) {
            console.error('Error al actualizar el tablero:', error);
        }
    };

    const handleCreateColumn = async () => {
        if (!newColumnName.trim()) return;

        if (!canEdit) {
            showToast('No tienes permisos para crear columnas en este tablero.', 'warning');
            return;
        }

        try {
            const response = await apiClient.post(`/boards/${boardId}/columns`, {
                name: newColumnName,
            });

            const newColumn = {
                id: response.data.id,
                name: response.data.name,
                position: response.data.position,
            };

            setColumns([...columns, newColumn]);
            setTasksByColumn({ ...tasksByColumn, [newColumn.id]: [] });
            setNewColumnName('');
            setIsCreatingColumn(false);
        } catch (error) {
            console.error('Error al crear columna:', error);
        }
    };

    const handleUpdateColumn = async (columnId, newName) => {
        if (!canEdit) {
            showToast('No tienes permisos para editar columnas en este tablero.', 'warning');
            throw new Error('Sin permisos');
        }
        try {
            await apiClient.put(`/boards/columns/${columnId}`, {
                name: newName,
            });

            // Actualizar el estado local
            setColumns(columns.map(col =>
                col.id === columnId ? { ...col, name: newName } : col
            ));
        } catch (error) {
            console.error('Error al actualizar columna:', error);
            throw error;
        }
    };

    const handleDeleteColumn = async (columnId) => {
        if (!canEdit) {
            showToast('No tienes permisos para eliminar columnas en este tablero.', 'warning');
            throw new Error('Sin permisos');
        }
        try {
            await apiClient.delete(`/boards/columns/${columnId}`);

            // Actualizar el estado local
            setColumns(columns.filter(col => col.id !== columnId));

            // Eliminar las tareas de esa columna del estado
            const newTasksByColumn = { ...tasksByColumn };
            delete newTasksByColumn[columnId];
            setTasksByColumn(newTasksByColumn);

            // Recalcular métricas
            const computedMetrics = computeMetrics(
                columns.filter(col => col.id !== columnId),
                newTasksByColumn
            );
            setMetrics(computedMetrics);
        } catch (error) {
            console.error('Error al eliminar columna:', error);
            throw error;
        }
    };

    const handleDragOver = (event) => {
        const { active, over } = event;

        if (!over || active.data.current?.type !== 'task') {
            return;
        }

        const overData = over.data.current;
        const targetColumnId = overData?.columnId;

        if (!targetColumnId) {
            return;
        }

        updateTasksState((current) => {
            const originColumnId = findColumnIdByTaskId(current, active.id);
            if (!originColumnId || originColumnId === targetColumnId) {
                return current;
            }

            const source = current[originColumnId] || [];
            const destination = current[targetColumnId] || [];

            const movingIndex = source.findIndex((task) => task.id === active.id);
            if (movingIndex === -1) {
                return current;
            }

            const updatedSource = [...source];
            const [movingTask] = updatedSource.splice(movingIndex, 1);
            const updatedDestination = [...destination];

            const insertIndex = overData?.type === 'task'
                ? updatedDestination.findIndex((task) => task.id === over.id)
                : updatedDestination.length;

            const nextTask = { ...movingTask, columnId: targetColumnId };

            if (insertIndex === -1) {
                updatedDestination.push(nextTask);
            } else {
                updatedDestination.splice(insertIndex, 0, nextTask);
            }

            return {
                ...current,
                [originColumnId]: updatedSource,
                [targetColumnId]: updatedDestination,
            };
        });
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) {
            dragOriginRef.current = null;
            return;
        }

        const activeData = active.data.current;
        const overData = over.data.current;

        if (activeData?.type !== 'task') {
            return;
        }

        const originColumnId = dragOriginRef.current || activeData.columnId || findColumnIdByTaskId(tasksByColumn, active.id);
        const targetColumnId = overData?.columnId;

        if (!originColumnId || !targetColumnId) {
            dragOriginRef.current = null;
            return;
        }

        const previousState = Object.fromEntries(Object.entries(tasksByColumn).map(([key, list]) => [key, [...list]]));

        updateTasksState((current) => {
            const source = current[originColumnId] || [];
            const destination = current[targetColumnId] || [];

            if (originColumnId === targetColumnId) {
                const oldIndex = source.findIndex((task) => task.id === active.id);
                const newIndex = overData?.type === 'task'
                    ? source.findIndex((task) => task.id === over.id)
                    : source.length - 1;

                if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
                    return current;
                }

                return {
                    ...current,
                    [originColumnId]: arrayMove(source, oldIndex, newIndex),
                };
            }

            const movingIndex = source.findIndex((task) => task.id === active.id);
            if (movingIndex === -1) {
                return current;
            }

            const updatedSource = [...source];
            const [movingTask] = updatedSource.splice(movingIndex, 1);
            const updatedDestination = [...destination];

            const insertIndex = overData?.type === 'task'
                ? updatedDestination.findIndex((task) => task.id === over.id)
                : updatedDestination.length;

            const nextTask = { ...movingTask, columnId: targetColumnId };

            if (insertIndex === -1) {
                updatedDestination.push(nextTask);
            } else {
                updatedDestination.splice(insertIndex, 0, nextTask);
            }

            return {
                ...current,
                [originColumnId]: updatedSource,
                [targetColumnId]: updatedDestination,
            };
        });

        if (originColumnId !== targetColumnId) {
            try {
                await apiClient.put(`/tasks/${active.id}`, { columnId: targetColumnId });
            } catch (requestError) {
                console.error('No fue posible actualizar la tarea arrastrada:', requestError);
                if (requestError.response?.status === 403) {
                    showToast('No tienes permisos para mover tareas en este tablero.', 'error');
                }
                setTasksByColumn(previousState);
                setMetrics(computeMetrics(columns, previousState));
            }
        }

        dragOriginRef.current = null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-white text-lg">Cargando tablero…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md text-center">
                    <div className="text-red-400 text-lg mb-2">{error}</div>
                    {(error.includes('acceso') || error.includes('existe')) && (
                        <div className="text-gray-400 text-sm">
                            Redirigiendo al dashboard...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!boardInfo) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-white text-lg">No se encontró el tablero solicitado.</div>
            </div>
        );
    }

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-2 sm:gap-3 h-full pb-4 overflow-x-auto">
                    {columns.map((column) => (
                        <Column
                            key={column.id}
                            column={column}
                            tasks={filteredTasksByColumn[column.id] || []}
                            columnProgress={metrics.columnProgress?.[column.id] ?? 0}
                            onCreateTask={handleCreateTask}
                            onTaskClick={handleTaskClick}
                            onUpdateColumn={handleUpdateColumn}
                            onDeleteColumn={handleDeleteColumn}
                            canEdit={canEdit}
                        />
                    ))}

                    {/* Botón para agregar otra lista */}
                    <div className="flex-shrink-0 w-full sm:w-[272px] md:w-[280px] lg:w-[300px]">
                        {isCreatingColumn ? (
                            <div className="bg-[#22272b] rounded-xl p-3">
                                <input
                                    type="text"
                                    placeholder="Introduce el título de la lista"
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCreateColumn();
                                        } else if (e.key === 'Escape') {
                                            setIsCreatingColumn(false);
                                            setNewColumnName('');
                                        }
                                    }}
                                    onBlur={() => {
                                        if (!newColumnName.trim()) {
                                            setIsCreatingColumn(false);
                                        }
                                    }}
                                    autoFocus
                                    className="w-full px-3 py-2 bg-[#282e33] text-white rounded border border-[#579dff] focus:outline-none focus:border-[#579dff] mb-2"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreateColumn}
                                        className="px-4 py-1.5 bg-[#579dff] hover:bg-[#4c8adb] text-white rounded text-sm font-medium transition-colors"
                                    >
                                        Añadir lista
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCreatingColumn(false);
                                            setNewColumnName('');
                                        }}
                                        className="px-3 py-1.5 hover:bg-white/10 text-white rounded text-sm transition-colors"
                                    >
                                        <Close fontSize="small" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreatingColumn(true)}
                                className="w-full h-auto min-h-[44px] flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-normal transition-colors"
                            >
                                <Add fontSize="small" />
                                <span>Añade otra lista</span>
                            </button>
                        )}
                    </div>
                </div>

                <DragOverlay>
                    {activeTask ? (
                        <TaskCard task={activeTask} columnId={activeTask.columnId} />
                    ) : null}
                </DragOverlay>
            </DndContext>

            <TaskModal
                open={isModalOpen}
                onClose={handleModalClose}
                task={selectedTask}
                onTaskUpdate={handleTaskUpdate}
                boardId={boardId}
                isOwner={isOwner}
                canEdit={canEdit}
                initialSubtaskId={initialSubtaskId}
            />

            <ToastComponent />
        </>
    );
};
