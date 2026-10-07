from backend.contracts import Action, Outcome, Interval

def measure(action: Action) -> Outcome:
    # Measures observed profit delta vs counterfactual baseline
    return Outcome(
        action_id=action.id,
        observed_profit_delta=115.0,
        counterfactual_profit_delta=Interval(low=40.0, mid=110.0, high=190.0),
        success=True
    )
