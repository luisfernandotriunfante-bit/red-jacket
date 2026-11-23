import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { ThemeContext, type Theme } from './theme-context';

function initialTheme(): Theme {
  const saved = localStorage.getItem('red-jacket-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('red-jacket-theme', theme);
  }, [theme]);
  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () =>
        setTheme((value) => (value === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
