from datetime import date, datetime
from typing import Literal, Any
from pydantic import BaseModel, Field

class Scope(BaseModel):
    platform: str | None = None
    campaign_id: str | None = None
    sku: str | None = None
    creative_id: str | None = None

class Incident(BaseModel):
    id: str
    sim_date: date
    metric: str
    scope: Scope
    direction: Literal["up", "down"]
    magnitude_pct: float
    detector: str
    confidence: float
    money_at_risk: float
    severity: float
    status: Literal["open", "diagnosed", "resolved"]

class EvidenceItem(BaseModel):
    id: str
    tool: str
    description: str
    values: dict[str, float | str | int]
    provenance: Literal["measured", "derived", "scenario"]

class Diagnosis(BaseModel):
    incident_id: str
    cause: str
    evidence_ids: list[str]
    explanation: str
    source: Literal["agent", "playbook", "template"]
    guardian: Literal["PASS", "DOWNGRADED", "FAIL"]

class BudgetChange(BaseModel):
    campaign_id: str
    from_spend: float
    to_spend: float

class Interval(BaseModel):
    low: float
    mid: float
    high: float

class OpportunityScore(BaseModel):
    sim_date: date
    campaign_id: str
    sku: str
    forecast_component: float
    curve_component: float
    margin_component: float
    stock_component: float
    total_score: float

class Recommendation(BaseModel):
    id: str
    incident_id: str
    mode: Literal["growth", "profit", "efficiency"]
    changes: list[BudgetChange]
    expected_profit_delta: Interval
    constraints_binding: list[str]
    confidence: float
    opportunity_scores: list[OpportunityScore] = Field(default_factory=list)

class PolicyDecision(BaseModel):
    recommendation_id: str
    verdict: Literal["AUTO", "REVIEW", "BLOCK"]
    reasons: list[str]
    size_factor: float

class Action(BaseModel):
    id: str
    recommendation_id: str
    status: Literal["pending", "rolling_out", "active", "rolled_back", "blocked"]
    rollout_pct: float
    rollback_guard: dict[str, Any]
    changes: list[BudgetChange] = Field(default_factory=list)
    created_at: datetime | None = None

class Outcome(BaseModel):
    action_id: str
    observed_profit_delta: float
    counterfactual_profit_delta: Interval
    success: bool

class AgentStep(BaseModel):
    step: int
    tool: str
    args: dict[str, Any] = Field(default_factory=dict)
    result_summary: str

class RiskBudget(BaseModel):
    used_pct: float
    limit_pct: float

class KPIs(BaseModel):
    total_spend: float
    total_revenue: float
    blended_roas: float
    total_profit: float
    active_campaigns: int
    open_incidents: int
    actions_today: int

class AppState(BaseModel):
    sim_date: date
    autonomy_level: Literal["dry_run", "supervised", "full_autopilot"]
    risk_budget: RiskBudget
    kpis: KPIs
    sparklines: dict[str, list[float]]
    is_playing: bool = False
    play_speed: float = 1.0
    killswitch_active: bool = False

class CurvePoint(BaseModel):
    spend: float
    revenue_low: float
    revenue_mid: float
    revenue_high: float

class ResponseCurve(BaseModel):
    campaign_id: str
    sku: str
    data_points: list[CurvePoint]
    current_spend: float
    recommended_spend: float
    opportunity_score: float

class SKUBubble(BaseModel):
    sku: str
    name: str
    category: str
    margin_pct: float
    days_of_cover: float
    spend: float
    revenue: float
    quadrant: Literal["scale", "protect", "pause", "fix"]
    opportunity_score: float
    provenance: Literal["measured", "derived", "scenario"]

class TickResult(BaseModel):
    sim_date: date
    incidents_detected: int
    actions_taken: int
    tick_duration_ms: int

class InjectRequest(BaseModel):
    type: str
    platform: str | None = None
    sku: str | None = None
    magnitude: float = 0.3

class PlayRequest(BaseModel):
    speed: float = 1.0
    stop_after_days: int = 14

class SpendOverride(BaseModel):
    campaign_id: str
    spend: float

class WhatIfRequest(BaseModel):
    mode: Literal["growth", "profit", "efficiency"] = "profit"
    overrides: list[SpendOverride] = Field(default_factory=list)

class KillSwitchRequest(BaseModel):
    active: bool

class HealthResponse(BaseModel):
    status: str
    version: str
    sim_day: date | None = None
    features: dict[str, bool] = Field(default_factory=dict)

class Scorecard(BaseModel):
    detection: dict[str, Any]
    forecast: dict[str, Any]
    backtest: dict[str, Any]
    regime_shift: dict[str, Any]
    placebo: dict[str, Any]
    agent_vs_playbook: dict[str, Any]
    guardian: dict[str, Any]
    stockout_spend_avoided: float
    median_time_to_diagnosis_s: float
    honest_limits: list[str]
