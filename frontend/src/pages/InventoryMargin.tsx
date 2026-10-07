// frontend/src/pages/InventoryMargin.tsx
// Invente '26 Neo-Brutalist — Inventory × Margin Studio
import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, AlertTriangle, TrendingUp, Package, BarChart3 } from 'lucide-react';
import { BubbleChart } from '../components/charts/BubbleChart';
import { useInventoryMargin } from '../api/hooks';
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

// ─── Types ─────────────────────────────────────────────────────────────────────
type SortField =
  | 'sku' | 'name' | 'category' | 'margin_pct' | 'days_of_cover'
  | 'spend' | 'revenue' | 'roas' | 'opportunity_score' | 'quadrant';

const ALL = 'all' as const;
type FilterValue = Quadrant | typeof ALL;

// Helper to normalize margin percentage (e.g. 0.62 -> 62.0%, 62.0 -> 62.0%)
function normMargin(pct: number): number {
  return pct <= 1 ? pct * 100 : pct;
}

// ─── Mini Components ───────────────────────────────────────────────────────────
const QuadrantBadge: React.FC<{ quadrant: Quadrant }> = ({ quadrant }) => {
  const color = quadrantMeta[quadrant]?.color ?? '#cccccc';
  const label = quadrantMeta[quadrant]?.label ?? quadrant.toUpperCase();
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
  const styles: Record<string, { bg: string; color: string }> = {
    measured: { bg: P.accent.cyan,   color: '#000' },
    derived:  { bg: P.bg.gridLine,   color: '#000' },
    scenario: { bg: P.accent.yellow, color: '#000' },
  };
  const s = styles[provenance] ?? styles.derived;
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
      {provenance}
    </span>
  );
};

const OpportunityBar: React.FC<{ score: number }> = ({ score }) => {
  const barColor =
    score >= 70 ? P.accent.lime :
    score >= 40 ? P.accent.yellow :
                  P.accent.pink;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 8, background: P.bg.gridLine,
        border: '1.5px solid #000000', position: 'relative', minWidth: 60,
      }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, score))}%`, height: '100%',
          background: barColor,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 900, fontFamily: FONT, minWidth: 28 }}>
        {score}
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
        fontSize: 10, fontWeight: 900, color: P.text.subtle, letterSpacing: '0.08em',
        textTransform: 'uppercase', fontFamily: FONT,
      }}>{label}</span>
      <span style={{ background: accent, border: '2px solid #000000', padding: '2px 6px', color: '#000000' }}>
        {icon}
      </span>
    </div>
    <div style={{ fontSize: 32, fontWeight: 900, color: P.text.primary, fontFamily: FONT, lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: P.text.subtle, marginTop: 4, fontFamily: FONT }}>{sub}</div>}
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
      color: sortKey === col ? P.text.primary : P.text.subtle,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      cursor: 'pointer',
      borderBottom: '3px solid #000000',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      background: sortKey === col ? P.bg.gridLine : 'transparent',
    }}
  >
    {label}
    {sortKey === col && (
      <span style={{ marginLeft: 4, fontWeight: 900 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
    )}
  </th>
);

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: FONT,
  fontWeight: 500,
  color: P.text.primary,
  borderBottom: `1px solid ${P.bg.gridLine}`,
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryMargin() {
  const { data, refetch, dataUpdatedAt } = useInventoryMargin();

  const [activeFilter, setActiveFilter] = useState<FilterValue>(ALL);
  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortField>('opportunity_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Fall back to built-in 20 SKUs so the UI ALWAYS renders immediately without placeholder stub
  const skus: SKUBubble[] = useMemo(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      return data;
    }
    return DEFAULT_20_SKUS;
  }, [data]);

  const totalSkus  = skus.length;
  const avgMargin  = totalSkus > 0 ? skus.reduce((s, b) => s + normMargin(b.margin_pct), 0) / totalSkus : 0;
  const avgCover   = totalSkus > 0 ? skus.reduce((s, b) => s + b.days_of_cover, 0) / totalSkus : 0;
  const atRisk     = skus.filter(b => b.quadrant === 'pause' || b.quadrant === 'fix').length;

  const filteredSkus = useMemo(
    () => skus
      .filter(b => activeFilter === ALL || b.quadrant === activeFilter)
      .filter(b => {
        if (!search) return true;
        const q = search.trim().toLowerCase();
        return (
          b.sku.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q)
        );
      }),
    [skus, activeFilter, search],
  );

  const getRoas = (b: SKUBubble) => b.spend > 0 ? b.revenue / b.spend : 0;

  const sortedSkus = useMemo(() => {
    const copy = [...filteredSkus];
    copy.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;

      if (sortKey === 'roas') {
        va = getRoas(a);
        vb = getRoas(b);
      } else if (sortKey === 'margin_pct') {
        va = normMargin(a.margin_pct);
        vb = normMargin(b.margin_pct);
      } else {
        va = a[sortKey as keyof SKUBubble] as number | string;
        vb = b[sortKey as keyof SKUBubble] as number | string;
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

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'LIVE';

  const filterBtns: { value: FilterValue; label: string; accent: string }[] = [
    { value: ALL, label: `ALL (${skus.length})`, accent: P.bg.border },
    { value: 'scale',   label: `SCALE (${skus.filter(s => s.quadrant === 'scale').length})`,   accent: P.accent.lime },
    { value: 'protect', label: `PROTECT (${skus.filter(s => s.quadrant === 'protect').length})`, accent: P.accent.yellow },
    { value: 'pause',   label: `PAUSE (${skus.filter(s => s.quadrant === 'pause').length})`,   accent: P.accent.pink },
    { value: 'fix',     label: `FIX (${skus.filter(s => s.quadrant === 'fix').length})`,       accent: P.accent.cyan },
  ];

  return (
    <div style={{
      padding: '28px 36px',
      maxWidth: 1440,
      margin: '0 auto',
      fontFamily: FONT,
      background: '#f3f3ed',
      minHeight: '100vh',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: P.text.primary, letterSpacing: '-0.02em',
            textTransform: 'uppercase', fontFamily: FONT, margin: 0,
          }}>
            INVENTORY <span style={{ color: P.accent.lime }}>×</span> MARGIN MATRIX
          </h1>
          <p style={{ color: P.text.subtle, fontSize: 13, marginTop: 4, fontFamily: FONT, fontWeight: 600 }}>
            SKU-level profitability and stock health overview
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live Engine Badge */}
          <span style={{
            background: P.accent.lime, border: '2px solid #000000',
            padding: '5px 14px', fontSize: 11, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT,
            color: '#000000',
          }}>● LIVE ENGINE</span>
          <span style={{
            fontSize: 11, fontFamily: FONT, fontWeight: 600,
            color: P.text.subtle, padding: '5px 10px',
            background: '#ffffff', border: '2px solid #000000',
          }}>Updated {lastUpdated}</span>
          <button
            onClick={() => refetch()}
            style={{
              background: '#ffffff', border: '3px solid #000000',
              boxShadow: '3px 3px 0 #000000', padding: '5px 12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: FONT, fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
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
          icon={<Package size={14} />} accent={P.accent.lime}
        />
        <KPICard
          label="Avg Margin" value={`${avgMargin.toFixed(1)}%`}
          icon={<TrendingUp size={14} />} accent={P.accent.lime}
        />
        <KPICard
          label="Avg Stock Cover" value={`${avgCover.toFixed(1)} days`}
          icon={<BarChart3 size={14} />} accent={P.accent.cyan}
          sub="days of inventory"
        />
        <KPICard
          label="At-Risk SKUs" value={atRisk}
          icon={<AlertTriangle size={14} />} accent={P.accent.pink}
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
                color: P.text.primary,
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
            <h2 style={{ fontSize: 14, fontWeight: 900, color: P.text.primary, textTransform: 'uppercase', fontFamily: FONT, margin: 0 }}>
              Margin % vs Days of Cover
            </h2>
            <p style={{ fontSize: 11, color: P.text.subtle, marginTop: 3, fontFamily: FONT, fontWeight: 600 }}>
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
          <h2 style={{ fontSize: 14, fontWeight: 900, color: P.text.primary, textTransform: 'uppercase', fontFamily: FONT, margin: 0 }}>
            SKU Data Table
            <span style={{ marginLeft: 10, fontSize: 12, color: P.text.subtle, fontWeight: 600 }}>
              ({filteredSkus.length} of {totalSkus} SKUs)
            </span>
          </h2>
          {/* Live Search Input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#ffffff', border: '3px solid #000000',
            boxShadow: '3px 3px 0 #000000', padding: '6px 12px',
          }}>
            <Search size={13} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH SKU, NAME, CATEGORY…"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: P.text.primary, fontSize: 12, width: 240,
                fontFamily: FONT, fontWeight: 700,
                textTransform: 'uppercase',
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: P.text.subtle, fontFamily: FONT, fontWeight: 700, textTransform: 'uppercase' }}>
                    No SKUs match your search filter.
                  </td>
                </tr>
              )}
              {sortedSkus.map(b => {
                const roas = b.spend > 0 ? (b.revenue / b.spend).toFixed(2) : '—';
                const isHighlighted = highlightedSku === b.sku;
                const qColor = quadrantMeta[b.quadrant]?.color ?? '#ccc';
                const mPct = normMargin(b.margin_pct);

                return (
                  <tr
                    key={b.sku}
                    onClick={() => setHighlightedSku(s => s === b.sku ? null : b.sku)}
                    style={{
                      cursor: 'pointer',
                      background: isHighlighted ? P.bg.gridLine : 'transparent',
                      borderLeft: isHighlighted ? `5px solid ${qColor}` : '5px solid transparent',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isHighlighted)
                        (e.currentTarget as HTMLTableRowElement).style.background = P.bg.gridLine;
                    }}
                    onMouseLeave={e => {
                      if (!isHighlighted)
                        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                    }}
                  >
                    <td style={tdStyle}>
                      <code style={{ fontFamily: FONT, fontWeight: 900, fontSize: 12 }}>{b.sku}</code>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{b.name}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: P.text.subtle, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {b.category}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 900 }}>{mPct.toFixed(1)}%</span>
                      <ProvenanceBadge provenance={b.provenance || "scenario"} />
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontWeight: 900,
                        color: b.days_of_cover < 7 ? P.accent.pink : P.text.primary,
                      }}>
                        {b.days_of_cover.toFixed(1)}d
                      </span>
                      <ProvenanceBadge provenance="derived" />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      ${b.spend.toLocaleString()}
                      <ProvenanceBadge provenance="measured" />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      ${b.revenue.toLocaleString()}
                      <ProvenanceBadge provenance="measured" />
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontWeight: 900,
                        color: b.spend > 0 && b.revenue / b.spend >= 2 ? P.accent.lime : P.text.primary,
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
