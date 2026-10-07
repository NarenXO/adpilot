"""
tests/test_eval.py
------------------
Verification tests for the Phase 3 Evaluation Benchmark Harness.

Tests:
  1. evaluate_detection → precision/recall in [0, 1], correct structure.
  2. evaluate_forecast → MAPE is non-negative float.
  3. run_backtest → CI, curve, mean_profit_delta correct types.
  4. run_placebo_test → false_positive_rate <= 0.05 for known-safe signals.
  5. build_scorecard → returns valid Scorecard Pydantic model.
  6. run_eval → full harness runs without error, returns a dict.
  7. Scorecard.honest_limits → non-empty list of strings.
  8. per_type keys → all four incident types present.
  9. Backtest curve → length matches n_seeds.
 10. Scorecard fields → all required fields present and typed.
"""
from __future__ import annotations

import pytest

from backend.eval.detection_eval import evaluate_detection
from backend.eval.forecast_eval import evaluate_forecast
from backend.eval.backtest import run_backtest
from backend.eval.placebo import run_placebo_test
from backend.eval.scorecard import build_scorecard
from backend.eval.harness import run_eval
from backend.contracts.schemas import Scorecard


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def scorecard() -> Scorecard:
    """Build a scorecard using fixture-only mode (no DB)."""
    return build_scorecard(conn=None)


# ---------------------------------------------------------------------------
# Detection evaluation tests
# ---------------------------------------------------------------------------

class TestDetectionEval:
    def test_returns_expected_keys(self):
        result = evaluate_detection(conn=None)
        required = {"precision", "recall", "false_alarms_per_week", "per_type", "baseline_comparison"}
        assert required.issubset(result.keys())

    def test_precision_recall_in_range(self):
        result = evaluate_detection(conn=None)
        assert 0.0 <= result["precision"] <= 1.0
        assert 0.0 <= result["recall"] <= 1.0

    def test_false_alarms_per_week_non_negative(self):
        result = evaluate_detection(conn=None)
        assert result["false_alarms_per_week"] >= 0.0

    def test_per_type_has_all_four_incident_types(self):
        result = evaluate_detection(conn=None)
        per_type = result["per_type"]
        expected = {"CREATIVE_FATIGUE", "STOCKOUT", "TRACKING_BREAK", "MARGIN_SQUEEZE"}
        assert expected.issubset(per_type.keys())

    def test_per_type_values_in_range(self):
        result = evaluate_detection(conn=None)
        for inc_type, metrics in result["per_type"].items():
            assert 0.0 <= metrics["precision"] <= 1.0, f"precision out of range for {inc_type}"
            assert 0.0 <= metrics["recall"] <= 1.0, f"recall out of range for {inc_type}"

    def test_baseline_comparison_keys_present(self):
        result = evaluate_detection(conn=None)
        baseline = result["baseline_comparison"]
        assert "naive_precision" in baseline
        assert "naive_recall" in baseline

    def test_with_explicit_detections(self):
        detections = [
            {"sim_date": "2024-06-15", "detector": "creative_fatigue", "scope_sku": "SKU-007"},
        ]
        result = evaluate_detection(conn=None, detected_incidents=detections)
        assert isinstance(result["precision"], float)
        assert isinstance(result["recall"], float)


# ---------------------------------------------------------------------------
# Forecast evaluation tests
# ---------------------------------------------------------------------------

class TestForecastEval:
    def test_mape_non_negative(self):
        result = evaluate_forecast(conn=None)
        assert result["mape"] >= 0.0

    def test_mape_is_float(self):
        result = evaluate_forecast(conn=None)
        assert isinstance(result["mape"], float)

    def test_holdout_days_correct(self):
        result = evaluate_forecast(conn=None, holdout_days=30)
        assert result["holdout_days"] == 30

    def test_n_samples_matches_holdout(self):
        result = evaluate_forecast(conn=None, holdout_days=30)
        assert result["n_samples"] == 30

    def test_mape_reasonable_range(self):
        # MAPE should not be wildly high for synthetic data
        result = evaluate_forecast(conn=None)
        assert result["mape"] < 200.0, "MAPE unexpectedly high"


# ---------------------------------------------------------------------------
# Backtest tests
# ---------------------------------------------------------------------------

class TestBacktest:
    def test_returns_required_keys(self):
        result = run_backtest(conn=None, n_seeds=5)
        required = {"mean_profit_delta", "ci_low", "ci_high", "worst_seed", "n_seeds", "curve"}
        assert required.issubset(result.keys())

    def test_curve_length_matches_n_seeds(self):
        n = 5
        result = run_backtest(conn=None, n_seeds=n)
        assert len(result["curve"]) == n

    def test_ci_bounds_ordered(self):
        result = run_backtest(conn=None, n_seeds=10)
        assert result["ci_low"] <= result["mean_profit_delta"]
        assert result["mean_profit_delta"] <= result["ci_high"]

    def test_worst_seed_lte_mean(self):
        result = run_backtest(conn=None, n_seeds=10)
        assert result["worst_seed"] <= result["mean_profit_delta"]

    def test_curve_has_seed_and_profit_keys(self):
        result = run_backtest(conn=None, n_seeds=3)
        for entry in result["curve"]:
            assert "seed" in entry
            assert "profit_delta" in entry


# ---------------------------------------------------------------------------
# Placebo tests
# ---------------------------------------------------------------------------

class TestPlacebo:
    def test_false_positive_rate_within_threshold(self):
        result = run_placebo_test()
        assert result["false_positive_rate"] <= 0.05, (
            f"Placebo false positive rate {result['false_positive_rate']} exceeds 0.05"
        )

    def test_tests_run_positive(self):
        result = run_placebo_test()
        assert result["tests_run"] > 0

    def test_no_failures_with_stub(self):
        result = run_placebo_test(detect_fn=None)
        assert len(result["failures"]) == 0

    def test_failures_is_list(self):
        result = run_placebo_test()
        assert isinstance(result["failures"], list)


# ---------------------------------------------------------------------------
# Scorecard tests
# ---------------------------------------------------------------------------

class TestScorecard:
    def test_scorecard_is_pydantic_model(self, scorecard):
        assert isinstance(scorecard, Scorecard)

    def test_honest_limits_non_empty(self, scorecard):
        assert isinstance(scorecard.honest_limits, list)
        assert len(scorecard.honest_limits) > 0

    def test_honest_limits_are_strings(self, scorecard):
        for item in scorecard.honest_limits:
            assert isinstance(item, str), f"honest_limits entry not a string: {item!r}"

    def test_stockout_spend_avoided_non_negative(self, scorecard):
        assert scorecard.stockout_spend_avoided >= 0.0

    def test_median_time_to_diagnosis_positive(self, scorecard):
        assert scorecard.median_time_to_diagnosis_s > 0.0

    def test_all_required_fields_present(self, scorecard):
        fields = scorecard.model_fields.keys()
        required = {
            "detection", "forecast", "backtest", "regime_shift",
            "placebo", "agent_vs_playbook", "guardian",
            "stockout_spend_avoided", "median_time_to_diagnosis_s", "honest_limits",
        }
        assert required.issubset(set(fields))

    def test_detection_field_has_precision(self, scorecard):
        assert "precision" in scorecard.detection

    def test_forecast_field_has_mape(self, scorecard):
        assert "mape" in scorecard.forecast

    def test_backtest_field_has_curve(self, scorecard):
        assert "curve" in scorecard.backtest

    def test_placebo_field_has_false_positive_rate(self, scorecard):
        assert "false_positive_rate" in scorecard.placebo

    def test_model_dump_roundtrip(self, scorecard):
        d = scorecard.model_dump()
        reconstructed = Scorecard(**d)
        assert reconstructed == scorecard


# ---------------------------------------------------------------------------
# Full harness integration test
# ---------------------------------------------------------------------------

class TestHarness:
    def test_run_eval_returns_dict(self):
        result = run_eval(db_path=None, output_path=None)
        assert isinstance(result, dict)

    def test_run_eval_has_all_scorecard_keys(self):
        result = run_eval(db_path=None, output_path=None)
        required = {
            "detection", "forecast", "backtest", "regime_shift",
            "placebo", "agent_vs_playbook", "guardian",
            "stockout_spend_avoided", "median_time_to_diagnosis_s", "honest_limits",
        }
        assert required.issubset(result.keys())

    def test_run_eval_honest_limits_non_empty(self):
        result = run_eval(db_path=None, output_path=None)
        assert isinstance(result["honest_limits"], list)
        assert len(result["honest_limits"]) > 0

    def test_run_eval_output_file(self, tmp_path):
        import json

        out_file = str(tmp_path / "scorecard.json")
        run_eval(db_path=None, output_path=out_file)

        import pathlib
        content = pathlib.Path(out_file).read_text(encoding="utf-8")
        parsed = json.loads(content)
        assert "detection" in parsed
        assert "honest_limits" in parsed
