"""backend/eval — Evaluation Benchmark Harness."""

from backend.eval.detection_eval import evaluate_detection
from backend.eval.forecast_eval import evaluate_forecast
from backend.eval.backtest import run_backtest
from backend.eval.placebo import run_placebo_test
from backend.eval.scorecard import build_scorecard
from backend.eval.harness import run_eval

__all__ = [
    "evaluate_detection",
    "evaluate_forecast",
    "run_backtest",
    "run_placebo_test",
    "build_scorecard",
    "run_eval",
]
