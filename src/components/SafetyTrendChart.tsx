import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

import { calculateSafetyTrends, getSafetyLevel, getSafetyTrend, type SafetyDataPoint } from '../lib/safetyAnalytics';
import type { Report } from '../types';

interface SafetyTrendChartProps {
  reports: Report[];
  height?: number;
}

const SafetyTrendChart: React.FC<SafetyTrendChartProps> = ({
  reports,
  height = 200,
}) => {
  const chartData = useMemo(() => {
    const dataPoints = calculateSafetyTrends(reports, 24);

    // Convert to chart format
    return dataPoints.map(point => ({
      time: point.time.getTime(),
      hour: point.hourLabel,
      safety: point.safetyScore,
      reports: point.totalReports,
      positive: point.positiveReports,
      negative: point.negativeReports,
    }));
  }, [reports]);

  const trend = useMemo(() => {
    const dataPoints = calculateSafetyTrends(reports, 24);
    return getSafetyTrend(dataPoints);
  }, [reports]);

  const currentSafety = useMemo(() => {
    if (chartData.length === 0) {
      return null;
    }
    const latest = chartData[chartData.length - 1];
    return getSafetyLevel(latest.safety);
  }, [chartData]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const safetyLevel = getSafetyLevel(data.safety);

      return (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          minWidth: '180px',
        }}>
          <div style={{
            color: '#1f2937',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
          }}>
            {data.hour}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: safetyLevel.color,
            }}></div>
            <span style={{
              color: safetyLevel.color,
              fontSize: '16px',
              fontWeight: '700',
            }}>
              {data.safety}% {safetyLevel.description}
            </span>
          </div>

          <div style={{
            color: '#6b7280',
            fontSize: '12px',
            lineHeight: '1.4',
          }}>
            {data.reports} total reports<br/>
            {data.positive} positive • {data.negative} concerning
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom dot component for the line
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || payload.reports === 0) {
      return null;
    } // Don't show dots for hours with no reports

    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="#3b82f6"
        stroke="white"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))' }}
      />
    );
  };

  if (chartData.length === 0) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <i className="fas fa-chart-line" style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}></i>
          <div style={{ fontSize: '14px' }}>No safety trend data available</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      {/* Trend indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentSafety && (
            <>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: currentSafety.color,
              }}></div>
              <span style={{
                color: currentSafety.color,
                fontSize: '14px',
                fontWeight: '600',
              }}>
                {currentSafety.description} Area
              </span>
            </>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          color: '#6b7280',
        }}>
          {trend === 'improving' && (
            <>
              <i className="fas fa-arrow-up" style={{ color: '#10b981' }}></i>
              <span style={{ color: '#10b981' }}>Improving</span>
            </>
          )}
          {trend === 'declining' && (
            <>
              <i className="fas fa-arrow-down" style={{ color: '#ef4444' }}></i>
              <span style={{ color: '#ef4444' }}>Declining</span>
            </>
          )}
          {trend === 'stable' && (
            <>
              <i className="fas fa-minus" style={{ color: '#6b7280' }}></i>
              <span>Stable</span>
            </>
          )}
          {trend === 'unknown' && (
            <span>Unknown trend</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 5,
            right: 5,
            left: 5,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="safetyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            opacity={0.5}
          />

          <XAxis
            dataKey="hour"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(value) => `${value}%`}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="safety"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#safetyGradient)"
            dot={<CustomDot />}
            activeDot={{
              r: 5,
              fill: '#3b82f6',
              stroke: 'white',
              strokeWidth: 2,
              style: { filter: 'drop-shadow(0 2px 8px rgba(59, 130, 246, 0.4))' },
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SafetyTrendChart;
