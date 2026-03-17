from typing import Dict, List
from fastapi import APIRouter, HTTPException
from app.models.patient import PatientProfile

router = APIRouter()

patients_db: Dict[str, PatientProfile] = {}


@router.post("", response_model=PatientProfile, status_code=201)
def create_patient(patient: PatientProfile):
    if patient.patient_id in patients_db:
        raise HTTPException(status_code=409, detail="Patient already exists")
    patients_db[patient.patient_id] = patient
    return patient


@router.get("/{patient_id}", response_model=PatientProfile)
def get_patient(patient_id: str):
    if patient_id not in patients_db:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patients_db[patient_id]


@router.put("/{patient_id}", response_model=PatientProfile)
def update_patient(patient_id: str, patient: PatientProfile):
    if patient_id not in patients_db:
        raise HTTPException(status_code=404, detail="Patient not found")
    patients_db[patient_id] = patient
    return patient


@router.get("", response_model=List[PatientProfile])
def list_patients():
    return list(patients_db.values())
