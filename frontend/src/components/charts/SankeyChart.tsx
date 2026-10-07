import React, { useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

export interface BudgetChangeItem {
  campaignId: string;
  fromSpend: number;
  toSpend: number;
}

export interface SankeyChartProps {
  changes: BudgetChangeItem[];
  height?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Sankey chart caught rendering error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#1f2d45] bg-[#111827] p-8 text-center text-xs text-[#94a3b8]">
            Unable to render Sankey flow chart.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export const SankeyChart: React.FC<SankeyChartProps> = ({
  changes = [],
  height = '340px',
}) => {
  // Filter active changes where absolute change > $1
  const activeChanges = useMemo(() => {
    return changes.filter(
      (c) => Math.abs(c.toSpend - c.fromSpend) > 1.0
    );
  }, [changes]);

  // Pre-calculate sources (decreases) and targets (increases)
  const { sources, targets, totalSource, totalTarget } = useMemo(() => {
    const srcPalette = ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#f87171'];
    const tgtPalette = ['#00ff88', '#34d399', '#10b981', '#6ee7b7', '#059669'];

    const src: Array<{ name: string; campaignId: string; amount: number; color: string }> = [];
    const tgt: Array<{ name: string; campaignId: string; amount: number; color: string }> = [];

    let srcIdx = 0;
    let tgtIdx = 0;

    for (const c of activeChanges) {
      const delta = c.toSpend - c.fromSpend;
      const absDelta = Math.round(Math.abs(delta));

      if (delta < 0 && absDelta > 0) {
        src.push({
          name: `${c.campaignId} [-$${absDelta}]`,
          campaignId: c.campaignId,
          amount: absDelta,
          color: srcPalette[srcIdx % srcPalette.length],
        });
        srcIdx++;
      } else if (delta > 0 && absDelta > 0) {
        tgt.push({
          name: `${c.campaignId} [+$${absDelta}]`,
          campaignId: c.campaignId,
          amount: absDelta,
          color: tgtPalette[tgtIdx % tgtPalette.length],
        });
        tgtIdx++;
      }
    }

    const tSource = src.reduce((sum, s) => sum + s.amount, 0);
    const tTarget = tgt.reduce((sum, t) => sum + t.amount, 0);

    return {
      sources: src,
      targets: tgt,
      totalSource: tSource,
      totalTarget: tTarget,
    };
  }, [activeChanges]);

  // Fallback empty state: if zero changes or portfolio is stable
  if (!activeChanges || activeChanges.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-[#1f2d45] bg-[#111827] p-8 text-center"
        style={{ height }}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a2235] text-[#3b82f6]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="mb-1 text-sm font-semibold text-[#e2e8f0]">Portfolio Spend is Stable</div>
        <p className="max-w-md text-xs text-[#64748b]">
          No budget reallocations today. Portfolio spend is stable.
        </p>
      </div>
    );
  }

  // Fallback condition: single-slider adjustment (only sources or only targets)
  // Cleanly return fallback card without attempting to build ECharts sankey
  if (sources.length === 0 || targets.length === 0 || totalSource <= 0 || totalTarget <= 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-[#1f2d45] bg-[#111827] p-8 text-center"
        style={{ height }}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a2235] text-[#f59e0b]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="mb-1 text-sm font-semibold text-[#e2e8f0]">Reallocation Flow Incomplete</div>
        <p className="max-w-md text-xs text-[#64748b]">
          Adjust both decreasing and increasing campaigns to visualize budget reallocation flows.
        </p>
      </div>
    );
  }

  const option = useMemo<EChartsOption>(() => {
    // Both sources and targets exist and have valid totals
    const workingSources = [...sources];
    const workingTargets = [...targets];

    const totalDec = totalSource;
    const totalInc = totalTarget;

    // Balance source and target with equilibrium node if needed
    if (totalDec > totalInc) {
      const diff = totalDec - totalInc;
      workingTargets.push({
        name: `Reserve Savings [+$${diff}]`,
        campaignId: 'Reserve Savings',
        amount: diff,
        color: '#3b82f6',
      });
    } else if (totalInc > totalDec) {
      const diff = totalInc - totalDec;
      workingSources.push({
        name: `Budget Expansion [-$${diff}]`,
        campaignId: 'Budget Expansion',
        amount: diff,
        color: '#3b82f6',
      });
    }

    const flowTotal = Math.max(
      workingSources.reduce((sum, s) => sum + s.amount, 0),
      workingTargets.reduce((sum, t) => sum + t.amount, 0),
      1.0
    );

    // Assemble nodes
    const nodes = [
      ...workingSources.map((s) => ({
        name: s.name,
        itemStyle: { color: s.color, borderColor: '#1f2d45', borderWidth: 1 },
      })),
      ...workingTargets.map((t) => ({
        name: t.name,
        itemStyle: { color: t.color, borderColor: '#1f2d45', borderWidth: 1 },
      })),
    ];

    // Assemble proportional links
    const links: any[] = [];
    for (const src of workingSources) {
      for (const tgt of workingTargets) {
        const raw = (src.amount * tgt.amount) / flowTotal;
        const linkVal = isNaN(raw) ? 0 : Math.round(raw);
        if (linkVal >= 1) {
          links.push({
            source: src.name,
            target: tgt.name,
            value: linkVal,
            sourceCamp: src.campaignId,
            targetCamp: tgt.campaignId,
          });
        }
      }
    }

    return {
      backgroundColor: 'transparent',
      animationDuration: 600,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0a0d14',
        borderColor: '#1f2d45',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: '#e2e8f0',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            const edge = params.data;
            return `
              <div style="font-family:Inter,sans-serif;min-width:200px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">
                  Budget Reallocation Flow
                </div>
                <div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:6px;">
                  Reallocating $${Math.round(edge.value).toLocaleString()}
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;font-size:12px;">
                  <span style="color:#64748b;">From: <b style="color:#f43f5e;">${edge.sourceCamp}</b></span>
                  <span style="color:#64748b;">To: <b style="color:#00ff88;">${edge.targetCamp}</b></span>
                </div>
              </div>
            `;
          } else {
            return `
              <div style="font-family:Inter,sans-serif;padding:2px 4px;">
                <div style="font-weight:700;color:#e2e8f0;font-size:13px;">${params.name}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
                  Total Shift: <b>$${Math.round(params.value).toLocaleString()}</b>
                </div>
              </div>
            `;
          }
        },
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency',
          },
          nodeAlign: 'justify',
          nodeWidth: 16,
          nodeGap: 14,
          draggable: false,
          top: 20,
          right: 20,
          bottom: 20,
          left: 20,
          label: {
            color: '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 500,
          },
          lineStyle: {
            color: 'source',
            curveness: 0.5,
            opacity: 0.42,
          },
          data: nodes,
          links: links,
        },
      ],
    };
  }, [sources, targets, totalSource, totalTarget]);

  return (
    <ChartErrorBoundary
      fallback={
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-[#1f2d45] bg-[#111827] p-8 text-center"
          style={{ height }}
        >
          <div className="mb-1 text-sm font-semibold text-[#e2e8f0]">Unable to Render Reallocation Chart</div>
          <p className="max-w-md text-xs text-[#64748b]">
            Adjust both decreasing and increasing campaigns to visualize budget reallocation flows.
          </p>
        </div>
      }
    >
      <div className="relative w-full rounded-xl border border-[#1f2d45] bg-[#111827] p-4">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between border-b border-[#1f2d45] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#e2e8f0]">Budget Reallocation Flow</span>
            <span className="rounded bg-[#1a2235] px-2 py-0.5 text-[10px] text-[#64748b]">
              Source → Target
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#64748b]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#f43f5e]" />
              <span>Decreased Spend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00ff88]" />
              <span>Increased Spend</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height }}>
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </div>
    </ChartErrorBoundary>
  );
};

export default SankeyChart;
