import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { VIBE_CONFIG } from '../constants/vibes';

const VibeLegend: React.FC = () => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="vibe-legend"
      style={{
        position: 'absolute',
        right: '18px',
        bottom: '18px',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              width: '240px',
              maxHeight: '300px',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: '0 16px 32px rgba(15, 23, 42, 0.10)',
              pointerEvents: 'auto',
            }}
          >
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: '700',
                color: '#0f172a',
                WebkitTapHighlightColor: 'transparent',
              }}
              aria-label={t('community.vibeLegendCollapse')}
            >
              <span>{t('community.vibeLegend')}</span>
              <ChevronDown size={15} color="#0f172a" />
            </button>

            <div
              style={{
                padding: '0 12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '240px',
                overflowY: 'auto',
              }}
            >
              {Object.entries(VIBE_CONFIG).map(([vibeType, config]) => (
                <div
                  key={vibeType}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 8px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.04)',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: config.color,
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    <span style={{ fontSize: '10px' }}>{config.icon}</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t(`vibes.${vibeType}`, config.label)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsExpanded(prev => !prev)}
        style={{
          pointerEvents: 'auto',
          width: '52px',
          height: '52px',
          borderRadius: '18px',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 12px 26px rgba(15, 23, 42, 0.10)',
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={isExpanded ? t('community.vibeLegendCollapse') : t('community.vibeLegendExpand')}
      >
        {isExpanded ? <ChevronDown size={18} color="#0f172a" /> : <ChevronUp size={18} color="#0f172a" />}
      </button>
    </div>
  );
};

export default VibeLegend;
