import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  fullWidth?: boolean;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  error = false,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-3 py-2 border rounded-lg text-sm focus:outline-none transition-all duration-200';
  const errorClasses = error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <input
      className={`${baseClasses} ${errorClasses} ${widthClass} ${className}`}
      {...props}
    />
  );
};

export const Textarea: React.FC<TextareaProps> = ({
  error = false,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'px-3 py-2 border rounded-lg text-sm focus:outline-none transition-all duration-200 resize-vertical';
  const errorClasses = error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <textarea
      className={`${baseClasses} ${errorClasses} ${widthClass} ${className}`}
      {...props}
    />
  );
};

export default Input;
