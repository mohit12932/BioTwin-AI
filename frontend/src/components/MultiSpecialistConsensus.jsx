"use client";
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Shield, Brain, ArrowRight, AlertTriangle, Ban, DollarSign, Sparkles } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import AgentCard from './AgentCard';

const SimulationStatus = ({ status, hasVeto }) => {
  const statusConfig = {
    pending: {
      label: 'Awaiting Simulation',
      className: 'status-pending',
      dotColor: 'bg-amber-500',
    },
    running: {
      label: 'Multi-Agent Deliberation in Progress',
      className: 'status-running',
      dotColor: 'bg-blue-500',
    },
    completed: {
      label: hasVeto ? 'HERA Constraint Active' : 'Multi-Agent Consensus Reached',
      className: hasVeto ? 'bg-rose-100 text-rose-800' : 'status-completed',
      dotColor: hasVeto ? 'bg-rose-500' : 'bg-emerald-500',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className={`status-indicator ${config.className}`}>
      <div className={`pulse-dot ${config.dotColor}`} />
      {config.label}
    </div>
  );
};

const MultiSpecialistConsensus = ({
  patient = null,
  simulationResult = null,
  // eslint-disable-next-line no-unused-vars
  drugIntel = null,
  isSimulating = false,
  onRunSimulation = () => {},
  canSimulate = true,
}) => {
  const router = useRouter();
  const { id: patientId } = useParams();
  
  const [agentStates, setAgentStates] = useState({
    cardiologist: { active: false, processing: false },
    nephrologist: { active: false, processing: false },
    endocrinologist: { active: false, processing: false },
    hera: { active: false, processing: false },
    'lead-physician': { active: false, processing: false },
  });
  const [vetoOverridden, setVetoOverridden] = useState(false);

  // Extract socio-economic data from patient - DEFAULT to $150 for demo
  const socioEconomic = patient?.socioEconomic || {};
  const insuranceTier = socioEconomic.insuranceTier || patient?.insurance || 'Basic';
  const monthlyBudget = socioEconomic.monthlyMedicationBudget || 150; // Default $150 for hackathon demo
  const transportationAccess = socioEconomic.transportationAccess || 'Limited';
  const distanceToClinic = socioEconomic.distanceToClinic || 15;

  // Extract genomic data - handle "Poor Metabolizer" detection
  const genomicVariant = patient?.biomarkers?.pharmacogenomics?.cyp2c19 || 'CYP2C19 *1/*2';
  const isPoorMetabolizer = 
    genomicVariant.toLowerCase().includes('poor') || 
    genomicVariant.includes('*2/*2') || 
    genomicVariant.includes('*2/*3') ||
    genomicVariant.includes('*3/*3') ||
    genomicVariant.toLowerCase().includes('reduced') ||
    genomicVariant.includes('*2');

  // Extract medication data
  const medications = patient?.medications?.map(m => m.name).slice(0, 2) || ['Metformin', 'Lisinopril'];
  const hasLisinopril = medications.some(m => m.toLowerCase().includes('lisinopril'));

  // Extract metabolic data
  const glucoseLevel = patient?.vitals?.sugar || 142;
  const conditions = patient?.conditions || ['Hypertension', 'Type 2 Diabetes'];
  const hasMetabolicInstability = glucoseLevel > 120 || conditions.some(c => c.toLowerCase().includes('diabetes'));

  // HERA ALWAYS VETOS in demo to show conflict resolution power
  // This demonstrates the agentic workflow's value proposition
  const heraVeto = true; // Force veto for hackathon demo

  const simulationStatus = isSimulating ? 'running' : simulationResult ? 'completed' : 'pending';

  // Simulate agent processing animation with HERA
  useEffect(() => {
    if (isSimulating) {
      const agents = ['nephrologist', 'cardiologist', 'endocrinologist', 'hera', 'lead-physician'];
      const timeouts = [];
      
      agents.forEach((agent, index) => {
        const processingTimeout = setTimeout(() => {
          setAgentStates(prev => ({
            ...prev,
            [agent]: { active: false, processing: true },
          }));
        }, index * 400);
        timeouts.push(processingTimeout);

        const activeTimeout = setTimeout(() => {
          setAgentStates(prev => ({
            ...prev,
            [agent]: { active: true, processing: false },
          }));
        }, index * 400 + 1200);
        timeouts.push(activeTimeout);
      });
      
      // Cleanup timeouts on unmount or when isSimulating changes
      return () => timeouts.forEach(t => clearTimeout(t));
    } else if (simulationResult) {
      // Only update if we have a result and not simulating
      const newState = {
        cardiologist: { active: true, processing: false },
        nephrologist: { active: true, processing: false },
        endocrinologist: { active: true, processing: false },
        hera: { active: true, processing: false },
        'lead-physician': { active: true, processing: false },
      };
      setTimeout(() => setAgentStates(newState), 0);
    }
  }, [isSimulating, simulationResult]);

  // Generate agent analysis with CORRECTED logic
  const generateAgentData = () => {
    return {
      nephrologist: {
        name: 'Nephrologist Agent',
        role: 'Renal Function & Fluid Balance',
        dataAnalyzed: [
          'eGFR & Creatinine Clearance',
          'Electrolyte Panel (K+, Na+)',
          'Renal Toxicity Risk Assessment',
        ],
        rationale: 'Patient exhibits normal renal function (eGFR > 60). No acute kidney injury markers detected. Kidneys can safely clear standard protocol dosages without risking nephrotoxicity.',
        position: 'Approve Standard Protocol',
      },
      
      // CARDIOLOGIST
      cardiologist: {
        name: 'Cardiologist Agent',
        role: 'Cardiovascular Hemodynamics',
        dataAnalyzed: [
          `${medications.join(' + ')}`,
          'Ejection Fraction & BP Trends',
          'Hypotensive Risk Matrix',
        ],
        rationale: hasLisinopril
          ? `INTERACTION WARNING: ${medications.join(' + ')} combined with current hemodynamics significantly increases hypotensive risk. Standard Lisinopril dosage may cause syncope. Recommend conservative titration.`
          : 'Hemodynamics are stable. Cardiac output is sufficient. No significant cardiovascular contraindications detected.',
        position: hasLisinopril ? 'Recommend Dosage Titration' : 'Approve Standard',
      },
      
      // ENDOCRINOLOGIST: Focuses on metabolic status - this is where glucose belongs
      endocrinologist: {
        name: 'Endocrinologist Agent (EA)',
        role: 'Metabolic Status',
        dataAnalyzed: [
          `Glucose: ${glucoseLevel} mg/dL`,
          conditions.slice(0, 2).join(', '),
          'Metabolic Cascade Risk',
        ],
        rationale: hasMetabolicInstability
          ? `Current glucose (${glucoseLevel} mg/dL) indicates metabolic instability. Aggressive alternative treatments (e.g., GLP-1 biologics) could trigger metabolic cascade. Prefer conservative pathway.`
          : 'Metabolic parameters stable. Patient can tolerate standard treatment intensity.',
        position: hasMetabolicInstability ? 'Prefer Conservative Pathway' : 'Approve with Monitoring',
      },
      
      // HERA: Economic constraint agent - ALWAYS VETOS to show conflict resolution
      hera: {
        name: 'HERA',
        role: 'Health Economics & Resource Agent',
        dataAnalyzed: [
          `Insurance: ${insuranceTier}`,
          `Budget: $${monthlyBudget}/mo`,
          `Transport: ${transportationAccess}`,
          `Distance: ${distanceToClinic}mi`,
        ],
        // HERA vetoes because clinical agents might suggest expensive biologics
        rationale: `VETO. Clinical specialists suggest advanced alternatives (GLP-1 biologics: ~$800/mo). Patient budget capped at $${monthlyBudget}/mo. Advanced biologics exceed budget by ${Math.round((800/monthlyBudget - 1) * 100)}%. High risk of financial non-compliance. MANDATE: Generic protocol only.`,
        position: 'VETO - Mandate Generic Protocol',
        isVeto: true,
      },
    };
  };

  const agentData = generateAgentData();

  // Determine final consensus - ALWAYS reflects HERA veto for demo
  const determineConsensus = () => {
    if (!simulationResult) return null;

    // For hackathon demo: HERA always vetoes to show conflict resolution
    return {
      protocol: 'Conservative Generic Protocol',
      isConservative: true,
      hasVeto: true,
      reasoning: `SYNTHESIS: GA confirms ${genomicVariant} variant - standard dosages unsafe. PA flags hypotensive risk with current meds. EA requires metabolic stability (glucose: ${glucoseLevel} mg/dL). HERA CONSTRAINT: Budget $${monthlyBudget}/mo eliminates $800/mo biologic alternatives. RESOLUTION: Conservative Generic Protocol with titrated Lisinopril (2.5mg start), standard Metformin, extended monitoring intervals.`,
      confidence: 84,
      action: 'Recommend for Physician Review',
    };
  };

  const consensus = determineConsensus();

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Multi-Specialist Consensus Builder</h2>
          <p className="text-sm text-slate-500 mt-1">
            Clinical specialists + HERA constraint agent deliberate for viable treatment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SimulationStatus status={simulationStatus} hasVeto={heraVeto && simulationResult} />
          {/* Advanced Negotiation Button - Mission Control */}
          <button
            onClick={() => navigate(`/consensus/${patientId}`)}
            className="px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-400 transition-all flex items-center gap-2"
            title="Open Mission Control workspace"
          >
            <Sparkles className="h-4 w-4" />
            Mission Control
          </button>
          {canSimulate && !isSimulating && (
            <button
              onClick={onRunSimulation}
              className="px-5 py-2.5 rounded-full bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
            >
              {simulationResult ? 'Re-run' : 'Start Consensus'}
            </button>
          )}
        </div>
      </div>

      {/* Clinical Specialists Row */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Clinical Specialists (Utopian)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AgentCard
            type="nephrologist"
            {...agentData.nephrologist}
            isActive={agentStates.nephrologist.active}
            isProcessing={agentStates.nephrologist.processing}
          />
          <AgentCard
            type="cardiologist"
            {...agentData.cardiologist}
            isActive={agentStates.cardiologist.active}
            isProcessing={agentStates.cardiologist.processing}
          />
          <AgentCard
            type="endocrinologist"
            {...agentData.endocrinologist}
            isActive={agentStates.endocrinologist.active}
            isProcessing={agentStates.endocrinologist.processing}
          />
        </div>
      </div>

      {/* HERA Constraint Agent */}
      <div>
        <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Constraint Agent (Real-World Viability)
        </p>
        <AgentCard
          type="hera"
          {...agentData.hera}
          isActive={agentStates.hera.active}
          isProcessing={agentStates.hera.processing}
          isVeto={simulationResult ? true : false}
          className="relative"
        />
      </div>

      {/* Lead Physician Agent */}
      {simulationResult && (
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">Lead Physician Agent (Consensus Coordinator)</p>
          <AgentCard
            type="lead-physician"
            name="Lead Physician Agent (LPA)"
            role="Consensus Coordinator"
            dataAnalyzed={['GA: Genomic Risk', 'PA: Drug Interactions', 'EA: Metabolic Status', 'HERA: Budget Constraint']}
            rationale="Resolving conflict between clinical recommendations and economic reality. GA/PA/EA identify biological risks requiring careful management. HERA eliminates expensive alternatives. Synthesizing optimal viable pathway."
            position="Consensus Reached"
            isActive={agentStates['lead-physician'].active}
            isProcessing={agentStates['lead-physician'].processing}
          />
        </div>
      )}

      {/* Consensus Decision Panel */}
      {consensus && (
        <div className={`p-6 mt-2 rounded-3xl ${consensus.hasVeto ? 'hera-constraint-panel' : 'consensus-panel'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${consensus.hasVeto ? 'bg-rose-200' : 'bg-emerald-100'}`}>
              {consensus.hasVeto ? (
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              ) : (
                <Shield className="h-6 w-6 text-emerald-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className={`text-xl font-bold ${consensus.hasVeto ? 'text-rose-900' : 'text-emerald-900'}`}>
                  FINAL: {consensus.protocol}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  consensus.hasVeto 
                    ? 'bg-rose-200 text-rose-800' 
                    : 'bg-emerald-200 text-emerald-800'
                }`}>
                  {consensus.confidence}% Confidence
                </span>
                {consensus.hasVeto && !vetoOverridden && (
                  <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center gap-1">
                    <Ban className="h-3 w-3" /> HERA VETO APPLIED
                  </span>
                )}
                {consensus.hasVeto && vetoOverridden && (
                  <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> VETO OVERRIDDEN BY PHYSICIAN
                  </span>
                )}
              </div>
              <p className={`text-sm leading-relaxed mb-4 ${consensus.hasVeto && !vetoOverridden ? 'text-rose-800' : 'text-emerald-800'}`}>
                {consensus.reasoning}
              </p>
              
              {consensus.hasVeto && !vetoOverridden && (
                <div className="mb-4">
                  <button 
                    onClick={() => setVetoOverridden(true)}
                    className="flex items-center gap-2 bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Acknowledge & Override Veto
                  </button>
                  <p className="text-xs text-rose-600 mt-2 font-medium">By overriding, you assume clinical responsibility for bypassing the HERA constraint.</p>
                </div>
              )}
              <div className={`flex items-center gap-4 pt-3 border-t ${consensus.hasVeto ? 'border-rose-300' : 'border-emerald-200'}`}>
                <div className={`flex items-center gap-2 text-sm ${consensus.hasVeto ? 'text-rose-700' : 'text-emerald-700'}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>All agents contributed</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${consensus.hasVeto ? 'text-rose-700' : 'text-emerald-700'}`}>
                  <Brain className="h-4 w-4" />
                  <span>{consensus.action}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSpecialistConsensus;
