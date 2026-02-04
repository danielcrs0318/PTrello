import { useTheme } from '../providers/ThemeProvider';

const computeBoardProgress = (board) => {
    const columns = Array.isArray(board.columns) ? board.columns : [];
    const totalTasks = columns.reduce((acc, column) => acc + (column.tasks?.length || 0), 0);
    const maxPosition = columns.reduce((max, column) => Math.max(max, column.position || 0), 0);
    const doneTasks = columns
        .filter((column) => (column.position || 0) === maxPosition)
        .reduce((acc, column) => acc + (column.tasks?.length || 0), 0);

    const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return {
        totalTasks,
        doneTasks,
        percent,
    };
};

const boardBackgrounds = [
    'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
    'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
    'linear-gradient(135deg, #065f46 0%, #059669 100%)',
    'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
    'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
];

export const BoardList = ({ boards, onOpenBoard }) => {
    const { colors } = useTheme();
    
    return (
        <div>
            {boards.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                    <p className="text-sm sm:text-base" style={{ color: colors.text.secondary }}>
                        No tienes tableros. Crea uno para empezar.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {boards.map((board, index) => {
                        const bgStyle = board.backgroundColor || boardBackgrounds[index % boardBackgrounds.length];
                        return (
                            <button
                                key={board.id}
                                type="button"
                                className="group relative h-20 sm:h-24 md:h-28 rounded-lg overflow-hidden hover:brightness-110 transition-all"
                                style={{ 
                                    background: bgStyle
                                }}
                                onClick={() => onOpenBoard(board.id)}
                            >
                                <div className="absolute inset-0 bg-black/20" />
                                <div className="relative h-full p-2 sm:p-3 flex items-start">
                                    <h3 className="text-xs sm:text-sm md:text-base font-bold text-white text-left line-clamp-2">
                                        {board.name}
                                    </h3>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
