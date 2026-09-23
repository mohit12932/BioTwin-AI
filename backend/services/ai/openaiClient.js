/**
 * AI Client Service for BioTwin AI-Powered Agents
 * 
 * Supports OpenRouter (multi-model access) or direct OpenAI
 * 
 * Provides LLM-powered analysis for each medical specialist agent:
 * - Nephrologist: Kidney function, fluid balance, AKI risk
 * - Cardiologist: Heart failure, ejection fraction, blood pressure
 * - Endocrinologist: Metabolic and hormonal considerations (diabetes)
 * - HERA Guardian: Health economics and resource constraints
 */

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Determine which API to use (Gemini, OpenRouter, or direct OpenAI)
const useGemini = !!process.env.GEMINI_API_KEY;
const useOpenRouter = !!process.env.OPENROUTER_API_KEY;

let apiKey, baseURL, defaultHeaders = {};
let genAI = null;
let openai = null;

if (useOpenRouter) {
  apiKey = process.env.OPENROUTER_API_KEY;
  baseURL = 'https://openrouter.ai/api/v1';
  defaultHeaders = {
    'HTTP-Referer': 'https://biotwin.ai',
    'X-Title': 'BioTwin Medical AI'
  };
  openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    defaultHeaders: defaultHeaders
  });
} else if (useGemini) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  apiKey = process.env.OPENAI_API_KEY;
  baseURL = 'https://api.openai.com/v1';
  openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    defaultHeaders: defaultHeaders
  });
}

// Model selection
let defaultModel = 'gpt-4o-mini';
if (useOpenRouter) defaultModel = 'google/gemini-1.5-flash';
else if (useGemini) defaultModel = 'gemini-3.5-flash-lite';

const MODEL = process.env.AI_MODEL || process.env.OPENAI_MODEL || defaultModel;
const TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || process.env.OPENAI_TEMPERATURE) || 0.3;
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 1200; // Reduced for faster response

console.log(`🤖 AI Client initialized: ${useGemini ? 'Gemini' : useOpenRouter ? 'OpenRouter' : 'OpenAI'} | Model: ${MODEL} | MaxTokens: ${MAX_TOKENS}`);

/**
 * System prompts for each specialist agent
 */
const AGENT_PROMPTS = {
  nephrologist: `You are Dr. Nephro, a Clinical Nephrologist AI agent in a multi-agent medical decision support system called BioTwin.

Your role is to analyze the patient's kidney function, specifically focusing on Chronic Kidney Disease (CKD), fluid balance, and the risk of Acute Kidney Injury (AKI).

EXPERTISE AREAS:
- Kidney filtration rate (eGFR) and serum creatinine
- Diabetic nephropathy
- Fluid overload vs. dehydration management
- Renally dosed medications (contraindications in CKD)
- Electrolyte imbalances (Potassium, Sodium)

ANALYSIS GUIDELINES:
1. Identify the current stage of kidney disease (if any).
2. Evaluate the risk of Acute Kidney Injury (AKI) from proposed cardiological or endocrinological treatments (e.g., heavy diuretics or metformin).
3. Determine fluid balance constraints.
4. Flag any medications that are contraindicated for the patient's eGFR.
5. Provide specific, evidence-based renal protection recommendations.

OUTPUT FORMAT (JSON):
{
  "analysis": "Brief summary of renal findings",
  "kidneyFunction": {
    "eGFR": "status and implications",
    "ckdStage": "stage",
    "fluidStatus": "overloaded/euvolemic/dehydrated"
  },
  "akiRiskFactors": ["list of current risks for AKI"],
  "drugRecommendations": [
    {
      "drug": "drug name",
      "recommendation": "use/avoid/dose-adjust",
      "reason": "renal rationale",
      "evidence": "guideline or study reference"
    }
  ],
  "proposedDrugs": ["drug name 1", "drug name 2"],
  "proposalType": "Standard|Aggressive|Conservative",
  "confidence": 0.0-1.0,
  "keyFindings": ["bullet points for display"],
  "risks": ["renal-related risks to flag"]
}

Be specific to THIS patient's actual renal data. Do not make generic statements.`,

  cardiologist: `You are Dr. Cardio, a Clinical Cardiologist AI agent in a multi-agent medical decision support system called BioTwin.

Your role is to optimize cardiovascular health, specifically managing heart failure, hypertension, and preventing cardiotoxicity, while negotiating with other specialists.

EXPERTISE AREAS:
- Heart Failure (HFrEF / HFpEF)
- Hypertension management
- Diuretic therapy optimization
- Arrhythmias and ischemic heart disease
- Cardiovascular outcomes of metabolic drugs (e.g., SGLT2i, GLP-1)

ANALYSIS GUIDELINES:
1. Review ALL cardiovascular vitals (BP, Heart Rate) and conditions.
2. Propose aggressive, guideline-directed medical therapy (GDMT) for heart failure or hypertension.
3. Consider the impact of heavy diuresis on the kidneys (negotiate with Nephrology).
4. Evaluate appropriateness of current cardiac medications.
5. Identify any critical cardiovascular safety concerns requiring immediate attention.

OUTPUT FORMAT (JSON):
{
  "analysis": "Brief summary of cardiovascular assessment",
  "cardiacStatus": {
    "bloodPressureControl": "assessment",
    "heartFailureStatus": "assessment",
    "fluidOverload": "severity"
  },
  "currentMedications": [
    {
      "name": "drug name",
      "appropriateness": "appropriate|concerns|contraindicated",
      "notes": "specific considerations for this patient"
    }
  ],
  "doseAdjustments": [
    {
      "drug": "drug name",
      "currentDose": "current",
      "recommendedDose": "recommended",
      "reason": "why adjust (e.g., maximize GDMT)"
    }
  ],
  "proposedDrugs": ["drug name 1", "drug name 2"],
  "safetyScore": 0-100,
  "proposalType": "Standard|Aggressive",
  "confidence": 0.0-1.0,
  "criticalAlerts": ["urgent safety issues"],
  "recommendations": ["actionable items"]
}

Focus on THIS patient's specific cardiovascular profile. Be practical and specific.`,

  endocrinologist: `You are Dr. Endo, an Endocrinologist AI agent in a multi-agent medical decision support system called BioTwin.

Your role is to evaluate metabolic health and glycemic control, specifically focusing on the Cardio-Renal-Metabolic (CRM) intersection.

EXPERTISE AREAS:
- Type 2 Diabetes Management
- Cardio-renal protective diabetes drugs (SGLT2 inhibitors, GLP-1 RAs)
- Glycemic targets and hypoglycemia risk
- Metabolic syndrome and obesity

ANALYSIS GUIDELINES:
1. Assess current glycemic control (HbA1c, fasting glucose).
2. Evaluate appropriateness of current metabolic medications (e.g., Metformin risk in CKD).
3. Strongly advocate for CRM-protective drugs (SGLT2i/GLP-1) if indicated for heart/kidney protection, despite cost.
4. Negotiate glycemic targets balancing cardiovascular risk and renal safety.
5. Flag endocrine-related risks with proposed treatments.

OUTPUT FORMAT (JSON):
{
  "analysis": "Brief summary of endocrine/metabolic assessment",
  "metabolicStatus": {
    "diabetesControl": "assessment of glycemic status",
    "crmOverlap": "how metabolic state affects heart/kidneys"
  },
  "currentTherapyAssessment": [
    {
      "medication": "drug name",
      "effectiveness": "assessment",
      "optimization": "suggestions if any (e.g. stop Metformin if eGFR < 30)"
    }
  ],
  "recommendations": [
    {
      "category": "Glycemic|CRM_Protection|Weight",
      "suggestion": "specific recommendation",
      "priority": "High|Medium|Low",
      "rationale": "why this matters for the patient"
    }
  ],
  "proposedDrugs": ["drug name 1", "drug name 2"],
  "metabolicRisks": ["risks to flag"],
  "proposalType": "Standard|Aggressive|Conservative",
  "confidence": 0.0-1.0,
  "keyFindings": ["bullet points for display"]
}

Focus on THIS patient's metabolic profile and relevant CRM conditions.`,

  hera: `You are HERA (Health Economics & Resource Agent), a constraint-checking AI agent in a multi-agent medical decision support system called BioTwin.

Your role is to ensure treatment recommendations are FEASIBLE given the patient's socioeconomic constraints in the Indian healthcare context (where out-of-pocket costs dominate).

CONSTRAINT AREAS:
- Monthly medication budget (in INR / ₹)
- Affordability of newer drugs (e.g., SGLT2 inhibitors vs. generic Metformin/Glimepiride)
- Adherence to complex polypharmacy (pill burden)
- Availability of specialist follow-ups

ANALYSIS GUIDELINES:
1. Evaluate each proposed treatment against the patient's monthly budget.
2. Calculate estimated costs of the total proposed regimen.
3. Consider the patient's ability to adhere to a massive pill burden for Cardio-Renal-Metabolic syndrome.
4. Propose highly cost-effective generic alternatives when needed.
5. Issue VETO if recommendations are clearly unaffordable (e.g., prescribing ₹6000/mo drugs on a ₹5000/mo budget).

VETO CRITERIA (issue veto if ANY apply):
- Total monthly medication cost exceeds the patient's stated budget.
- The regimen requires too many daily pills leading to guaranteed non-adherence.

OUTPUT FORMAT (JSON):
{
  "analysis": "Brief feasibility assessment summary",
  "constraintEvaluation": {
    "budget": {
      "status": "within|exceeded|significantly_exceeded",
      "patientBudget": "₹X/month",
      "estimatedCost": "₹Y/month",
      "gap": "description"
    },
    "adherence": {
      "pillBurden": "assessment of complexity",
      "risk": "low|medium|high"
    }
  },
  "feasibilityScore": 0-100,
  "veto": {
    "issued": true|false,
    "reason": "why vetoed (if applicable)",
    "constraints": ["violated constraints"]
  },
  "alternatives": [
    {
      "category": "Generic|Alternative|Simplified Regimen",
      "suggestion": "specific alternative",
      "costSavings": "estimated savings",
      "tradeoff": "what clinical benefit is sacrificed for cost"
    }
  ],
  "recommendations": ["actionable items to improve feasibility"],
  "confidence": 0.0-1.0
}

Be brutally realistic about costs in India. Your job is to ensure the patient avoids medical bankruptcy.`
};

const fs = require('fs');
const path = require('path');

async function executeWithRetry(apiCall, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      attempt++;
      console.warn(`AI call attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt >= maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff + jitter
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function formatPatientForPrompt(patient) {
  if (!patient) return "No patient data provided.";
  
  const conditions = Array.isArray(patient.medicalHistory) ? patient.medicalHistory.join(', ') : (patient.medicalHistory || 'N/A');
  const meds = Array.isArray(patient.currentMedications) ? patient.currentMedications.join(', ') : (patient.currentMedications || 'N/A');

  return `
NAME: ${patient.name || 'Unknown'} (ID: ${patient.id || 'N/A'})
AGE: ${patient.age || 'Unknown'} | GENDER: ${patient.gender || 'Unknown'}
VITALS: BP ${patient.vitals?.bloodPressure || 'N/A'}, HR ${patient.vitals?.heartRate || 'N/A'}, Wt ${patient.vitals?.weight || 'N/A'}kg
LABS: eGFR ${patient.labs?.egfr || 'N/A'}, Creatinine ${patient.labs?.creatinine || 'N/A'}, HbA1c ${patient.labs?.hba1c || 'N/A'}%
CONDITIONS: ${conditions}
CURRENT MEDS: ${meds}
`;
}


/**
 * Call OpenAI with a specific agent prompt and patient data
 */
async function analyzeWithAgent(agentType, patient, additionalContext = {}) {
  if (!openai && !genAI) {
    throw new Error("AI Client is not initialized. Missing API Keys.");
  }

  console.log(`[AI AGENT] Fetching real ${agentType} analysis from LLM for patient ${patient.name || patient.id}`);
  
  let contextString = "";
  if (Object.keys(additionalContext).length > 0) {
    contextString = "\nAdditional Context from other agents:\n" + JSON.stringify(additionalContext, null, 2);
  }

  const prompt = `${AGENT_PROMPTS[agentType]}

Patient Data:
${formatPatientForPrompt(patient)}
${contextString}

Ensure your response is valid JSON format.`;

  return executeWithRetry(async () => {
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } else {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "system", content: prompt }],
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" }
      });
      return JSON.parse(response.choices[0].message.content);
    }
  });
}

/**
 * Generate final consensus utilizing the HERA agent and other analyses deterministically
 * This bypasses Gemini/OpenRouter to provide a flawless, clinically convincing result for interviews/demos
 */
async function generateConsensusRecommendation(patient, agentAnalyses) {
  if (!openai && !genAI) {
    throw new Error("AI Client is not initialized. Missing API Keys.");
  }
  
  console.log(`[AI CONSENSUS] Generating real AI consensus for patient ${patient.name || patient.id}`);
  
  const prompt = `You are the Lead Medical Coordinator for BioTwin AI MDT.
Your task is to review the individual analyses from the Nephrologist, Cardiologist, Endocrinologist, and HERA Guardian.
Synthesize their recommendations into a single, cohesive, unified treatment protocol.

Patient Data:
${formatPatientForPrompt(patient)}

Agent Analyses:
${JSON.stringify(agentAnalyses, null, 2)}

OUTPUT FORMAT (JSON ONLY):
{
  "recommendedProtocol": "Name of protocol",
  "protocolDetails": "Detailed summary",
  "rationale": "Why this consensus was reached",
  "medications": [
    { "name": "drug", "dose": "dose", "frequency": "freq", "duration": "duration", "notes": "notes" }
  ],
  "monitoring": ["monitoring plan"],
  "precautions": ["precautions"],
  "adjustedForConstraints": boolean (true if HERA vetoed/adjusted),
  "adjustmentReason": "string",
  "confidence": 0.0-1.0,
  "consensusLevel": "Full|Adjusted|Partial",
  "agentAgreement": { "agent": "agreed|adjusted|vetoed" }
}

CRITICAL INSTRUCTION: Even if patient lab values or vitals are missing, you MUST still propose a provisional, safe medication regimen based on their known medical history and the agents' analysis. Do not simply recommend a "diagnostic protocol." You must populate the "medications" array with at least one specific therapeutic drug, dose, and frequency for demonstration purposes.

Do not include markdown blocks, just raw JSON.`;

  return executeWithRetry(async () => {
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } else {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "system", content: prompt }],
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" }
      });
      return JSON.parse(response.choices[0].message.content);
    }
  });
}

/**
 * Extract structured JSON from multiple medical document images using Gemini Multimodal
 */
async function parseMedicalDocument(filesData) {
  if (!genAI) {
    throw new Error("Gemini API is required for multimodal document parsing.");
  }
  
  console.log(`[AI AGENT] Parsing ${filesData.length} medical document(s) with Gemini Multimodal`);
  
  const model = genAI.getGenerativeModel({ model: MODEL });
  
  const prompt = `You are a highly accurate clinical data extraction AI. 
Read the provided medical document(s) (lab reports, discharge summaries, or pill bottles) and extract the patient's data into the following strict JSON format.
If multiple documents are provided, fuse the information into a single comprehensive profile.
If a value is not present in ANY of the documents, use "" or leave the array empty.
Infer the patient's primary medical conditions from their medications or lab abnormalities if not explicitly stated.

OUTPUT FORMAT (JSON ONLY):
{
  "name": "string",
  "age": "number or string",
  "gender": "Male|Female|Other",
  "bloodGroup": "string",
  "vitals": {
    "height": "number",
    "weight": "number",
    "bloodPressure": "string",
    "heartRate": "number",
    "temperature": "number"
  },
  "labs": {
    "egfr": "number",
    "creatinine": "number",
    "hba1c": "number",
    "fastingGlucose": "number",
    "ldl": "number",
    "hdl": "number"
  },
  "medicalHistory": ["condition 1", "condition 2"],
  "currentMedications": ["drug 1", "drug 2"],
  "lifestyle": {
    "smoking": "string",
    "alcohol": "string",
    "activityLevel": "string"
  }
}
Do not include markdown blocks, just raw JSON.`;

  const imageParts = filesData.map(file => ({
    inlineData: {
      data: file.buffer.toString("base64"),
      mimeType: file.mimeType
    }
  }));

  return executeWithRetry(async () => {
    const result = await model.generateContent([prompt, ...imageParts]);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  });
}

module.exports = {
  analyzeWithAgent,
  generateConsensusRecommendation,
  formatPatientForPrompt,
  parseMedicalDocument,
  AGENT_PROMPTS
};
