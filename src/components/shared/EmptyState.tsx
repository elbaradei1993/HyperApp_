import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="mx-auto w-24 h-24 text-gray-400 mb-4 opacity-50">
          {icon}
        </div>
      )}

      <h3 className="text-base font-medium text-gray-900 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
