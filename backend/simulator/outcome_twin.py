"""
backend/simulator/outcome_twin.py
=================================
Independent simulator (Outcome Twin) for unbiased evaluation of actions.
Uses a different Hill curve (η=1.1, perturbed K and E_max) from the main world
to prevent grading its own homework.
"""
from __future__ import annotations

from datetime import datetime, timezone
import numpy as np
import pandas as pd


def _get_main_world_params() -> tuple[dict[str, float], dict[str, float]]:
    """Reproduce the rng sequence from generate_world to get exact K and Emax."""
    rng = np.random.default_rng(42)
    
    for _ in range(20):
        rng.uniform(5, 40)       # cogs
        rng.uniform(0.20, 0.75)  # margin
        rng.integers(0, 730)     # days_since
        
    skus = [f"sku_{i:03d}" for i in range(1, 21)]
    platforms = ["meta", "google", "tiktok"]
    campaigns = []
    for plat in platforms:
        for j in range(1, 5):
            campaigns.append(f"camp_{plat}_{j:02d}")
            
    for camp in campaigns:
        n = int(rng.integers(1, 4))
        rng.choice(skus, size=n, replace=False)
        
    camp_K = {}
    camp_Emax = {}
    
    for camp in campaigns:
        camp_K[camp] = float(rng.uniform(500, 2000))
        camp_Emax[camp] = float(rng.uniform(3000, 15000))
        rng.uniform(200, 1200)
        rng.uniform(0.40, 2.50)
        rng.uniform(0.02, 0.05)
        
    return camp_K, camp_Emax


class OutcomeTwin:
    def __init__(self, world_dfs: dict[str, pd.DataFrame], seed: int = 99):
        """
        Initialize with the current world state DataFrames.
        Uses a DIFFERENT seed (default 99) than the main world (42)
        to ensure independent randomness.
        """
        self.world_dfs = world_dfs
        self.rng = np.random.default_rng(seed)
        self.eta_twin = 1.1
        
        sm = world_dfs["sku_master"]
        self.sku_margin = dict(zip(sm["sku"], sm["margin_pct"]))
        
        ad = world_dfs["ad_performance"]
        self.camp_primary_sku = {}
        for camp in ad["campaign_id"].unique():
            skus_for_camp = ad[ad["campaign_id"] == camp]["sku"].mode()
            if not skus_for_camp.empty:
                self.camp_primary_sku[camp] = skus_for_camp.iloc[0]
            else:
                self.camp_primary_sku[camp] = "sku_001"
                
        k_main, emax_main = _get_main_world_params()
        self.k_twin = {}
        self.emax_twin = {}
        
        for camp, k_val in k_main.items():
            self.k_twin[camp] = k_val * float(self.rng.uniform(0.85, 1.15))
        for camp, e_val in emax_main.items():
            self.emax_twin[camp] = e_val * float(self.rng.uniform(0.90, 1.10))
            
    def _twin_hill_revenue(self, spend: float, campaign_id: str) -> float:
        """Internal: compute revenue using twin's Hill parameters."""
        if spend <= 0:
            return 0.0
        k = self.k_twin.get(campaign_id, 1000.0)
        emax = self.emax_twin.get(campaign_id, 5000.0)
        eta = self.eta_twin
        
        s_eta = spend ** eta
        k_eta = k ** eta
        return (emax * s_eta) / (k_eta + s_eta)
        
    def _estimate_cogs(self, revenue: float, campaign_id: str) -> float:
        """Internal: estimate COGS from revenue using SKU margin data."""
        sku = self.camp_primary_sku.get(campaign_id, "sku_001")
        margin = self.sku_margin.get(sku, 0.5)
        return revenue * (1.0 - margin)

    def simulate_action_outcome(
        self,
        action_id: str,
        budget_changes: dict[str, float],
        rollout_pct: float = 1.0,
        measurement_days: int = 3
    ) -> dict:
        """
        Simulates what happens when budget_changes are applied.
        """
        if not budget_changes or rollout_pct == 0.0:
            noise = float(self.rng.normal(0, 0.05))
            vals = sorted([float(self.rng.normal(0, 0.01)) for _ in range(3)])
            return {
                "action_id": action_id,
                "observed_profit_delta": noise,
                "counterfactual_low": vals[0],
                "counterfactual_mid": vals[1],
                "counterfactual_high": vals[2],
                "success": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
        ad = self.world_dfs["ad_performance"]
        total_profit_delta = 0.0
        
        for camp_id, new_spend in budget_changes.items():
            camp_data = ad[ad["campaign_id"] == camp_id]
            if not camp_data.empty:
                last_date = camp_data["date"].max()
                old_spend = camp_data[camp_data["date"] == last_date]["spend"].sum()
            else:
                old_spend = 0.0
                
            effective_spend = old_spend + rollout_pct * (new_spend - old_spend)
            
            new_revenue = self._twin_hill_revenue(effective_spend, camp_id)
            new_cogs = self._estimate_cogs(new_revenue, camp_id)
            new_profit = new_revenue - new_cogs - effective_spend
            
            old_revenue = self._twin_hill_revenue(old_spend, camp_id)
            old_cogs = self._estimate_cogs(old_revenue, camp_id)
            old_profit = old_revenue - old_cogs - old_spend
            
            profit_delta_per_campaign = (new_profit - old_profit) * measurement_days
            total_profit_delta += profit_delta_per_campaign
            
        noise = float(self.rng.normal(0, 0.05))
        observed_profit_delta = total_profit_delta * (1.0 + noise)
        
        cf_mid = 0.0
        cf_low = -abs(observed_profit_delta) * 0.3
        cf_high = abs(observed_profit_delta) * 0.2
        
        base_noise = 0.02 * abs(observed_profit_delta) if observed_profit_delta != 0 else 0.01
        cf_mid += float(self.rng.normal(0, base_noise))
        cf_low += float(self.rng.normal(0, base_noise))
        cf_high += float(self.rng.normal(0, base_noise))
        
        vals = sorted([cf_low, cf_mid, cf_high])
        cf_low, cf_mid, cf_high = vals[0], vals[1], vals[2]
        
        success = observed_profit_delta > cf_mid
        
        return {
            "action_id": action_id,
            "observed_profit_delta": round(observed_profit_delta, 4),
            "counterfactual_low": round(cf_low, 4),
            "counterfactual_mid": round(cf_mid, 4),
            "counterfactual_high": round(cf_high, 4),
            "success": bool(success),
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    def simulate_batch(self, actions: list[dict]) -> pd.DataFrame:
        """
        Process a list of action dicts and return a DataFrame
        matching the `outcomes` DDL exactly.
        """
        outcomes = []
        for action in actions:
            action_id = action.get("action_id", "unknown")
            budget_changes = action.get("budget_changes", {})
            rollout_pct = action.get("rollout_pct", 1.0)
            
            outcome = self.simulate_action_outcome(
                action_id=action_id,
                budget_changes=budget_changes,
                rollout_pct=rollout_pct
            )
            outcomes.append(outcome)
            
        if not outcomes:
            df = pd.DataFrame(columns=[
                "action_id", "observed_profit_delta", "counterfactual_low",
                "counterfactual_mid", "counterfactual_high", "success", "created_at"
            ])
        else:
            df = pd.DataFrame(outcomes)
            
        df["created_at"] = pd.to_datetime(df["created_at"])
        df["success"] = df["success"].astype(bool)
        
        expected_cols = [
            "action_id", "observed_profit_delta", "counterfactual_low",
            "counterfactual_mid", "counterfactual_high", "success", "created_at"
        ]
        
        for col in expected_cols:
            if col not in df.columns:
                df[col] = None
                
        return df[expected_cols]
