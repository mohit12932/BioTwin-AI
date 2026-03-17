from typing import Dict, List
from fastapi import APIRouter, HTTPException
from app.models.simulation import SimulationRequest, SimulationResult
from app.services.simulation_service import SimulationService
from app.api.routes.digital_twin import twins_db

router = APIRouter()
simulations_db: Dict[str, SimulationResult] = {}
simulation_service = SimulationService()


@router.post("", response_model=SimulationResult, status_code=201)
def run_simulation(request: SimulationRequest):
    if request.twin_id not in twins_db:
        raise HTTPException(status_code=404, detail="Digital twin not found")
    twin = twins_db[request.twin_id]
    result = simulation_service.run_simulation(twin, request)
    simulations_db[result.simulation_id] = result
    return result


@router.get("/twin/{twin_id}", response_model=List[SimulationResult])
def get_simulations_for_twin(twin_id: str):
    return [s for s in simulations_db.values() if s.twin_id == twin_id]


@router.get("/{simulation_id}", response_model=SimulationResult)
def get_simulation(simulation_id: str):
    if simulation_id not in simulations_db:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return simulations_db[simulation_id]


@router.get("", response_model=List[SimulationResult])
def list_simulations():
    return list(simulations_db.values())
