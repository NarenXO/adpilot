def update_calibration(predicted_mid: float, observed_delta: float) -> float:
    # Updates confidence calibration factor
    error = abs(predicted_mid - observed_delta)
    return max(0.5, 1.0 - (error / 100.0))
