from typing import Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.digital_twin import DigitalTwin
from app.models.patient import PatientProfile
from app.services.twin_service import DigitalTwinService
from app.api.routes.patients import patients_db

router = APIRouter()
twins_db: Dict[str, DigitalTwin] = {}
twin_service = DigitalTwinService()


class CreateTwinRequest(BaseModel):
    patient_id: str


@router.post("", response_model=DigitalTwin, status_code=201)
def create_twin(request: CreateTwinRequest):
    if request.patient_id not in patients_db:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient = patients_db[request.patient_id]
    twin = twin_service.create_twin(patient)
    twins_db[twin.twin_id] = twin
    return twin


@router.get("/{twin_id}", response_model=DigitalTwin)
def get_twin(twin_id: str):
    if twin_id not in twins_db:
        raise HTTPException(status_code=404, detail="Digital twin not found")
    return twins_db[twin_id]


@router.put("/{twin_id}/update", response_model=DigitalTwin)
def update_twin(twin_id: str, patient: PatientProfile):
    if twin_id not in twins_db:
        raise HTTPException(status_code=404, detail="Digital twin not found")
    twin = twins_db[twin_id]
    updated = twin_service.update_twin(twin, patient)
    twins_db[twin_id] = updated
    return updated


@router.get("", response_model=List[DigitalTwin])
def list_twins():
    return list(twins_db.values())
