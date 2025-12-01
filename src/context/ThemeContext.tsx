import { createContext, useContext, ReactNode } from 'react';

export interface Theme {
  colors: {
    purple: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    bg: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    border: {
      default: string;
      hover: string;
    };
    status: {
      success: string;
      error: string;
      warning: string;
      info: string;
    };
  };
}

const darkTheme: Theme = {
  colors: {
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },
    bg: {
      primary: '#0f0f0f',
      secondary: '#1a1a1a',
      tertiary: '#252525',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
      tertiary: '#808080',
    },
    border: {
      default: '#333333',
      hover: '#404040',
    },
    status: {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
  },
};

const ThemeContext = createContext<Theme>(darkTheme);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return <ThemeContext.Provider value={darkTheme}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

