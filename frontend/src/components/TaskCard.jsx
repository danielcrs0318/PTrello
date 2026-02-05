import { memo, useMemo } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CheckBox, DragIndicator } from '@mui/icons-material';

export const TaskCard = memo(({ task, columnId, onTaskClick, canEdit = true }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        disabled: !canEdit,
        data: {
            type: 'task',
            columnId,
            task,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0.5 : 1,
        willChange: 'transform',
        touchAction: 'none',
    };

    const { hasSubtasks, completedCount, totalCount } = useMemo(() => {
        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
        const doneCount = subtasks.filter((st) => st.completed).length;
        return {
            hasSubtasks: subtasks.length > 0,
            completedCount: doneCount,
            totalCount: subtasks.length,
        };
    }, [task.subtasks]);

    const handleClick = () => {
        onTaskClick?.(task);
    };

    return (
        <article
            ref={setNodeRef}
            className="bg-[#22272b] hover:bg-[#2c333a] rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all border border-[#22272b] hover:border-[#444]"
            style={style}
        >
            <div
                className="p-2.5"
                onClick={handleClick}
            >
                <div className="flex items-start gap-2">
                    <button
                        type="button"
                        data-drag-handle
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        disabled={!canEdit}
                        className={`mt - 0.5 ${canEdit ? 'text-gray-400 hover:text-gray-200 cursor-grab active:cursor-grabbing' : 'text-gray-600 cursor-not-allowed opacity-50'} `}
                        aria-label={canEdit ? "Mover tarea" : "No puedes mover esta tarea"}
                        title={canEdit ? "Mover tarea" : "Solo lectura"}
                    >
                        <DragIndicator sx={{ fontSize: 18 }} />
                    </button>
                    <div
                        className="text-sm leading-snug mb-1 flex-1"
                        style={{
                            color: task.completed ? '#9fadbc' : 'white',
                            textDecoration: task.completed ? 'line-through' : 'none',
                        }}
                    >
                        {task.title}
                    </div>
                </div>

                {/* Mostrar checklist si existe */}
                {hasSubtasks && (
                    <div className="flex items-center gap-1.5 mt-2">
                        <CheckBox sx={{ fontSize: 14, color: completedCount === totalCount ? '#4ade80' : '#9ca3af' }} />
                        <span className={`text - xs ${completedCount === totalCount ? 'text-green-400' : 'text-gray-400'} `}>
                            {completedCount}/{totalCount}
                        </span>
                    </div>
                )}

                {Array.isArray(task.assignees) && task.assignees.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold">
                            {task.assignees[0].displayName?.charAt(0) || 'U'}
                        </div>
                        {task.assignees.length > 1 && (
                            <span className="text-[10px] text-gray-400">
                                +{task.assignees.length - 1}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
});
