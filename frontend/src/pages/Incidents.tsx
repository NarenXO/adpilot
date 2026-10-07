import React, { useState, useEffect, useMemo } from 'react';
import { TimelineChart, Incident } from '../components/charts/TimelineChart';

// Golden path fallback incidents (matching fixtures/incidents.json)
const FALLBACK_INCIDENTS: Incident[] = [
  {
    id: 'INC-001',
    sim_date: '2024-06-15',
    metric: 'ctr',
    scope: {
      platform: 'meta',
      campaign_id: 'camp_meta_03',
      sku: 'SKU-007',
      creative_id: 'cr_042',
    },
    direction: 'down',
    magnitude_pct: 35.2,
    detector: 'creative_fatigue',
    confidence: 0.92,
    money_at_risk: 340.0,
    severity: 312.8,
    status: 'open',
  },
  {
    id: 'INC-002',
    sim_date: '2024-06-15',
    metric: 'days_of_cover',
    scope: {
      platform: 'google',
      campaign_id: 'camp_goog_01',
      sku: 'SKU-002',
    },
    direction: 'down',
    magnitude_pct: 80.0,
    detector: 'stockout_risk',
    confidence: 0.95,
    money_at_risk: 850.0,
    severity: 807.5,
    status: 'open',
  },
  {
    id: 'INC-003',
    sim_date: '2024-06-14',
    metric: 'purchases',
    scope: {
      platform: 'tiktok',
      campaign_id: 'camp_tt_02',
      sku: 'SKU-015',
    },
    direction: 'down',
    magnitude_pct: 88.0,
    detector: 'tracking_break',
    confidence: 0.95,
    money_at_risk: 420.0,
    severity: 399.0,
    status: 'diagnosed',
  },
  {
    id: 'INC-004',
    sim_date: '2024-06-13',
    metric: 'margin_pct',
    scope: {
      platform: 'shopify',
      sku: 'SKU-009',
    },
    direction: 'down',
    magnitude_pct: 42.5,
    detector: 'margin_squeeze',
    confidence: 0.90,
    money_at_risk: 280.0,
    severity: 252.0,
    status: 'resolved',
  },
  {
    id: 'INC-005',
    sim_date: '2024-06-12',
    metric: 'cpc',
    scope: {
      platform: 'meta',
      campaign_id: 'camp_meta_01',
      sku: 'SKU-001',
    },
    direction: 'up',
    magnitude_pct: 28.4,
    detector: 'ewma',
    confidence: 0.84,
    money_at_risk: 160.0,
    severity: 134.4,
    status: 'resolved',
  },
];

// Inline Mission-Control SVG Icons
const ArrowDownIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'diagnosed' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'severity' | 'money_at_risk' | 'recent' | 'confidence'>('severity');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Fetch incidents from API or fallback
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/api/incidents');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.incidents || [];
          if (isMounted && items.length > 0) {
            setIncidents(items);
            return;
          }
        }
      } catch (err) {
        // Fallback gracefully on network error or missing server
      }
      if (isMounted) {
        setIncidents(FALLBACK_INCIDENTS);
      }
    }

    loadData().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter & Search
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Status filter
      if (statusFilter !== 'all' && inc.status !== statusFilter) {
        return false;
      }
      // Search query (metric, platform, campaign, sku, detector, id)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMetric = inc.metric.toLowerCase().includes(query);
        const matchesPlatform = (inc.scope?.platform || '').toLowerCase().includes(query);
        const matchesCampaign = (inc.scope?.campaign_id || '').toLowerCase().includes(query);
        const matchesSku = (inc.scope?.sku || '').toLowerCase().includes(query);
        const matchesCreative = (inc.scope?.creative_id || '').toLowerCase().includes(query);
        const matchesDetector = inc.detector.toLowerCase().includes(query);
        const matchesId = inc.id.toLowerCase().includes(query);

        return (
          matchesMetric ||
          matchesPlatform ||
          matchesCampaign ||
          matchesSku ||
          matchesCreative ||
          matchesDetector ||
          matchesId
        );
      }
      return true;
    });
  }, [incidents, statusFilter, searchQuery]);

  // Ranked sorting
  const sortedIncidents = useMemo(() => {
    const list = [...filteredIncidents];
    list.sort((a, b) => {
      if (sortBy === 'severity') {
        return b.severity - a.severity;
      }
      if (sortBy === 'money_at_risk') {
        return b.money_at_risk - a.money_at_risk;
      }
      if (sortBy === 'confidence') {
        return b.confidence - a.confidence;
      }
      if (sortBy === 'recent') {
        return new Date(b.sim_date).getTime() - new Date(a.sim_date).getTime();
      }
      return 0;
    });
    return list;
  }, [filteredIncidents, sortBy]);

  // Statistics
  const activeCount = useMemo(() => {
    return incidents.filter((i) => i.status === 'open').length;
  }, [incidents]);

  const totalMoneyAtRisk = useMemo(() => {
    return incidents
      .filter((i) => i.status === 'open')
      .reduce((acc, curr) => acc + curr.money_at_risk, 0);
  }, [incidents]);

  const countsByStatus = useMemo(() => {
    return {
      all: incidents.length,
      open: incidents.filter((i) => i.status === 'open').length,
      diagnosed: incidents.filter((i) => i.status === 'diagnosed').length,
      resolved: incidents.filter((i) => i.status === 'resolved').length,
    };
  }, [incidents]);

  const handleNavigateToDiagnosis = (incidentId: string) => {
    const targetUrl = `/diagnosis?id=${encodeURIComponent(incidentId)}`;
    window.location.href = targetUrl;
  };

  const handleSelectIncidentFromChart = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    const cardEl = document.getElementById(`incident-card-${incidentId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ============================================================== */}
        {/* 1. Header Section */}
        {/* ============================================================== */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                  Anomaly Sentinel & Incidents
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    PHASE 2 LIVE
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Real-time seasonal EWMA detector & deterministic business rules monitoring Meta, Google, TikTok campaigns.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Active Incident Badge */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <div className="text-xs">
                <span className="font-semibold text-white font-mono">{activeCount}</span>
                <span className="text-slate-400 ml-1.5">Open Incidents</span>
              </div>
            </div>

            {/* Total Money-at-Risk Indicator */}
            <div className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl">
              <div className="text-right">
                <div className="text-[10px] uppercase font-mono tracking-wider text-rose-300 font-medium">
                  Money At Risk
                </div>
                <div className="text-base font-bold text-rose-400 font-mono tracking-tight">
                  ${totalMoneyAtRisk.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================== */}
        {/* 2. Top Interactive ECharts Timeline Section */}
        {/* ============================================================== */}
        <section aria-label="Incident Timeline">
          <TimelineChart
            incidents={incidents}
            onSelectIncident={handleSelectIncidentFromChart}
          />
        </section>

        {/* ============================================================== */}
        {/* 3. Filter, Search & Sort Control Bar */}
        {/* ============================================================== */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-x-auto">
            {(['all', 'open', 'diagnosed', 'resolved'] as const).map((tab) => {
              const active = statusFilter === tab;
              const count = countsByStatus[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <span className="capitalize">{tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      active ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input & Sort Selector */}
          <div className="flex flex-1 md:max-w-md items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search metric, campaign, SKU, platform..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500 hover:text-slate-300"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <span className="text-[10px] uppercase font-mono text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-slate-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="severity">Highest Severity</option>
                <option value="money_at_risk">Highest Money at Risk</option>
                <option value="confidence">Highest Confidence</option>
                <option value="recent">Most Recent Date</option>
              </select>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. Ranked Incidents Grid */}
        {/* ============================================================== */}
        <main aria-label="Ranked Incidents List">
          {loading ? (
            // Loading Skeletons
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 animate-pulse space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-24 bg-slate-800 rounded" />
                    <div className="h-5 w-16 bg-slate-800 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 bg-slate-800 rounded" />
                    <div className="h-4 w-1/2 bg-slate-800 rounded" />
                  </div>
                  <div className="h-8 bg-slate-800 rounded-lg" />
                </div>
              ))}
            </div>
          ) : sortedIncidents.length === 0 ? (
            // Empty State
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center max-w-lg mx-auto my-8 space-y-4">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheckIcon />
              </div>
              <h3 className="text-lg font-semibold text-slate-200">No Incidents Found</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                Sentinel monitoring active. All marketing channels are currently operating within expected statistical baselines.
              </p>
              {(statusFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            // Cards Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedIncidents.map((incident) => {
                const isCritical = incident.severity >= 150;
                const isSelected = selectedIncidentId === incident.id;

                // Color tokens based on severity
                const badgeColor = isCritical
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

                const pulseClass = isCritical && incident.status === 'open' ? 'ring-1 ring-rose-500/40 shadow-rose-950/40 shadow-lg' : '';

                // Platform pill color
                const platform = (incident.scope?.platform || 'general').toLowerCase();
                let platformBadge = 'bg-slate-800 text-slate-300 border-slate-700';
                if (platform === 'meta') platformBadge = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
                else if (platform === 'google') platformBadge = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                else if (platform === 'tiktok') platformBadge = 'bg-pink-500/15 text-pink-400 border-pink-500/30';
                else if (platform === 'shopify') platformBadge = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

                // Status pill color
                let statusBadge = 'bg-slate-800 text-slate-400 border-slate-700';
                if (incident.status === 'open') statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                else if (incident.status === 'diagnosed') statusBadge = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                else if (incident.status === 'resolved') statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                // Friendly detector names
                let detectorLabel = incident.detector;
                if (incident.detector === 'ewma') detectorLabel = 'EWMA Seasonal Detector';
                else if (incident.detector === 'creative_fatigue') detectorLabel = 'Creative Fatigue Rule';
                else if (incident.detector === 'stockout_risk') detectorLabel = 'Stockout Risk Rule';
                else if (incident.detector === 'tracking_break') detectorLabel = 'Tracking Break Rule';
                else if (incident.detector === 'margin_squeeze') detectorLabel = 'Margin Squeeze Rule';

                return (
                  <article
                    key={incident.id}
                    id={`incident-card-${incident.id}`}
                    className={`bg-slate-900/70 border rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/90 ${
                      isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-slate-800'
                    } ${pulseClass}`}
                  >
                    <div className="space-y-4">
                      {/* Card Top: Metric Name, Direction, and Severity Score Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-lg flex items-center justify-center ${
                              incident.direction === 'down'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            }`}
                          >
                            {incident.direction === 'down' ? <ArrowDownIcon /> : <ArrowUpIcon />}
                          </span>
                          <div>
                            <div className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                              {incident.id}
                            </div>
                            <h2 className="text-base font-bold text-white capitalize flex items-center gap-1.5">
                              {incident.metric.replace('_', ' ')}
                            </h2>
                          </div>
                        </div>

                        {/* Severity Score Badge with Pulsing Glow on Critical */}
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 shadow-sm ${badgeColor}`}
                        >
                          {isCritical && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                          )}
                          <span>Sev {incident.severity.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Scope Tags Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                        {incident.scope?.platform && (
                          <span className={`px-2 py-0.5 rounded border capitalize ${platformBadge}`}>
                            {incident.scope.platform}
                          </span>
                        )}
                        {incident.scope?.campaign_id && (
                          <span className="px-2 py-0.5 rounded border bg-slate-950/80 text-slate-300 border-slate-800">
                            {incident.scope.campaign_id}
                          </span>
                        )}
                        {incident.scope?.sku && (
                          <span className="px-2 py-0.5 rounded border bg-slate-950/80 text-cyan-300 border-slate-800">
                            {incident.scope.sku}
                          </span>
                        )}
                        {incident.scope?.creative_id && (
                          <span className="px-2 py-0.5 rounded border bg-slate-950/80 text-purple-300 border-slate-800">
                            {incident.scope.creative_id}
                          </span>
                        )}
                      </div>

                      {/* Money at Risk & Magnitude Stat Row */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
                        <div>
                          <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">
                            Money at Risk
                          </div>
                          <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
                            ${incident.money_at_risk.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">
                            Magnitude
                          </div>
                          <div className="text-sm font-bold text-slate-200 font-mono mt-0.5 flex items-center gap-1">
                            <span>{incident.magnitude_pct.toFixed(1)}%</span>
                            <span className="text-xs text-slate-400 font-normal capitalize">({incident.direction})</span>
                          </div>
                        </div>
                      </div>

                      {/* Confidence Meter (% bar) and Detector Badge */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">{detectorLabel}</span>
                          <span className="font-mono text-slate-300 font-semibold">
                            {(incident.confidence * 100).toFixed(0)}% Conf
                          </span>
                        </div>
                        {/* Gradient Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, incident.confidence * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Status Pill and Investigate CTA */}
                    <div className="mt-5 pt-3.5 border-t border-slate-800/70 flex items-center justify-between gap-2">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono uppercase font-semibold border ${statusBadge}`}>
                        {incident.status}
                      </span>

                      {/* CTA Button */}
                      <button
                        onClick={() => handleNavigateToDiagnosis(incident.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all group"
                      >
                        <span>Investigate Diagnosis</span>
                        <span className="transition-transform group-hover:translate-x-0.5">
                          <ArrowRightIcon />
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Incidents;
