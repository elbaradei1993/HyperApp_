import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

import { VIBE_CONFIG } from '../constants/vibes';

const VibeLegend: React.FC = () => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '10px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        minWidth: '140px',
      }}
    >
      {/* Header */}
      <button
        onClick={toggleExpanded}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontWeight: '600',
          color: '#374151',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={isExpanded ? t('community.vibeLegendCollapse') : t('community.vibeLegendExpand')}
      >
        <span>{t('community.vibeLegend')}</span>
        {isExpanded ? (
          <ChevronDown size={14} color="#6b7280" />
        ) : (
          <ChevronUp size={14} color="#6b7280" />
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {Object.entries(VIBE_CONFIG).map(([vibeType, config]) => (
                <div
                  key={vibeType}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#374151',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/* Color indicator */}
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: config.color,
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      flexShrink: 0,
                    }}
                  />
                  {/* Icon and label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '10px' }}>{config.icon}</span>
                    <span style={{ fontSize: '10px', fontWeight: '600' }}>
                      {t(`vibes.${vibeType}`, config.label)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VibeLegend;
