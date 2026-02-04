import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        // Cargar preferencia guardada o usar preferencia del sistema
        const saved = localStorage.getItem('theme');
        if (saved) {
            return saved === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        // Guardar preferencia
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // Actualizar clase en el html
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);

    const theme = {
        isDark,
        toggleTheme,
        colors: {
            // Fondos
            bg: {
                primary: isDark ? '#1a1d21' : '#ffffff',
                secondary: isDark ? '#22272b' : '#f7f8f9',
                tertiary: isDark ? '#282e33' : '#ebecf0',
                hover: isDark ? '#2c3238' : '#dfe1e6',
                modal: isDark ? '#282e33' : '#ffffff',
            },
            // Textos
            text: {
                primary: isDark ? '#b6c2cf' : '#172b4d',
                secondary: isDark ? '#9fadbc' : '#5e6c84',
                tertiary: isDark ? '#8c9bab' : '#6b778c',
                inverse: isDark ? '#172b4d' : '#ffffff',
            },
            // Bordes
            border: {
                primary: isDark ? '#3c434a' : '#dfe1e6',
                secondary: isDark ? '#2c3238' : '#c1c7d0',
            },
            // Botones
            button: {
                primary: '#579dff',
                hover: '#85b8ff',
                secondary: isDark ? '#2c3238' : '#091e420f',
                secondaryHover: isDark ? '#3a4149' : '#091e4224',
                danger: '#c9372c',
                dangerHover: '#ae2e24',
            },
            // Input
            input: {
                bg: isDark ? '#22272b' : '#ffffff',
                border: isDark ? '#3c434a' : '#dfe1e6',
                focus: '#579dff',
            },
            // Cards
            card: {
                bg: isDark ? '#22272b' : '#ffffff',
                hover: isDark ? '#2c3238' : '#f4f5f7',
            },
        }
    };

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
