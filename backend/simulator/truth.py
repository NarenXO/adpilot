"""
backend/simulator/truth.py
==========================
TruthRecorder: collects ground-truth labels for every injected incident.
Produces a DataFrame matching the DDL `truth` table exactly:
    sim_date DATE, incident_type VARCHAR, scope_platform VARCHAR,
    scope_campaign_id VARCHAR, scope_sku VARCHAR, is_decoy BOOLEAN, label VARCHAR
"""
from __future__ import annotations

from datetime import date
import pandas as pd


_TRUTH_COLUMNS = [
    "sim_date",
    "incident_type",
    "scope_platform",
    "scope_campaign_id",
    "scope_sku",
    "is_decoy",
    "label",
]


class TruthRecorder:
    """
    Collects ground-truth entries for injected anomalies.

    Usage
    -----
    recorder = TruthRecorder()
    recorder.record_incident(
        sim_date=date(2024, 7, 15),
        incident_type="CREATIVE_FATIGUE",
        platform="meta",
        campaign_id="camp_meta_01",
        sku="sku_003",
        is_decoy=False,
        label="alert",
    )
    truth_df = recorder.to_dataframe()
    """

    def __init__(self) -> None:
        self._rows: list[dict] = []

    def record_incident(
        self,
        sim_date: date,
        incident_type: str,
        platform: str | None,
        campaign_id: str | None,
        sku: str | None,
        is_decoy: bool,
        label: str,
    ) -> None:
        """
        Append a single ground-truth row.

        Parameters
        ----------
        sim_date       : The calendar date the incident is active / detected.
        incident_type  : One of Cause enum values (e.g. "CREATIVE_FATIGUE").
        platform       : Scope platform, or None/empty if not applicable.
        campaign_id    : Scope campaign_id, or None/empty if not applicable.
        sku            : Scope sku, or None/empty if not applicable.
        is_decoy       : True if this is a benign decoy that should NOT alert.
        label          : "alert" or "no_alert".
        """
        self._rows.append(
            {
                "sim_date": sim_date,
                "incident_type": incident_type,
                "scope_platform": platform if platform is not None else "",
                "scope_campaign_id": campaign_id if campaign_id is not None else "",
                "scope_sku": sku if sku is not None else "",
                "is_decoy": bool(is_decoy),
                "label": label,
            }
        )

    def to_dataframe(self) -> pd.DataFrame:
        """Return a DataFrame matching the DDL `truth` table exactly."""
        if not self._rows:
            return pd.DataFrame(columns=_TRUTH_COLUMNS)
        df = pd.DataFrame(self._rows, columns=_TRUTH_COLUMNS)
        df["sim_date"] = pd.to_datetime(df["sim_date"]).dt.date
        df["is_decoy"] = df["is_decoy"].astype(bool)
        return df
