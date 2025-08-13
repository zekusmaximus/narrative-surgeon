import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { MMKV } from 'react-native-mmkv';

export type ThemeType = 'light' | 'dark' | 'sepia' | 'high-contrast' | 'auto';

export interface Theme {
  type: ThemeType;
  colors: {
    // Background colors
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    surface: string;
    surfaceSecondary: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;
    
    // Primary colors
    primary: string;
    primaryDark: string;
    primaryLight: string;
    
    // Accent colors
    accent: string;
    accentDark: string;
    accentLight: string;
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Border and separator colors
    border: string;
    borderLight: string;
    separator: string;
    
    // Interactive states
    hover: string;
    active: string;
    selected: string;
    disabled: string;
    
    // Specific component colors
    cardBackground: string;
    menuBackground: string;
    tooltipBackground: string;
    
    // Editor specific
    editorBackground: string;
    editorText: string;
    editorCursor: string;
    editorSelection: string;
    editorLineNumbers: string;
    
    // Syntax highlighting
    syntaxKeyword: string;
    syntaxString: string;
    syntaxComment: string;
    syntaxFunction: string;
    syntaxVariable: string;
    
    // Analysis colors
    tensionHigh: string;
    tensionMedium: string;
    tensionLow: string;
    addedText: string;
    removedText: string;
    unchangedText: string;
  };
  
  fonts: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
    mono: string;
  };
  
  fontSizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  
  shadows: {
    sm: object;
    md: object;
    lg: object;
  };
}

const baseTheme = {
  fonts: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System', 
    mono: 'Courier New',
  },
  fontSizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

const lightTheme: Theme = {
  type: 'light',
  colors: {
    // Background colors
    background: '#ffffff',
    backgroundSecondary: '#f8f9fa',
    backgroundTertiary: '#e9ecef',
    surface: '#ffffff',
    surfaceSecondary: '#f8f9fa',
    
    // Text colors
    text: '#212529',
    textSecondary: '#495057',
    textTertiary: '#6c757d',
    textInverse: '#ffffff',
    
    // Primary colors
    primary: '#007bff',
    primaryDark: '#0056b3',
    primaryLight: '#66b3ff',
    
    // Accent colors
    accent: '#28a745',
    accentDark: '#1e7e34',
    accentLight: '#71dd8a',
    
    // Status colors
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
    
    // Border and separator colors
    border: '#dee2e6',
    borderLight: '#e9ecef',
    separator: '#e9ecef',
    
    // Interactive states
    hover: '#f8f9fa',
    active: '#e9ecef',
    selected: '#e3f2fd',
    disabled: '#6c757d',
    
    // Specific component colors
    cardBackground: '#ffffff',
    menuBackground: '#ffffff',
    tooltipBackground: '#343a40',
    
    // Editor specific
    editorBackground: '#ffffff',
    editorText: '#212529',
    editorCursor: '#007bff',
    editorSelection: '#b3d9ff',
    editorLineNumbers: '#6c757d',
    
    // Syntax highlighting
    syntaxKeyword: '#d73a49',
    syntaxString: '#032f62',
    syntaxComment: '#6a737d',
    syntaxFunction: '#6f42c1',
    syntaxVariable: '#e36209',
    
    // Analysis colors
    tensionHigh: '#dc3545',
    tensionMedium: '#ffc107',
    tensionLow: '#28a745',
    addedText: '#28a745',
    removedText: '#dc3545',
    unchangedText: '#495057',
  },
  ...baseTheme,
};

const darkTheme: Theme = {
  type: 'dark',
  colors: {
    // Background colors
    background: '#1a1a1a',
    backgroundSecondary: '#2d2d2d',
    backgroundTertiary: '#404040',
    surface: '#2d2d2d',
    surfaceSecondary: '#404040',
    
    // Text colors
    text: '#e9ecef',
    textSecondary: '#ced4da',
    textTertiary: '#adb5bd',
    textInverse: '#212529',
    
    // Primary colors
    primary: '#4da6ff',
    primaryDark: '#0066cc',
    primaryLight: '#80bfff',
    
    // Accent colors
    accent: '#51cf66',
    accentDark: '#37b24d',
    accentLight: '#8ce99a',
    
    // Status colors
    success: '#51cf66',
    warning: '#ffd43b',
    error: '#ff6b6b',
    info: '#4dabf7',
    
    // Border and separator colors
    border: '#495057',
    borderLight: '#404040',
    separator: '#495057',
    
    // Interactive states
    hover: '#404040',
    active: '#495057',
    selected: '#1c4966',
    disabled: '#6c757d',
    
    // Specific component colors
    cardBackground: '#2d2d2d',
    menuBackground: '#2d2d2d',
    tooltipBackground: '#495057',
    
    // Editor specific
    editorBackground: '#1a1a1a',
    editorText: '#e9ecef',
    editorCursor: '#4da6ff',
    editorSelection: '#264f78',
    editorLineNumbers: '#858585',
    
    // Syntax highlighting
    syntaxKeyword: '#ff7b72',
    syntaxString: '#a5d6ff',
    syntaxComment: '#8b949e',
    syntaxFunction: '#d2a8ff',
    syntaxVariable: '#ffa657',
    
    // Analysis colors
    tensionHigh: '#ff6b6b',
    tensionMedium: '#ffd43b',
    tensionLow: '#51cf66',
    addedText: '#51cf66',
    removedText: '#ff6b6b',
    unchangedText: '#ced4da',
  },
  ...baseTheme,
};

const sepiaTheme: Theme = {
  type: 'sepia',
  colors: {
    // Background colors
    background: '#f4f1e8',
    backgroundSecondary: '#ede6d6',
    backgroundTertiary: '#e6dcc4',
    surface: '#f4f1e8',
    surfaceSecondary: '#ede6d6',
    
    // Text colors
    text: '#3c2415',
    textSecondary: '#5d4037',
    textTertiary: '#8d6e63',
    textInverse: '#f4f1e8',
    
    // Primary colors
    primary: '#8b4513',
    primaryDark: '#5d2f02',
    primaryLight: '#d4a574',
    
    // Accent colors
    accent: '#6b4423',
    accentDark: '#3e2723',
    accentLight: '#a1887f',
    
    // Status colors
    success: '#558b2f',
    warning: '#f9a825',
    error: '#c62828',
    info: '#0277bd',
    
    // Border and separator colors
    border: '#d7cc9a',
    borderLight: '#e6dcc4',
    separator: '#d7cc9a',
    
    // Interactive states
    hover: '#ede6d6',
    active: '#e6dcc4',
    selected: '#d4c5a0',
    disabled: '#8d6e63',
    
    // Specific component colors
    cardBackground: '#f4f1e8',
    menuBackground: '#f4f1e8',
    tooltipBackground: '#5d4037',
    
    // Editor specific
    editorBackground: '#f4f1e8',
    editorText: '#3c2415',
    editorCursor: '#8b4513',
    editorSelection: '#d4c5a0',
    editorLineNumbers: '#8d6e63',
    
    // Syntax highlighting
    syntaxKeyword: '#b71c1c',
    syntaxString: '#1b5e20',
    syntaxComment: '#8d6e63',
    syntaxFunction: '#4a148c',
    syntaxVariable: '#e65100',
    
    // Analysis colors
    tensionHigh: '#c62828',
    tensionMedium: '#f9a825',
    tensionLow: '#558b2f',
    addedText: '#558b2f',
    removedText: '#c62828',
    unchangedText: '#5d4037',
  },
  ...baseTheme,
};

const highContrastTheme: Theme = {
  type: 'high-contrast',
  colors: {
    // Background colors
    background: '#000000',
    backgroundSecondary: '#1a1a1a',
    backgroundTertiary: '#333333',
    surface: '#000000',
    surfaceSecondary: '#1a1a1a',
    
    // Text colors
    text: '#ffffff',
    textSecondary: '#ffffff',
    textTertiary: '#cccccc',
    textInverse: '#000000',
    
    // Primary colors
    primary: '#00ff00',
    primaryDark: '#00cc00',
    primaryLight: '#66ff66',
    
    // Accent colors
    accent: '#ffff00',
    accentDark: '#cccc00',
    accentLight: '#ffff66',
    
    // Status colors
    success: '#00ff00',
    warning: '#ffff00',
    error: '#ff0000',
    info: '#00ffff',
    
    // Border and separator colors
    border: '#ffffff',
    borderLight: '#cccccc',
    separator: '#ffffff',
    
    // Interactive states
    hover: '#333333',
    active: '#666666',
    selected: '#004400',
    disabled: '#666666',
    
    // Specific component colors
    cardBackground: '#000000',
    menuBackground: '#000000',
    tooltipBackground: '#333333',
    
    // Editor specific
    editorBackground: '#000000',
    editorText: '#ffffff',
    editorCursor: '#00ff00',
    editorSelection: '#004400',
    editorLineNumbers: '#cccccc',
    
    // Syntax highlighting
    syntaxKeyword: '#ff00ff',
    syntaxString: '#00ffff',
    syntaxComment: '#808080',
    syntaxFunction: '#ffff00',
    syntaxVariable: '#ff8000',
    
    // Analysis colors
    tensionHigh: '#ff0000',
    tensionMedium: '#ffff00',
    tensionLow: '#00ff00',
    addedText: '#00ff00',
    removedText: '#ff0000',
    unchangedText: '#ffffff',
  },
  ...baseTheme,
};

const themes: Record<ThemeType, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  sepia: sepiaTheme,
  'high-contrast': highContrastTheme,
  auto: lightTheme, // Will be determined dynamically
};

interface ThemeContextType {
  theme: Theme;
  themeType: ThemeType;
  setTheme: (themeType: ThemeType) => void;
  availableThemes: ThemeType[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const storage = new MMKV({
  id: 'narrative-surgeon-theme',
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeType, setThemeType] = useState<ThemeType>('auto');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    // Load saved theme
    const savedTheme = storage.getString('theme') as ThemeType;
    if (savedTheme && themes[savedTheme]) {
      setThemeType(savedTheme);
    }

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const setTheme = (newThemeType: ThemeType) => {
    setThemeType(newThemeType);
    storage.set('theme', newThemeType);
  };

  const getCurrentTheme = (): Theme => {
    if (themeType === 'auto') {
      return systemColorScheme === 'dark' ? themes.dark : themes.light;
    }
    return themes[themeType];
  };

  const currentTheme = getCurrentTheme();
  const availableThemes: ThemeType[] = ['auto', 'light', 'dark', 'sepia', 'high-contrast'];

  const contextValue: ThemeContextType = {
    theme: currentTheme,
    themeType,
    setTheme,
    availableThemes,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper hook for creating themed styles
export const useThemedStyles = <T extends Record<string, any>>(
  createStyles: (theme: Theme) => T
): T => {
  const { theme } = useTheme();
  return createStyles(theme);
};

// Theme-aware component wrapper
export const withTheme = <P extends object>(
  Component: React.ComponentType<P & { theme: Theme }>
) => {
  return (props: P) => {
    const { theme } = useTheme();
    return <Component {...props} theme={theme} />;
  };
};