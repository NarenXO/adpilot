"""backend/eval — Evaluation Benchmark Harness."""

from backend.eval.detection_eval import evaluate_detection
from backend.eval.forecast_eval import evaluate_forecast
from backend.eval.backtest import run_backtest
from backend.eval.placebo import run_placebo_test
from backend.eval.scorecard import build_scorecard

def __getattr__(name: str):
    if name == "run_eval":
        from backend.eval.harness import run_eval
        return run_eval
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    "evaluate_detection",
    "evaluate_forecast",
    "run_backtest",
    "run_placebo_test",
    "build_scorecard",
    "run_eval",
]
