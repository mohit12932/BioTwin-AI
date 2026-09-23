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

## ⚙️ Local Setup & Installation

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
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key
OPENAI_API_KEY=sk-your-openai-key
```

### 3. Run the Platform
Open two terminals.

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
