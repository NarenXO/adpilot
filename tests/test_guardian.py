import pytest
from backend.contracts import Diagnosis, EvidenceItem
from backend.contracts.enums import Cause
from backend.guardian.signatures import check_cause_signature
from backend.guardian.verifier import verify

def test_signatures_all_golden_causes():
    # CREATIVE_FATIGUE
    e_fatigue = [EvidenceItem(id="1", tool="t", description="d", values={"ctr_drop_pct": 20.0, "avg_frequency": 6.0, "spend": 100}, provenance="measured")]
    assert check_cause_signature(Cause.CREATIVE_FATIGUE, e_fatigue)[0] == True
    
    e_fatigue_fail = [EvidenceItem(id="1", tool="t", description="d", values={"ctr_drop_pct": 5.0, "avg_frequency": 2.0, "spend": 100}, provenance="measured")]
    assert check_cause_signature(Cause.CREATIVE_FATIGUE, e_fatigue_fail)[0] == False
    
    # STOCKOUT
    e_stockout = [EvidenceItem(id="1", tool="t", description="d", values={"days_of_cover": 1.0, "spend": 100}, provenance="measured")]
    assert check_cause_signature(Cause.STOCKOUT, e_stockout)[0] == True
    
    e_stockout_fail = [EvidenceItem(id="1", tool="t", description="d", values={"days_of_cover": 10.0, "spend": 100}, provenance="measured")]
    assert check_cause_signature(Cause.STOCKOUT, e_stockout_fail)[0] == False
    
    # TRACKING_BREAK
    e_tracking = [EvidenceItem(id="1", tool="t", description="d", values={"conversion_drop": 80.0, "actual_transactions": 100}, provenance="measured")]
    assert check_cause_signature(Cause.TRACKING_BREAK, e_tracking)[0] == True
    
    e_tracking_fail = [EvidenceItem(id="1", tool="t", description="d", values={"conversion_drop": 10.0, "pixel_purchases": 90, "actual_transactions": 100}, provenance="measured")]
    assert check_cause_signature(Cause.TRACKING_BREAK, e_tracking_fail)[0] == False
    
    # MARGIN_SQUEEZE
    e_margin = [EvidenceItem(id="1", tool="t", description="d", values={"margin": 15.0}, provenance="measured")]
    assert check_cause_signature(Cause.MARGIN_SQUEEZE, e_margin)[0] == True
    
    e_margin_fail = [EvidenceItem(id="1", tool="t", description="d", values={"margin": 30.0}, provenance="measured")]
    assert check_cause_signature(Cause.MARGIN_SQUEEZE, e_margin_fail)[0] == False


def test_guardian_pass_valid_diagnosis():
    diagnosis = Diagnosis(
        incident_id="inc1",
        cause=Cause.MARGIN_SQUEEZE,
        source="agent",
        evidence_ids=["1"],
        explanation="Margin dropped to 15.5%",
        guardian="PASS"
    )
    evidence = [EvidenceItem(id="1", tool="t", description="d", values={"margin": 15.5}, provenance="measured")]
    
    new_diag = verify(diagnosis, evidence)
    assert new_diag.guardian == "PASS"
    assert "15.5" in new_diag.explanation

def test_guardian_downgrades_hallucinated_numbers():
    diagnosis = Diagnosis(
        incident_id="inc2",
        cause=Cause.MARGIN_SQUEEZE,
        source="agent",
        evidence_ids=["1"],
        explanation="Margin dropped to 99.4%", # Hallucination
        guardian="PASS"
    )
    # Give margin 15.5 so it passes signature but fails verification
    evidence = [EvidenceItem(id="1", tool="t", description="d", values={"margin": 15.5}, provenance="measured")]
    
    new_diag = verify(diagnosis, evidence)
    assert new_diag.guardian == "DOWNGRADED"
    assert "Sanitized" in new_diag.explanation
    assert "99.4" not in new_diag.explanation
    assert new_diag.cause == Cause.MARGIN_SQUEEZE

def test_guardian_fails_invalid_signature():
    diagnosis = Diagnosis(
        incident_id="inc3",
        cause=Cause.STOCKOUT,
        source="agent",
        evidence_ids=["1"],
        explanation="Stockout due to days of cover 45.0",
        guardian="PASS"
    )
    evidence = [EvidenceItem(id="1", tool="t", description="d", values={"days_of_cover": 45.0, "spend": 100}, provenance="measured")]
    
    new_diag = verify(diagnosis, evidence)
    assert new_diag.guardian == "FAIL"
    assert new_diag.cause == Cause.UNKNOWN
    assert "Rejected" in new_diag.explanation

def test_guardian_catches_mixed_currency_and_percent_hallucinations():
    diagnosis = Diagnosis(
        incident_id="inc4",
        cause=Cause.MARGIN_SQUEEZE,
        source="agent",
        evidence_ids=["1"],
        explanation="Margin dropped to 88.5% with COGS at $45.00", 
        guardian="PASS"
    )
    # Give margin 15.0 so it passes signature but fails verification of 88.5 and 45.00
    evidence = [EvidenceItem(id="1", tool="t", description="d", values={"margin": 15.0}, provenance="measured")]
    
    new_diag = verify(diagnosis, evidence)
    assert new_diag.guardian == "DOWNGRADED"
    assert "Sanitized" in new_diag.explanation
