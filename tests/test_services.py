import pytest
from app.models.patient import PatientProfile, GenomicData, MedicalHistory, PhysiologicalSignals
from app.models.digital_twin import DigitalTwin, TwinStatus
from app.models.simulation import SimulationRequest, Treatment
from app.services.twin_service import DigitalTwinService
from app.services.simulation_service import SimulationService


@pytest.fixture
def basic_patient():
    return PatientProfile(patient_id="p1", name="John Doe", age=45, sex="M")


@pytest.fixture
def complex_patient():
    return PatientProfile(
        patient_id="p2",
        name="Jane Smith",
        age=62,
        sex="F",
        genomic_data=GenomicData(
            gene_variants=["BRCA2", "CYP2C19*2", "HLA-B*57:01"],
            risk_alleles={"rs429358": "E4"},
            pharmacogenomics={
                "CYP2D6": "poor_metabolizer",
                "CYP2C19": "intermediate_metabolizer",
                "abacavir": "hypersensitivity_risk",
            },
        ),
        medical_history=MedicalHistory(
            conditions=["hypertension", "type 2 diabetes", "hyperlipidemia"],
            medications=["metformin", "lisinopril", "atorvastatin"],
            allergies=["penicillin allergy", "sulfa allergy"],
            surgeries=["appendectomy"],
        ),
        physiological_signals=PhysiologicalSignals(
            heart_rate=78.0,
            blood_pressure_systolic=145.0,
            blood_pressure_diastolic=92.0,
            temperature=37.1,
            oxygen_saturation=96.5,
            glucose_level=148.0,
        ),
    )


twin_service = DigitalTwinService()
sim_service = SimulationService()


def test_create_twin_basic(basic_patient):
    twin = twin_service.create_twin(basic_patient)
    assert twin.patient_id == "p1"
    assert twin.twin_id is not None
    assert twin.status == TwinStatus.ACTIVE
    assert isinstance(twin.risk_scores, dict)
    assert "cardiovascular" in twin.risk_scores
    assert "metabolic" in twin.risk_scores


def test_create_twin_complex(complex_patient):
    twin = twin_service.create_twin(complex_patient)
    assert twin.patient_id == "p2"
    assert twin.risk_scores["cardiovascular"] > 0.3
    assert twin.risk_scores["metabolic"] > 0.3
    assert len(twin.predicted_responses) > 0


def test_biological_model_structure(complex_patient):
    twin = twin_service.create_twin(complex_patient)
    bm = twin.biological_model
    assert "physiological_baselines" in bm
    assert "metabolic_profile" in bm
    assert "immune_response" in bm
    assert "genetic_risk_factors" in bm
    assert bm["physiological_baselines"]["heart_rate"] == 78.0


def test_risk_scores_range(complex_patient):
    twin = twin_service.create_twin(complex_patient)
    for risk, score in twin.risk_scores.items():
        assert 0.0 <= score <= 1.0, f"{risk} score {score} out of range"


def test_risk_scores_elevated_for_high_risk_patient(complex_patient):
    twin = twin_service.create_twin(complex_patient)
    assert twin.risk_scores["cardiovascular"] >= 0.5
    assert twin.risk_scores["metabolic"] >= 0.3


def test_predicted_responses_pharmacogenomics(complex_patient):
    twin = twin_service.create_twin(complex_patient)
    responses = twin.predicted_responses
    assert any("reduce_dose" in v or "reduced_efficacy" in v or "increased_exposure" in v for v in responses.values())


def test_update_twin(complex_patient):
    twin = twin_service.create_twin(complex_patient)
    updated_patient = complex_patient.model_copy(update={"age": 63})
    updated_twin = twin_service.update_twin(twin, updated_patient)
    assert updated_twin.twin_id == twin.twin_id
    assert updated_twin.status == TwinStatus.ACTIVE


def test_update_twin_preserves_id(basic_patient):
    twin = twin_service.create_twin(basic_patient)
    updated = twin_service.update_twin(twin, basic_patient)
    assert updated.twin_id == twin.twin_id
    assert updated.patient_id == twin.patient_id


def test_run_simulation_basic(basic_patient):
    twin = twin_service.create_twin(basic_patient)
    treatment = Treatment(treatment_id="tr1", name="Metformin", type="drug", dosage="500mg")
    request = SimulationRequest(twin_id=twin.twin_id, treatments=[treatment], simulation_duration_days=30)
    result = sim_service.run_simulation(twin, request)
    assert result.simulation_id is not None
    assert result.twin_id == twin.twin_id
    assert 0.0 <= result.efficacy_score <= 1.0
    assert 0.0 <= result.safety_score <= 1.0
    assert isinstance(result.adverse_reactions, list)
    assert isinstance(result.recommendation, str)


def test_simulation_with_contraindicated_drug(complex_patient):
    twin = twin_service.create_twin(complex_patient)
    treatment = Treatment(treatment_id="tr2", name="abacavir", type="drug")
    request = SimulationRequest(twin_id=twin.twin_id, treatments=[treatment], simulation_duration_days=14)
    result = sim_service.run_simulation(twin, request)
    assert result.safety_score < 1.0


def test_simulation_multiple_treatments(complex_patient):
    twin = twin_service.create_twin(complex_patient)
    treatments = [
        Treatment(treatment_id="tr1", name="Metformin", type="drug", dosage="1000mg"),
        Treatment(treatment_id="tr2", name="Lisinopril", type="drug", dosage="10mg"),
        Treatment(treatment_id="tr3", name="Atorvastatin", type="drug", dosage="40mg"),
    ]
    request = SimulationRequest(twin_id=twin.twin_id, treatments=treatments, simulation_duration_days=90)
    result = sim_service.run_simulation(twin, request)
    assert len(result.treatments) == 3
    assert result.predicted_outcomes["simulation_duration_days"] == 90


def test_simulation_recommendation_high_efficacy_safety():
    patient = PatientProfile(
        patient_id="p_safe",
        name="Safe Patient",
        age=40,
        sex="M",
        medical_history=MedicalHistory(conditions=["hypertension"]),
    )
    twin = twin_service.create_twin(patient)
    treatment = Treatment(treatment_id="tr1", name="lisinopril", type="drug")
    request = SimulationRequest(twin_id=twin.twin_id, treatments=[treatment], simulation_duration_days=30)
    result = sim_service.run_simulation(twin, request)
    assert result.recommendation is not None
    assert len(result.recommendation) > 10


def test_simulation_predicted_outcomes_structure(basic_patient):
    twin = twin_service.create_twin(basic_patient)
    treatment = Treatment(treatment_id="tr1", name="Aspirin", type="drug")
    request = SimulationRequest(twin_id=twin.twin_id, treatments=[treatment], simulation_duration_days=60)
    result = sim_service.run_simulation(twin, request)
    outcomes = result.predicted_outcomes
    assert "baseline_vitals" in outcomes
    assert "systems_targeted" in outcomes
    assert "risk_trajectory" in outcomes
    assert outcomes["simulation_duration_days"] == 60
