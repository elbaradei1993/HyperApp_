import React, { useMemo, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

import { VIBE_CONFIG } from '../constants/vibes';
import type { VibeType } from '../constants/vibes';

interface VibeFigureProps {
  vibeType: VibeType;
  size?: number;
  className?: string;
  animated?: boolean;
}

// Cinematic movie-style illustration component with advanced animations
const VibeFigureIllustration: React.FC<{
  vibeType: VibeType;
  size: number;
  animated: boolean;
}> = ({ vibeType, size, animated: isAnimated }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  // Map vibe types to updated unDraw.co illustrations
  const illustrationMapping: Record<VibeType, string> = {
    safe: 'undraw_security-on_3ykb.svg',
    calm: 'undraw_quiet-street_v45k.svg',
    lively: 'undraw_running-wild_jnn2.svg',
    festive: 'undraw_mello_uiud.svg',
    crowded: 'undraw_social-distancing_jh03.svg',
    suspicious: 'undraw_dark-alley_ykce.svg',
    dangerous: 'undraw_exploring_fzmr.svg',
    noisy: 'undraw_construction-workers_z99i.svg',
    quiet: 'undraw_notify_rnwe.svg',
    unknown: 'Festive.svg',
  };

  // Memoize illustration URL for performance
  const illustrationUrl = useMemo(() => `/illustrations/${illustrationMapping[vibeType]}`, [vibeType, illustrationMapping]);
  const vibeColor = VIBE_CONFIG[vibeType].color;

  // Cinematic scene transition with dramatic timing
  const [sceneTransition] = useSpring(() => ({
    from: {
      opacity: 0,
      transform: 'scale(0.7) rotate(-8deg) translateX(-20px)',
      filter: 'blur(4px) brightness(0.8)',
    },
    to: {
      opacity: 1,
      transform: 'scale(1) rotate(0deg) translateX(0px)',
      filter: 'blur(0px) brightness(1)',
    },
    config: {
      mass: 2,
      tension: 120,
      friction: 14,
      precision: 0.01,
    },
    reset: true,
  }), [vibeType]);

  // Advanced cinematic camera movements - dolly zoom effect
  const [cameraSpring] = useSpring(() => {
    if (isAnimated) {
      return {
        from: {
          transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
          filter: 'contrast(1) saturate(1)',
        },
        to: [
          {
            transform: 'perspective(1000px) rotateX(2deg) rotateY(1deg) scale(1.05)',
            filter: 'contrast(1.1) saturate(1.2)',
          },
          {
            transform: 'perspective(1000px) rotateX(-1deg) rotateY(-1deg) scale(0.98)',
            filter: 'contrast(0.95) saturate(0.9)',
          },
          {
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
            filter: 'contrast(1) saturate(1)',
          },
        ],
        config: {
          mass: 3,
          tension: 60,
          friction: 20,
          precision: 0.01,
        },
        loop: { reverse: false },
        delay: 2000,
      };
    } else {
      return {
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
        filter: 'contrast(1) saturate(1)',
        config: { tension: 300, friction: 20 },
      };
    }
  }, [isAnimated]);

  // Dynamic floating with cinematic physics - more dramatic movement
  const [cinematicFloat] = useSpring(() => {
    if (isAnimated) {
      return {
        from: {
          transform: 'translateY(0px) translateX(0px) rotate(0deg)',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
        },
        to: [
          {
            transform: 'translateY(-12px) translateX(3px) rotate(1.5deg)',
            filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.25))',
          },
          {
            transform: 'translateY(-6px) translateX(-2px) rotate(-0.8deg)',
            filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.2))',
          },
          {
            transform: 'translateY(0px) translateX(0px) rotate(0deg)',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          },
        ],
        config: {
          mass: 2.5,
          tension: 70,
          friction: 16,
          precision: 0.01,
        },
        loop: true,
        delay: 1000,
      };
    } else {
      return {
        transform: 'translateY(0px) translateX(0px) rotate(0deg)',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
        config: { tension: 300, friction: 20 },
      };
    }
  }, [isAnimated]);

  // Interactive cinematic effects - triggered on hover/click
  const [interactiveSpring] = useSpring(() => ({
    transform: isHovered
      ? 'scale(1.15) translateZ(20px)'
      : isClicked
        ? 'scale(1.25) translateZ(30px) rotateY(5deg)'
        : 'scale(1) translateZ(0px) rotateY(0deg)',
    filter: isHovered
      ? 'drop-shadow(0 12px 32px rgba(0,0,0,0.3)) brightness(1.1)'
      : isClicked
        ? 'drop-shadow(0 16px 40px rgba(0,0,0,0.4)) brightness(1.2)'
        : 'drop-shadow(0 4px 12px rgba(0,0,0,0.15)) brightness(1)',
    config: {
      mass: 1,
      tension: isClicked ? 400 : 280,
      friction: 20,
      precision: 0.01,
    },
  }), [isHovered, isClicked]);

  // Atmospheric particles with cinematic timing
  const [atmosphericParticles] = useSpring(() => {
    if (isAnimated) {
      return {
        opacity: 0.6,
        transform: 'translateY(-15px) translateX(5px) scale(1.2) rotate(10deg)',
        config: {
          mass: 1.2,
          tension: 100,
          friction: 12,
          precision: 0.01,
        },
        loop: { reverse: true },
        delay: 800,
      };
    } else {
      return {
        opacity: 0,
        transform: 'translateY(20px) translateX(0px) scale(0.8) rotate(0deg)',
        config: { tension: 120, friction: 16 },
      };
    }
  }, [isAnimated]);

  // Secondary particle system for depth
  const [depthParticles] = useSpring(() => {
    if (isAnimated) {
      return {
        opacity: 0.3,
        transform: 'translateY(-25px) translateX(-8px) scale(0.8) rotate(-15deg)',
        config: {
          mass: 1.8,
          tension: 80,
          friction: 18,
          precision: 0.01,
        },
        loop: { reverse: true },
        delay: 1500,
      };
    } else {
      return {
        opacity: 0,
        transform: 'translateY(30px) translateX(0px) scale(0.6) rotate(0deg)',
        config: { tension: 120, friction: 16 },
      };
    }
  }, [isAnimated]);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        cursor: 'pointer',
        perspective: '1000px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsClicked(false);
      }}
      onMouseDown={() => setIsClicked(true)}
      onMouseUp={() => setIsClicked(false)}
    >
      {/* Cinematic camera container */}
      <animated.div
        style={{
          ...cameraSpring,
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Main illustration with cinematic floating */}
        <animated.div
          style={{
            ...cinematicFloat,
            ...interactiveSpring,
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            overflow: 'hidden',
            transformStyle: 'preserve-3d',
          }}
        >
          <animated.img
            src={illustrationUrl}
            alt=""
            style={{
              ...sceneTransition,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
            loading="lazy"
          />
        </animated.div>
      </animated.div>

      {/* Atmospheric particles - primary layer */}
      {isAnimated && (
        <animated.div
          style={{
            ...atmosphericParticles,
            position: 'absolute',
            top: '15%',
            right: '10%',
            width: '8px',
            height: '8px',
            background: `radial-gradient(circle, ${vibeColor}70, ${vibeColor}30)`,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Depth particles - secondary layer */}
      {isAnimated && (
        <animated.div
          style={{
            ...depthParticles,
            position: 'absolute',
            top: '25%',
            left: '15%',
            width: '5px',
            height: '5px',
            background: `radial-gradient(circle, ${vibeColor}50, ${vibeColor}15)`,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Cinematic glow effect - enhanced for movie feel */}
      {(isHovered || isClicked) && (
        <animated.div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${vibeColor}20 0%, ${vibeColor}10 40%, transparent 80%)`,
            pointerEvents: 'none',
            zIndex: -1,
            filter: 'blur(2px)',
          }}
        />
      )}

      {/* Film grain effect overlay */}
      {isAnimated && (
        <animated.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 2,
            mixBlendMode: 'overlay',
          }}
        />
      )}
    </div>
  );
};

// Main VibeFigure component using unDraw.co illustrations
const VibeFigure: React.FC<VibeFigureProps> = ({
  vibeType,
  size = 40,
  className = '',
  animated = true,
}) => {
  return (
    <div className={`vibe-figure ${className}`} style={{ display: 'inline-block' }}>
      <VibeFigureIllustration
        vibeType={vibeType}
        size={size}
        animated={animated}
      />
    </div>
  );
};

export default VibeFigure;
