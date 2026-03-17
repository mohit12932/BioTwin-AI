from uuid import uuid4
from datetime import datetime, timezone
from typing import List
from app.models.digital_twin import DigitalTwin
from app.models.simulation import SimulationRequest, SimulationResult, Treatment


KNOWN_CONTRAINDICATIONS = {
    "penicillin": ["penicillin allergy", "amoxicillin allergy"],
    "aspirin": ["aspirin allergy", "nsaid allergy"],
    "sulfa": ["sulfa allergy", "sulfonamide allergy"],
    "codeine": ["codeine allergy", "opioid allergy"],
    "ibuprofen": ["nsaid allergy", "ibuprofen allergy"],
    "warfarin": ["warfarin allergy"],
    "metformin": ["kidney_disease", "renal failure"],
    "nsaids": ["kidney_disease", "nsaid allergy", "peptic ulcer"],
}

DRUG_EFFICACY_PROFILES = {
    "metformin": {"metabolic": 0.85, "cardiovascular": 0.6},
    "lisinopril": {"cardiovascular": 0.82, "metabolic": 0.5},
    "atorvastatin": {"cardiovascular": 0.80, "metabolic": 0.55},
    "aspirin": {"cardiovascular": 0.75},
    "insulin": {"metabolic": 0.90},
    "chemotherapy": {"oncological": 0.70},
    "immunotherapy": {"oncological": 0.65},
    "levodopa": {"neurological": 0.80},
}


class SimulationService:
    def run_simulation(self, twin: DigitalTwin, request: SimulationRequest) -> SimulationResult:
        effects = self._simulate_drug_effects(twin, request.treatments)
        efficacy = self._compute_efficacy(twin, request.treatments, effects)
        safety = self._compute_safety(twin, request.treatments, effects)
        adverse = self._identify_adverse_reactions(twin, request.treatments)
        recommendation = self._generate_recommendation(efficacy, safety, adverse)
        predicted_outcomes = self._build_predicted_outcomes(twin, request.treatments, effects, request.simulation_duration_days)

        return SimulationResult(
            simulation_id=str(uuid4()),
            twin_id=request.twin_id,
            treatments=request.treatments,
            predicted_outcomes=predicted_outcomes,
            efficacy_score=round(efficacy, 3),
            safety_score=round(safety, 3),
            adverse_reactions=adverse,
            recommendation=recommendation,
            simulated_at=datetime.now(timezone.utc).isoformat(),
        )

    def _simulate_drug_effects(self, twin: DigitalTwin, treatments: List[Treatment]) -> dict:
        effects = {}
        baselines = twin.biological_model.get("physiological_baselines", {})

        for treatment in treatments:
            name_lower = treatment.name.lower()
            effect = {"target_systems": [], "expected_changes": {}}

            if "statin" in name_lower or name_lower in ("atorvastatin", "simvastatin", "rosuvastatin"):
                effect["target_systems"].append("cardiovascular")
                effect["expected_changes"]["ldl_reduction_percent"] = 40
                effect["expected_changes"]["cardiovascular_risk_reduction"] = 0.25

            if "metformin" in name_lower:
                effect["target_systems"].append("metabolic")
                glucose = baselines.get("glucose_level", 90)
                effect["expected_changes"]["glucose_reduction"] = glucose * 0.15
                effect["expected_changes"]["hba1c_reduction"] = 1.2

            if "lisinopril" in name_lower or "ace inhibitor" in name_lower:
                effect["target_systems"].append("cardiovascular")
                sbp = baselines.get("blood_pressure_systolic", 120)
                effect["expected_changes"]["sbp_reduction"] = sbp * 0.10
                effect["expected_changes"]["cardiovascular_risk_reduction"] = 0.20

            if "chemotherapy" in name_lower or treatment.type == "chemotherapy":
                effect["target_systems"].append("oncological")
                effect["expected_changes"]["tumor_response"] = "partial_response"
                effect["expected_changes"]["immune_suppression"] = True

            if "immunotherapy" in name_lower:
                effect["target_systems"].append("oncological")
                effect["expected_changes"]["immune_activation"] = True
                effect["expected_changes"]["tumor_response"] = "immune_mediated_response"

            if not effect["target_systems"]:
                effect["target_systems"].append("general")
                effect["expected_changes"]["systemic_effect"] = "moderate"

            effects[treatment.treatment_id] = effect

        return effects

    def _compute_efficacy(self, twin: DigitalTwin, treatments: List[Treatment], effects: dict) -> float:
        if not treatments:
            return 0.0

        risk_scores = twin.risk_scores
        total_efficacy = 0.0

        for treatment in treatments:
            name_lower = treatment.name.lower()
            base_efficacy = 0.5

            for drug, profile in DRUG_EFFICACY_PROFILES.items():
                if drug in name_lower:
                    for risk_area, efficacy_val in profile.items():
                        if risk_area in risk_scores and risk_scores[risk_area] > 0.3:
                            base_efficacy = max(base_efficacy, efficacy_val)
                    break

            predicted = twin.predicted_responses
            for drug_class, response in predicted.items():
                if drug_class.lower() in name_lower:
                    if "reduce_dose" in response or "reduced_efficacy" in response:
                        base_efficacy *= 0.75
                    elif "increase_dose" in response:
                        base_efficacy *= 0.90

            total_efficacy += base_efficacy

        return min(total_efficacy / len(treatments), 1.0)

    def _compute_safety(self, twin: DigitalTwin, treatments: List[Treatment], effects: dict) -> float:
        safety = 1.0
        drug_reaction_risk = twin.risk_scores.get("drug_reaction", 0.1)
        safety -= drug_reaction_risk * 0.3

        medical_history = twin.biological_model.get("metabolic_profile", {})

        adverse = self._identify_adverse_reactions(twin, treatments)
        safety -= 0.15 * len(adverse)

        for response in twin.predicted_responses.values():
            if "contraindicated" in response:
                safety -= 0.3
            elif "toxicity_risk" in response:
                safety -= 0.15

        if medical_history.get("liver_function") == "impaired":
            safety -= 0.1
        if medical_history.get("kidney_function") == "impaired":
            safety -= 0.1

        return max(round(safety, 3), 0.0)

    def _identify_adverse_reactions(self, twin: DigitalTwin, treatments: List[Treatment]) -> List[str]:
        adverse = []
        predicted = twin.predicted_responses

        for treatment in treatments:
            name_lower = treatment.name.lower()

            for drug_key, contra_list in KNOWN_CONTRAINDICATIONS.items():
                if drug_key in name_lower:
                    for response_key, response_val in predicted.items():
                        if "contraindicated" in response_val and response_key.lower() in name_lower:
                            reaction = f"{treatment.name}: contraindicated based on genomic profile"
                            if reaction not in adverse:
                                adverse.append(reaction)

            for drug_class, response in predicted.items():
                if drug_class.lower() in name_lower:
                    if "hypersensitivity" in response:
                        adverse.append(f"{treatment.name}: hypersensitivity risk (genomic marker detected)")
                    elif "toxicity_risk" in response:
                        adverse.append(f"{treatment.name}: toxicity risk (poor metabolizer)")

        return adverse

    def _generate_recommendation(self, efficacy: float, safety: float, adverse: List[str]) -> str:
        if len(adverse) > 0 and safety < 0.5:
            return (
                "NOT RECOMMENDED: Significant adverse reaction risks identified. "
                "Consider alternative therapies. Consult specialist before proceeding."
            )
        if safety < 0.6:
            return (
                "CAUTION: Proceed with close monitoring. Elevated safety concerns detected. "
                "Consider dose adjustment or alternative treatment."
            )
        if efficacy >= 0.75 and safety >= 0.75:
            return (
                "RECOMMENDED: Treatment shows high efficacy and safety profile for this patient's digital twin. "
                "Proceed with standard monitoring protocol."
            )
        if efficacy >= 0.6 and safety >= 0.7:
            return (
                "LIKELY BENEFICIAL: Treatment expected to be effective with acceptable safety. "
                "Monitor for adverse effects during initial phase."
            )
        if efficacy < 0.4:
            return (
                "LIMITED EFFICACY: Treatment may not provide sufficient benefit for this patient. "
                "Consider alternative or adjunct therapies."
            )
        return (
            "CONDITIONAL RECOMMENDATION: Treatment may be appropriate with careful monitoring. "
            "Review dosage and duration with clinical team."
        )

    def _build_predicted_outcomes(self, twin: DigitalTwin, treatments: List[Treatment], effects: dict, duration_days: int) -> dict:
        baselines = twin.biological_model.get("physiological_baselines", {})
        outcomes = {
            "baseline_vitals": baselines,
            "projected_changes": {},
            "simulation_duration_days": duration_days,
            "systems_targeted": [],
        }

        all_changes = {}
        all_systems = set()
        for treatment_id, effect in effects.items():
            all_systems.update(effect.get("target_systems", []))
            for key, val in effect.get("expected_changes", {}).items():
                all_changes[key] = val

        outcomes["projected_changes"] = all_changes
        outcomes["systems_targeted"] = list(all_systems)
        outcomes["risk_trajectory"] = {
            risk: max(0.0, score - 0.05 * (duration_days / 30))
            for risk, score in twin.risk_scores.items()
        }
        return outcomes
