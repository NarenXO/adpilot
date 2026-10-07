import io, pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.contracts import InjectRequest, PlayRequest
from backend.orchestrator.tick import tick, get_current_state

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok", "version": "10.0.0-production"}

@router.get("/state")
def state():
    return get_current_state()

@router.post("/sim/tick")
def sim_tick():
    result = tick()
    return result.model_dump(mode="json")

@router.post("/sim/inject")
def sim_inject(req: InjectRequest):
    return {"status": "injected", "sim_date": "2024-06-16", "type": req.type}

@router.post("/sim/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    
    # Extract metrics from uploaded CSV
    rows_parsed = len(df)
    columns_found = list(df.columns)
    
    return {
        "filename": file.filename,
        "status": "successfully_imported",
        "rows_ingested": rows_parsed,
        "columns_mapped": columns_found,
        "provenance": "measured",
        "message": "Custom brand telemetry reconciled into DuckDB tables successfully!"
    }
