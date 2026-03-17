import pytest
from app.models.patient import (
    GenomicData, MedicalHistory, DiagnosticReport,
    PhysiologicalSignals, PatientProfile,
)
from app.models.digital_twin import DigitalTwin, TwinStatus
from app.models.simulation import Treatment, SimulationRequest, SimulationResult


def test_genomic_data_defaults():
    g = GenomicData()
    assert g.gene_variants == []
    assert g.risk_alleles == {}
    assert g.pharmacogenomics == {}


def test_genomic_data_with_values():
    g = GenomicData(
        gene_variants=["BRCA1", "CYP2C19*2"],
        risk_alleles={"rs123": "A"},
        pharmacogenomics={"CYP2D6": "poor_metabolizer"},
    )
    assert "BRCA1" in g.gene_variants
    assert g.pharmacogenomics["CYP2D6"] == "poor_metabolizer"


def test_medical_history_defaults():
    m = MedicalHistory()
    assert m.conditions == []
    assert m.medications == []
    assert m.allergies == []
    assert m.surgeries == []


def test_diagnostic_report():
    r = DiagnosticReport(
        report_type="blood_panel",
        findings={"hemoglobin": 14.5, "wbc": 7000},
        timestamp="2024-01-01T00:00:00",
    )
    assert r.report_type == "blood_panel"
    assert r.findings["hemoglobin"] == 14.5


def test_physiological_signals():
    s = PhysiologicalSignals(
        heart_rate=72.0,
        blood_pressure_systolic=120.0,
        blood_pressure_diastolic=80.0,
        temperature=37.0,
        oxygen_saturation=98.5,
        glucose_level=90.0,
    )
    assert s.heart_rate == 72.0
    assert s.oxygen_saturation == 98.5


def test_patient_profile_minimal():
    p = PatientProfile(patient_id="p1", name="John Doe", age=45, sex="M")
    assert p.patient_id == "p1"
    assert p.genomic_data is None
    assert p.diagnostic_reports == []


def test_patient_profile_full():
    p = PatientProfile(
        patient_id="p2",
        name="Jane Doe",
        age=55,
        sex="F",
        genomic_data=GenomicData(gene_variants=["BRCA2"]),
        medical_history=MedicalHistory(conditions=["hypertension"], medications=["lisinopril"]),
        diagnostic_reports=[DiagnosticReport(report_type="ECG", findings={"result": "normal"}, timestamp="2024-01-01T00:00:00")],
        physiological_signals=PhysiologicalSignals(
            heart_rate=68.0, blood_pressure_systolic=135.0, blood_pressure_diastolic=85.0,
            temperature=36.8, oxygen_saturation=97.0, glucose_level=105.0,
        ),
    )
    assert p.age == 55
    assert len(p.diagnostic_reports) == 1
    assert p.genomic_data.gene_variants[0] == "BRCA2"


def test_digital_twin_model():
    twin = DigitalTwin(
        twin_id="t1",
        patient_id="p1",
        status=TwinStatus.ACTIVE,
        biological_model={"physiological_baselines": {"heart_rate": 72}},
        risk_scores={"cardiovascular": 0.3},
        predicted_responses={"CYP2D6": "normal_response"},
        created_at="2024-01-01T00:00:00",
        updated_at="2024-01-01T00:00:00",
    )
    assert twin.status == TwinStatus.ACTIVE
    assert twin.risk_scores["cardiovascular"] == 0.3


def test_twin_status_enum():
    assert TwinStatus.INITIALIZING == "INITIALIZING"
    assert TwinStatus.ACTIVE == "ACTIVE"
    assert TwinStatus.UPDATING == "UPDATING"
    assert TwinStatus.ERROR == "ERROR"


def test_treatment_model():
    t = Treatment(
        treatment_id="tr1",
        name="Metformin",
        type="drug",
        dosage="500mg",
        frequency="twice daily",
        duration="90 days",
    )
    assert t.name == "Metformin"
    assert t.dosage == "500mg"


def test_treatment_optional_fields():
    t = Treatment(treatment_id="tr2", name="Physical Therapy", type="therapy")
    assert t.dosage is None
    assert t.frequency is None


def test_simulation_request():
    req = SimulationRequest(
        twin_id="t1",
        treatments=[Treatment(treatment_id="tr1", name="Metformin", type="drug")],
        simulation_duration_days=30,
    )
    assert req.simulation_duration_days == 30
    assert len(req.treatments) == 1


def test_simulation_result():
    result = SimulationResult(
        simulation_id="sim1",
        twin_id="t1",
        treatments=[Treatment(treatment_id="tr1", name="Aspirin", type="drug")],
        predicted_outcomes={"glucose_reduction": 10.0},
        efficacy_score=0.75,
        safety_score=0.85,
        adverse_reactions=[],
        recommendation="RECOMMENDED",
        simulated_at="2024-01-01T00:00:00",
    )
    assert result.efficacy_score == 0.75
    assert result.adverse_reactions == []
