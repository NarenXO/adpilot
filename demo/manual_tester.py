import sys
import os

# Add parent dir to path so we can import backend correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.contracts import Incident, Diagnosis, EvidenceItem
from backend.contracts.enums import Cause
from backend.investigator.agent import investigate
from backend.guardian.verifier import verify
from backend.guardian.signatures import check_cause_signature

def mode_1_hallucination_test():
    print("\n--- Mode 1: Manual Guardian Hallucination Test ---")
    try:
        actual_ctr_drop = float(input("Enter actual CTR drop % in evidence (e.g. 15.5): "))
    except ValueError:
        print("[WARN] Invalid input. Defaulting to 15.5")
        actual_ctr_drop = 15.5
        
    explanation = input("Type custom AI explanation text (try lying, e.g. 'CTR dropped by 99% leading to revenue loss'): ")
    
    # We add ctr=0.02 to ensure it passes the creative fatigue signature test,
    # so we can explicitly test the hallucination downgrade behavior.
    evidence = [
        EvidenceItem(
            id="ev_hal_1",
            tool="mock_tool",
            description="Mock evidence",
            values={"ctr": 0.02, "ctr_drop_pct": actual_ctr_drop},
            provenance="measured"
        )
    ]
    
    diag = Diagnosis(
        cause=Cause.CREATIVE_FATIGUE,
        source="agent",
        evidence_ids=["ev_hal_1"],
        explanation=explanation,
        guardian="PENDING"
    )
    
    verified_diag = verify(diag, evidence)
    
    print("\n[RESULT]")
    print(f"Guardian Status: {verified_diag.guardian}")
    print(f"Sanitized Text: {verified_diag.explanation}")


def mode_2_signature_test():
    print("\n--- Mode 2: Manual Cause Signature Test ---")
    print("Causes: 1=CREATIVE_FATIGUE, 2=STOCKOUT, 3=TRACKING_BREAK, 4=MARGIN_SQUEEZE")
    cause_map = {
        "1": Cause.CREATIVE_FATIGUE,
        "2": Cause.STOCKOUT,
        "3": Cause.TRACKING_BREAK,
        "4": Cause.MARGIN_SQUEEZE
    }
    
    choice = input("Select Cause (1-4): ")
    cause = cause_map.get(choice, Cause.UNKNOWN)
    
    values = {}
    if cause == Cause.CREATIVE_FATIGUE:
        values["ctr"] = float(input("Enter CTR (e.g. 0.03): ") or 0.03)
        values["avg_frequency"] = float(input("Enter avg frequency (e.g. 6.0): ") or 6.0)
    elif cause == Cause.STOCKOUT:
        values["days_of_cover"] = float(input("Enter days of cover (e.g. 1.0): ") or 1.0)
        values["stock_units"] = int(input("Enter stock units (e.g. 0): ") or 0)
    elif cause == Cause.TRACKING_BREAK:
        values["pixel_purchases"] = int(input("Enter pixel purchases (e.g. 10): ") or 10)
        values["actual_transactions"] = int(input("Enter actual transactions (e.g. 100): ") or 100)
    elif cause == Cause.MARGIN_SQUEEZE:
        values["margin"] = float(input("Enter margin pct (e.g. 15.0): ") or 15.0)
        values["discount"] = float(input("Enter discount pct (e.g. 30.0): ") or 30.0)
    else:
        print("[WARN] Invalid cause selected.")
        return

    evidence = [
        EvidenceItem(
            id="ev_sig_1",
            tool="mock_tool",
            description="Mock evidence",
            values=values,
            provenance="measured"
        )
    ]
    
    sig_valid, reason = check_cause_signature(cause, evidence)
    
    print("\n[RESULT]")
    if sig_valid:
        print(f"Status: PASS -> {reason}")
    else:
        print(f"Status: FAIL -> {reason} (Cause would be UNKNOWN)")


def mode_3_custom_incident():
    print("\n--- Mode 3: Custom Incident Investigation ---")
    inc_id = input("Incident ID (e.g. inc_custom_01): ") or "inc_custom_01"
    metric = input("Metric (ctr/purchases/margin): ") or "ctr"
    platform = input("Platform (meta/google/tiktok): ") or "meta"
    sku = input("SKU (optional): ")
    campaign = input("Campaign (optional): ")
    
    inc = Incident(
        id=inc_id,
        metric=metric,
        platform=platform if platform else None,
        scope_sku=sku if sku else None,
        campaign_id=campaign if campaign else None
    )
    
    print("\n[Running Investigation...]")
    evidence, diagnosis, trace = investigate(inc)
    
    print("\n[RESULT]")
    print(f"Cause: {diagnosis.cause.value}")
    print(f"Source: {diagnosis.source}")
    print(f"Guardian Status: {diagnosis.guardian}")
    print(f"Explanation: {diagnosis.explanation}")
    print(f"Number of Evidence Items: {len(evidence)}")
    print(f"Number of Trace Steps: {len(trace)}")


def main():
    # Setup mock global for tools in case they get called directly
    from unittest.mock import patch, MagicMock
    def side_effect(query, *args, **kwargs):
        m = MagicMock()
        if "compare_periods" in query or "ad_performance" in query:
            m.fetchone.return_value = [1.0, 2.0, 3.0, 4.0, 5.0]
        elif "ga_funnel" in query:
            m.fetchone.return_value = [100, 20, 10, 5]
        elif "creatives" in query:
            m.fetchall.return_value = [["c1", "video", 10, "hook1", 0.05, 10.0, 2.5]]
        elif "inventory" in query:
            m.fetchone.return_value = [100, 10.5]
        elif "sales" in query:
            m.fetchone.return_value = [100.0, 10.0, 90.0, 50.0, 40.0]
        elif "platform_split" in query or "GROUP BY platform" in query:
            m.fetchall.return_value = [["meta", 1000.0, 2000.0]]
        elif "tracking health" in query or ("pixel_purchases" in query):
            m.fetchone.return_value = [100, 80]
        elif "memory" in query:
            m.fetchall.return_value = [["inc_old", "old summary", True]]
        else:
            m.fetchone.return_value = [1, 2, 3, 4, 5]
        return m

    mock_conn = MagicMock()
    mock_conn.execute.side_effect = side_effect
    patch("backend.investigator.tools.get_db", return_value=mock_conn).start()
    
    while True:
        print("\n=== AdPilot Manual Tester ===")
        print("1. Manual Guardian Hallucination Test")
        print("2. Manual Cause Signature Test")
        print("3. Custom Incident Investigation")
        print("4. Exit")
        
        choice = input("Select an option (1-4): ")
        if choice == "1":
            mode_1_hallucination_test()
        elif choice == "2":
            mode_2_signature_test()
        elif choice == "3":
            mode_3_custom_incident()
        elif choice == "4":
            print("Exiting.")
            break
        else:
            print("[WARN] Invalid option.")

if __name__ == "__main__":
    main()
