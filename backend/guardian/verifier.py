import re
import math
from typing import List, Set
from dataclasses import replace
from backend.contracts import Diagnosis, EvidenceItem
from backend.contracts.enums import Cause
from backend.guardian.signatures import check_cause_signature

def _extract_numbers(text: str) -> List[float]:
    # Match integers and floats (e.g., 15, 15.5, .5). We ignore % or $ here as they are just contexts.
    # A simple regex for numbers
    matches = re.findall(r'\b\d+(?:\.\d+)?\b', text)
    return [float(m) for m in matches]

def _flatten_evidence_numbers(evidence: List[EvidenceItem]) -> List[float]:
    nums = []
    for e in evidence:
        for v in e.values.values():
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                nums.append(float(v))
            elif isinstance(v, str):
                nums.extend(_extract_numbers(v))
    return nums

def _match_number(num: float, evidence_nums: List[float], tol: float = 0.05) -> bool:
    for ev_num in evidence_nums:
        if math.isclose(num, ev_num, abs_tol=tol):
            return True
        # For percentages (e.g. 15% -> 15.0 in text, 0.15 in evidence)
        if math.isclose(num / 100.0, ev_num, abs_tol=tol):
            return True
        if math.isclose(num, ev_num * 100.0, abs_tol=tol):
            return True
    return False

def verify(diagnosis: Diagnosis, evidence: List[EvidenceItem]) -> Diagnosis:
    # 1. Number verification
    explanation_nums = _extract_numbers(diagnosis.explanation)
    evidence_nums = _flatten_evidence_numbers(evidence)
    
    numbers_valid = True
    for n in explanation_nums:
        if not _match_number(n, evidence_nums):
            numbers_valid = False
            break
            
    # 2. Cause Signature Test
    sig_valid, reason = check_cause_signature(diagnosis.cause, evidence)
    
    # 3. Verdict Determination
    updates = {}
    
    # Handle whether cause is an enum or string
    cause_str = diagnosis.cause.value if hasattr(diagnosis.cause, 'value') else diagnosis.cause

    if numbers_valid and sig_valid:
        updates["guardian"] = "PASS"
    elif sig_valid and not numbers_valid:
        updates["guardian"] = "DOWNGRADED"
        updates["explanation"] = f"[Guardian Sanitized] Verified {cause_str} based on raw evidence metrics without unverified numerical claims."
    elif not sig_valid:
        updates["guardian"] = "FAIL"
        updates["cause"] = Cause.UNKNOWN.value if hasattr(Cause.UNKNOWN, 'value') else "UNKNOWN"
        updates["explanation"] = f"[Guardian Rejected] Claimed cause {cause_str} failed signature validation. Root cause unverified."
        
    return diagnosis.model_copy(update=updates)
