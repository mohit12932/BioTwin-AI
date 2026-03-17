from enum import Enum
from typing import Dict
from pydantic import BaseModel


class TwinStatus(str, Enum):
    INITIALIZING = "INITIALIZING"
    ACTIVE = "ACTIVE"
    UPDATING = "UPDATING"
    ERROR = "ERROR"


class DigitalTwin(BaseModel):
    twin_id: str
    patient_id: str
    status: TwinStatus = TwinStatus.ACTIVE
    biological_model: dict
    risk_scores: Dict[str, float]
    predicted_responses: Dict[str, str]
    created_at: str
    updated_at: str
