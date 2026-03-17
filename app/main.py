from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import patients, digital_twin, simulation

app = FastAPI(title="BioTwin AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(digital_twin.router, prefix="/digital-twins", tags=["digital-twins"])
app.include_router(simulation.router, prefix="/simulations", tags=["simulations"])


@app.get("/")
def root():
    return {"message": "BioTwin AI API", "version": "1.0.0"}
