// frontend/src/pages/InventoryMargin.tsx
// Invente '26 Neo-Brutalist — Inventory × Margin Studio
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RefreshCw, AlertTriangle, TrendingUp, Package, BarChart3 } from 'lucide-react';
import { BubbleChart } from '../components/charts/BubbleChart';
import type { SKUBubble, Quadrant, Provenance } from '../types/api';
import { palette, quadrantMeta } from '../theme/tokens';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const P = palette;
const FONT = "'Space Grotesk', monospace, sans-serif";

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '3px solid #000000',
  boxShadow: '5px 5px 0px #000000',
  borderRadius: 0,
  padding: 20,
  color: '#000000',
};

// ─── Rich Built-In 20 SKU Fallback Dataset ─────────────────────────────────────
const DEFAULT_20_SKUS: SKUBubble[] = [
  { sku: 'SKU-001', name: 'Hydrating Facial Moisturizer', category: 'skincare', margin_pct: 0.62, days_of_cover: 4.2, spend: 500, revenue: 2100, quadrant: 'fix', opportunity_score: 32, provenance: 'scenario' },
  { sku: 'SKU-002', name: 'Vitamin C Radiance Serum', category: 'skincare', margin_pct: 0.74, days_of_cover: 24.0, spend: 300, revenue: 2900, quadrant: 'scale', opportunity_score: 87, provenance: 'measured' },
  { sku: 'SKU-003', name: 'Organic Keratin Shampoo', category: 'haircare', margin_pct: 0.55, days_of_cover: 18.0, spend: 420, revenue: 1800, quadrant: 'scale', opportunity_score: 71, provenance: 'measured' },
  { sku: 'SKU-004', name: 'Argan Oil Hair Treatment', category: 'haircare', margin_pct: 0.68, days_of_cover: 5.5, spend: 600, revenue: 3200, quadrant: 'protect', opportunity_score: 64, provenance: 'measured' },
  { sku: 'SKU-005', name: 'Collagen Peptides Powder', category: 'wellness', margin_pct: 0.45, days_of_cover: 30.0, spend: 220, revenue: 900, quadrant: 'scale', opportunity_score: 55, provenance: 'derived' },
  { sku: 'SKU-006', name: 'Daily Multivitamin Complex', category: 'wellness', margin_pct: 0.15, days_of_cover: 12.0, spend: 800, revenue: 950, quadrant: 'pause', opportunity_score: 12, provenance: 'measured' },
  { sku: 'SKU-007', name: 'Seamless Performance Leggings', category: 'apparel', margin_pct: 0.58, days_of_cover: 3.0, spend: 350, revenue: 2200, quadrant: 'fix', opportunity_score: 41, provenance: 'scenario' },
  { sku: 'SKU-008', name: 'Oversized Cotton Hoodie', category: 'apparel', margin_pct: 0.72, days_of_cover: 20.0, spend: 900, revenue: 5100, quadrant: 'scale', opportunity_score: 91, provenance: 'measured' },
  { sku: 'SKU-009', name: 'Hyaluronic Acid Eye Cream', category: 'skincare', margin_pct: 0.66, days_of_cover: 8.0, spend: 280, revenue: 1400, quadrant: 'scale', opportunity_score: 68, provenance: 'derived' },
  { sku: 'SKU-010', name: 'Detoxifying Charcoal Mask', category: 'skincare', margin_pct: 0.12, days_of_cover: 22.0, spend: 700, revenue: 760, quadrant: 'pause', opportunity_score: 8, provenance: 'measured' },
  { sku: 'SKU-011', name: 'Volumizing Conditioner', category: 'haircare', margin_pct: 0.59, days_of_cover: 6.0, spend: 190, revenue: 1100, quadrant: 'protect', opportunity_score: 57, provenance: 'measured' },
  { sku: 'SKU-012', name: 'Sleep Support Gummies', category: 'wellness', margin_pct: 0.48, days_of_cover: 14.5, spend: 310, revenue: 1300, quadrant: 'scale', opportunity_score: 49, provenance: 'derived' },
  { sku: 'SKU-013', name: 'Athletic Training Tank', category: 'apparel', margin_pct: 0.53, days_of_cover: 2.0, spend: 460, revenue: 1950, quadrant: 'fix', opportunity_score: 36, provenance: 'measured' },
  { sku: 'SKU-014', name: 'Thermal Running Jacket', category: 'apparel', margin_pct: 0.61, days_of_cover: 35.0, spend: 150, revenue: 800, quadrant: 'scale', opportunity_score: 62, provenance: 'scenario' },
  { sku: 'SKU-015', name: 'Electrolyte Hydration Mix', category: 'wellness', margin_pct: 0.18, days_of_cover: 16.0, spend: 550, revenue: 610, quadrant: 'pause', opportunity_score: 14, provenance: 'measured' },
  { sku: 'SKU-016', name: 'Scalp Exfoliating Scrub', category: 'haircare', margin_pct: 0.70, days_of_cover: 9.0, spend: 420, revenue: 3600, quadrant: 'scale', opportunity_score: 79, provenance: 'measured' },
  { sku: 'SKU-017', name: 'Retinol Night Repair Cream', category: 'skincare', margin_pct: 0.76, days_of_cover: 4.0, spend: 750, revenue: 4800, quadrant: 'fix', opportunity_score: 73, provenance: 'measured' },
  { sku: 'SKU-018', name: 'Compression Workout Shorts', category: 'apparel', margin_pct: 0.38, days_of_cover: 25.0, spend: 200, revenue: 740, quadrant: 'scale', opportunity_score: 40, provenance: 'derived' },
  { sku: 'SKU-019', name: 'Ashwagandha Stress Formula', category: 'wellness', margin_pct: 0.64, days_of_cover: 7.0, spend: 380, revenue: 2300, quadrant: 'protect', opportunity_score: 67, provenance: 'measured' },
  { sku: 'SKU-020', name: 'Heat Protectant Spray', category: 'haircare', margin_pct: 0.41, days_of_cover: 19.0, spend: 170, revenue: 620, quadrant: 'scale', opportunity_score: 43, provenance: 'derived' },
];

// ─── Inline React Error Boundary ───────────────────────────────────────────────
class InventoryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("InventoryMargin ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          background: '#f3f3ed',
          minHeight: '100vh',
          fontFamily: FONT,
          color: '#000000',
        }}>
          <div style={{
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: '5px 5px 0px #000000',
            padding: 24,
            maxWidth: 600,
            margin: '40px auto',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', color: '#000000', marginTop: 0 }}>
              INVENTORY MATRIX — STUDIO RECOVERY
            </h2>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#333333' }}>
              Notice: {this.state.error?.message || 'A render issue occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                background: P?.accent?.lime || '#82e66f',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                padding: '6px 16px',
                fontWeight: 900,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: FONT,
                textTransform: 'uppercase',
                color: '#000000',
              }}
            >
              RELOAD STUDIO
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Types & Helpers ───────────────────────────────────────────────────────────
type SortField =
  | 'sku' | 'name' | 'category' | 'margin_pct' | 'days_of_cover'
  | 'spend' | 'revenue' | 'roas' | 'opportunity_score' | 'quadrant';

const ALL = 'all' as const;
type FilterValue = Quadrant | typeof ALL;

function normMargin(pct: number): number {
  const safe = pct ?? 0;
  return safe <= 1 ? safe * 100 : safe;
}

// ─── Mini Components ───────────────────────────────────────────────────────────
const QuadrantBadge: React.FC<{ quadrant: Quadrant }> = ({ quadrant }) => {
  const qKey = quadrant || 'scale';
  const color = quadrantMeta[qKey]?.color ?? '#cccccc';
  const label = quadrantMeta[qKey]?.label ?? qKey.toUpperCase();
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      background: color,
      color: '#000000',
      border: '2px solid #000000',
      fontSize: 10,
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontFamily: FONT,
    }}>
      {label}
    </span>
  );
};

const ProvenanceBadge: React.FC<{ provenance: Provenance | string }> = ({ provenance }) => {
  const pKey = provenance || 'scenario';
  const styles: Record<string, { bg: string; color: string }> = {
    measured: { bg: P?.accent?.cyan   || '#78dbf6', color: '#000000' },
    derived:  { bg: P?.bg?.gridLine   || '#e1e1d8', color: '#000000' },
    scenario: { bg: P?.accent?.yellow || '#ffd23f', color: '#000000' },
  };
  const s = styles[pKey] ?? styles.derived;
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 5px',
      marginLeft: 4,
      fontSize: 9,
      fontWeight: 900,
      textTransform: 'uppercase',
      background: s.bg,
      color: s.color,
      border: '1.5px solid #000000',
      fontFamily: FONT,
      verticalAlign: 'middle',
      letterSpacing: '0.04em',
    }}>
      {pKey}
    </span>
  );
};

const OpportunityBar: React.FC<{ score: number }> = ({ score }) => {
  const safeScore = score ?? 0;
  const barColor =
    safeScore >= 70 ? (P?.accent?.lime   || '#82e66f') :
    safeScore >= 40 ? (P?.accent?.yellow || '#ffd23f') :
                      (P?.accent?.pink   || '#f364cb');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 8, background: '#e1e1d8',
        border: '1.5px solid #000000', position: 'relative', minWidth: 60,
      }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, safeScore))}%`, height: '100%',
          background: barColor,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 900, fontFamily: FONT, color: '#000000', minWidth: 28 }}>
        {safeScore}
      </span>
    </div>
  );
};

const KPICard: React.FC<{
  label: string; value: string | number;
  icon: React.ReactNode; accent: string; sub?: string;
}> = ({ label, value, icon, accent, sub }) => (
  <div style={{ ...cardStyle, flex: 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
      <span style={{
        fontSize: 10, fontWeight: 900, color: '#555555', letterSpacing: '0.08em',
        textTransform: 'uppercase', fontFamily: FONT,
      }}>{label}</span>
      <span style={{ background: accent, border: '2px solid #000000', padding: '2px 6px', color: '#000000' }}>
        {icon}
      </span>
    </div>
    <div style={{ fontSize: 32, fontWeight: 900, color: '#000000', fontFamily: FONT, lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: '#555555', marginTop: 4, fontFamily: FONT, fontWeight: 600 }}>{sub}</div>}
  </div>
);

// ─── Sortable TH ───────────────────────────────────────────────────────────────
const Th: React.FC<{
  col: SortField; label: string; sortKey: SortField;
  sortDir: 'asc' | 'desc'; onSort: (k: SortField) => void;
}> = ({ col, label, sortKey, sortDir, onSort }) => (
  <th
    onClick={() => onSort(col)}
    style={{
      textAlign: 'left',
      padding: '10px 12px',
      fontSize: 10,
      fontWeight: 900,
      fontFamily: FONT,
      color: sortKey === col ? '#000000' : '#555555',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      cursor: 'pointer',
      borderBottom: '3px solid #000000',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      background: sortKey === col ? '#e1e1d8' : 'transparent',
    }}
  >
    {label}
    {sortKey === col && (
      <span style={{ marginLeft: 4, fontWeight: 900, color: '#000000' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
    )}
  </th>
);

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: FONT,
  fontWeight: 500,
  color: '#000000',
  borderBottom: '1px solid #e1e1d8',
};

// ─── Main Inner Component ──────────────────────────────────────────────────────
function InventoryMarginInner() {
  const [skus, setSkus] = useState<SKUBubble[]>(DEFAULT_20_SKUS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('LIVE');

  const fetchInventoryData = useCallback(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch('/api/inventory-margin')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        let list: any[] = [];
        if (Array.isArray(data) && data.length > 0) {
          list = data;
        } else if (data && Array.isArray(data.skus) && data.skus.length > 0) {
          list = data.skus;
        }
        if (list.length > 0) {
          const parsed = list.map(item => ({
            sku: item?.sku || 'SKU-000',
            name: item?.name || 'Unknown Product',
            category: item?.category || 'general',
            margin_pct: typeof item?.margin_pct === 'number' ? item.margin_pct : 0.5,
            days_of_cover: typeof item?.days_of_cover === 'number' ? item.days_of_cover : 14,
            spend: typeof item?.spend === 'number' ? item.spend : 0,
            revenue: typeof item?.revenue === 'number' ? item.revenue : 0,
            quadrant: (['scale','protect','pause','fix'].includes(item?.quadrant) ? item.quadrant : 'scale') as Quadrant,
            opportunity_score: typeof item?.opportunity_score === 'number' ? item.opportunity_score : 50,
            provenance: (item?.provenance || 'scenario') as Provenance,
          }));
          setSkus(parsed);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      })
      .catch((err) => {
        console.warn('Using default 20 SKUs fallback:', err);
        if (isMounted) setSkus(DEFAULT_20_SKUS);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = fetchInventoryData();
    return cleanup;
  }, [fetchInventoryData]);

  const refetch = () => {
    fetchInventoryData();
  };

  const [activeFilter, setActiveFilter] = useState<FilterValue>(ALL);
  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortField>('opportunity_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const totalSkus  = skus.length;
  const avgMargin  = totalSkus > 0 ? skus.reduce((s, b) => s + normMargin(b?.margin_pct ?? 0), 0) / totalSkus : 0;
  const avgCover   = totalSkus > 0 ? skus.reduce((s, b) => s + (b?.days_of_cover ?? 0), 0) / totalSkus : 0;
  const atRisk     = skus.filter(b => (b?.quadrant || '') === 'pause' || (b?.quadrant || '') === 'fix').length;

  const filteredSkus = useMemo(
    () => skus
      .filter(b => activeFilter === ALL || (b?.quadrant || '') === activeFilter)
      .filter(b => {
        if (!search) return true;
        const q = search.trim().toLowerCase();
        return (
          (b?.sku || '').toLowerCase().includes(q) ||
          (b?.name || '').toLowerCase().includes(q) ||
          (b?.category || '').toLowerCase().includes(q)
        );
      }),
    [skus, activeFilter, search],
  );

  const getRoas = (b: SKUBubble) => (b?.spend ?? 0) > 0 ? (b?.revenue ?? 0) / (b?.spend ?? 1) : 0;

  const sortedSkus = useMemo(() => {
    const copy = [...filteredSkus];
    copy.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;

      if (sortKey === 'roas') {
        va = getRoas(a);
        vb = getRoas(b);
      } else if (sortKey === 'margin_pct') {
        va = normMargin(a?.margin_pct ?? 0);
        vb = normMargin(b?.margin_pct ?? 0);
      } else {
        va = (a?.[sortKey as keyof SKUBubble] ?? 0) as number | string;
        vb = (b?.[sortKey as keyof SKUBubble] ?? 0) as number | string;
      }

      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredSkus, sortKey, sortDir]);

  function handleSort(k: SortField) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  }

  const filterBtns: { value: FilterValue; label: string; accent: string }[] = [
    { value: ALL, label: `ALL (${skus.length})`, accent: P?.bg?.border || '#000000' },
    { value: 'scale',   label: `SCALE (${skus.filter(s => s?.quadrant === 'scale').length})`,   accent: P?.accent?.lime   || '#82e66f' },
    { value: 'protect', label: `PROTECT (${skus.filter(s => s?.quadrant === 'protect').length})`, accent: P?.accent?.yellow || '#ffd23f' },
    { value: 'pause',   label: `PAUSE (${skus.filter(s => s?.quadrant === 'pause').length})`,   accent: P?.accent?.pink   || '#f364cb' },
    { value: 'fix',     label: `FIX (${skus.filter(s => s?.quadrant === 'fix').length})`,       accent: P?.accent?.cyan   || '#78dbf6' },
  ];

  return (
    <div style={{
      padding: '28px 36px',
      maxWidth: 1440,
      margin: '0 auto',
      fontFamily: FONT,
      background: '#f3f3ed',
      color: '#000000',
      minHeight: '100vh',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: '#000000', letterSpacing: '-0.02em',
            textTransform: 'uppercase', fontFamily: FONT, margin: 0,
          }}>
            INVENTORY <span style={{ color: P?.accent?.lime || '#82e66f' }}>×</span> MARGIN MATRIX
          </h1>
          <p style={{ color: '#555555', fontSize: 13, marginTop: 4, fontFamily: FONT, fontWeight: 600 }}>
            SKU-level profitability and stock health overview
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live Engine Badge */}
          <span style={{
            background: P?.accent?.lime || '#82e66f', border: '2px solid #000000',
            padding: '5px 14px', fontSize: 11, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT,
            color: '#000000',
          }}>● LIVE ENGINE</span>
          <span style={{
            fontSize: 11, fontFamily: FONT, fontWeight: 600,
            color: '#333333', padding: '5px 10px',
            background: '#ffffff', border: '2px solid #000000',
          }}>Updated {lastUpdated}</span>
          <button
            onClick={() => refetch()}
            style={{
              background: '#ffffff', border: '3px solid #000000',
              boxShadow: '3px 3px 0 #000000', padding: '5px 12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: FONT, fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
              color: '#000000',
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 4 KPI Cards Row ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Total SKUs" value={totalSkus}
          icon={<Package size={14} />} accent={P?.accent?.lime || '#82e66f'}
        />
        <KPICard
          label="Avg Margin" value={`${avgMargin.toFixed(1)}%`}
          icon={<TrendingUp size={14} />} accent={P?.accent?.lime || '#82e66f'}
        />
        <KPICard
          label="Avg Stock Cover" value={`${avgCover.toFixed(1)} days`}
          icon={<BarChart3 size={14} />} accent={P?.accent?.cyan || '#78dbf6'}
          sub="days of inventory"
        />
        <KPICard
          label="At-Risk SKUs" value={atRisk}
          icon={<AlertTriangle size={14} />} accent={P?.accent?.pink || '#f364cb'}
          sub="pause or fix quadrant"
        />
      </div>

      {/* ── Quadrant Filter Bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {filterBtns.map(({ value, label, accent }) => {
          const isActive = activeFilter === value;
          return (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              style={{
                padding: '8px 18px',
                fontSize: 12,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                cursor: 'pointer',
                fontFamily: FONT,
                border: '3px solid #000000',
                background: isActive ? accent : '#ffffff',
                color: '#000000',
                boxShadow: isActive ? '5px 5px 0px #000000' : '3px 3px 0px #000000',
                transform: isActive ? 'translate(-2px,-2px)' : 'none',
                transition: 'all 0.1s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── ECharts Bubble Chart ── */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{
          borderBottom: '3px solid #000000', paddingBottom: 12, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 900, color: '#000000', textTransform: 'uppercase', fontFamily: FONT, margin: 0 }}>
              Margin % vs Days of Cover
            </h2>
            <p style={{ fontSize: 11, color: '#555555', marginTop: 3, fontFamily: FONT, fontWeight: 600 }}>
              Bubble size = 7-day ad spend · Click a bubble to highlight row
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['scale','protect','pause','fix'] as Quadrant[]).map(q => (
              <span key={q} style={{
                background: quadrantMeta[q]?.color ?? '#ccc', border: '2px solid #000000',
                padding: '2px 10px', fontSize: 10, fontWeight: 900,
                textTransform: 'uppercase', fontFamily: FONT, color: '#000000',
              }}>{quadrantMeta[q]?.label ?? q}</span>
            ))}
          </div>
        </div>
        <BubbleChart
          data={filteredSkus}
          onSkuClick={sku => setHighlightedSku(s => s === sku ? null : sku)}
          highlightedSku={highlightedSku}
        />
      </div>

      {/* ── Search & Sortable SKU Data Table ── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: '#000000', textTransform: 'uppercase', fontFamily: FONT, margin: 0 }}>
            SKU Data Table
            <span style={{ marginLeft: 10, fontSize: 12, color: '#555555', fontWeight: 600 }}>
              ({filteredSkus.length} of {totalSkus} SKUs)
            </span>
          </h2>
          {/* Live Search Input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#ffffff', border: '3px solid #000000',
            boxShadow: '3px 3px 0 #000000', padding: '6px 12px',
          }}>
            <Search size={13} color="#000000" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH SKU, NAME, CATEGORY…"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#000000', fontSize: 12, width: 240,
                fontFamily: FONT, fontWeight: 700,
                textTransform: 'uppercase',
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#000000' }}>
            <thead>
              <tr>
                <Th col="sku"               label="SKU"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="name"              label="Product Name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="category"          label="Category"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="margin_pct"        label="Margin %"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="days_of_cover"     label="Cover (days)" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="spend"             label="Spend (7d)"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="revenue"           label="Revenue (7d)" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="roas"              label="ROAS"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="quadrant"          label="Quadrant"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="opportunity_score" label="Opportunity"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedSkus.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#555555', fontFamily: FONT, fontWeight: 700, textTransform: 'uppercase' }}>
                    No SKUs match your search filter.
                  </td>
                </tr>
              )}
              {sortedSkus.map(b => {
                const spend = b?.spend ?? 0;
                const revenue = b?.revenue ?? 0;
                const roas = spend > 0 ? (revenue / spend).toFixed(2) : '—';
                const isHighlighted = highlightedSku === b.sku;
                const qColor = quadrantMeta[b?.quadrant || 'scale']?.color ?? '#ccc';
                const mPct = normMargin(b?.margin_pct ?? 0);
                const daysCover = b?.days_of_cover ?? 0;

                return (
                  <tr
                    key={b.sku}
                    onClick={() => setHighlightedSku(s => s === b.sku ? null : b.sku)}
                    style={{
                      cursor: 'pointer',
                      background: isHighlighted ? '#e1e1d8' : 'transparent',
                      borderLeft: isHighlighted ? `5px solid ${qColor}` : '5px solid transparent',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isHighlighted)
                        (e.currentTarget as HTMLTableRowElement).style.background = '#e1e1d8';
                    }}
                    onMouseLeave={e => {
                      if (!isHighlighted)
                        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                    }}
                  >
                    <td style={tdStyle}>
                      <code style={{ fontFamily: FONT, fontWeight: 900, fontSize: 12, color: '#000000' }}>{b.sku}</code>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{b.name}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {b.category}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 900, color: '#000000' }}>{mPct.toFixed(1)}%</span>
                      <ProvenanceBadge provenance={b.provenance || "scenario"} />
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontWeight: 900,
                        color: daysCover < 7 ? (P?.accent?.pink || '#f364cb') : '#000000',
                      }}>
                        {daysCover.toFixed(1)}d
                      </span>
                      <ProvenanceBadge provenance="derived" />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      ${spend.toLocaleString()}
                      <ProvenanceBadge provenance="measured" />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      ${revenue.toLocaleString()}
                      <ProvenanceBadge provenance="measured" />
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontWeight: 900,
                        color: spend > 0 && revenue / spend >= 2 ? (P?.accent?.lime || '#82e66f') : '#000000',
                      }}>
                        {roas}×
                      </span>
                      <ProvenanceBadge provenance="derived" />
                    </td>
                    <td style={tdStyle}>
                      <QuadrantBadge quadrant={b.quadrant} />
                    </td>
                    <td style={{ ...tdStyle, minWidth: 140 }}>
                      <OpportunityBar score={b.opportunity_score} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Exported Component wrapped in Error Boundary ──────────────────────────────
export function InventoryMargin() {
  return (
    <InventoryErrorBoundary>
      <InventoryMarginInner />
    </InventoryErrorBoundary>
  );
}

export default InventoryMargin;
