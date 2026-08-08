import pytest
from fastapi.testclient import TestClient
from app.main import app

import app.api.routes.patients as patients_module
import app.api.routes.digital_twin as digital_twin_module
import app.api.routes.simulation as simulation_module

client = TestClient(app)

SAMPLE_PATIENT = {
    "patient_id": "test-patient-001",
    "name": "Alice Johnson",
    "age": 52,
    "sex": "F",
    "genomic_data": {
        "gene_variants": ["BRCA1", "CYP2D6*4"],
        "risk_alleles": {"rs429358": "E3"},
        "pharmacogenomics": {"CYP2D6": "poor_metabolizer"},
    },
    "medical_history": {
        "conditions": ["hypertension", "type 2 diabetes"],
        "medications": ["metformin", "lisinopril"],
        "allergies": ["penicillin allergy"],
        "surgeries": [],
    },
    "diagnostic_reports": [
        {
            "report_type": "HbA1c",
            "findings": {"value": 7.8, "unit": "%"},
            "timestamp": "2024-01-15T09:00:00",
        }
    ],
    "physiological_signals": {
        "heart_rate": 76.0,
        "blood_pressure_systolic": 138.0,
        "blood_pressure_diastolic": 88.0,
        "temperature": 37.0,
        "oxygen_saturation": 97.5,
        "glucose_level": 145.0,
    },
}


@pytest.fixture(autouse=True)
def reset_db():
    """Reset in-memory databases before each test."""
    patients_module.patients_db.clear()
    digital_twin_module.twins_db.clear()
    simulation_module.simulations_db.clear()
    yield


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "BioTwin AI API"
    assert data["version"] == "1.0.0"


# --- Patient API Tests ---

def test_create_patient():
    response = client.post("/patients", json=SAMPLE_PATIENT)
    assert response.status_code == 201
    data = response.json()
    assert data["patient_id"] == "test-patient-001"
    assert data["name"] == "Alice Johnson"


def test_create_patient_duplicate():
    client.post("/patients", json=SAMPLE_PATIENT)
    response = client.post("/patients", json=SAMPLE_PATIENT)
    assert response.status_code == 409


def test_get_patient():
    client.post("/patients", json=SAMPLE_PATIENT)
    response = client.get("/patients/test-patient-001")
    assert response.status_code == 200
    assert response.json()["patient_id"] == "test-patient-001"


def test_get_patient_not_found():
    response = client.get("/patients/nonexistent-id")
    assert response.status_code == 404


def test_update_patient():
    client.post("/patients", json=SAMPLE_PATIENT)
    updated = {**SAMPLE_PATIENT, "age": 53}
    response = client.put("/patients/test-patient-001", json=updated)
    assert response.status_code == 200
    assert response.json()["age"] == 53


def test_update_patient_not_found():
    response = client.put("/patients/nonexistent", json=SAMPLE_PATIENT)
    assert response.status_code == 404


def test_list_patients_empty():
    response = client.get("/patients")
    assert response.status_code == 200
    assert response.json() == []


def test_list_patients():
    client.post("/patients", json=SAMPLE_PATIENT)
    response = client.get("/patients")
    assert response.status_code == 200
    assert len(response.json()) == 1


# --- Digital Twin API Tests ---

def test_create_digital_twin():
    client.post("/patients", json=SAMPLE_PATIENT)
    response = client.post("/digital-twins", json={"patient_id": "test-patient-001"})
    assert response.status_code == 201
    data = response.json()
    assert data["patient_id"] == "test-patient-001"
    assert "twin_id" in data
    assert "biological_model" in data
    assert "risk_scores" in data


def test_create_twin_patient_not_found():
    response = client.post("/digital-twins", json={"patient_id": "nonexistent"})
    assert response.status_code == 404


def test_get_digital_twin():
    client.post("/patients", json=SAMPLE_PATIENT)
    create_resp = client.post("/digital-twins", json={"patient_id": "test-patient-001"})
    twin_id = create_resp.json()["twin_id"]
    response = client.get(f"/digital-twins/{twin_id}")
    assert response.status_code == 200
    assert response.json()["twin_id"] == twin_id


def test_get_twin_not_found():
    response = client.get("/digital-twins/nonexistent-twin")
    assert response.status_code == 404


def test_update_digital_twin():
    client.post("/patients", json=SAMPLE_PATIENT)
    create_resp = client.post("/digital-twins", json={"patient_id": "test-patient-001"})
    twin_id = create_resp.json()["twin_id"]
    updated_patient = {**SAMPLE_PATIENT, "age": 54}
    response = client.put(f"/digital-twins/{twin_id}/update", json=updated_patient)
    assert response.status_code == 200
    assert response.json()["twin_id"] == twin_id


def test_list_digital_twins():
    client.post("/patients", json=SAMPLE_PATIENT)
    client.post("/digital-twins", json={"patient_id": "test-patient-001"})
    response = client.get("/digital-twins")
    assert response.status_code == 200
    assert len(response.json()) == 1


# --- Simulation API Tests ---

SAMPLE_TREATMENT = {
    "treatment_id": "tr-001",
    "name": "Metformin",
    "type": "drug",
    "dosage": "1000mg",
    "frequency": "twice daily",
    "duration": "90 days",
}


def _setup_twin():
    """Helper: create patient and twin, return twin_id."""
    client.post("/patients", json=SAMPLE_PATIENT)
    resp = client.post("/digital-twins", json={"patient_id": "test-patient-001"})
    return resp.json()["twin_id"]


def test_run_simulation():
    twin_id = _setup_twin()
    payload = {
        "twin_id": twin_id,
        "treatments": [SAMPLE_TREATMENT],
        "simulation_duration_days": 30,
    }
    response = client.post("/simulations", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["twin_id"] == twin_id
    assert "simulation_id" in data
    assert 0.0 <= data["efficacy_score"] <= 1.0
    assert 0.0 <= data["safety_score"] <= 1.0
    assert "recommendation" in data


def test_run_simulation_twin_not_found():
    payload = {
        "twin_id": "nonexistent-twin",
        "treatments": [SAMPLE_TREATMENT],
        "simulation_duration_days": 30,
    }
    response = client.post("/simulations", json=payload)
    assert response.status_code == 404


def test_get_simulation():
    twin_id = _setup_twin()
    payload = {"twin_id": twin_id, "treatments": [SAMPLE_TREATMENT], "simulation_duration_days": 30}
    sim_resp = client.post("/simulations", json=payload)
    sim_id = sim_resp.json()["simulation_id"]
    response = client.get(f"/simulations/{sim_id}")
    assert response.status_code == 200
    assert response.json()["simulation_id"] == sim_id


def test_get_simulation_not_found():
    response = client.get("/simulations/nonexistent-sim")
    assert response.status_code == 404


def test_list_simulations():
    twin_id = _setup_twin()
    payload = {"twin_id": twin_id, "treatments": [SAMPLE_TREATMENT], "simulation_duration_days": 30}
    client.post("/simulations", json=payload)
    response = client.get("/simulations")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_get_simulations_for_twin():
    twin_id = _setup_twin()
    payload = {"twin_id": twin_id, "treatments": [SAMPLE_TREATMENT], "simulation_duration_days": 30}
    client.post("/simulations", json=payload)
    response = client.get(f"/simulations/twin/{twin_id}")
    assert response.status_code == 200
    sims = response.json()
    assert len(sims) == 1
    assert sims[0]["twin_id"] == twin_id


def test_simulation_with_multiple_treatments():
    twin_id = _setup_twin()
    treatments = [
        {"treatment_id": "tr1", "name": "Metformin", "type": "drug", "dosage": "500mg"},
        {"treatment_id": "tr2", "name": "Lisinopril", "type": "drug", "dosage": "10mg"},
        {"treatment_id": "tr3", "name": "Atorvastatin", "type": "drug", "dosage": "40mg"},
    ]
    payload = {"twin_id": twin_id, "treatments": treatments, "simulation_duration_days": 90}
    response = client.post("/simulations", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert len(data["treatments"]) == 3
    assert data["predicted_outcomes"]["simulation_duration_days"] == 90
