import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

import { calculateSafetyScore } from '../lib/safetyAnalytics';
import type { Vibe } from '../types';

interface SafetyWaveOverlayProps {
  vibes: Vibe[];
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  speed: number;
  direction: number;
  type: 'dot' | 'circle' | 'star';
}

const SafetyWaveOverlay: React.FC<SafetyWaveOverlayProps> = ({ vibes, className = '' }) => {
  const [safetyScore, setSafetyScore] = useState(75);
  const [particleIntensity, setParticleIntensity] = useState(1);

  useEffect(() => {
    const score = calculateSafetyScore(vibes);
    setSafetyScore(score);

    const baseIntensity = score > 80 ? 0.6 : score > 60 ? 0.8 : score > 40 ? 1.2 : 1.5;
    const activityBonus = vibes.length > 15 ? 0.4 : vibes.length > 8 ? 0.2 : 0;
    setParticleIntensity(baseIntensity + activityBonus);
  }, [vibes]);

  const getParticleColors = (score: number) => {
    if (score >= 80) {
      return ['#22c55e', '#16a34a', '#15803d', '#dcfce7'];
    } else if (score >= 60) {
      return ['#eab308', '#ca8a04', '#a16207', '#fef3c7'];
    } else if (score >= 40) {
      return ['#f97316', '#ea580c', '#c2410c', '#fed7aa'];
    } else {
      return ['#ef4444', '#dc2626', '#b91c1c', '#fecaca'];
    }
  };

  const colors = getParticleColors(safetyScore);

  const particles = useMemo(() => {
    const particleCount = Math.floor(12 * particleIntensity);
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 80 + 10,
      size: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.5 + 0.2,
      direction: Math.random() * Math.PI * 2,
      type: (['dot', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
    }));
  }, [colors, particleIntensity]);

  const renderParticle = (particle: Particle) => {
    const baseX = particle.x;
    const baseY = particle.y;

    return (
      <motion.div
        key={particle.id}
        style={{
          position: 'absolute',
          left: `${baseX}%`,
          bottom: `${baseY}px`,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          opacity: particle.opacity,
        }}
        animate={{
          x: [
            0,
            Math.sin(particle.direction) * 30 * particle.speed,
            Math.sin(particle.direction + Math.PI) * 20 * particle.speed,
            0,
          ],
          y: [
            0,
            Math.cos(particle.direction) * 15 * particle.speed,
            Math.cos(particle.direction + Math.PI) * 25 * particle.speed,
            0,
          ],
          scale: [1, 1.2, 0.8, 1],
          opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity * 0.5, particle.opacity],
        }}
        transition={{
          duration: 8 / particle.speed,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: particle.id * 0.1,
        }}
      >
        {particle.type === 'dot' && (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size}px ${particle.color}40`,
            }}
          />
        )}
        {particle.type === 'circle' && (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `1px solid ${particle.color}`,
              backgroundColor: `${particle.color}20`,
            }}
          />
        )}
        {particle.type === 'star' && (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 24 24"
            style={{ filter: `drop-shadow(0 0 2px ${particle.color}60)` }}
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={particle.color}
            />
          </svg>
        )}
      </motion.div>
    );
  };

  return (
    <div
      className={`safety-particle-overlay ${className}`}
      style={{
        position: 'fixed',
        bottom: '0', // At very bottom, overlaying everything
        left: 0,
        right: 0,
        height: '120px', // Increased height for better particle spread
        zIndex: 100, // Above both map and tab navigation
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Floating particles */}
      <div className="particle-container">
        {particles.map(renderParticle)}
      </div>

      {/* Subtle gradient background */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40px',
          background: `linear-gradient(to top, ${colors[3]}10, transparent)`,
          opacity: 0.3,
        }}
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Safety indicator glow */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '20px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: colors[0],
          boxShadow: `0 0 20px ${colors[0]}60`,
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <style>
        {`
          .safety-particle-overlay {
            will-change: transform;
          }

          .particle-container {
            position: relative;
            width: 100%;
            height: 100%;
          }

          /* Performance optimizations */
          .particle-container > div {
            will-change: transform, opacity;
            backface-visibility: hidden;
          }

          /* Responsive adjustments */
          @media (max-width: 768px) {
            .safety-particle-overlay {
              height: 60px;
            }
          }

          /* Reduce motion for accessibility */
          @media (prefers-reduced-motion: reduce) {
            .particle-container > div {
              animation: none !important;
            }
            .safety-particle-overlay > div:not(.particle-container) {
              animation: none !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default SafetyWaveOverlay;
