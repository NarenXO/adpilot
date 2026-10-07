import React, { useState, useMemo } from 'react';
import { AlertTriangle, TrendingUp, Package, BarChart3, Search, RefreshCw } from 'lucide-react';
import { BubbleChart } from '../components/charts/BubbleChart';
import { useInventoryMargin } from '../api/hooks';
import type { SKUBubble, Quadrant } from '../types/api';
import { colors, quadrantMeta } from '../theme/tokens';

// ─── Mini UI primitives (self-contained so no missing imports) ────────────────



const KPICard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  sub?: string;
}> = ({ label, value, icon, accent = colors.accent, sub }) => (
  <div
    style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      flex: 1,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: colors.muted, fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: accent, opacity: 0.8 }}>{icon}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: colors.muted }}>{sub}</div>}
  </div>
);

const QuadrantBadge: React.FC<{ quadrant: Quadrant }> = ({ quadrant }) => {
  const meta = quadrantMeta[quadrant];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.color}40`,
      }}
    >
      {meta.label}
    </span>
  );
};

const ProvenanceBadge: React.FC<{ provenance: string }> = ({ provenance }) => {
  const styles: Record<string, { color: string; bg: string }> = {
    measured: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    derived:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
    scenario: { color: colors.fix,   bg: 'rgba(168,85,247,0.1)' },
  };
  const s = styles[provenance] ?? styles.derived;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        color: s.color,
        background: s.bg,
        marginLeft: 4,
        verticalAlign: 'middle',
      }}
    >
      {provenance}
    </span>
  );
};

const OpportunityBar: React.FC<{ score: number }> = ({ score }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div
      style={{
        flex: 1,
        height: 6,
        background: colors.border,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${score}%`,
          height: '100%',
          borderRadius: 3,
          background: score >= 70 ? colors.scale : score >= 40 ? colors.protect : colors.pause,
          transition: 'width 0.5s ease',
        }}
      />
    </div>
    <span style={{ fontSize: 11, color: colors.muted, minWidth: 28 }}>{score.toFixed(0)}</span>
  </div>
);

// ─── Sortable table header ────────────────────────────────────────────────────
type SortField = 'sku' | 'name' | 'category' | 'margin_pct' | 'days_of_cover' | 'spend' | 'revenue' | 'roas' | 'opportunity_score' | 'quadrant';

const Th: React.FC<{
  col: SortField;
  label: string;
  sortKey: SortField;
  sortDir: 'asc' | 'desc';
  onSort: (k: SortField) => void;
}> = ({ col, label, sortKey, sortDir, onSort }) => (
  <th
    onClick={() => onSort(col)}
    style={{
      textAlign: 'left',
      padding: '10px 12px',
      fontSize: 11,
      fontWeight: 600,
      color: sortKey === col ? colors.accent : colors.muted,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      cursor: 'pointer',
      borderBottom: `1px solid ${colors.border}`,
      userSelect: 'none',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
    {sortKey === col && (
      <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
    )}
  </th>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

const ALL = 'all' as const;
type FilterValue = Quadrant | typeof ALL;

export default function InventoryMargin() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useInventoryMargin();

  const [activeFilter, setActiveFilter] = useState<FilterValue>(ALL);
  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortField>('opportunity_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const skus: SKUBubble[] = data ?? [];

  // KPIs
  const totalSkus = skus.length;
  const avgMargin = totalSkus > 0 ? skus.reduce((s, b) => s + b.margin_pct, 0) / totalSkus : 0;
  const avgCover  = totalSkus > 0 ? skus.reduce((s, b) => s + b.days_of_cover, 0) / totalSkus : 0;
  const atRisk    = skus.filter(b => b.quadrant === 'pause' || b.quadrant === 'fix').length;

  // Filtered data for chart + table
  const filteredSkus = useMemo(
    () =>
      skus
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

  const getRoas = (item: SKUBubble) => item.spend > 0 ? item.revenue / item.spend : 0;

  // Sorted for table
  const sortedSkus = useMemo(() => {
    const copy = [...filteredSkus];
    copy.sort((a, b) => {
      const va: number | string = sortKey === 'roas' ? getRoas(a) : (a[sortKey as keyof SKUBubble] as number | string);
      const vb: number | string = sortKey === 'roas' ? getRoas(b) : (b[sortKey as keyof SKUBubble] as number | string);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredSkus, sortKey, sortDir]);

  function handleSort(k: SortField) {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('desc'); }
  }

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—';

  if (isLoading) {
    return (
      <div style={{ padding: 32, color: colors.muted, textAlign: 'center' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} size={24} />
        <p style={{ marginTop: 12 }}>Loading SKU data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: colors.pause }}>
        <AlertTriangle size={32} />
        <p style={{ marginTop: 12 }}>Failed to load data.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.text, letterSpacing: '-0.02em' }}>
            Inventory <span style={{ color: colors.accent }}>×</span> Margin Studio
          </h1>
          <p style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
            SKU-level profitability and stock health overview
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              color: colors.muted,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: '4px 10px',
            }}
          >
            Updated {lastUpdated}
          </span>
          <button
            onClick={() => refetch()}
            style={{
              background: colors.surface2,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: '6px 10px',
              color: colors.muted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Total SKUs"
          value={totalSkus}
          icon={<Package size={18} />}
          accent={colors.accent}
        />
        <KPICard
          label="Avg Margin"
          value={`${avgMargin.toFixed(1)}%`}
          icon={<TrendingUp size={18} />}
          accent={colors.scale}
        />
        <KPICard
          label="Avg Cover"
          value={`${avgCover.toFixed(1)}d`}
          icon={<BarChart3 size={18} />}
          accent={colors.protect}
          sub="days of inventory"
        />
        <KPICard
          label="At-Risk SKUs"
          value={atRisk}
          icon={<AlertTriangle size={18} />}
          accent={colors.pause}
          sub="pause or fix quadrant"
        />
      </div>

      {/* ── Quadrant Filter Bar ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([ALL, ...(['scale', 'protect', 'pause', 'fix'] as Quadrant[])] as FilterValue[]).map(f => {
          const isActive = activeFilter === f;
          const meta = f !== ALL ? quadrantMeta[f] : null;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 18px',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                border: `1px solid ${isActive ? (meta?.color ?? colors.accent) : colors.border}`,
                background: isActive ? (meta?.bg ?? 'rgba(59,130,246,0.15)') : 'transparent',
                color: isActive ? (meta?.color ?? colors.accent) : colors.muted,
                transition: 'all 0.15s ease',
              }}
            >
              {f === ALL ? 'All' : quadrantMeta[f].label}
              {f !== ALL && (
                <span style={{ marginLeft: 6, opacity: 0.7 }}>
                  ({skus.filter(s => s.quadrant === f).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Bubble Chart ── */}
      <div style={{ marginBottom: 20, overflow: 'hidden',
        background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            Margin % vs Days of Cover
          </h2>
          <p style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
            Bubble size = 7-day ad spend · Click a bubble to highlight
          </p>
        </div>
        <div style={{ padding: 16 }}>
          <BubbleChart
            data={filteredSkus}
            onSkuClick={sku => setHighlightedSku(s => s === sku ? null : sku)}
            highlightedSku={highlightedSku}
          />
        </div>
      </div>

      {/* ── SKU Table ── */}
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
            SKU Details
            <span style={{ marginLeft: 8, fontSize: 11, color: colors.muted, fontWeight: 400 }}>
              {filteredSkus.length} SKUs
            </span>
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: colors.surface2,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: '6px 12px',
            }}
          >
            <Search size={13} color={colors.muted} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search SKU or name…"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: colors.text,
                fontSize: 13,
                width: 180,
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th col="sku"              label="SKU"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="name"             label="Name"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="category"         label="Category"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="margin_pct"       label="Margin %"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="days_of_cover"    label="Cover (d)"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="spend"            label="Spend (7d)" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="revenue"          label="Rev (7d)"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="roas"             label="ROAS"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="opportunity_score" label="Opp."      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="quadrant"         label="Quadrant"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedSkus.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: colors.muted }}>
                    No SKUs match your search.
                  </td>
                </tr>
              )}
              {sortedSkus.map(b => {
                const roas = b.spend > 0 ? (b.revenue / b.spend).toFixed(2) : '—';
                const isHighlighted = highlightedSku === b.sku;
                return (
                  <tr
                    key={b.sku}
                    onClick={() => setHighlightedSku(s => s === b.sku ? null : b.sku)}
                    style={{
                      cursor: 'pointer',
                      background: isHighlighted ? colors.surface2 : 'transparent',
                      borderLeft: isHighlighted
                        ? `3px solid ${quadrantMeta[b.quadrant].color}`
                        : '3px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background = colors.surface2;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        isHighlighted ? colors.surface2 : 'transparent';
                    }}
                  >
                    <td style={td()}><code style={{ color: colors.accent, fontSize: 11 }}>{b.sku}</code></td>
                    <td style={td()}>{b.name}</td>
                    <td style={td()}>
                      <span style={{ fontSize: 11, color: colors.muted }}>{b.category}</span>
                    </td>
                    <td style={td()}>
                      {b.margin_pct.toFixed(1)}%
                      <ProvenanceBadge provenance="scenario" />
                    </td>
                    <td style={td()}>
                      <span style={{ color: b.days_of_cover < 7 ? colors.pause : colors.text }}>
                        {b.days_of_cover.toFixed(1)}
                      </span>
                      <ProvenanceBadge provenance="derived" />
                    </td>
                    <td style={td()}>
                      ${b.spend.toLocaleString()}
                      <ProvenanceBadge provenance="measured" />
                    </td>
                    <td style={td()}>
                      ${b.revenue.toLocaleString()}
                      <ProvenanceBadge provenance="measured" />
                    </td>
                    <td style={td()}>
                      <span style={{ color: b.spend > 0 ? colors.scale : colors.muted }}>
                        {roas}
                      </span>
                      <ProvenanceBadge provenance="derived" />
                    </td>
                    <td style={{ ...td(), minWidth: 120 }}>
                      <OpportunityBar score={b.opportunity_score} />
                    </td>
                    <td style={td()}>
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

function td(): React.CSSProperties {
  return {
    padding: '10px 12px',
    fontSize: 13,
    color: colors.text,
    borderBottom: `1px solid ${colors.border}`,
  };
}
