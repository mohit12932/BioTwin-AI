"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, BrainCircuit, ShieldCheck, Waves, FlaskConical, Presentation } from 'lucide-react';
import apiClient from '@/api/apiClient';

export default function Home() {
  const router = useRouter();

  const pillars = [
    {
      icon: BrainCircuit,
      title: 'Digital Twin Simulation',
      text: 'Model each patient with a virtual health profile and test multiple treatment strategies before clinical execution.',
    },
    {
      icon: Waves,
      title: 'Continuous Learning',
      text: 'Capture real outcomes, feed them back into the platform, and steadily improve prediction accuracy.',
    },
    {
      icon: ShieldCheck,
      title: 'Secure Clinical Workflow',
      text: 'Bridge intake, explainability, EHR sync, and wearable telemetry in one protected decision environment.',
    },
    {
      icon: FlaskConical,
      title: 'Biomarker Translation',
      text: 'Bring lab panels and biomarker context into targetability, cohort match, and drug intelligence layers.',
    },
  ];

  const [demoCases, setDemoCases] = React.useState([]);
  const [launchError, setLaunchError] = React.useState('');
  const [isLaunching, setIsLaunching] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('biotwin_token')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoggedIn(true);
    }
    apiClient.get('/patient/demo-cases')
      .then((response) => setDemoCases(response.data))
      .catch((err) => {
        console.error('Failed to load demo cases:', err);
        setDemoCases([]);
      });
  }, []);

  const launchDemoCase = async (slug) => {
    setLaunchError('');
    setIsLaunching(true);
    try {
      const response = await apiClient.post(`/patient/demo-seed/${slug}`);
      router.push(`/dashboard/${response.data.patientId}`);
    } catch (err) {
      console.error('Failed to launch demo case:', err);
      setLaunchError(err.response?.data?.error || 'Failed to launch demo case. Please try again.');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 bg-[radial-gradient(circle_at_top,_rgba(217,255,102,0.26),_transparent_32%),linear-gradient(180deg,_#edf5e8_0%,_#deefd2_100%)] text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center gap-10">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-[#f6f3ee]/88 shadow-[0_24px_80px_rgba(80,110,88,0.12)]">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="p-8 md:p-12">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] bg-lime-100 text-lime-700">
                <img src="/logo.jpg" alt="BioTwin Logo" className="h-5 w-5 rounded-full object-cover bg-white" /> Precision Medicine Workspace
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl text-slate-900">
                BioTwin AI turns patient data into a treatment-safe digital twin.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Ingest clinical data, simulate treatment protocols, compare projected outcomes, and learn from real-world recovery signals in one end-to-end platform.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() => router.push(isLoggedIn ? '/doctor' : '/login')}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 font-semibold transition bg-black text-white hover:bg-slate-800"
                >
                  {isLoggedIn ? 'Enter Clinical Registry' : 'Clinical Login'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-8 md:p-10 border-l border-black/5 bg-white/35">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">System Layers</p>
              <div className="mt-6 space-y-4">
                {[
                  { name: 'Patient Intake', description: 'Collect and structure patient medical history, demographics, and clinical data into a comprehensive health profile.' },
                  { name: 'Digital Twin Engine', description: 'Create a virtual replica of the patient to simulate disease progression and compare treatment outcomes.' },
                  { name: 'Clinical Dashboard', description: 'Visualize patient metrics, risk scores, treatment recommendations, and simulation history in real-time.' },
                  { name: 'Learning Loop', description: 'Continuously improve predictions by feeding real-world outcomes back into the AI model.' },
                  { name: 'Secure Integration', description: 'Connect with EHR systems and wearable devices through encrypted, HIPAA-compliant API endpoints.' },
                  { name: 'Explainable AI', description: 'Provide transparent insights into AI decisions with feature importance and what-if scenario analysis.' },
                ].map((layer, index) => (
                  <div key={layer.name} className="group rounded-2xl border p-4 transition-all duration-200 hover:shadow-md border-black/5 bg-white/80 hover:border-lime-300">
                    <p className="text-xs uppercase tracking-[0.2em] text-lime-700">Layer {index + 1}</p>
                    <p className="mt-2 font-semibold text-slate-900">{layer.name}</p>
                    <p className="mt-2 text-sm leading-relaxed max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:opacity-100 text-slate-600">{layer.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="rounded-3xl border p-6 transition hover:-translate-y-1 border-black/5 bg-white/80 shadow-sm">
                <div className="mb-4 inline-flex rounded-2xl p-3 bg-lime-100 text-lime-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">{pillar.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{pillar.text}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-[2rem] border p-6 border-black/5 bg-white/80 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl p-3 bg-violet-100 text-violet-700"><Presentation className="h-5 w-5" /></div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Presentation Mode</h2>
              <p className="text-sm text-slate-600">Launch seeded domain cases instantly for demos, judging, or stakeholder walkthroughs.</p>
            </div>
          </div>
          {launchError && (
            <div className="mb-4 rounded-xl border p-3 text-sm border-rose-200 bg-rose-50 text-rose-700">
              {launchError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {demoCases.map((demo) => (
              <button 
                key={demo.slug} 
                onClick={() => launchDemoCase(demo.slug)} 
                disabled={isLaunching}
                className="rounded-3xl border p-5 text-left transition hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 border-black/5 bg-[#f8f6f0] hover:border-violet-300 hover:bg-white"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-violet-700">{demo.disease}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{demo.title}</p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
                  {isLaunching ? 'Launching...' : 'Launch case'} <ArrowRight className="h-4 w-4" />
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
