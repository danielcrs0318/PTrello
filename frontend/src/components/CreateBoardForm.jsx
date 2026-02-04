import { useState } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { apiClient } from '../services/api.js';

const DEFAULT_FORM = {
    name: '',
    description: '',
};

export const CreateBoardForm = ({ onBoardCreated }) => {
    const { colors } = useTheme();
    const [form, setForm] = useState(DEFAULT_FORM);
    const [requesting, setRequesting] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setRequesting(true);
        setError(null);

        try {
            const response = await apiClient.post('/boards', form);
            onBoardCreated?.(response.data);
            setForm(DEFAULT_FORM);
        } catch (requestError) {
            const fallback = requestError.response?.data?.mensaje || 'No fue posible crear el tablero.';
            setError(fallback);
        } finally {
            setRequesting(false);
        }
    };

    return (
        <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
            <div>
                <label 
                    htmlFor="board-name" 
                    className="block text-xs font-medium mb-1"
                    style={{ color: colors.text.secondary }}
                >
                    Título del tablero
                </label>
                <input
                    id="board-name"
                    name="name"
                    placeholder="Introduce el título del tablero"
                    value={form.name}
                    onChange={handleChange}
                    required
                    minLength={3}
                    className="w-full rounded px-3 py-2 text-sm focus:outline-none transition-colors"
                    style={{
                        backgroundColor: colors.input.bg,
                        border: `1px solid ${colors.input.border}`,
                        color: colors.text.primary,
                    }}
                    onFocus={(e) => e.target.style.borderColor = colors.input.focus}
                    onBlur={(e) => e.target.style.borderColor = colors.input.border}
                />
            </div>
            {error && <span className="text-red-400 text-xs block">{error}</span>}
            <button 
                type="submit" 
                className="w-full font-medium px-4 py-2 sm:py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm" 
                disabled={requesting}
                style={{
                    backgroundColor: colors.button.primary,
                    color: 'white',
                }}
                onMouseEnter={(e) => !requesting && (e.target.style.backgroundColor = colors.button.hover)}
                onMouseLeave={(e) => !requesting && (e.target.style.backgroundColor = colors.button.primary)}
            >
                {requesting ? 'Creando…' : 'Crear'}
            </button>
        </form>
    );
};
