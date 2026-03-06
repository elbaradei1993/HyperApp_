import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = '#3b82f6',
  className = '',
}) => {
  const { t } = useTranslation();
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses[size]} ${className}`}
      style={{ color }}
      role="status"
    >
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
};

export default LoadingSpinner;
