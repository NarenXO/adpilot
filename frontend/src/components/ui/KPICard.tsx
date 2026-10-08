import React from 'react';

interface Props {
  label: string;
  value: number;
  unit?: string;
  deltaPct?: number;
  sparklineData?: number[];
}

export function KPICard({ label, value, unit = '', deltaPct = 0, sparklineData = [] }: Props) {
  const formatValue = (val: number) => {
    if (val >= 100000) return `${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString('en-IN');
  };

  const isPositive = deltaPct >= 0;
  const accentColor = isPositive ? '#82e66f' : '#f364cb';

  return (
    <div style={{ background: '#ffffff', border: '3px solid #000', boxShadow: '4px 4px 0px #000', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', fontFamily: "'Space Grotesk', monospace" }}>{label}</span>
        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: accentColor, border: '2px solid #000' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: 900, color: '#000' }}>
          {unit === '₹' ? '₹' : ''}{formatValue(value)}{unit === 'x' ? 'x' : ''}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 800, backgroundColor: accentColor, padding: '2px 6px', border: '2px solid #000', borderRadius: '4px' }}>
          {isPositive ? '+' : ''}{deltaPct}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: '30px', gap: '2px', marginTop: 'auto' }}>
        {sparklineData.map((val, i) => {
          const max = Math.max(...sparklineData, 1);
          const heightPct = (val / max) * 100;
          return (
            <div key={i} style={{ flex: 1, backgroundColor: accentColor, border: '1px solid #000', height: `${heightPct}%`, minHeight: '4px' }} />
          );
        })}
      </div>
    </div>
  );
}

export default KPICard;
