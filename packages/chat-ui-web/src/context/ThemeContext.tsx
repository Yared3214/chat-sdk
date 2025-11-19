import React, { createContext, useContext, useState } from 'react';
import { defaultTheme } from '../themes/default';
import { darkTheme } from '../themes/dark';

export type Theme = typeof defaultTheme;

const ThemeCtx = createContext({ theme: defaultTheme, setTheme: (t: Theme) => {} });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
};

export const useTheme = () => useContext(ThemeCtx);

export const themes = { default: defaultTheme, dark: darkTheme };
