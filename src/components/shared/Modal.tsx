import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'lg',
  showCloseButton = true,
}) => {
  if (!isOpen) {
    return null;
  }

  const maxWidth = {
    sm: '400px',
    md: '500px',
    lg: '600px',
    xl: '800px',
  }[size];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '20px',
        backdropFilter: 'blur(10px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
          transform: 'translateY(0) scale(1)',
          transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
        }}
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: window.innerWidth < 480 ? '12px' : '20px',
              left: window.innerWidth < 480 ? '12px' : '20px',
              background: 'rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              fontSize: window.innerWidth < 480 ? '16px' : '18px',
              cursor: 'pointer',
              color: '#666',
              width: window.innerWidth < 480 ? '28px' : '36px',
              height: window.innerWidth < 480 ? '28px' : '36px',
              borderRadius: window.innerWidth < 480 ? '6px' : '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'all 0.2s ease',
              fontWeight: 'bold',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>
        )}

        {/* Title */}
        {title && (
          <div style={{ padding: '24px 24px 0 24px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1a1a1a',
              margin: 0,
            }}>
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
