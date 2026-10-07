import React, { useEffect, useRef, useState, useMemo } from 'react';
import Card, { CardProps } from './Card';
import Badge from './Badge';

export interface KPICardProps extends Omit<CardProps, 'title' | 'children'> {
  label: string;
  value: number | string;
  unit?: string;
  deltaPct?: number;
  sparklineData?: number[];
  className?: string;
}

// Cubic ease-out curve for smooth deceleration
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Animated number counter hook using plain requestAnimationFrame
 */
const useAnimatedNumber = (target: number | string, duration = 750): string => {
  const isNumeric = typeof target === 'number' || (!isNaN(Number(target)) && target !== '');
  const numericTarget = typeof target === 'number' ? target : Number(target);

  const [displayValue, setDisplayValue] = useState<number>(isNumeric ? 0 : 0);
  const prevTargetRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Check how many decimal places the target has (up to 2)
  const decimalPlaces = useMemo(() => {
    if (!isNumeric) return 0;
    const str = numericTarget.toString();
    if (str.includes('.')) {
      return Math.min(2, str.split('.')[1].length);
    }
    return 0;
  }, [numericTarget, isNumeric]);

  useEffect(() => {
    if (!isNumeric) return;

    const startVal = prevTargetRef.current;
    const endVal = numericTarget;
    prevTargetRef.current = endVal;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const current = startVal + (endVal - startVal) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(endVal);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [numericTarget, duration, isNumeric]);

  if (!isNumeric) {
    return String(target);
  }

  // Format with localized comma separators and appropriate decimals
  return displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
};

/**
 * Pure SVG Sparkline Component (~80x24px)
 */
interface InlineSparklineProps {
  data: number[];
  color: string;
}

const InlineSparkline: React.FC<InlineSparklineProps> = ({ data, color }) => {
  const gradientId = useMemo(() => `sparkline-grad-${Math.random().toString(36).substring(2, 9)}`, []);

  if (!data || data.length < 2) {
    return null;
  }

  const width = 80;
  const height = 24;
  const padX = 2;
  const padY = 3;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max === min ? 1 : max - min;

  const points = data.map((val, idx) => {
    const x = padX + (idx / (data.length - 1)) * (width - padX * 2);
    const y = (height - padY) - ((val - min) / range) * (height - padY * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${width - padX},${height} L ${padX},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="2.5"
          fill={color}
        />
      )}
    </svg>
  );
};

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  unit,
  deltaPct,
  sparklineData,
  className = '',
  ...cardProps
}) => {
  const animatedValue = useAnimatedNumber(value);

  // Delta trend colors
  const isPositive = deltaPct !== undefined && deltaPct > 0;
  const isNegative = deltaPct !== undefined && deltaPct < 0;

  const trendColor = isPositive
    ? 'var(--accent-neon-green, #10b981)'
    : isNegative
    ? 'var(--accent-red, #ef4444)'
    : 'var(--accent-cyan, #38bdf8)';

  return (
    <Card
      className={`adpilot-kpi-card ${className}`.trim()}
      {...cardProps}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {/* Top Header Row: Label & Delta Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-secondary, #94a3b8)',
              letterSpacing: '0.01em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </span>

          {deltaPct !== undefined && (
            <Badge
              variant={isPositive ? 'success' : isNegative ? 'danger' : 'neutral'}
              style={{
                fontSize: '0.6875rem',
                padding: '0.125rem 0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>{isPositive ? '↑ +' : isNegative ? '↓ ' : ''}</span>
              <span>{Math.abs(deltaPct).toFixed(1)}%</span>
            </Badge>
          )}
        </div>

        {/* Middle / Bottom Row: Metric Value + Inline Sparkline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: '0.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
            {unit && (
              <span
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary, #94a3b8)',
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                }}
              >
                {unit}
              </span>
            )}
            <span
              className="mono"
              style={{
                fontSize: '1.875rem', // 30px
                fontWeight: 700,
                lineHeight: 1.1,
                color: 'var(--text-primary, #f8fafc)',
                letterSpacing: '-0.02em',
              }}
            >
              {animatedValue}
            </span>
          </div>

          {sparklineData && sparklineData.length > 0 && (
            <div style={{ paddingBottom: '0.25rem' }}>
              <InlineSparkline data={sparklineData} color={trendColor} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default KPICard;
