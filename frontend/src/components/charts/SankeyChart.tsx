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
          <div style={{
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
            color: '#4a4a4a',
            fontSize: '12px',
            fontWeight: 700,
          }}>
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
    const srcPalette = ['#f364cb', '#f783d7', '#e04eb5', '#ff94e2', '#d639a9'];
    const tgtPalette = ['#82e66f', '#96eb85', '#6ed95a', '#a8f09b', '#5ac446'];

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
        style={{
          height,
          background: '#ffffff',
          border: '3px solid #000000',
          boxShadow: '4px 4px 0px #000000',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#000000', marginBottom: '6px' }}>Portfolio Spend is Stable</div>
        <p style={{ fontSize: '12px', color: '#666666', fontWeight: 600, margin: 0 }}>
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
        style={{
          height,
          background: '#ffffff',
          border: '3px solid #000000',
          boxShadow: '4px 4px 0px #000000',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#000000', marginBottom: '6px' }}>Reallocation Flow Incomplete</div>
        <p style={{ fontSize: '12px', color: '#666666', fontWeight: 600, margin: 0 }}>
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
        color: '#78dbf6',
      });
    } else if (totalInc > totalDec) {
      const diff = totalInc - totalDec;
      workingSources.push({
        name: `Budget Expansion [-$${diff}]`,
        campaignId: 'Budget Expansion',
        amount: diff,
        color: '#78dbf6',
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
        itemStyle: { color: s.color, borderColor: '#000000', borderWidth: 2 },
      })),
      ...workingTargets.map((t) => ({
        name: t.name,
        itemStyle: { color: t.color, borderColor: '#000000', borderWidth: 2 },
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
        backgroundColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 3,
        padding: [10, 14],
        textStyle: {
          color: '#000000',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            const edge = params.data;
            return `
              <div style="font-family:'Space Grotesk',sans-serif;min-width:200px;color:#000000;">
                <div style="font-size:11px;color:#4a4a4a;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">
                  Budget Reallocation Flow
                </div>
                <div style="font-size:14px;font-weight:800;color:#000000;margin-bottom:6px;border-bottom:2px solid #000;padding-bottom:3px;">
                  Reallocating $${Math.round(edge.value).toLocaleString()}
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;font-size:12px;">
                  <span style="color:#000000;">From: <b style="color:#f364cb;">${edge.sourceCamp}</b></span>
                  <span style="color:#000000;">To: <b style="color:#82e66f;">${edge.targetCamp}</b></span>
                </div>
              </div>
            `;
          } else {
            return `
              <div style="font-family:'Space Grotesk',sans-serif;padding:2px 4px;color:#000000;">
                <div style="font-weight:800;color:#000000;font-size:13px;border-bottom:2px solid #000;padding-bottom:2px;margin-bottom:4px;">${params.name}</div>
                <div style="font-size:12px;color:#4a4a4a;margin-top:2px;font-weight:600;">
                  Total Shift: <b style="color:#000000;font-weight:800;">$${Math.round(params.value).toLocaleString()}</b>
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
            color: '#000000',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            fontWeight: 700,
          },
          lineStyle: {
            color: 'source',
            curveness: 0.5,
            opacity: 0.45,
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
          style={{
            height,
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            borderRadius: '10px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#000000', marginBottom: '6px' }}>Unable to Render Reallocation Chart</div>
          <p style={{ fontSize: '12px', color: '#666666', fontWeight: 600, margin: 0 }}>
            Adjust both decreasing and increasing campaigns to visualize budget reallocation flows.
          </p>
        </div>
      }
    >
      <div style={{
        background: '#ffffff',
        border: '3px solid #000000',
        boxShadow: '4px 4px 0px #000000',
        borderRadius: '10px',
        padding: '16px',
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #000000',
          paddingBottom: '10px',
          marginBottom: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#000000' }}>Budget Reallocation Flow</span>
            <span style={{
              background: '#78dbf6',
              border: '2px solid #000000',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#000000',
            }}>
              Source → Target
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', fontWeight: 700, color: '#000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f364cb', border: '1.5px solid #000000' }} />
              <span>Decreased Spend</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#82e66f', border: '1.5px solid #000000' }} />
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
