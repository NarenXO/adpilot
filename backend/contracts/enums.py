from enum import Enum

class Cause(str, Enum):
    CREATIVE_FATIGUE = "CREATIVE_FATIGUE"
    STOCKOUT = "STOCKOUT"
    TRACKING_BREAK = "TRACKING_BREAK"
    MARGIN_SQUEEZE = "MARGIN_SQUEEZE"
    AUDIENCE_SATURATION = "AUDIENCE_SATURATION"
    CPC_SURGE = "CPC_SURGE"
    HOLIDAY_DEMAND = "HOLIDAY_DEMAND"
    PLANNED_PROMO = "PLANNED_PROMO"
    UNKNOWN = "UNKNOWN"

class Direction(str, Enum):
    UP = "up"
    DOWN = "down"

class Provenance(str, Enum):
    MEASURED = "measured"
    DERIVED = "derived"
    SCENARIO = "scenario"

class Verdict(str, Enum):
    AUTO = "AUTO"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"

class ActionStatus(str, Enum):
    PENDING = "pending"
    ROLLING_OUT = "rolling_out"
    ACTIVE = "active"
    ROLLED_BACK = "rolled_back"
    BLOCKED = "blocked"

class IncidentStatus(str, Enum):
    OPEN = "open"
    DIAGNOSED = "diagnosed"
    RESOLVED = "resolved"

class DiagnosisSource(str, Enum):
    AGENT = "agent"
    PLAYBOOK = "playbook"
    TEMPLATE = "template"

class GuardianResult(str, Enum):
    PASS = "PASS"
    DOWNGRADED = "DOWNGRADED"
    FAIL = "FAIL"

class AutonomyLevel(str, Enum):
    DRY_RUN = "dry_run"
    SUPERVISED = "supervised"
    FULL_AUTOPILOT = "full_autopilot"

class OptMode(str, Enum):
    GROWTH = "growth"
    PROFIT = "profit"
    EFFICIENCY = "efficiency"
