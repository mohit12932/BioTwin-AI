import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Users, Plus, Loader2, ArrowRight, UserCircle, LogOut } from 'lucide-react';
import apiClient from '@/api/apiClient';

const DoctorDashboard = () => {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check auth
    const token = localStorage.getItem('biotwin_token');
    const userData = localStorage.getItem('biotwin_user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(userData));
    }

    // Fetch patients
    const fetchPatients = async () => {
      try {
        const response = await apiClient.get('/patient');
        setPatients(response.data);
      } catch (err) {
        setError('Failed to load patient records. Ensure backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('biotwin_token');
    localStorage.removeItem('biotwin_user');
    router.push('/login');
  };

  const getRiskColor = (score) => {
    if (!score) return 'bg-slate-100 text-slate-600';
    if (score < 40) return 'bg-emerald-100 text-emerald-700';
    if (score < 70) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-lime-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(217,255,102,0.15),_transparent_32%),linear-gradient(180deg,_#edf5e8_0%,_#f8faf7_100%)] text-slate-900 pb-16">
      
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="BioTwin Logo" className="h-10 w-10 rounded-xl object-contain bg-white shadow-sm" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">BioTwin Clinical Home</h1>
              <p className="text-xs text-slate-500">Secure Doctor Access</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-2 md:flex">
              <UserCircle className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{user?.name || 'Dr. Authorized'}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto mt-10 max-w-6xl px-6">
        
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Patient Registry</h2>
            <p className="mt-2 text-slate-600">Select a patient to access their digital twin and run treatment simulations.</p>
          </div>
          <button
            onClick={() => router.push('/new')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-5 w-5" /> New Clinical Intake
          </button>
        </div>

        {error && (
          <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {patients.map((patient) => {
            const riskScore = patient.metrics?.riskScore || 50;
            return (
              <button
                key={patient.id || patient.patientId}
                onClick={() => router.push(`/dashboard/${patient.id || patient.patientId}`)}
                className="group relative flex flex-col items-start overflow-hidden rounded-[1.5rem] border border-black/5 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-lime-200 hover:shadow-md"
              >
                <div className="mb-4 flex w-full items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 group-hover:bg-lime-50 group-hover:text-lime-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-bold ${getRiskColor(riskScore)}`}>
                    Risk: {riskScore}/100
                  </div>
                </div>
                
                <h3 className="mb-1 text-xl font-bold text-slate-900">{patient.name || 'Unnamed Patient'}</h3>
                <p className="mb-4 text-sm text-slate-500">
                  {patient.age}y • {patient.gender || 'Unknown'} • {patient.disease || 'General Evaluation'}
                </p>
                
                <div className="mt-auto inline-flex w-full items-center justify-between border-t border-black/5 pt-4 text-sm font-semibold text-lime-700">
                  Open Digital Twin <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
          
          {patients.length === 0 && !loading && !error && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/50 p-12 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-slate-900">No Patients Found</h3>
              <p className="mb-6 max-w-sm text-sm text-slate-500">Your registry is empty. Create a new patient or open the demo database.</p>
              <button
                onClick={() => router.push('/new')}
                className="rounded-full bg-lime-100 px-6 py-2 text-sm font-bold text-lime-700 transition hover:bg-lime-200"
              >
                Start Intake
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
