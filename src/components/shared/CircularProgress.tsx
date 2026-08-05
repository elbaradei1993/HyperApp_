import React, { useEffect, useId, useMemo, useState } from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animationDuration?: number;
  className?: string;
}

interface MultiSegmentCircularProgressProps {
  segments: Array<{
    percentage: number;
    color: string;
    label?: string;
  }>;
  size?: number;
  strokeWidth?: number;
  backgroundColor?: string;
  showCenterContent?: boolean;
  centerContent?: React.ReactNode;
  animationDuration?: number;
  segmentGap?: number;
  glow?: boolean;
  className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  showPercentage = true,
  animationDuration = 1500,
  className = '',
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100); // Small delay to ensure component is mounted

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={`circular-progress ${className}`} style={{
      position: 'relative',
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
        }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.3"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: `stroke-dashoffset ${animationDuration}ms ease-in-out`,
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>

      {/* Center content */}
      {showPercentage && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontSize: Math.max(12, size * 0.12),
          fontWeight: '900',
          color,
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        }}>
          {Math.round(animatedPercentage)}%
        </div>
      )}
    </div>
  );
};

const MultiSegmentCircularProgress: React.FC<MultiSegmentCircularProgressProps> = ({
  segments,
  size = 120,
  strokeWidth = 8,
  backgroundColor = '#e5e7eb',
  showCenterContent = true,
  centerContent,
  animationDuration = 2000,
  segmentGap = 2.4,
  glow = false,
  className = '',
}) => {
  const filterId = useId().replace(/:/g, '');
  const normalizedSegments = useMemo(() => {
    const validSegments = segments.filter((segment) => Number.isFinite(segment.percentage) && segment.percentage > 0);
    const total = validSegments.reduce((sum, segment) => sum + segment.percentage, 0);

    if (total <= 0) {
      return [];
    }

    return validSegments.map((segment) => ({
      ...segment,
      percentage: (segment.percentage / total) * 100,
    }));
  }, [segments]);
  const [animatedSegments, setAnimatedSegments] = useState(normalizedSegments.map(() => 0));
  const radius = (size - strokeWidth) / 2;

  useEffect(() => {
    setAnimatedSegments(normalizedSegments.map(() => 0));
    const timer = setTimeout(() => {
      setAnimatedSegments(normalizedSegments.map((segment) => segment.percentage));
    }, 100);

    return () => clearTimeout(timer);
  }, [normalizedSegments]);

  let cumulativePercentage = 0;

  return (
    <div className={`multi-segment-circular-progress ${className}`} style={{
      position: 'relative',
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
        }}
      >
        {glow && (
          <defs>
            {normalizedSegments.map((segment, index) => (
              <filter
                key={`${segment.label || index}-glow`}
                id={`${filterId}-glow-${index}`}
                x="-60%"
                y="-60%"
                width="220%"
                height="220%"
              >
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feFlood floodColor={segment.color} floodOpacity="0.72" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>
        )}

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.34"
        />

        {/* Rounded, independently glowing segments */}
        {normalizedSegments.map((segment, index) => {
          const startPercentage = cumulativePercentage;
          const animatedValue = animatedSegments[index] ?? 0;
          const visiblePercentage = animatedValue > 0
            ? Math.max(animatedValue - segmentGap, Math.min(0.8, animatedValue))
            : 0;
          cumulativePercentage += segment.percentage;

          return (
            <circle
              key={`${segment.label || index}-segment`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${visiblePercentage} ${100 - visiblePercentage}`}
              strokeDashoffset={-startPercentage}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              filter={glow ? `url(#${filterId}-glow-${index})` : undefined}
              style={{
                transition: `stroke-dasharray ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              }}
            />
          );
        })}
      </svg>

      {/* Center content */}
      {showCenterContent && centerContent && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          {centerContent}
        </div>
      )}
    </div>
  );
};

export { CircularProgress, MultiSegmentCircularProgress };
export default CircularProgress;
