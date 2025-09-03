import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { BUILT_IN_THEMES, type ColorTheme } from '@shared/schema';
import { useAuth } from '@/hooks/useAuth';

interface UserThemeData {
  theme: {
    themeName: string;
    customColors: any;
  };
  availableThemes: ColorTheme[];
}

export function useTheme() {
  const [currentThemeName, setCurrentThemeName] = useState<string>(() => {
    // Initialize with saved theme from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('photocraft-theme') || 'default';
    }
    return 'default';
  });
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user theme preferences
  const { data: themeData, isLoading } = useQuery<UserThemeData>({
    queryKey: ['/api/user/theme'],
    enabled: isAuthenticated,
    retry: false,
    // Default fallback for unauthenticated users
    initialData: {
      theme: { themeName: 'default', customColors: null },
      availableThemes: Object.values(BUILT_IN_THEMES)
    }
  });

  // Update theme mutation
  const updateThemeMutation = useMutation({
    mutationFn: async (themeName: string) => {
      return await apiRequest('PUT', '/api/user/theme', { 
        themeName,
        customColors: null 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/theme'] });
    }
  });

  // Apply theme to document
  const applyTheme = (themeName: string) => {
    const theme = BUILT_IN_THEMES[themeName] || BUILT_IN_THEMES.default;
    
    // Remove any existing theme classes
    document.documentElement.classList.remove(...Object.keys(BUILT_IN_THEMES).map(name => `theme-${name}`));
    
    // Add the current theme class
    document.documentElement.classList.add(`theme-${theme.name}`);
    
    // Apply CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-muted', theme.colors.textMuted);
    root.style.setProperty('--theme-border', theme.colors.border);
    
    setCurrentThemeName(themeName);
  };

  // Initial theme application
  useEffect(() => {
    applyTheme(currentThemeName);
  }, []);

  // Apply theme when theme data changes (for authenticated users)
  useEffect(() => {
    if (isAuthenticated && themeData?.theme?.themeName) {
      const themeName = themeData.theme.themeName;
      if (themeName !== currentThemeName) {
        applyTheme(themeName);
      }
    }
  }, [themeData, isAuthenticated]);

  // For unauthenticated users, use localStorage fallback
  useEffect(() => {
    if (!isAuthenticated) {
      const savedTheme = localStorage.getItem('photocraft-theme') || 'default';
      if (savedTheme !== currentThemeName) {
        applyTheme(savedTheme);
      }
    }
  }, [isAuthenticated]);

  const changeTheme = async (themeName: string) => {
    // Apply theme immediately for better UX
    applyTheme(themeName);

    if (isAuthenticated) {
      // Save to backend for authenticated users
      try {
        await updateThemeMutation.mutateAsync(themeName);
      } catch (error) {
        console.error('Failed to save theme:', error);
        // Revert to previous theme on error
        const previousTheme = themeData?.theme?.themeName || 'default';
        applyTheme(previousTheme);
        throw error;
      }
    } else {
      // Save to localStorage for unauthenticated users
      localStorage.setItem('photocraft-theme', themeName);
    }
  };

  return {
    currentTheme: BUILT_IN_THEMES[currentThemeName] || BUILT_IN_THEMES.default,
    currentThemeName,
    availableThemes: Object.values(BUILT_IN_THEMES),
    changeTheme,
    isLoading: isLoading || updateThemeMutation.isPending,
    isAuthenticated
  };
}