import React from 'react';
import { Search } from 'lucide-react';

interface LocationSearchButtonProps {
  onClick: () => void;
  top?: string;
}

const LocationSearchButton: React.FC<LocationSearchButtonProps> = ({ onClick, top = '20px' }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top,
        right: '10px',
        backgroundColor: 'var(--bg-surface)',
        border: '0.5px solid var(--wire)',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,200,150,0.2)',
        zIndex: 1000,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateY(0)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,200,150,0.3), 0 4px 10px rgba(0,200,150,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,200,150,0.2)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
      }}
    >
      <Search size={20} color="var(--accent)" />
    </button>
  );
};

export default LocationSearchButton;
