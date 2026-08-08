from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class Treatment(BaseModel):
    treatment_id: str
    name: str
    type: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None


class SimulationRequest(BaseModel):
    twin_id: str
    treatments: List[Treatment]
    simulation_duration_days: int


class SimulationResult(BaseModel):
    simulation_id: str
    twin_id: str
    treatments: List[Treatment]
    predicted_outcomes: Dict[str, Any]
    efficacy_score: float
    safety_score: float
    adverse_reactions: List[str]
    recommendation: str
    simulated_at: str
