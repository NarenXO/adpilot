// frontend/src/pages/InventoryMargin.tsx
// Invente '26 Neo-Brutalist — Inventory × Margin Studio
import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, AlertTriangle, TrendingUp, Package, BarChart3 } from 'lucide-react';
import { BubbleChart } from '../components/charts/BubbleChart';
import { useInventoryMargin } from '../api/hooks';
import type { SKUBubble, Quadrant } from '../types/api';
import { palette, quadrantMeta } from '../theme/tokens';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const P = palette;
const FONT = "'Space Grotesk', monospace, sans-serif";

const cardStyle: React.CSSProperties = {
  background: P.bg.card,
  border: `3px solid ${P.bg.border}`,
  boxShadow: `5px 5px 0px ${P.bg.shadow}`,
  borderRadius: 0,
  padding: 20,
};

// ─── Types ─────────────────────────────────────────────────────────────────────
type SortField =
  | 'sku' | 'name' | 'category' | 'margin_pct' | 'days_of_cover'
  | 'spend' | 'revenue' | 'roas' | 'opportunity_score' | 'quadrant';

const ALL = 'all' as const;
type FilterValue = Quadrant | typeof ALL;

// ─── Mini Components ───────────────────────────────────────────────────────────
const QuadrantBadge: React.FC<{ quadrant: Quadrant }> = ({ quadrant }) => {
  const color = quadrantMeta[quadrant].color;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      background: color,
      color: P.text.primary,
      border: `2px solid ${P.bg.border}`,
      fontSize: 10,
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      fontFamily: FONT,
    }}>
      {quadrantMeta[quadrant].label}
    </span>
  );
};

const ProvenanceBadge: React.FC<{ provenance: string }> = ({ provenance }) => {
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
      border: '1.5px solid #000',
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
        border: '1.5px solid #000', position: 'relative', minWidth: 60,
      }}>
        <div style={{
          width: `${score}%`, height: '100%',
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
      <span style={{ background: accent, border: '2px solid #000', padding: '2px 6px', color: '#000' }}>
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
      borderBottom: `3px solid ${P.bg.border}`,
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
  const { data, isLoading, error, refetch, dataUpdatedAt } = useInventoryMargin();

  const [activeFilter, setActiveFilter] = useState<FilterValue>(ALL);
  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortField>('opportunity_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const skus: SKUBubble[] = data ?? [];

  const totalSkus  = skus.length;
  const avgMargin  = totalSkus > 0 ? skus.reduce((s, b) => s + b.margin_pct, 0) / totalSkus : 0;
  const avgCover   = totalSkus > 0 ? skus.reduce((s, b) => s + b.days_of_cover, 0) / totalSkus : 0;
  const atRisk     = skus.filter(b => b.quadrant === 'pause' || b.quadrant === 'fix').length;

  const filteredSkus = useMemo(
    () => skus
      .filter(b => activeFilter === ALL || b.quadrant === activeFilter)
      .filter(b => {
        if (!search) return true;
        const q = search.toLowerCase();
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
      const va: number | string = sortKey === 'roas'
        ? getRoas(a)
        : (a[sortKey as keyof SKUBubble] as number | string);
      const vb: number | string = sortKey === 'roas'
        ? getRoas(b)
        : (b[sortKey as keyof SKUBubble] as number | string);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredSkus, sortKey, sortDir]);

  function handleSort(k: SortField) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  }

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—';

  if (isLoading) {
    return (
      <div style={{ padding: 40, fontFamily: FONT, textAlign: 'center', background: P.bg.base, minHeight: '100vh' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} size={28} />
        <p style={{ marginTop: 16, fontWeight: 700, textTransform: 'uppercase', fontSize: 14 }}>Loading SKU data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: FONT, textAlign: 'center', background: P.bg.base, minHeight: '100vh' }}>
        <AlertTriangle size={36} />
        <p style={{ marginTop: 12, fontWeight: 700, textTransform: 'uppercase', fontSize: 14, color: P.accent.pink }}>
          Failed to load data. Check backend.
        </p>
      </div>
    );
  }

  const filterBtns: { value: FilterValue; label: string; accent: string }[] = [
    { value: ALL, label: 'ALL', accent: P.bg.border },
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
      background: P.bg.base,
      minHeight: '100vh',
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: P.text.primary, letterSpacing: '-0.02em',
            textTransform: 'uppercase', fontFamily: FONT, margin: 0,
          }}>
            INVENTORY <span style={{ color: P.accent.lime }}>×</span> MARGIN STUDIO
          </h1>
          <p style={{ color: P.text.subtle, fontSize: 13, marginTop: 4, fontFamily: FONT, fontWeight: 600 }}>
            SKU Profitability &amp; Stock Coverage Matrix
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* LIVE pill */}
          <span style={{
            background: P.accent.lime, border: `2px solid ${P.bg.border}`,
            padding: '5px 14px', fontSize: 11, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT,
            color: '#000',
          }}>● LIVE ENGINE</span>
          <span style={{
            fontSize: 11, fontFamily: FONT, fontWeight: 600,
            color: P.text.subtle, padding: '5px 10px',
            background: P.bg.card, border: `2px solid ${P.bg.border}`,
          }}>Updated {lastUpdated}</span>
          <button
            onClick={() => refetch()}
            style={{
              background: P.bg.card, border: `3px solid ${P.bg.border}`,
              boxShadow: '3px 3px 0 #000', padding: '5px 12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: FONT, fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
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
          label="Avg Stock Cover" value={`${avgCover.toFixed(1)}d`}
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
                border: `3px solid ${P.bg.border}`,
                background: isActive ? accent : P.bg.card,
                color: P.text.primary,
                boxShadow: isActive ? `5px 5px 0px ${P.bg.shadow}` : `3px 3px 0px ${P.bg.shadow}`,
                transform: isActive ? 'translate(-2px,-2px)' : 'none',
                transition: 'all 0.1s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Bubble Chart ── */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{
          borderBottom: `3px solid ${P.bg.border}`, paddingBottom: 12, marginBottom: 16,
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
                background: quadrantMeta[q].color, border: `2px solid #000`,
                padding: '2px 10px', fontSize: 10, fontWeight: 900,
                textTransform: 'uppercase', fontFamily: FONT, color: '#000',
              }}>{quadrantMeta[q].label}</span>
            ))}
          </div>
        </div>
        <BubbleChart
          data={filteredSkus}
          onSkuClick={sku => setHighlightedSku(s => s === sku ? null : sku)}
          highlightedSku={highlightedSku}
        />
      </div>

      {/* ── SKU Table ── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: P.text.primary, textTransform: 'uppercase', fontFamily: FONT, margin: 0 }}>
            SKU Details
            <span style={{ marginLeft: 10, fontSize: 12, color: P.text.subtle, fontWeight: 600 }}>
              {filteredSkus.length} of {totalSkus}
            </span>
          </h2>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: P.bg.card, border: `3px solid ${P.bg.border}`,
            boxShadow: '3px 3px 0 #000', padding: '6px 12px',
          }}>
            <Search size={13} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH SKU, NAME, CATEGORY…"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: P.text.primary, fontSize: 12, width: 220,
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
                <Th col="days_of_cover"     label="Cover (d)"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="spend"             label="Spend (7d)"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="revenue"           label="Revenue"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="roas"              label="ROAS"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="opportunity_score" label="Opp. Score"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="quadrant"          label="Quadrant"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedSkus.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: P.text.subtle, fontFamily: FONT, fontWeight: 700, textTransform: 'uppercase' }}>
                    No SKUs match your search.
                  </td>
                </tr>
              )}
              {sortedSkus.map(b => {
                const roas = b.spend > 0 ? (b.revenue / b.spend).toFixed(2) : '—';
                const isHighlighted = highlightedSku === b.sku;
                const qColor = quadrantMeta[b.quadrant].color;
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
                      <span style={{ fontWeight: 900 }}>{b.margin_pct.toFixed(1)}%</span>
                      <ProvenanceBadge provenance="scenario" />
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontWeight: 900,
                        color: b.days_of_cover < 7 ? P.accent.pink : P.text.primary,
                      }}>
                        {b.days_of_cover.toFixed(1)}
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
                    <td style={{ ...tdStyle, minWidth: 140 }}>
                      <OpportunityBar score={b.opportunity_score} />
                    </td>
                    <td style={tdStyle}>
                      <QuadrantBadge quadrant={b.quadrant} />
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
