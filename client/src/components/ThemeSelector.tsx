import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette, Check } from 'lucide-react';
import { BUILT_IN_THEMES, type ColorTheme } from '@shared/schema';

interface ThemeSelectorProps {
  currentTheme?: string;
  onThemeSelect: (themeName: string) => void;
  isLoading?: boolean;
}

export default function ThemeSelector({ currentTheme = 'default', onThemeSelect, isLoading }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);

  const handleThemeSelect = (themeName: string) => {
    setSelectedTheme(themeName);
    onThemeSelect(themeName);
  };

  const ThemePreview = ({ theme }: { theme: ColorTheme }) => (
    <div className="flex items-center space-x-3">
      {/* Color preview squares */}
      <div className="flex space-x-1">
        <div 
          className="w-4 h-4 rounded border border-border"
          style={{ backgroundColor: theme.colors.primary }}
          title="Основной цвет"
        />
        <div 
          className="w-4 h-4 rounded border border-border"
          style={{ backgroundColor: theme.colors.accent }}
          title="Акцентный цвет"
        />
        <div 
          className="w-4 h-4 rounded border border-border"
          style={{ backgroundColor: theme.colors.secondary }}
          title="Вторичный цвет"
        />
      </div>
      
      {/* Theme info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-sm">{theme.label}</h4>
          {selectedTheme === theme.name && (
            <Check className="w-4 h-4 text-green-600" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {theme.description}
        </p>
      </div>
    </div>
  );

  return (
    <Card data-testid="theme-selector">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="w-5 h-5" />
          <span>Цветовая тема</span>
        </CardTitle>
        <CardDescription>
          Выберите цветовую схему, которая вам нравится. Настройки сохраняются в вашем профиле.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.values(BUILT_IN_THEMES).map((theme) => (
          <Card 
            key={theme.name}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTheme === theme.name 
                ? 'ring-2 ring-primary bg-accent/5' 
                : 'hover:bg-accent/5'
            }`}
            onClick={() => handleThemeSelect(theme.name)}
            data-testid={`theme-option-${theme.name}`}
          >
            <CardContent className="p-4">
              <ThemePreview theme={theme} />
            </CardContent>
          </Card>
        ))}
        
        {selectedTheme !== currentTheme && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Применить изменения?</p>
                <p className="text-xs text-muted-foreground">
                  Тема будет сохранена в вашем профиле
                </p>
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTheme(currentTheme)}
                  disabled={isLoading}
                  data-testid="button-cancel-theme"
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  onClick={() => onThemeSelect(selectedTheme)}
                  disabled={isLoading}
                  data-testid="button-save-theme"
                >
                  {isLoading ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {selectedTheme === currentTheme && currentTheme !== 'default' && (
          <div className="pt-4 border-t">
            <Badge variant="secondary" className="text-xs">
              ✨ Активная тема: {BUILT_IN_THEMES[currentTheme]?.label}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}