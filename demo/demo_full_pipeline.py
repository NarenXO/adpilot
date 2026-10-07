import sys
import os

# Add parent dir to path so we can import backend correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.contracts import Incident, Cause
from backend.investigator.agent import investigate
from backend.guardian.verifier import verify
from unittest.mock import patch, MagicMock

# Apply global patch for the demo so it runs without DB crashing
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


def print_header(title):
    print("\n" + "="*80)
    print(title.center(80))
    print("="*80 + "\n")

def run_cached_golden_path():
    print_header("TESTING CACHED GOLDEN PATH INCIDENTS")
    
    incidents = [
        Incident(id="incident_creative_fatigue", metric="ctr"),
        Incident(id="incident_stockout", metric="revenue"),
        Incident(id="incident_tracking_break", metric="cvr"),
        Incident(id="incident_margin_squeeze", metric="margin")
    ]
    
    report_lines = ["# AdPilot Sanjeevi Demo Report\n\n## Cached Golden Path Incidents\n"]
    
    for inc in incidents:
        print(f"--- Running investigation for {inc.id} ---")
        evidence, diagnosis, trace = investigate(inc)
        
        status = "[OK]" if diagnosis.guardian == "PASS" else "[FAIL]"
        
        print(f"Cause: {diagnosis.cause.value}")
        print(f"Source: {diagnosis.source}")
        print(f"Guardian Status: {diagnosis.guardian} {status}")
        print(f"Explanation: {diagnosis.explanation}")
        print(f"Evidence Items: {len(evidence)}")
        print("-" * 50)
        
        report_lines.append(f"- **{inc.id}**: Cause={diagnosis.cause.value}, Guardian={diagnosis.guardian} {status}\n")
    
    return report_lines

def run_playbook_fallback():
    print_header("TESTING PLAYBOOK FALLBACK (OLLAMA OFFLINE)")
    
    # We use a non-cached ID to ensure it triggers normal execution, which falls back since Ollama isn't running
    inc = Incident(id="inc_fallback_test", metric="sales", scope_sku="SKU1")
    
    print(f"--- Running investigation for {inc.id} (Expect Playbook Fallback) ---")
    evidence, diagnosis, trace = investigate(inc)
    
    status = "[OK]" if diagnosis.source == "playbook" else "[FAIL]"
    
    print(f"Cause: {diagnosis.cause.value}")
    print(f"Source: {diagnosis.source} {status}")
    print(f"Guardian Status: {diagnosis.guardian}")
    print(f"Explanation: {diagnosis.explanation}")
    print(f"Trace Steps: {len(trace)}")
    if len(trace) > 0:
        print(f"First Trace Tool: {trace[0].tool}")
    print("-" * 50)
    
    report_line = f"\n## Playbook Fallback\n- **{inc.id}**: Source={diagnosis.source} {status}, Cause={diagnosis.cause.value}\n"
    return [report_line]

def write_report(lines):
    report_path = os.path.join(os.path.dirname(__file__), "demo_report.md")
    with open(report_path, "w") as f:
        f.writelines(lines)
    print(f"\n[OK] Report written to {report_path}")

def main():
    while True:
        print("\n=== AdPilot Sanjeevi Module Demo ===")
        print("1. Run cached Golden Path incidents")
        print("2. Run playbook fallback (Ollama offline simulator)")
        print("3. Run full suite and generate Markdown report")
        print("4. Exit")
        
        choice = input("Select an option (1-4): ")
        
        if choice == "1":
            run_cached_golden_path()
        elif choice == "2":
            run_playbook_fallback()
        elif choice == "3":
            lines = run_cached_golden_path()
            lines.extend(run_playbook_fallback())
            write_report(lines)
        elif choice == "4":
            print("Exiting demo.")
            break
        else:
            print("[WARN] Invalid option. Please select 1-4.")

if __name__ == "__main__":
    main()
