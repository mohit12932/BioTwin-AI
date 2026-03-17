from typing import Optional, List, Dict
from pydantic import BaseModel


class GenomicData(BaseModel):
    gene_variants: List[str] = []
    risk_alleles: Dict[str, str] = {}
    pharmacogenomics: Dict[str, str] = {}


class MedicalHistory(BaseModel):
    conditions: List[str] = []
    medications: List[str] = []
    allergies: List[str] = []
    surgeries: List[str] = []


class DiagnosticReport(BaseModel):
    report_type: str
    findings: Dict
    timestamp: str


class PhysiologicalSignals(BaseModel):
    heart_rate: float
    blood_pressure_systolic: float
    blood_pressure_diastolic: float
    temperature: float
    oxygen_saturation: float
    glucose_level: float


class PatientProfile(BaseModel):
    patient_id: str
    name: str
    age: int
    sex: str
    genomic_data: Optional[GenomicData] = None
    medical_history: Optional[MedicalHistory] = None
    diagnostic_reports: List[DiagnosticReport] = []
    physiological_signals: Optional[PhysiologicalSignals] = None
