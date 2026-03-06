import React, { useState } from 'react';

import { VIBE_CONFIG } from '../constants/vibes';
import type { VibeType } from '../constants/vibes';

import VibeFigure from './VibeFigure';

const VibeFigureDemo: React.FC = () => {
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('calm');
  const [animated, setAnimated] = useState(true);

  const vibeTypes = Object.keys(VIBE_CONFIG) as VibeType[];

  return (
    <div style={{
      padding: '20px',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          textAlign: 'center',
          color: '#1e293b',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Animated Human Figures Demo
        </h1>

        {/* Controls */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'center',
          marginBottom: '3rem',
          padding: '1.5rem',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: '500', color: '#374151' }}>Animation:</label>
            <button
              onClick={() => setAnimated(!animated)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: animated ? '#10b981' : '#ef4444',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
            >
              {animated ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Selected Figure Display */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem',
          padding: '2rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '1rem',
            textTransform: 'capitalize',
          }}>
            {selectedVibe} Figure
          </h2>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '120px',
          }}>
            <VibeFigure
              vibeType={selectedVibe}
              size={80}
              animated={animated}
            />
          </div>
          <p style={{
            color: '#6b7280',
            marginTop: '1rem',
            fontSize: '0.9rem',
          }}>
            {VIBE_CONFIG[selectedVibe].label} • {VIBE_CONFIG[selectedVibe].icon}
          </p>
        </div>

        {/* All Figures Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {vibeTypes.map((vibeType) => (
            <div
              key={vibeType}
              onClick={() => setSelectedVibe(vibeType)}
              style={{
                padding: '1.5rem',
                background: selectedVibe === vibeType ? '#eff6ff' : 'white',
                border: `2px solid ${selectedVibe === vibeType ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                boxShadow: selectedVibe === vibeType
                  ? '0 10px 15px -3px rgba(59, 130, 246, 0.1)'
                  : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                transform: selectedVibe === vibeType ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '80px',
                marginBottom: '1rem',
              }}>
                <VibeFigure
                  vibeType={vibeType}
                  size={60}
                  animated={animated}
                />
              </div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '0.5rem',
                textTransform: 'capitalize',
              }}>
                {vibeType}
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '0.9rem',
                marginBottom: '0.5rem',
              }}>
                {VIBE_CONFIG[vibeType].icon} {VIBE_CONFIG[vibeType].label}
              </p>
              <div style={{
                width: '100%',
                height: '4px',
                background: VIBE_CONFIG[vibeType].color,
                borderRadius: '2px',
                opacity: 0.7,
              }} />
            </div>
          ))}
        </div>

        {/* Usage Instructions */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '1rem',
          }}>
            How to Use VibeFigure Component
          </h3>
          <div style={{
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            color: '#374151',
            textAlign: 'left',
            marginBottom: '1rem',
          }}>
            {`<VibeFigure
  vibeType="calm"        // 'safe' | 'calm' | 'lively' | 'festive' | etc.
  size={40}              // Size in pixels (default: 40)
  animated={true}        // Enable/disable animation (default: true)
  className="my-figure"  // Optional CSS class
/>`}
          </div>
          <p style={{
            color: '#6b7280',
            fontSize: '0.9rem',
            lineHeight: '1.5',
          }}>
            Each figure automatically animates based on its vibe type using React Spring physics.
            The animations are optimized for performance and respect user motion preferences.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VibeFigureDemo;
