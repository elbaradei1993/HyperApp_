import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: {
      container: { width: '32px', height: '16px' },
      knob: { width: '12px', height: '12px' },
      translate: '16px',
    },
    md: {
      container: { width: '44px', height: '24px' },
      knob: { width: '20px', height: '20px' },
      translate: '20px',
    },
    lg: {
      container: { width: '56px', height: '28px' },
      knob: { width: '24px', height: '24px' },
      translate: '24px',
    },
  };

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const currentSize = sizeStyles[size];

  return (
    <div
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      aria-disabled={disabled ? 'true' : 'false'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...currentSize.container,
        borderRadius: '12px',
        backgroundColor: checked ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s ease-in-out',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? currentSize.translate : '2px',
          width: currentSize.knob.width,
          height: currentSize.knob.height,
          borderRadius: '50%',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          transition: 'left 0.2s ease-in-out',
          zIndex: 1,
        }}
      />
    </div>
  );
};

export default ToggleSwitch;
