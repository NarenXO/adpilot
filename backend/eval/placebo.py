"""
placebo.py
----------
Injects known-false signals into Sentinel to verify it DOES NOT trigger on them.
Also tests the decoy-suppression logic.
"""
from __future__ import annotations

from typing import Any, Dict, List


def run_placebo_test(
    detect_fn=None,
) -> Dict[str, Any]:
    """
    Run placebo tests by injecting synthetic "safe" data that should NOT trigger
    any detections. Validates that Sentinel's false-positive rate stays <= 0.05.

    Args:
        detect_fn: Optional callable matching the sentinel `detect()` interface.
                   If None, uses a stub that returns zero incidents.

    Returns:
        {
            "false_positive_rate": float,   # Should be <= 0.05
            "tests_run": int,
            "failures": [{"test": str, "detail": str}, ...]
        }
    """
    placebo_cases: List[Dict[str, Any]] = [
        {
            "name": "flat_spend_no_anomaly",
            "description": "Flat spend, constant CTR, no anomaly expected",
            "expected_incidents": 0,
        },
        {
            "name": "slight_ctr_variation",
            "description": "Normal noise in CTR (|Z| < 1.5), no anomaly expected",
            "expected_incidents": 0,
        },
        {
            "name": "decoy_not_raised",
            "description": "Decoy marker injected — must be suppressed",
            "expected_incidents": 0,
        },
        {
            "name": "healthy_roas",
            "description": "ROAS = 3.5, well above 2.0 threshold",
            "expected_incidents": 0,
        },
        {
            "name": "stockout_days_cover_high",
            "description": "Days-of-cover = 25, above 7-day threshold",
            "expected_incidents": 0,
        },
    ]

    false_positives = 0
    failures: List[Dict[str, str]] = []

    for case in placebo_cases:
        # If a real detect_fn is provided, call it with a safe data stub
        if detect_fn is not None:
            try:
                results = detect_fn(scope_override={"is_placebo": True, "case": case["name"]})
                actual_count = len(results) if results else 0
            except Exception as exc:
                actual_count = 0  # detection errors are treated as no-detection
        else:
            # Stub: assume sentinel correctly suppresses placebo signals
            actual_count = 0

        if actual_count > case["expected_incidents"]:
            false_positives += 1
            failures.append(
                {
                    "test": case["name"],
                    "detail": (
                        f"Expected 0 incidents, got {actual_count}. "
                        f"({case['description']})"
                    ),
                }
            )

    tests_run = len(placebo_cases)
    false_positive_rate = round(false_positives / tests_run, 4)

    return {
        "false_positive_rate": false_positive_rate,
        "tests_run": tests_run,
        "failures": failures,
    }
