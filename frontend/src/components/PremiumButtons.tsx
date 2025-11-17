import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { ArrowRight, Sparkles, Eye, Zap } from 'lucide-react';

interface PremiumButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
}

export const CreatePhotobookButton: React.FC<PremiumButtonProps> = ({
  children,
  onClick,
  className = '',
  size = 'default',
  disabled = false
}) => {
  const baseClass = 'btn-create-photobook relative';
  // Убираем Tailwind классы для padding - используем только CSS
  const sizeClasses = {
    sm: 'text-sm',
    default: 'text-lg',
    lg: 'text-xl'
  };

  return (
    <button
      className={`${baseClass} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {/* Sparkle effects */}
      <span className="sparkle">✨</span>
      <span className="sparkle">⭐</span>
      <span className="sparkle">💫</span>
      
      {/* Button content */}
      <span className="relative z-10 flex items-center gap-2">
        <Zap className="w-5 h-5" />
        {children}
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
};

export const ViewExamplesButton: React.FC<PremiumButtonProps> = ({
  children,
  onClick,
  className = '',
  size = 'default',
  disabled = false
}) => {
  const baseClass = 'btn-view-examples relative';
  // Убираем Tailwind классы для padding - используем только CSS
  const sizeClasses = {
    sm: 'text-sm',
    default: 'text-base',
    lg: 'text-lg'
  };

  return (
    <button
      className={`${baseClass} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <Sparkles className="w-4 h-4" />
      </span>
    </button>
  );
};

// Компонент для группы кнопок в hero секции
export const HeroButtonGroup: React.FC<{
  onCreateClick?: () => void;
  onViewClick?: () => void;
}> = ({
  onCreateClick,
  onViewClick
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="hero-button-group">
      <CreatePhotobookButton onClick={onCreateClick}>
        {t('createPhotobook')}
      </CreatePhotobookButton>
      <ViewExamplesButton onClick={onViewClick}>
        {t('viewExamples')}
      </ViewExamplesButton>
    </div>
  );
};

// Компактные версии для использования в карточках
export const CompactCreateButton: React.FC<PremiumButtonProps> = (props) => (
  <CreatePhotobookButton {...props} size="sm" />
);

export const CompactViewButton: React.FC<PremiumButtonProps> = (props) => (
  <ViewExamplesButton {...props} size="sm" />
);