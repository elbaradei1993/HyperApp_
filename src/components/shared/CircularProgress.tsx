import React, { useEffect, useState } from 'react';

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
  className = '',
}) => {
  const [animatedSegments, setAnimatedSegments] = useState(segments.map(() => 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedSegments(segments.map(segment => segment.percentage));
    }, 100);

    return () => clearTimeout(timer);
  }, [segments]);

  // Calculate cumulative percentages for segments
  const getSegmentPath = (startPercentage: number, endPercentage: number) => {
    const startAngle = (startPercentage / 100) * 360;
    const endAngle = (endPercentage / 100) * 360;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = size / 2 + radius * Math.cos(startRad);
    const y1 = size / 2 + radius * Math.sin(startRad);
    const x2 = size / 2 + radius * Math.cos(endRad);
    const y2 = size / 2 + radius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${size / 2 + radius * Math.cos(startRad)} ${size / 2 + radius * Math.sin(startRad)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

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
        style={{
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

        {/* Multi-segment progress paths */}
        {segments.map((segment, index) => {
          const startPercentage = cumulativePercentage;
          const endPercentage = Math.min(cumulativePercentage + animatedSegments[index], 100);
          cumulativePercentage += animatedSegments[index];

          if (animatedSegments[index] === 0) {
            return null;
          }

          return (
            <path
              key={index}
              d={getSegmentPath(startPercentage, endPercentage)}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              style={{
                transition: `all ${animationDuration}ms ease-in-out`,
                filter: `drop-shadow(0 0 4px ${segment.color}30)`,
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
