from uuid import uuid4
from datetime import datetime, timezone
from app.models.patient import PatientProfile
from app.models.digital_twin import DigitalTwin, TwinStatus


class DigitalTwinService:
    def create_twin(self, patient: PatientProfile) -> DigitalTwin:
        now = datetime.now(timezone.utc).isoformat()
        biological_model = self._build_biological_model(patient)
        risk_scores = self._compute_risk_scores(patient)
        predicted_responses = self._compute_predicted_responses(patient)
        return DigitalTwin(
            twin_id=str(uuid4()),
            patient_id=patient.patient_id,
            status=TwinStatus.ACTIVE,
            biological_model=biological_model,
            risk_scores=risk_scores,
            predicted_responses=predicted_responses,
            created_at=now,
            updated_at=now,
        )

    def update_twin(self, twin: DigitalTwin, patient: PatientProfile) -> DigitalTwin:
        updated_model = self._build_biological_model(patient)
        updated_risk = self._compute_risk_scores(patient)
        updated_responses = self._compute_predicted_responses(patient)
        twin_data = twin.model_dump()
        twin_data.update(
            biological_model=updated_model,
            risk_scores=updated_risk,
            predicted_responses=updated_responses,
            status=TwinStatus.ACTIVE,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        return DigitalTwin(**twin_data)

    def _build_biological_model(self, patient: PatientProfile) -> dict:
        if patient.physiological_signals:
            sig = patient.physiological_signals
            physiological_baselines = {
                "heart_rate": sig.heart_rate,
                "blood_pressure_systolic": sig.blood_pressure_systolic,
                "blood_pressure_diastolic": sig.blood_pressure_diastolic,
                "temperature": sig.temperature,
                "oxygen_saturation": sig.oxygen_saturation,
                "glucose_level": sig.glucose_level,
            }
        else:
            physiological_baselines = {
                "heart_rate": 72.0,
                "blood_pressure_systolic": 120.0,
                "blood_pressure_diastolic": 80.0,
                "temperature": 37.0,
                "oxygen_saturation": 98.0,
                "glucose_level": 90.0,
            }

        conditions = []
        medications = []
        if patient.medical_history:
            conditions = patient.medical_history.conditions
            medications = patient.medical_history.medications

        metabolic_profile = {
            "base_metabolic_rate": 1500 + (patient.age * -2),
            "liver_function": "normal" if "liver_disease" not in conditions else "impaired",
            "kidney_function": "normal" if "kidney_disease" not in conditions else "impaired",
            "diabetes_status": "diabetic" if any("diabetes" in c.lower() for c in conditions) else "non-diabetic",
        }

        gene_variants = []
        pharmacogenomics = {}
        if patient.genomic_data:
            gene_variants = patient.genomic_data.gene_variants
            pharmacogenomics = patient.genomic_data.pharmacogenomics

        return {
            "physiological_baselines": physiological_baselines,
            "metabolic_profile": metabolic_profile,
            "immune_response": {
                "inflammation_index": 1.0 + (0.1 * len(conditions)),
                "autoimmune_risk": "elevated" if any("autoimmune" in c.lower() for c in conditions) else "normal",
            },
            "genetic_risk_factors": {
                "variants_count": len(gene_variants),
                "pharmacogenomics_profile": pharmacogenomics,
                "high_risk_variants": [v for v in gene_variants if v.startswith("BRCA") or v.startswith("APOE")],
            },
        }

    def _compute_risk_scores(self, patient: PatientProfile) -> dict:
        conditions = []
        allergies = []
        if patient.medical_history:
            conditions = [c.lower() for c in patient.medical_history.conditions]
            allergies = patient.medical_history.allergies

        cv_risk = 0.1
        if patient.age > 50:
            cv_risk += 0.2
        if patient.age > 65:
            cv_risk += 0.15
        if any("hypertension" in c or "heart" in c for c in conditions):
            cv_risk += 0.25
        if any("diabetes" in c for c in conditions):
            cv_risk += 0.15
        if patient.physiological_signals:
            sig = patient.physiological_signals
            if sig.blood_pressure_systolic > 140:
                cv_risk += 0.1
            if sig.heart_rate > 100:
                cv_risk += 0.05

        metabolic_risk = 0.1
        if any("diabetes" in c or "obesity" in c or "metabolic" in c for c in conditions):
            metabolic_risk += 0.3
        if patient.age > 45:
            metabolic_risk += 0.1
        if patient.physiological_signals and patient.physiological_signals.glucose_level > 126:
            metabolic_risk += 0.2

        onco_risk = 0.05
        if patient.genomic_data:
            for variant in patient.genomic_data.gene_variants:
                if "BRCA" in variant or "TP53" in variant:
                    onco_risk += 0.2
                if "APOE4" in variant:
                    onco_risk += 0.1
        if any("cancer" in c for c in conditions):
            onco_risk += 0.3

        neuro_risk = 0.05
        if any("alzheimer" in c or "parkinson" in c or "epilepsy" in c for c in conditions):
            neuro_risk += 0.3
        if patient.age > 70:
            neuro_risk += 0.1

        drug_reaction_risk = 0.05 + (0.05 * len(allergies))
        if patient.genomic_data:
            pg = patient.genomic_data.pharmacogenomics
            poor_metabolizers = [k for k, v in pg.items() if "poor" in v.lower() or "slow" in v.lower()]
            drug_reaction_risk += 0.1 * len(poor_metabolizers)

        return {
            "cardiovascular": min(cv_risk, 1.0),
            "metabolic": min(metabolic_risk, 1.0),
            "oncological": min(onco_risk, 1.0),
            "neurological": min(neuro_risk, 1.0),
            "drug_reaction": min(drug_reaction_risk, 1.0),
        }

    def _compute_predicted_responses(self, patient: PatientProfile) -> dict:
        responses = {}
        if not patient.genomic_data:
            return {"general": "standard_response"}

        pg = patient.genomic_data.pharmacogenomics
        for drug_class, metabolism in pg.items():
            metabolism_lower = metabolism.lower()
            if "poor" in metabolism_lower or "slow" in metabolism_lower:
                responses[drug_class] = "increased_exposure_reduce_dose"
            elif "rapid" in metabolism_lower or "ultra" in metabolism_lower:
                responses[drug_class] = "reduced_exposure_increase_dose"
            else:
                responses[drug_class] = "normal_response"

        for variant in patient.genomic_data.gene_variants:
            if "HLA-B*57:01" in variant:
                responses["abacavir"] = "hypersensitivity_risk_contraindicated"
            if "CYP2C19*2" in variant:
                responses["clopidogrel"] = "reduced_efficacy"
            if "TPMT*3A" in variant or "TPMT*3C" in variant:
                responses["thiopurines"] = "toxicity_risk_reduce_dose"

        return responses
