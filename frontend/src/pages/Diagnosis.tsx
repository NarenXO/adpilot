import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { WaterfallChart } from '../components/charts/WaterfallChart';
import { TreemapChart } from '../components/charts/TreemapChart';
import { HeatmapChart } from '../components/charts/HeatmapChart';

// ─── Evidence Card & Provenance Types ──────────────────────────────────────────

export type ProvenanceType = 'Measured' | 'Derived' | 'Scenario';

export interface EvidenceItem {
  id: string; // e.g., 'E12'
  title: string;
  provenance: ProvenanceType;
  sourceTable: string;
  metricSnippet: string;
  description: string;
  timestamp: string;
  highlightedKeys: string[]; // keys in text matching this evidence
}

export interface CreativeItem {
  id: string; // e.g., 'cr_meta_03_A'
  name: string;
  format: 'Video 9:16' | 'Static Image' | 'Carousel';
  hookType: string;
  ageDays: number;
  ctrDecayPct: number;
  frequency: number;
  status: 'Fatigued' | 'Healthy' | 'Testing';
}

export interface ToolTraceStep {
  step: number;
  toolName: string;
  description: string;
  args: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'E12',
    title: 'CTR Baseline vs Current',
    provenance: 'Measured',
    sourceTable: 'meta_ads_insights_daily',
    metricSnippet: 'CTR dropped from 2.8% to 1.8%',
    description: 'Measured click-through rate over 12-day window across camp_meta_03 showing sharp downward inflection.',
    timestamp: '2024-06-15 08:30 UTC',
    highlightedKeys: ['2.8%', '1.8%', '12-day'],
  },
  {
    id: 'E13',
    title: 'High Audience Overlap & Frequency',
    provenance: 'Measured',
    sourceTable: 'meta_audience_overlap_log',
    metricSnippet: 'Frequency 7.2x (warning alert > 6.0x)',
    description: 'Target segment reach exhausted. Audience repetition exceeded standard threshold of 6.0x across top ad sets.',
    timestamp: '2024-06-15 08:31 UTC',
    highlightedKeys: ['7.2x', '6.0x'],
  },
  {
    id: 'E14',
    title: 'Creative Age & Wearout Curve',
    provenance: 'Derived',
    sourceTable: 'creative_fatigue_models',
    metricSnippet: 'Asset age: 21 days past peak engagement',
    description: 'Parametric decay curve models saturation point crossed on Day 9 of launch; current age 21 days.',
    timestamp: '2024-06-15 08:32 UTC',
    highlightedKeys: ['21 days'],
  },
  {
    id: 'E15',
    title: 'Budget Shift & Daily Opportunity Cost',
    provenance: 'Scenario',
    sourceTable: 'simulation_rebalance_v4',
    metricSnippet: 'Shift $1,200/day to camp_meta_05',
    description: 'Projected net profit recovery by migrating allocated budget away from saturated ad sets.',
    timestamp: '2024-06-15 08:33 UTC',
    highlightedKeys: ['$1,200'],
  },
  {
    id: 'E16',
    title: 'ROAS Uplift from Winner Rotation',
    provenance: 'Derived',
    sourceTable: 'synthetic_counterfactual_engine',
    metricSnippet: 'Estimated +0.8x blended ROAS delta',
    description: 'Marginal ROAS improvement calculated via synthetic control reweighting on winning SKUs.',
    timestamp: '2024-06-15 08:34 UTC',
    highlightedKeys: ['+0.8x'],
  },
];

const CREATIVES_DATA: CreativeItem[] = [
  {
    id: 'cr_meta_03_A',
    name: 'UGC Unboxing Hook v2',
    format: 'Video 9:16',
    hookType: 'Problem-Agitation (0-3s)',
    ageDays: 21,
    ctrDecayPct: -38.4,
    frequency: 7.2,
    status: 'Fatigued',
  },
  {
    id: 'cr_meta_03_B',
    name: 'Product Comparison Carousel',
    format: 'Carousel',
    hookType: 'Competitor Benchmark',
    ageDays: 14,
    ctrDecayPct: -18.2,
    frequency: 5.4,
    status: 'Healthy',
  },
  {
    id: 'cr_meta_03_C',
    name: 'Founder Story / Value Prop',
    format: 'Static Image',
    hookType: 'Social Proof & Press',
    ageDays: 4,
    ctrDecayPct: +4.6,
    frequency: 2.1,
    status: 'Testing',
  },
];

const TOOL_TRACE_STEPS: ToolTraceStep[] = [
  {
    step: 1,
    toolName: 'metric_drilldown',
    description: 'Isolate campaign-level CTR drop across Meta platform',
    args: { platform: 'meta', campaign: 'camp_meta_03', lookback_days: 14, metric: 'ctr' },
    output: { baseline_ctr: 0.028, current_ctr: 0.018, delta_pct: -35.7, p_value: 0.0004 },
    durationMs: 140,
  },
  {
    step: 2,
    toolName: 'creative_breakdown',
    description: 'Inspect individual creative assets within camp_meta_03',
    args: { campaign_id: 'camp_meta_03', top_n: 3, sort_by: 'spend_desc' },
    output: {
      assets_evaluated: 6,
      top_fatigued: 'cr_meta_03_A',
      spend_share_pct: 68.4,
      avg_frequency: 7.2,
    },
    durationMs: 220,
  },
  {
    step: 3,
    toolName: 'fatigue_curve',
    description: 'Fit Weibull decay model on ad impressions vs engagement',
    args: { asset_id: 'cr_meta_03_A', metric: 'ctr', half_life_days: 8.5 },
    output: {
      inflection_day: 9,
      current_day: 21,
      decay_severity: 'critical',
      replacement_recommended: true,
    },
    durationMs: 310,
  },
  {
    step: 4,
    toolName: 'inventory_check',
    description: 'Verify SKU inventory levels for associated campaign ads',
    args: { campaign_id: 'camp_meta_03', skus: ['SKU-042', 'SKU-045'] },
    output: {
      'SKU-042': { stock: 1420, days_of_supply: 28, stockout_risk: 'low' },
      'SKU-045': { stock: 890, days_of_supply: 22, stockout_risk: 'low' },
    },
    durationMs: 95,
  },
  {
    step: 5,
    toolName: 'margin_check',
    description: 'Audit gross margin elasticity given current acquisition cost',
    args: { campaign_id: 'camp_meta_03', cpa_current: 44.5, target_cpa: 28.0 },
    output: {
      current_contribution_margin: 0.14,
      target_contribution_margin: 0.32,
      burn_rate_daily: 820.0,
    },
    durationMs: 180,
  },
  {
    step: 6,
    toolName: 'tracking_health',
    description: 'Confirm Meta CAPI pixel event match quality and deduplication',
    args: { pixel_id: 'px_88491029', window_hours: 48 },
    output: { emq_score: 8.8, deduplication_rate: 0.994, latency_sec: 1.2, status: 'healthy' },
    durationMs: 110,
  },
];

// ─── Frozen Contract Compliance Types & Constants ────────────────────────────

export interface DiagnosisModel {
  incident_id: string;
  cause: string;
  evidence_ids: string[];
  explanation: string;
  source: 'llm' | 'playbook';
  guardian: 'PASS' | 'DOWNGRADED' | 'FAIL';
}

export interface AgentStep {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  result_summary: string;
}

export const MOCK_DIAGNOSIS: DiagnosisModel = {
  incident_id: 'INC-001',
  cause: 'creative_fatigue',
  evidence_ids: ['E12', 'E13', 'E14', 'E15', 'E16'],
  explanation:
    'Creative fatigue on Meta ads leading to a 32.4% drop in CTR. Audience repetition frequency reached 7.2x, causing high wearout on 21-day video creative.',
  source: 'llm',
  guardian: 'PASS',
};

export const MOCK_AGENT_STEPS: AgentStep[] = TOOL_TRACE_STEPS.map((t) => ({
  step: t.step,
  tool: t.toolName,
  args: t.args,
  result_summary: t.description,
}));

export const MOCK_EVIDENCE = EVIDENCE_ITEMS;
export const MOCK_CREATIVE_FATIGUE = CREATIVES_DATA;

// ─── Component ────────────────────────────────────────────────────────────────

export const Diagnosis: React.FC = () => {
  // Active highlight state for evidence links
  const [highlightedEvidence, setHighlightedEvidence] = useState<string | null>(null);

  // Agent trace replay accordion state
  const [expandedTraceSteps, setExpandedTraceSteps] = useState<number[]>([1]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // Filter keys for evidence
  const activeHighlightedKeys = useMemo(() => {
    if (!highlightedEvidence) return [];
    const item = EVIDENCE_ITEMS.find((e) => e.id === highlightedEvidence);
    return item ? item.highlightedKeys : [];
  }, [highlightedEvidence]);

  const isTextHighlighted = useCallback(
    (textSnippet: string, evidenceId?: string) => {
      if (evidenceId && highlightedEvidence === evidenceId) return true;
      return activeHighlightedKeys.includes(textSnippet);
    },
    [highlightedEvidence, activeHighlightedKeys]
  );

  // Trace Replay automated playback
  const handleReplayTrace = () => {
    setIsReplaying(true);
    setExpandedTraceSteps([1]);

    let currentStep = 1;
    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep <= TOOL_TRACE_STEPS.length) {
        setExpandedTraceSteps((prev) => [...prev, currentStep]);
      } else {
        clearInterval(interval);
        setIsReplaying(false);
      }
    }, 700);
  };

  const toggleTraceStep = (stepNumber: number) => {
    if (isReplaying) return;
    setExpandedTraceSteps((prev) =>
      prev.includes(stepNumber) ? prev.filter((s) => s !== stepNumber) : [...prev, stepNumber]
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ── 1. HEADER & META SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/80 bg-surface/50 backdrop-blur-md shadow-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
              INCIDENT
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">
              INC-001: Creative Fatigue on Meta Ads
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="danger">
              Metric: CTR (-32.4%)
            </Badge>
            <Badge variant="neutral">
              Scope: camp_meta_03
            </Badge>
            <Badge variant="warning">
              Severity: High
            </Badge>
            <Badge variant="info">
              Confidence: 91%
            </Badge>
          </div>
        </div>

        {/* Top-Right Guardian Verdict Badge */}
        <div className="flex items-center self-start md:self-auto gap-3 px-4 py-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold">
              Guardian Verdict
            </span>
            <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              PASS / VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. VERIFIED EXPLANATION & EVIDENCE PANEL (2-Column Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Verified Explanation */}
        <div className="lg:col-span-7 flex flex-col">
          <Card
            title={
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-text-primary text-sm">Investigator Verified Explanation</span>
              </div>
            }
            action={
              <Badge variant="success">
                Deterministic Match
              </Badge>
            }
            className="h-full flex flex-col justify-between"
          >
            <div className="space-y-4 text-sm text-text-secondary leading-relaxed font-sans">
              <p>
                Root-cause diagnosis identifies significant ad exhaustion in{' '}
                <span className="font-mono text-cyan-400 font-medium bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  camp_meta_03
                </span>
                . The primary driver is severe creative fatigue in high-volume creative assets where click-through rate
                plummeted from{' '}
                <span
                  className={`verified-number ${isTextHighlighted('2.8%', 'E12') ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedEvidence('E12')}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                >
                  2.8%
                </span>{' '}
                to{' '}
                <span
                  className={`verified-number ${isTextHighlighted('1.8%', 'E12') ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedEvidence('E12')}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                >
                  1.8%
                </span>{' '}
                over a{' '}
                <span
                  className={`verified-number ${isTextHighlighted('12-day', 'E12') ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedEvidence('E12')}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                >
                  12-day
                </span>{' '}
                monitoring cycle.
              </p>

              <p>
                Audience saturation indicators confirm individual user repetition reached an excessive frequency of{' '}
                <span
                  className={`verified-number ${isTextHighlighted('7.2x', 'E13') ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedEvidence('E13')}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                >
                  7.2x
                </span>
                , well past the safe burn threshold of{' '}
                <span
                  className={`verified-number ${isTextHighlighted('6.0x', 'E13') ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedEvidence('E13')}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                >
                  6.0x
                </span>
                . The lead video creative asset has now been running continuously for{' '}
                <span
                  className={`verified-number ${isTextHighlighted('21 days', 'E14') ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedEvidence('E14')}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                >
                  21 days
                </span>{' '}
                without revision or fresh hook variations.
              </p>

              <p>
                Recommended mitigation protocol is to throttle target spend and reallocate{' '}
                <span
                  className={`verified-number ${isTextHighlighted('$1,200', 'E15') ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedEvidence('E15')}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                >
                  $1,200
                </span>{' '}
                daily into accelerating winner{' '}
                <span className="font-mono text-cyan-400 font-medium bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  camp_meta_05
                </span>
                , yielding an estimated{' '}
                <span
                  className={`verified-number ${isTextHighlighted('+0.8x', 'E16') ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedEvidence('E16')}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                >
                  +0.8x
                </span>{' '}
                counterfactual ROAS uplift across active ad sets.
              </p>
            </div>

            {/* Bottom Citation Notice */}
            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Hover on evidence cards to highlight linked findings in text
              </span>
              <span className="font-mono text-[11px] text-text-muted">Evidence link: 5 checks active</span>
            </div>
          </Card>
        </div>

        {/* Right Column (5 cols): Interactive Evidence Cards Stack */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary tracking-wide uppercase font-mono">
              Evidence Ledger ({EVIDENCE_ITEMS.length})
            </h2>
            <span className="text-xs text-text-muted font-mono">Hover to inspect</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {EVIDENCE_ITEMS.map((item) => {
              const isHovered = highlightedEvidence === item.id;
              const badgeVariant =
                item.provenance === 'Measured'
                  ? 'measured'
                  : item.provenance === 'Derived'
                  ? 'derived'
                  : 'scenario';

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHighlightedEvidence(item.id)}
                  onMouseLeave={() => setHighlightedEvidence(null)}
                  className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    isHovered
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.25)] scale-[1.01]'
                      : 'border-border/70 bg-surface/40 hover:border-border hover:bg-surface/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-text-primary">
                        {item.id}
                      </span>
                      <span className="text-xs font-medium text-text-primary">{item.title}</span>
                    </div>
                    <Badge variant={badgeVariant}>
                      {item.provenance}
                    </Badge>
                  </div>

                  <p className="font-mono text-xs font-semibold text-emerald-400 mb-1">{item.metricSnippet}</p>
                  <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">{item.description}</p>

                  <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-text-muted font-mono">
                    <span>table: {item.sourceTable}</span>
                    <span>{item.timestamp.split(' ')[1]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Guardian Verification Notes Box */}
          <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/10 text-xs">
            <div className="flex items-center gap-2 font-mono font-semibold text-emerald-400 mb-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Guardian Verification Notes
            </div>
            <p className="text-[11px] text-text-secondary leading-normal">
              100% of statistical citations reconciled against cold storage warehouse records. Zero synthetic hall-checks
              detected. Ground truth variance &lt; 0.02%.
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. VISUAL CHARTS SECTION (2-Column Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Waterfall Chart (6 cols) */}
        <div className="lg:col-span-6">
          <Card
            title="Profit Waterfall Bridge"
            action={<span className="text-xs text-text-muted">Net profit impact decomposed by drivers</span>}
          >
            <WaterfallChart height={360} />
          </Card>
        </div>

        {/* Treemap Chart (6 cols) */}
        <div className="lg:col-span-6">
          <Card
            title="Multi-Channel Driver Treemap"
            action={<span className="text-xs text-text-muted">Spend volume leaf sized, ROAS colored</span>}
          >
            <TreemapChart height={360} />
          </Card>
        </div>
      </div>

      {/* ── 4. 14-DAY CAMPAIGN INTENSITY HEATMAP ── */}
      <div>
        <Card
          title="14-Day Campaign Intensity Heatmap"
          action={
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-2.5 h-2.5 rounded bg-[#0f172a] border border-blue-900 inline-block" /> Low ROAS
              <span className="w-2.5 h-2.5 rounded bg-[#10b981] inline-block ml-2" /> High ROAS
            </div>
          }
        >
          <div className="mb-2 text-xs text-text-muted">
            Daily ROAS progression across portfolio (highlighting creative fatigue in camp_meta_03)
          </div>
          <HeatmapChart height={320} />
        </Card>
      </div>

      {/* ── 5. AGENT TRACE REPLAY & CREATIVE FATIGUE BREAKDOWN (2-Column Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Agent Tool Trace Replay */}
        <div className="lg:col-span-7">
          <Card
            title="Agent Tool Trace Replay"
            action={
              <Button
                variant="secondary"
                onClick={handleReplayTrace}
                disabled={isReplaying}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
              >
                {isReplaying ? 'Replaying...' : 'Replay Trace'}
              </Button>
            }
          >
            <div className="mb-3 text-xs text-text-muted">
              Step-by-step audit logs of autonomous investigative tools
            </div>
            <div className="space-y-3">
              {TOOL_TRACE_STEPS.map((trace) => {
                const isExpanded = expandedTraceSteps.includes(trace.step);
                return (
                  <div
                    key={trace.step}
                    className="border border-border/80 rounded-lg overflow-hidden bg-surface/30 transition-colors"
                  >
                    <div
                      onClick={() => toggleTraceStep(trace.step)}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-surface/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-text-secondary">
                          {trace.step}
                        </span>
                        <div>
                          <span className="font-mono text-xs font-semibold text-cyan-400">
                            {trace.toolName}()
                          </span>
                          <p className="text-xs text-text-muted">{trace.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-text-muted">{trace.durationMs}ms</span>
                        <svg
                          className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 bg-surface/60 border-t border-border/60 text-xs font-mono space-y-2">
                        <div>
                          <span className="text-text-muted uppercase text-[10px] tracking-wider block mb-1">
                            Arguments
                          </span>
                          <pre className="p-2 rounded bg-black/40 text-text-secondary overflow-x-auto text-[11px]">
                            {JSON.stringify(trace.args, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-text-muted uppercase text-[10px] tracking-wider block mb-1">
                            Returned Payload
                          </span>
                          <pre className="p-2 rounded bg-black/40 text-emerald-400/90 overflow-x-auto text-[11px]">
                            {JSON.stringify(trace.output, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column (5 cols): Creative Fatigue Breakdown Panel */}
        <div className="lg:col-span-5">
          <Card
            title="Creative Fatigue Breakdown"
            action={<span className="text-xs text-text-muted">Asset health metrics</span>}
          >
            <div className="mb-3 text-xs text-text-muted">
              Active creative variants in camp_meta_03
            </div>
            <div className="space-y-3.5">
              {CREATIVES_DATA.map((cr) => {
                const statusVariant =
                  cr.status === 'Fatigued' ? 'danger' : cr.status === 'Healthy' ? 'success' : 'info';

                return (
                  <div
                    key={cr.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      cr.status === 'Fatigued'
                        ? 'border-red-500/30 bg-red-950/10'
                        : 'border-border/70 bg-surface/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-text-primary">{cr.id}</span>
                          <Badge variant={statusVariant}>
                            {cr.status}
                          </Badge>
                        </div>
                        <h4 className="text-xs font-medium text-text-secondary mt-0.5">{cr.name}</h4>
                      </div>
                      <span className="text-[11px] font-mono text-text-muted">{cr.ageDays}d active</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2 py-2 border-y border-border/40">
                      <div>
                        <span className="text-text-muted text-[10px] block">CTR DECAY</span>
                        <span className={cr.ctrDecayPct < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {cr.ctrDecayPct > 0 ? `+${cr.ctrDecayPct}%` : `${cr.ctrDecayPct}%`}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted text-[10px] block">FREQUENCY</span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            cr.frequency > 6.0 ? 'text-amber-400' : 'text-text-primary'
                          }`}
                        >
                          {cr.frequency.toFixed(1)}x
                          {cr.frequency > 6.0 && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans">
                              High
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <span>Format: {cr.format}</span>
                      <span>Hook: {cr.hookType}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Diagnosis;
