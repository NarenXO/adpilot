from fastapi import APIRouter, HTTPException
from backend.contracts import load_fixture

router = APIRouter()

@router.get("/incidents")
def get_incidents():
    return load_fixture("incidents")

@router.get("/incidents/{id}")
def get_incident(id: str):
    incidents = load_fixture("incidents")["incidents"]
    for inc in incidents:
        if inc["id"] == id:
            evidence = load_fixture("evidence")["evidence"]
            return {"incident": inc, "evidence": evidence}
    raise HTTPException(status_code=404, detail="Incident not found")

@router.get("/incidents/{id}/diagnosis")
def get_diagnosis(id: str):
    diag_data = load_fixture("diagnosis")
    if diag_data["diagnosis"]["incident_id"] == id or id == "INC-001":
        return diag_data
    raise HTTPException(status_code=404, detail="Diagnosis not found")
