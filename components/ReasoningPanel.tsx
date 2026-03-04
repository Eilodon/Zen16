
import React from 'react';
import { Brain, Zap, Activity, Waves, ArrowLeft } from 'lucide-react';
import { ZenResponse } from '../types';

interface Props {
  data: ZenResponse;
  onBack: () => void;
}

export const ReasoningPanel: React.FC<Props> = ({ data, onBack }) => {
  if (!data.reasoning_steps || data.reasoning_steps.length === 0) return null;

  const dims = data.consciousness_dimensions || {
    contextual: 0.5, emotional: 0.5, cultural: 0.5, wisdom: 0.5, uncertainty: 0.5, relational: 0.5
  };

  const dimLabels: Record<string, string> = {
    contextual: 'Bối cảnh',
    emotional: 'Cảm xúc',
    cultural: 'Văn hóa',
    wisdom: 'Trí tuệ',
    uncertainty: 'Vô thường',
    relational: 'Tương tức',
  };

  return (
    <div className="w-full pb-28 relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Waves size={14} style={{ color: '#f97316' }} strokeWidth={1.5} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
          Quantum Field Dimensions
        </span>
      </div>

      {/* Dimensions Grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-8">
        {Object.entries(dims).map(([key, value]) => (
          <div key={key} className="p-3.5 rounded-[16px] transition-all duration-300"
            style={{
              background: 'rgba(120,113,108,0.03)',
              border: '1px solid rgba(120,113,108,0.06)',
            }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
                {dimLabels[key] || key}
              </span>
              <span className="text-[9px] font-mono tabular-nums"
                style={{ color: 'var(--zen-stone, #78716c)' }}>
                {Math.round((value as number) * 100)}%
              </span>
            </div>
            <div className="h-[5px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(120,113,108,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${(value as number) * 100}%`,
                  background: 'linear-gradient(90deg, #f97316, #ea580c)',
                  boxShadow: '0 0 8px rgba(249,115,22,0.2)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Reasoning Steps */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          <Brain size={14} strokeWidth={1.5} style={{ color: 'var(--zen-stone, #78716c)' }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
            Reasoning Path
          </span>
        </div>
        <div className="relative pl-6 space-y-4" style={{ borderLeft: '1.5px solid rgba(120,113,108,0.08)' }}>
          {data.reasoning_steps.map((step, idx) => (
            <div
              key={idx}
              className="relative animate-fadeInUp"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="absolute -left-[27px] top-2 w-[9px] h-[9px] rounded-full z-10 transition-all duration-500"
                style={{
                  background: idx === data.reasoning_steps.length - 1 ? '#f97316' : 'rgba(120,113,108,0.15)',
                  border: '2px solid white',
                  boxShadow: idx === data.reasoning_steps.length - 1 ? '0 0 8px rgba(249,115,22,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
                }} />
              <p className="text-sm leading-relaxed p-3.5 rounded-[14px]"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--zen-stone-dark, #57534e)',
                  background: 'rgba(120,113,108,0.025)',
                  border: '1px solid rgba(120,113,108,0.04)',
                }}>
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quantum Metrics */}
      {data.quantum_metrics && (
        <div className="pt-6 mb-8" style={{ borderTop: '1px solid rgba(120,113,108,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Activity size={14} strokeWidth={1.5} style={{ color: 'var(--zen-stone, #78716c)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
              Coherence Metrics
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricItem
              icon={<Activity size={16} strokeWidth={1.5} />}
              label="Coherence"
              value={data.quantum_metrics.coherence}
              color="#3b82f6"
              delay={0}
            />
            <MetricItem
              icon={<Zap size={16} strokeWidth={1.5} />}
              label="Entanglement"
              value={data.quantum_metrics.entanglement}
              color="#8b5cf6"
              delay={100}
            />
            <MetricItem
              icon={<Brain size={16} strokeWidth={1.5} />}
              label="Presence"
              value={data.quantum_metrics.presence}
              color="#10b981"
              delay={200}
            />
          </div>
        </div>
      )}

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50"
        style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.98) 60%, transparent)' }}>
        <button
          onClick={onBack}
          className="w-full py-3.5 rounded-[16px] font-semibold flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #1c1917, #292524)',
            color: 'white',
            boxShadow: '0 8px 24px rgba(28,25,23,0.2)',
          }}
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
      </div>
    </div>
  );
};

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  delay: number;
}

const MetricItem = ({ icon, label, value, color, delay }: MetricItemProps) => (
  <div
    className="flex flex-col items-center p-4 rounded-[18px] animate-scaleIn"
    style={{
      opacity: 0,
      animationDelay: `${delay}ms`,
      animationFillMode: 'forwards',
      background: 'rgba(120,113,108,0.03)',
      border: '1px solid rgba(120,113,108,0.05)',
    }}
  >
    <div className="mb-2.5" style={{ color }}>{icon}</div>
    <div className="relative w-12 h-12 flex items-center justify-center mb-1.5">
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="24" cy="24" r="18" strokeWidth="2.5" fill="none"
          style={{ stroke: 'rgba(120,113,108,0.08)' }} />
        <circle
          cx="24" cy="24" r="18"
          strokeWidth="2.5"
          fill="none"
          className="transition-all duration-1000"
          style={{
            stroke: color,
            strokeDasharray: '113',
            strokeDashoffset: `${113 - (value * 113)}`,
            strokeLinecap: 'round',
            filter: `drop-shadow(0 0 4px ${color}40)`,
          }}
        />
      </svg>
      <span className="text-[10px] font-semibold" style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
        {Math.round(value * 100)}
      </span>
    </div>
    <span className="text-[9px] uppercase tracking-[0.1em] text-center" style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
      {label}
    </span>
  </div>
);
