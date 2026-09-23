<div align="center">
  
# 🧬 BioTwin AI
**The World’s First C++ Accelerated, Multi-Agent Virtual Multidisciplinary Team (MDT)**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![C++](https://img.shields.io/badge/C++-Native_Addon-blue?style=for-the-badge&logo=cplusplus)](https://isocpp.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Multi--Agent_Orchestration-white?style=for-the-badge&logo=openai)](https://openai.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Patient_Data-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-Caching-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)
> **BioTwin is a next-generation clinical copilot designed to prevent fragmented medical care for multi-morbid patients.** 
> It leverages parallel LLM personas (Cardiologist, Nephrologist, Endocrinologist) to debate clinical workflows, which are then strictly evaluated against a deterministic C++ constraint engine (HERA) to enforce physiological and socioeconomic limits.
</div>

---

## 🚀 The Core Innovation: "Assistance, Not Replacement"

Modern medicine suffers from severe fragmentation. A patient with Diabetes, Hypertension, and CKD might receive conflicting prescriptions from three different specialists, leading to catastrophic drug-drug interactions or unaffordable copays. 

**BioTwin solves this by simulating the "Tumor Board" or Multidisciplinary Team (MDT) meeting.**

Instead of relying on a single, hallucination-prone LLM, BioTwin utilizes an advanced **Agent Negotiation Protocol**. Specialized LLMs debate the patient's case, while the **Health Economics & Resource Agent (HERA)**—powered by a custom-compiled C++ graph engine—acts as a ruthless safety net, vetoing any AI proposal that violates strict medical, biological, or economic constraints.

> **Crucially, the human doctor always retains the final say. BioTwin is a decision-support copilot, featuring a robust Physician Override mechanism.**

---

## ⚡ Technical Architecture

BioTwin is engineered for absolute deterministic safety combined with generative flexibility. 

### 1. Multi-Agent Orchestration (Node.js & OpenAI)
- **Parallel Deliberation:** The backend dynamically spawns distinct LLM personas (e.g., Cardiologist, Nephrologist). 
- **Context Isolation:** Each agent only receives the biomarkers and history relevant to their specialty, preventing context bloat and hallucination.
- **Consensus Generation:** Agents debate iteratively until a unified protocol is formed.

### 2. HERA: C++ Deterministic Constraint Graph
You cannot trust LLMs with hard mathematical constraints like "$150/mo budget" or "GFR < 30 absolute contraindication."
- **Native Node-Addon:** BioTwin uses a custom `hera_graph.node` C++ binary bound to Node.js via `node-addon-api`.
- **$O(1)$ Verification:** The proposed protocol is passed from the LLMs to the C++ engine, which traverses a directed acyclic graph (DAG) of the patient's physiological and socioeconomic limits.
- **Absolute Veto:** If an AI agent recommends an $800 biologic for a patient with a $150 budget, the C++ engine instantaneously issues a hard veto, triggering a re-negotiation.

### 3. High-Performance Caching (Redis)
- To minimize token costs and reduce latency during massive agent swarms, semantic drug-interaction queries and identical clinical sub-routines are aggressively cached in Redis.

### 4. Interactive Dashboard (Next.js & React)
- **Live Telemetry:** The UI consumes the live JSON telemetry from the backend negotiation, rendering the precise rationale, recommendations, and confidence scores of each agent in real-time.
- **Glassmorphic Design:** A stunning, highly responsive dashboard built with TailwindCSS and Lucide icons.

---

## 🛠️ Tech Stack

| Domain | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js, React, TailwindCSS | Dynamic telemetry rendering & physician dashboard |
| **Backend** | Node.js, Express.js | API routing, Auth, and Agent Orchestration |
| **Native Addon**| C++, `node-addon-api`, `node-gyp` | HERA Graph Engine for $O(1)$ deterministic safety |
| **AI / ML** | OpenAI GPT-4 API | Generative clinical reasoning and multi-agent debate |
| **Database** | MongoDB | Persistent storage for complex patient phenotypes |
| **Caching** | Redis | High-speed cache for drug intelligence and semantic queries |

---

<<<<<<< HEAD
## ⚙️ Local Setup & Installation
=======
## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BIOTWIN AI PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   LAYER 1   │    │   LAYER 2   │    │   LAYER 3   │    │   LAYER 4   │  │
│  │   Patient   │───▶│   Digital   │───▶│  Clinical   │───▶│  Learning   │  │
│  │   Intake    │    │ Twin Engine │    │  Dashboard  │    │    Loop     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐                                         │
│  │   LAYER 5   │    │   LAYER 6   │                                         │
│  │   Secure    │    │ Explainable │                                         │
│  │ Integration │    │     AI      │                                         │
│  └─────────────┘    └─────────────┘                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer Descriptions

| Layer | Name | Functionality |
|-------|------|---------------|
| **Layer 1** | Patient Intake | 9-step precision intake form capturing phenotype, vitals, biomarkers, lifestyle, and socio-economic data |
| **Layer 2** | Digital Twin Engine | Converts patient profile into computable twin with feature vectors and risk calculations |
| **Layer 3** | Clinical Dashboard | Real-time visualization of agent consensus, treatment recommendations, and outcome trajectories |
| **Layer 4** | Learning Loop | Continuous learning from actual patient outcomes to improve future predictions |
| **Layer 5** | Secure Auth | JWT-based doctor authentication and secure API endpoints for EHR/wearable ingestion |
| **Layer 6** | Explainable AI | Feature importance analysis, what-if scenarios, and transparent reasoning |

---

### Multi-Agent AI System

BioTwin employs four specialized AI agents that collaborate using a consensus-based negotiation protocol:

```
                    ┌─────────────────────────────────┐
                    │      PATIENT DIGITAL TWIN       │
                    └───────────────┬─────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│    GENETICIST     │   │  PHARMACOLOGIST   │   │  ENDOCRINOLOGIST  │
│       Agent       │   │       Agent       │   │       Agent       │
│                   │   │                   │   │                   │
│ • Pharmacogenomics│   │ • Drug Interactions│   │ • Metabolic Analysis│
│ • Variant Analysis│   │ • Dosing Optimization│  │ • Glucose Management│
│ • Genetic Risks   │   │ • Safety Assessment│   │ • Hormonal Factors │
└─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────────┐
                    │        HERA GUARDIAN            │
                    │   (Health Economics & Resource) │
                    │                                 │
                    │  • Budget Validation            │
                    │  • Insurance Coverage           │
                    │  • Accessibility Constraints    │
                    │  • VETO AUTHORITY               │
                    └─────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────────┐
                    │      CONSENSUS PROTOCOL         │
                    │   Final Treatment Recommendation│
                    └─────────────────────────────────┘
```

---

### Technology Stack

#### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js 18+** | Runtime environment |
| **Express 5.x** | Web framework |
| **MongoDB 6.0** | Database (optional) |
| **Mongoose 9.x** | ODM for MongoDB |
| **jsonwebtoken / bcryptjs** | Secure Doctor Authentication |
| **OpenAI / OpenRouter** | AI-powered agent analysis |
| **WebSocket (ws)** | Real-time telemetry |
| **PDFKit** | Report generation |
| **Helmet** | Security middleware |

#### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Next.js 16** | React Framework |
| **App Router** | Next.js App Router |
| **TailwindCSS 4** | Utility-first styling |
| **Recharts** | Data visualization |
| **Axios** | HTTP client |
| **Lucide React** | Icon library |

---

## Project Structure

```
bio_twin/
├── backend/                          # Express.js API Server
│   ├── config/
│   │   ├── db.js                     # Database connection logic
│   │   └── mongo.js                  # MongoDB configuration
│   ├── data/
│   │   ├── mockDatabase.js           # In-memory fallback storage
│   │   └── learningWeights.json      # ML learning weights
│   ├── models/
│   │   └── Patient.js                # Mongoose patient schema
│   ├── routes/
│   │   ├── patient.routes.js         # Patient CRUD operations
│   │   ├── simulation.routes.js      # Treatment simulation
│   │   ├── feedback.routes.js        # Learning feedback (Layer 4)
│   │   ├── external.routes.js        # EHR/wearable integration
│   │   ├── explain.routes.js         # Explainable AI (Layer 6)
│   │   ├── pharmacology.routes.js    # Drug interactions
│   │   ├── alerts.routes.js          # Clinical alerts
│   │   ├── trials.routes.js          # Clinical trial matching
│   │   └── negotiation.routes.js     # Multi-agent negotiation
│   ├── services/
│   │   ├── digitalTwin.service.js    # Core digital twin engine
│   │   ├── intake.service.js         # Patient intake processing
│   │   ├── learning.service.js       # Continuous learning
│   │   ├── explainability.service.js # XAI features
│   │   ├── agentNegotiation.service.js # Multi-agent consensus
│   │   ├── agentMemory.service.js    # Agent memory/reflection
│   │   ├── agentSwarming.service.js  # Dynamic sub-agent spawning
│   │   └── agentTools.service.js     # Agent tool integration
│   ├── websocket/
│   │   └── telemetryServer.js        # Real-time WebSocket server
│   ├── server.js                     # Main entry point
│   ├── Dockerfile                    # Container configuration
│   └── package.json
│
├── frontend/                         # Next.js Application
│   ├── src/
│   │   ├── api/
│   │   │   └── apiClient.js          # Axios HTTP client
│   │   ├── components/
│   │   │   ├── PatientForm.jsx       # 9-step intake form
│   │   │   ├── PatientProfilePanel.jsx
│   │   │   ├── DigitalTwinSimulation.jsx
│   │   │   ├── TreatmentSimulator.jsx
│   │   │   ├── OutcomeTrajectoryChart.jsx
│   │   │   ├── AgentCard.jsx
│   │   │   ├── GlassBoxTerminal.jsx
│   │   │   └── HITLInterventionPanel.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Main clinical dashboard
│   │   │   ├── PatientDashboard.jsx
│   │   │   └── NegotiationPage.jsx
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── data/                     # Static data/configs
│   │   ├── App.jsx                   # Main router/layout
│   │   └── main.jsx                  # React entry point
│   ├── next.config.mjs
│   └── package.json
│
├── screenshots/                      # Documentation images
├── docker-compose.yml                # Production orchestration
├── .github/workflows/deploy.yml      # CI/CD pipeline
└── README.md                         # This file
```

---

## Quick Start
>>>>>>> 3778f74bcd64ed2d22a6821855c819025c03908c

### Prerequisites
- Node.js v18+
- Python 3.x and Build Tools (for compiling the C++ addon)
- MongoDB instance (local or Atlas)
- Redis server
- OpenAI API Key

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yourusername/biotwin-ai.git
cd biotwin-ai

# Install Backend & Compile C++ Engine
cd backend
npm install
npm run build:native  # Triggers node-gyp configure && node-gyp build (Requires Visual Studio C++ Build Tools)

# Install Frontend
cd ../frontend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `/backend` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/biotwin
<<<<<<< HEAD
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key
OPENAI_API_KEY=sk-your-openai-key
```

### 3. Run the Platform
Open two terminals.
=======

# Security
JWT_SECRET=your-secure-secret-key

# AI Configuration (choose one)
OPENROUTER_API_KEY=your-openrouter-api-key
# OR
OPENAI_API_KEY=your-openai-api-key

AI_MODEL=openai/gpt-4o-mini
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=2000

# CORS
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (`frontend/.env`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

### Running the Application

#### Development Mode
>>>>>>> 3778f74bcd64ed2d22a6821855c819025c03908c

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
<<<<<<< HEAD
=======
# App opens on http://localhost:3000
```

#### Production Mode

```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
npm run start
>>>>>>> 3778f74bcd64ed2d22a6821855c819025c03908c
```
Navigate to `http://localhost:3000` and login with the demo credentials.

---

## 🎯 The Physician Workflow

1. **Patient Intake:** Load the patient's complex multi-morbid profile (e.g., CKD, Diabetes, low socioeconomic status).
2. **Initiate MDT:** Click `Initiate MDT Consult`.
3. **Live Telemetry:** Watch in real-time as the Cardiologist, Nephrologist, and Endocrinologist debate the protocol.
4. **Constraint Validation:** See the HERA C++ engine instantly validate or veto the AI consensus.
5. **Human Authority:** The attending physician reviews the AI's transparent rationale and clicks "Acknowledge & Override Veto" or accepts the optimized baseline.

---

## 🛡️ Security & Compliance
- **Zero Hallucination Guarantee on Hard Constraints:** Because the final protocol MUST pass the C++ deterministic engine, LLM hallucinations cannot bypass biological or financial limits.
- **JWT Authentication:** fully secured API endpoints.
- **Stateless AI:** The OpenAI API is only used for processing; no PHI is retained in the LLM's memory.

---
*Designed for the future of Medicine. Built to empower the Doctor.*
