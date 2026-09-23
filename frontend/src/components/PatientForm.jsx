"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient, { parseLabReport } from '../api/apiClient';
import { User, Activity, Dna, FileText, Pill, HeartPulse, Microscope, Target, ArrowRight, ArrowLeft, Loader2, Bot, CheckCircle2, AlertTriangle, BrainCircuit, Sparkles, Shuffle, Camera, UploadCloud, X, Plus } from 'lucide-react';


const PatientForm = ({ darkMode = false }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [uiState, setUiState] = useState('upload'); // 'upload' | 'extracting' | 'review'
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  
  // State for all data points
  const [formData, setFormData] = useState({
    name: '', age: '', gender: 'Unknown', height: '', weight: '', bloodGroup: 'Unknown',
    symptoms: [], symptomSeverity: 5, symptomDuration: '',
    medicalHistory: { conditions: [], surgeries: '', familyHistory: '' },
    medications: [{ name: '', dosage: '', frequency: '' }],
    biomarkers: {
      genomicVariant: 'Not Assessed',
      therapyTarget: 'Broad Standard of Care',
      expressionLevel: 'Unknown',
      resistanceMarker: 'None reported',
      immuneProfile: 'Baseline',
      genomics: {
        variants: [],
        tumorMutationBurden: '',
        microsatelliteStatus: 'Unknown',
        pdL1Expression: '',
        herStatus: 'Unknown',
        hormoneReceptors: { er: 'Unknown', pr: 'Unknown' }
      },
      pharmacogenomics: { cyp2d6: 'Unknown', cyp2c19: 'Unknown', cyp2c9: 'Unknown', vkorc1: 'Unknown', tpmt: 'Unknown' }
    },
    allergies: [],
    lifestyle: { smoking: 'Unknown', alcohol: 'Unknown', exercise: 'Unknown', diet: 'Unknown' },
    vitals: { heartRate: '', bpSystolic: '', bpDiastolic: '', sugar: '', spO2: '', temperature: '' },
    disease: 'Unknown',
    treatmentGoal: 'Low Risk'
  });

  const [missingMetrics, setMissingMetrics] = useState([]);

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // If updating a missing metric, check if we should remove it from the missing list
    if (missingMetrics.includes(key) && value && value.toString().trim() !== '' && value !== 'Unknown') {
      setMissingMetrics(prev => prev.filter(m => m !== key));
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (missingMetrics.length > 0) return; // Prevent submission if metrics are missing
    
    setLoading(true);
    setSubmitStatus({ type: 'loading', message: 'Digitizing profile and constructing patient twin...' });
    try {
      const response = await apiClient.post('/patient/intake', formData);
      setSubmitStatus({ type: 'success', message: 'Digital twin created. Opening the clinical dashboard...' });
      router.push(`/dashboard/${response.data.patientId}`);
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.error || err?.message || 'Failed to construct Digital Health Profile. Please try again.';
      setSubmitStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files)].slice(0, 5)); // Limit to 5
    }
  };
  
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processDocuments = async () => {
    if (files.length === 0) return;
    
    setUiState('extracting');
    setSubmitStatus({ type: 'loading', message: 'AI is fusing the documents and extracting clinical data...' });
    
    try {
      const parsedData = await parseLabReport(files);
      
      setFormData(prev => ({
        ...prev,
        name: parsedData.name || prev.name,
        age: parsedData.age || prev.age,
        gender: parsedData.gender || prev.gender,
        bloodGroup: parsedData.bloodGroup || prev.bloodGroup,
        vitals: { ...prev.vitals, ...parsedData.vitals },
        medicalHistory: { ...prev.medicalHistory, conditions: parsedData.medicalHistory || prev.medicalHistory.conditions },
        lifestyle: { ...prev.lifestyle, ...parsedData.lifestyle }
      }));
      
      if (parsedData.currentMedications && parsedData.currentMedications.length > 0) {
        setFormData(prev => ({
          ...prev,
          medications: parsedData.currentMedications.map(name => ({ name, dosage: '', frequency: '' }))
        }));
      }

      // Check for necessary metrics
      const newMissing = [];
      if (!parsedData.name || parsedData.name.trim() === '') newMissing.push('name');
      if (!parsedData.age || parsedData.age === '' || parsedData.age === 'Unknown') newMissing.push('age');
      if (!parsedData.gender || parsedData.gender === '' || parsedData.gender === 'Unknown') newMissing.push('gender');
      // If we couldn't infer the disease from the lab, we ask for it
      if (!parsedData.disease && formData.disease === 'Unknown') newMissing.push('disease');

      setMissingMetrics(newMissing);
      setUiState('review');
      setSubmitStatus({ type: 'success', message: 'Extraction complete! Please review the profile.' });
      
    } catch (err) {
      console.error(err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to parse documents';
      setSubmitStatus({ type: 'error', message: `Submission failed: ${errorMsg}` });
      setUiState('upload');
    }
  };

  // Styles
  const shellClass = darkMode
    ? 'min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_26%),linear-gradient(180deg,_#07111f_0%,_#0f172a_100%)]'
    : 'min-h-screen bg-[radial-gradient(circle_at_top,_rgba(217,255,102,0.24),_transparent_26%),linear-gradient(180deg,_#edf5e8_0%,_#deefd2_100%)]';
  const heroCardClass = darkMode
    ? 'border-slate-800 bg-slate-900/75 text-white'
    : 'border-white/70 bg-[#f6f3ee]/88 text-slate-900 shadow-[0_24px_80px_rgba(80,110,88,0.12)]';
  const bigCardClass = darkMode
    ? 'glass-panel border-slate-700/50'
    : 'border border-white/70 bg-[#f6f3ee]/92 shadow-[0_24px_80px_rgba(80,110,88,0.12)]';
  const contentClass = darkMode
    ? 'bg-[#0f172a] text-white'
    : 'bg-[linear-gradient(180deg,#f8f6f0_0%,#f3f8ed_100%)] text-slate-900';
  const inputClass = darkMode
    ? 'w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white'
    : 'w-full bg-[#f1eee7] border border-black/5 rounded-xl p-3 text-slate-900 placeholder:text-slate-400';
  const labelClass = darkMode ? 'text-sm text-slate-400 font-medium' : 'text-sm text-slate-600 font-medium';
  const sectionCardClass = darkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-white/80 border-black/5';

  return (
    <div className={`${shellClass} pt-16 pb-12 flex justify-center items-center px-4 md:px-0`}>
      <div className="w-full max-w-4xl space-y-6">
        <div className={`rounded-[2rem] border p-6 md:p-8 ${heroCardClass}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] ${darkMode ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300' : 'bg-lime-100 text-lime-700'}`}>
                <Sparkles className="h-3.5 w-3.5" /> Unified Intake Studio
              </div>
              <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Build a clinical digital twin</h1>
              <p className={`mt-2 max-w-2xl text-base ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Upload all relevant documents (labs, vitals, prescriptions) simultaneously. The AI will fuse them into a single profile.</p>
            </div>
          </div>
        </div>

        <div className={`w-full overflow-hidden relative rounded-2xl sm:rounded-3xl ${bigCardClass}`}>
          <div className={`p-6 md:p-10 min-h-[400px] flex flex-col ${contentClass}`}>
            
            {uiState === 'upload' && (
              <div className="flex-1 flex flex-col justify-center animate-fadeIn">
                <div className={`w-full max-w-2xl mx-auto p-10 border-2 border-dashed rounded-3xl text-center transition-all ${darkMode ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' : 'border-lime-400 bg-lime-50/50 hover:bg-lime-100'}`}>
                  <UploadCloud size={56} className={`mx-auto mb-4 ${darkMode ? 'text-blue-400' : 'text-lime-600'}`} />
                  <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Drop medical documents here</h3>
                  <p className={`text-base mb-8 max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Upload lab reports, prescriptions, or vitals sheets. We support up to 5 images/PDFs at once.
                  </p>
                  
                  <label className={`cursor-pointer inline-flex items-center justify-center px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-lime-500 text-slate-900 hover:bg-lime-400'}`}>
                    <Plus size={20} className="mr-2" />
                    <span>Select Files</span>
                    <input type="file" className="hidden" multiple accept="image/*,application/pdf" onChange={handleFileChange} />
                  </label>
                </div>
                
                {files.length > 0 && (
                  <div className="mt-8 max-w-2xl mx-auto w-full animate-fadeIn">
                    <h4 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Selected Documents ({files.length}/5)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {files.map((f, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${sectionCardClass}`}>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText size={20} className={darkMode ? 'text-blue-400' : 'text-lime-600'} />
                            <span className="text-sm truncate font-medium">{f.name}</span>
                          </div>
                          <button onClick={() => removeFile(i)} className="text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg"><X size={16}/></button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-8 text-center">
                      <button onClick={processDocuments} className={`px-8 py-3 rounded-xl font-bold text-lg shadow-xl transition-all hover:scale-105 flex items-center gap-2 mx-auto ${darkMode ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                         <Bot size={20}/> Extract & Synthesize Data
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {uiState === 'extracting' && (
              <div className="flex-1 flex flex-col items-center justify-center animate-fadeIn text-center">
                <BrainCircuit size={64} className={`mb-6 animate-pulse ${darkMode ? 'text-blue-400' : 'text-lime-500'}`} />
                <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Fusing Medical Documents...</h3>
                <p className={`max-w-md ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  The multimodal AI is reading all provided files, cross-referencing values, and structuring a unified digital twin profile.
                </p>
              </div>
            )}

            {uiState === 'review' && (
              <div className="flex-1 flex flex-col animate-fadeIn">
                <div className="mb-6 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-lime-100 text-lime-600'}`}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Extraction Complete</h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Review the data below. Provide any missing critical metrics before generating the twin.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className={`rounded-2xl border p-5 ${sectionCardClass}`}>
                    <h4 className={`font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      <CheckCircle2 size={18}/> Successfully Captured
                    </h4>
                    <ul className={`space-y-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                       {!missingMetrics.includes('name') && <li><span className="opacity-60">Name:</span> {formData.name}</li>}
                       {!missingMetrics.includes('age') && <li><span className="opacity-60">Age:</span> {formData.age}</li>}
                       {!missingMetrics.includes('gender') && <li><span className="opacity-60">Gender:</span> {formData.gender}</li>}
                       {!missingMetrics.includes('disease') && <li><span className="opacity-60">Primary Condition:</span> {formData.disease}</li>}
                       {formData.medicalHistory.conditions.length > 0 && <li><span className="opacity-60">Conditions:</span> {formData.medicalHistory.conditions.join(', ')}</li>}
                       {formData.medications.length > 0 && formData.medications[0].name && <li><span className="opacity-60">Medications:</span> {formData.medications.length} found</li>}
                    </ul>
                  </div>

                  {missingMetrics.length > 0 ? (
                    <div className={`rounded-2xl border p-5 ${darkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                      <h4 className={`font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                        <AlertTriangle size={18}/> Missing Required Metrics
                      </h4>
                      <p className={`text-sm mb-4 ${darkMode ? 'text-amber-200/70' : 'text-amber-700/80'}`}>Please provide the following to complete the profile.</p>
                      <div className="space-y-3">
                        {missingMetrics.includes('name') && (
                          <div><label className={labelClass}>Patient Name</label><input type="text" value={formData.name} onChange={e => updateForm('name', e.target.value)} className={inputClass} placeholder="e.g. John Doe"/></div>
                        )}
                        {missingMetrics.includes('age') && (
                          <div><label className={labelClass}>Age</label><input type="number" value={formData.age} onChange={e => updateForm('age', e.target.value)} className={inputClass} placeholder="e.g. 45"/></div>
                        )}
                        {missingMetrics.includes('gender') && (
                          <div><label className={labelClass}>Gender</label>
                            <select value={formData.gender} onChange={e => updateForm('gender', e.target.value)} className={inputClass}>
                              <option>Unknown</option><option>Male</option><option>Female</option><option>Other</option>
                            </select>
                          </div>
                        )}
                        {missingMetrics.includes('disease') && (
                          <div><label className={labelClass}>Primary Disease Focus</label>
                            <select value={formData.disease} onChange={e => updateForm('disease', e.target.value)} className={inputClass}>
                              <option>Unknown</option><option>Cardiac</option><option>Respiratory</option><option>Metabolic</option><option>Neurological</option><option>Oncology</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-2xl border p-5 flex flex-col justify-center items-center text-center ${darkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                      <Target size={32} className={`mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}/>
                      <h4 className={`font-semibold mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Profile Complete</h4>
                      <p className={`text-sm ${darkMode ? 'text-blue-400/70' : 'text-blue-700/70'}`}>All required metrics are satisfied.</p>
                    </div>
                  )}
                </div>

                <div className={`pt-6 border-t flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-black/5'}`}>
                   <button onClick={() => { setUiState('upload'); setFiles([]); }} className={`px-5 py-2 text-sm rounded-lg font-medium transition-all ${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>
                     Start Over
                   </button>
                   
                   <div className="flex items-center gap-4">
                     <div className="text-right">
                       <label className={`block text-xs uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Treatment Goal</label>
                       <select value={formData.treatmentGoal} onChange={e => updateForm('treatmentGoal', e.target.value)} className={`text-sm font-semibold bg-transparent border-none focus:ring-0 cursor-pointer ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                         <option>Low Risk / Conservative</option>
                         <option>Cost-effective</option>
                         <option>Fast Recovery</option>
                         <option>Experimental / High Risk</option>
                       </select>
                     </div>
                     <button 
                       onClick={handleSubmit} 
                       disabled={loading || missingMetrics.length > 0}
                       className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 
                         ${loading || missingMetrics.length > 0 ? (darkMode ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed') : (darkMode ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:scale-105' : 'bg-gradient-to-r from-lime-400 to-emerald-300 text-slate-900 hover:from-lime-300 hover:to-emerald-200 shadow-[0_12px_30px_rgba(163,230,53,0.35)] hover:scale-105')}`}
                      >
                       {loading ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><Dna size={18} /> Generate Twin Model</>}
                     </button>
                   </div>
                </div>
              </div>
            )}

            {submitStatus.message && (
              <div className={`mt-6 rounded-2xl border p-4 text-sm max-w-2xl mx-auto w-full ${
                submitStatus.type === 'success'
                 ? (darkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700')
                  : submitStatus.type === 'error'
                  ? (darkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700')
                  : (darkMode ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700')
              }`}>
                <div className="flex items-start gap-3">
                  {submitStatus.type === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" /> : submitStatus.type === 'error' ? <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" /> : <Loader2 className={`mt-0.5 h-5 w-5 flex-none ${submitStatus.type === 'loading' ? 'animate-spin' : ''}`} />}
                  <div>
                    <p className="font-semibold">{submitStatus.type === 'success' ? 'Success' : submitStatus.type === 'error' ? 'Submission failed' : 'Processing status'}</p>
                    <p className="mt-1 opacity-90">{submitStatus.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default PatientForm;
