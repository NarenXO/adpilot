from backend.contracts import (
    load_fixture, Incident, EvidenceItem, Diagnosis, Recommendation,
    PolicyDecision, Action, Outcome, AppState, ResponseCurve,
    SKUBubble, Scorecard, OpportunityScore, SSEEvent
)

def test_all_fixtures_validate_against_schemas():
    for inc in load_fixture("incidents")["incidents"]:
        Incident.model_validate(inc)

    for ev in load_fixture("evidence")["evidence"]:
        EvidenceItem.model_validate(ev)

    Diagnosis.model_validate(load_fixture("diagnosis")["diagnosis"])

    for rec in load_fixture("recommendations")["recommendations"]:
        Recommendation.model_validate(rec)

    for dec in load_fixture("policy_decisions")["decisions"]:
        PolicyDecision.model_validate(dec)

    for act in load_fixture("actions")["actions"]:
        Action.model_validate(act)

    for out in load_fixture("outcomes")["outcomes"]:
        Outcome.model_validate(out)

    AppState.model_validate(load_fixture("state"))

    for curve in load_fixture("optimizer_curves")["curves"]:
        ResponseCurve.model_validate(curve)

    for sku in load_fixture("inventory_margin")["skus"]:
        SKUBubble.model_validate(sku)

    Scorecard.model_validate(load_fixture("scorecard"))

    for score in load_fixture("opportunity_scores")["scores"]:
        OpportunityScore.model_validate(score)

    for event in load_fixture("sse_events")["events"]:
        SSEEvent.model_validate(event)
