"use client";
import React from 'react';
import { HeartPulse, Droplet, Activity, Stethoscope, CheckCircle2, AlertTriangle, ArrowRight, DollarSign, Ban } from 'lucide-react';

const agentIcons = {
  cardiologist: HeartPulse,
  nephrologist: Droplet,
  endocrinologist: Activity,
  'lead-physician': Stethoscope,
  hera: DollarSign,
};

const agentColors = {
  cardiologist: {
    bg: 'bg-violet-50',
    border: 'border-l-violet-500',
    text: 'text-violet-700',
    iconBg: 'bg-violet-100',
    badge: 'bg-violet-100 text-violet-700',
  },
  nephrologist: {
    bg: 'bg-cyan-50',
    border: 'border-l-cyan-500',
    text: 'text-cyan-700',
    iconBg: 'bg-cyan-100',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  endocrinologist: {
    bg: 'bg-amber-50',
    border: 'border-l-amber-500',
    text: 'text-amber-700',
    iconBg: 'bg-amber-100',
    badge: 'bg-amber-100 text-amber-700',
  },
  'lead-physician': {
    bg: 'bg-emerald-50',
    border: 'border-l-emerald-500',
    text: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  hera: {
    bg: 'bg-rose-50',
    border: 'border-l-rose-500',
    text: 'text-rose-700',
    iconBg: 'bg-rose-100',
    badge: 'bg-rose-100 text-rose-700',
  },
};

const AgentCard = ({
  type = 'cardiologist',
  name = 'Agent',
  role = 'Specialist',
  dataAnalyzed = [],
  rationale = '',
  position = '',
  isVeto = false,
  isActive = false,
  isProcessing = false,
  className = '',
}) => {
  const Icon = agentIcons[type] || HeartPulse;
  const colors = agentColors[type] || agentColors.cardiologist;
  const isHeraAgent = type === 'hera';

  return (
    <div
      className={`
        agent-card p-5 transition-all duration-300
        ${isVeto ? 'bg-rose-50 border-l-rose-600' : colors.bg} border-l-4 ${!isVeto && colors.border}
        ${isActive ? (isVeto ? 'ring-2 ring-rose-400 ring-offset-2' : 'ring-2 ring-emerald-400 ring-offset-2') : ''}
        ${isProcessing ? 'animate-pulse' : ''}
        ${isVeto ? 'veto-card' : ''}
        ${className}
      `}
    >
      {/* Veto Badge */}
      {isVeto && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="veto-badge flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg">
            <Ban className="h-3.5 w-3.5" />
            VETO
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isVeto ? 'bg-rose-100' : colors.iconBg}`}>
            <Icon className={`h-5 w-5 ${isVeto ? 'text-rose-600' : colors.text}`} />
          </div>
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${isVeto ? 'text-rose-600' : colors.text}`}>{role}</p>
            <h4 className="text-lg font-bold text-slate-900">{name}</h4>
          </div>
        </div>
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className={`pulse-dot ${isHeraAgent ? 'bg-rose-500' : 'bg-blue-500'}`} />
            {isHeraAgent ? 'Evaluating...' : 'Analyzing...'}
          </div>
        )}
      </div>

      {/* Data Analyzed */}
      {dataAnalyzed.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Data Analyzed</p>
          <div className="flex flex-wrap gap-1.5">
            {dataAnalyzed.map((item, index) => (
              <span
                key={index}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${
                  isHeraAgent 
                    ? 'bg-rose-50/80 text-rose-700 border-rose-200' 
                    : 'bg-white/80 text-slate-600 border-slate-200'
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rationale */}
      {rationale && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {isHeraAgent ? 'Economic Assessment' : 'Rationale'}
          </p>
          <div className={`rounded-xl p-3 border ${
            isVeto 
              ? 'bg-rose-100/60 border-rose-200' 
              : 'bg-white/60 border-slate-100'
          }`}>
            <p className={`text-sm leading-relaxed ${isVeto ? 'text-rose-800' : 'text-slate-700'}`}>{rationale}</p>
          </div>
        </div>
      )}

      {/* Position/Vote */}
      {position && (
        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-200/50">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
            isVeto 
              ? 'bg-rose-600 text-white' 
              : position.toLowerCase().includes('adjust') || position.toLowerCase().includes('reduce') || position.toLowerCase().includes('veto')
                ? 'bg-rose-100 text-rose-700'
                : colors.badge
          }`}>
            {isVeto || position.toLowerCase().includes('veto') ? (
              <Ban className="h-3.5 w-3.5" />
            ) : position.toLowerCase().includes('adjust') || position.toLowerCase().includes('reduce') ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {position}
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300" />
        </div>
      )}
    </div>
  );
};

export default AgentCard;
