"use client";
import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Beaker, HeartPulse, ShieldAlert, Sparkles, TrendingUp, TrendingDown, Clock, 
  CheckCircle, AlertTriangle, XCircle, Info, Stethoscope, User, AlertOctagon 
} from 'lucide-react';
import apiClient from '../api/apiClient';

// Helper to determine Metric styling and trend - moved outside component
const getMetricStyle = (type, value) => {
  if (type === 'Effectiveness' || type === 'Survival') {
    if (value >= 75) return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: TrendingUp, trend: 'up' };
    if (value >= 50) return { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Activity, trend: 'flat' };
    return { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: TrendingDown, trend: 'down' };
  } else {
    // Risk and Side Effects: Lower is better
    if (value <= 30) return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: TrendingDown, trend: 'down' };
    if (value <= 60) return { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Activity, trend: 'flat' };
    return { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: TrendingUp, trend: 'up' };
  }
};

// StatCard component - moved outside to prevent recreation on each render
const StatCard = ({ title, value, unit, icon: IconComponent, type }) => {
  const style = getMetricStyle(type, value);
  const TrendIcon = style.icon;
  
  return (
    <div className="relative overflow-hidden p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <p className="font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <div className={`p-2 rounded-xl ${style.bg}`}>
          <IconComponent className={`w-5 h-5 ${style.color}`} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{value}</span>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{unit}</span>
      </div>
      
      {/* Trend Indicator Container */}
      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
        <TrendIcon className={`w-4 h-4 ${style.color}`} />
        <span className={`${style.color}`}>
          {style.trend === 'up' && type === 'Risk' ? 'Elevated level' : 
           style.trend === 'down' && type === 'Risk' ? 'Favorable range' : 
           style.trend === 'up' ? 'Positive trajectory' : 
           style.trend === 'down' ? 'Needs attention' : 'Stable'}
        </span>
      </div>
    </div>
  );
};

const DigitalTwinSimulation = () => {
  const [patientId, setPatientId] = useState('P123'); // Default mock patient
  const [treatmentPlan, setTreatmentPlan] = useState({
    type: 'Conservative',
    dosage: 'Medium',
    duration: 30
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/simulate', {
        patientId,
        treatmentPlan
      });
      const data = response.data;
      
      // Simulate slightly longer processing for UX effect
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 800);
      
    } catch (error) {
      console.error('Simulation Failed:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Layer 3 Activated
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Clinical Decision Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg max-w-2xl">
              Transform simulation outputs into clear, actionable, and decision-focused insights for advanced treatment planning.
            </p>
          </div>
        </div>

        {/* Top Controls & Patient Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls - Span 5 */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Stethoscope className="w-5 h-5 text-indigo-500" />
              Simulation Parameters
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Patient Identifier</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white transition-shadow"
                    placeholder="e.g. P123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Protocol</label>
                  <select 
                    value={treatmentPlan.type}
                    onChange={(e) => setTreatmentPlan({...treatmentPlan, type: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Conservative">Conservative</option>
                    <option value="Standard">Standard</option>
                    <option value="Aggressive">Aggressive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Dosage</label>
                  <select 
                    value={treatmentPlan.dosage}
                    onChange={(e) => setTreatmentPlan({...treatmentPlan, dosage: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={runSimulation}
                disabled={loading}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transform transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Computing Trajectory...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-5 h-5 group-hover:animate-pulse" /> 
                    Run Digital Twin Simulation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Patient Summary - Span 7 */}
          {result ? (
            <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden animate-fade-in text-white border border-slate-800">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <HeartPulse className="w-48 h-48" />
              </div>
              
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-200">
                      <User className="w-6 h-6" /> Patient Digital Twin Status
                    </h3>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono border border-white/20">
                      ID: {result.digitalTwinState.patientId}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Health Index</p>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-light tracking-tight">{result.digitalTwinState.healthIndex}</span>
                        <span className="text-sm font-medium text-slate-400 mb-1.5">/ 100</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Risk Level</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold mt-1 ${
                        result.digitalTwinState.riskLevel === 'Low' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        result.digitalTwinState.riskLevel === 'Medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {result.digitalTwinState.riskLevel}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Primary Concern</p>
                      <span className="text-lg font-medium tracking-tight text-white line-clamp-2">
                        {result.digitalTwinState.diseaseState}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-white/10">
                  <p className="text-slate-400 text-sm mb-3 font-medium flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4" /> Contributing Factors
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.digitalTwinState.contributingFactors?.map((factor, idx) => (
                      <span key={idx} className="bg-white/5 border border-white/10 text-slate-200 px-3 py-1.5 rounded-lg text-sm">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Awaiting Simulation</h3>
                <p className="text-slate-500 dark:text-slate-500 max-w-sm mx-auto">
                  Configure the treatment parameters on the left and run the simulation to generate the Digital Twin and clinical insights.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Results Matrix */}
        {result && (
          <div className="space-y-6 animate-slide-up">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard title="Effectiveness" value={result.effectiveness} unit="%" icon={TrendingUp} type="Effectiveness" />
              <StatCard title="Risk Exposure" value={result.risk} unit="%" icon={ShieldAlert} type="Risk" />
              <StatCard title="Side Effects" value={result.sideEffects} unit="%" icon={AlertTriangle} type="Risk" />
              <StatCard title="Survival Prob." value={result.survivalProbability} unit="%" icon={HeartPulse} type="Survival" />
              <StatCard title="Confidence" value={result.confidenceScore} unit="%" icon={Sparkles} type="Effectiveness" />
            </div>

            {/* Core Visualization & Decision Output */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Outcome Trajectory Graph - Span 2 */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      Outcome Trajectory Graph
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Disease severity projection over time</p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
                    result.diseaseProgression === 'Improving' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                    result.diseaseProgression === 'Worsening' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' :
                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                  }`}>
                    Trajectory: {result.diseaseProgression}
                  </span>
                </div>
                
                <div className="h-80 w-full flex-grow">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.trajectory} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dx={-10}
                        domain={[0, 100]}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          color: '#fff',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                          padding: '12px 16px'
                        }}
                        itemStyle={{ fontWeight: '600', padding: '2px 0' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}
                        labelFormatter={(label) => `Day ${label}`}
                      />
                      <Legend 
                        iconType="circle" 
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                      <Line 
                        name="Without Treatment"
                        type="monotone" 
                        dataKey="Without Treatment" 
                        stroke="#ef4444" // Rose
                        strokeWidth={2} 
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 0 }}
                      />
                      <Line 
                        name={`Selected (${treatmentPlan.type})`}
                        type="monotone" 
                        dataKey="Selected Treatment" 
                        stroke="#3b82f6" // Blue
                        strokeWidth={4} 
                        dot={false}
                        activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }}
                      />
                      <Line 
                        name={`Optimized (${result.recommendation.best.name})`}
                        type="monotone" 
                        dataKey="Optimized Treatment" 
                        stroke="#10b981" // Emerald
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 6, fill: '#10b981', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Decision Engine UI - Recommended Actions */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    AI Recommendation
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Guided clinical decision support</p>
                </div>
                
                <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                  
                  {/* Recommended */}
                  <div className="relative pl-4 border-l-4 border-emerald-500">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1 rounded-full">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-bold tracking-wide">RECOMMENDED</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl rounded-tl-none border border-emerald-100 dark:border-emerald-500/20">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        {result.recommendation.best.name} Protocol
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        <span className="font-semibold">Reason:</span> {result.recommendation.best.reason}
                      </p>
                    </div>
                  </div>

                  {/* Alternative */}
                  {result.recommendation.alternatives.map((alt, i) => (
                    <div key={i} className="relative pl-4 border-l-4 border-amber-400">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-bold text-sm tracking-wide">ALTERNATIVE OPTION</span>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl rounded-tl-none border border-amber-100 dark:border-amber-500/20">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-0.5">
                          {alt.name} Protocol
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {alt.reason}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Avoid */}
                  {result.recommendation.avoid.map((avoid, i) => (
                    <div key={i} className="relative pl-4 border-l-4 border-rose-500">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
                        <XCircle className="w-4 h-4" />
                        <span className="font-bold text-sm tracking-wide">AVOID</span>
                      </div>
                      <div className="bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl rounded-tl-none border border-rose-100 dark:border-rose-500/20">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-0.5">
                          {avoid.name} Protocol
                        </h4>
                        <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                          ⚠ High side-effect probability detected
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {avoid.reason}
                        </p>
                      </div>
                    </div>
                  ))}

                </div>
              </div>

            </div>

            {/* Multi-Treatment Comparison View */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white mb-6">
                <Beaker className="w-5 h-5 text-indigo-500" />
                Multi-Treatment Comparative Analysis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {result.recommendation.comparisons?.map((comp, idx) => {
                  
                  const isBest = comp.type === result.recommendation.best.name;
                  const isAvoid = result.recommendation.avoid.some(a => a.name === comp.type);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`relative p-5 rounded-2xl border-2 transition-all ${
                        isBest ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 
                        isAvoid ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/10 opacity-75' : 
                        'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                      }`}
                    >
                      {isBest && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5" /> Optimal
                        </div>
                      )}
                      
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-center pb-3 border-b border-slate-200 dark:border-slate-700/50">
                        {comp.type}
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-slate-500 dark:text-slate-400">Effectiveness</span>
                            <span className="font-bold text-slate-900 dark:text-white">{comp.metrics.effectiveness}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${comp.metrics.effectiveness}%` }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-slate-500 dark:text-slate-400">Risk Profile</span>
                            <span className={`font-bold ${comp.metrics.risk > 60 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                              {comp.metrics.risk}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${comp.metrics.risk > 60 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${comp.metrics.risk}%` }}></div>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-between items-center text-sm font-medium">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-4 h-4" /> Rec. Time
                          </span>
                          <span className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 rounded-md px-2 py-0.5">
                            {parseInt(comp.metrics.recoveryTime)} days
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      <style>{`
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default DigitalTwinSimulation;
