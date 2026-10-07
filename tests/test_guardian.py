import pytest
from backend.contracts import Diagnosis, EvidenceItem
from backend.contracts.enums import Cause
from backend.guardian.signatures import check_cause_signature
from backend.guardian.verifier import verify

def test_signatures_all_golden_causes():
    # CREATIVE_FATIGUE
    e_fatigue = [EvidenceItem(id="1", tool="t", description="d", values={"ctr": 0.02}, provenance="m")]
    assert check_cause_signature(Cause.CREATIVE_FATIGUE, e_fatigue)[0] == True
    
    e_fatigue_fail = [EvidenceItem(id="1", tool="t", description="d", values={"ctr": 0.10, "avg_frequency": 2.0}, provenance="m")]
    assert check_cause_signature(Cause.CREATIVE_FATIGUE, e_fatigue_fail)[0] == False
    
    # STOCKOUT
    e_stockout = [EvidenceItem(id="1", tool="t", description="d", values={"days_of_cover": 1.0}, provenance="m")]
    assert check_cause_signature(Cause.STOCKOUT, e_stockout)[0] == True
    
    e_stockout_fail = [EvidenceItem(id="1", tool="t", description="d", values={"days_of_cover": 10.0}, provenance="m")]
    assert check_cause_signature(Cause.STOCKOUT, e_stockout_fail)[0] == False
    
    # TRACKING_BREAK
    e_tracking = [EvidenceItem(id="1", tool="t", description="d", values={"pixel_purchases": 10, "actual_transactions": 100}, provenance="m")]
    assert check_cause_signature(Cause.TRACKING_BREAK, e_tracking)[0] == True
    
    e_tracking_fail = [EvidenceItem(id="1", tool="t", description="d", values={"pixel_purchases": 90, "actual_transactions": 100}, provenance="m")]
    assert check_cause_signature(Cause.TRACKING_BREAK, e_tracking_fail)[0] == False
    
    # MARGIN_SQUEEZE
    e_margin = [EvidenceItem(id="1", tool="t", description="d", values={"margin": 15.0}, provenance="m")]
    assert check_cause_signature(Cause.MARGIN_SQUEEZE, e_margin)[0] == True
    
    e_margin_fail = [EvidenceItem(id="1", tool="t", description="d", values={"margin": 30.0}, provenance="m")]
    assert check_cause_signature(Cause.MARGIN_SQUEEZE, e_margin_fail)[0] == False


def test_guardian_pass_valid_diagnosis():
    diagnosis = Diagnosis(
        cause=Cause.MARGIN_SQUEEZE,
        source="agent",
        evidence_ids=["1"],
        explanation="Margin dropped to 15.5%",
        guardian="PENDING"
    )
    evidence = [EvidenceItem(id="1", tool="t", description="d", values={"margin": 15.5}, provenance="m")]
    
    new_diag = verify(diagnosis, evidence)
    assert new_diag.guardian == "PASS"
    assert "15.5" in new_diag.explanation

def test_guardian_downgrades_hallucinated_numbers():
    diagnosis = Diagnosis(
        cause=Cause.MARGIN_SQUEEZE,
        source="agent",
        evidence_ids=["1"],
        explanation="Margin dropped to 99.4%", # Hallucination
        guardian="PENDING"
    )
    evidence = [EvidenceItem(id="1", tool="t", description="d", values={"margin": 15.5}, provenance="m")]
    
    new_diag = verify(diagnosis, evidence)
    assert new_diag.guardian == "DOWNGRADED"
    assert "Sanitized" in new_diag.explanation
    assert "99.4" not in new_diag.explanation
    assert new_diag.cause == Cause.MARGIN_SQUEEZE

def test_guardian_fails_invalid_signature():
    diagnosis = Diagnosis(
        cause=Cause.STOCKOUT,
        source="agent",
        evidence_ids=["1"],
        explanation="Stockout due to days of cover 45.0",
        guardian="PENDING"
    )
    evidence = [EvidenceItem(id="1", tool="t", description="d", values={"days_of_cover": 45.0}, provenance="m")]
    
    new_diag = verify(diagnosis, evidence)
    assert new_diag.guardian == "FAIL"
    assert new_diag.cause == Cause.UNKNOWN
    assert "Rejected" in new_diag.explanation
