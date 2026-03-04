import React, { useState, useMemo } from 'react';
import { History, TrendingUp, X, Trash2, Fingerprint, Map } from 'lucide-react';
import { ConversationEntry, ConsciousnessArchetype } from '../types';
import { dbService } from '../services/db';

interface Props {
  history: ConversationEntry[];
  onClear: () => void;
}

export const HistoryPanel: React.FC<Props> = ({ history, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);

  const analysis = useMemo(() => {
    if (history.length === 0) return null;

    const displayData = history;

    const safeMetric = (entry: ConversationEntry, key: 'coherence' | 'presence' | 'entanglement') => {
      return entry.quantum_metrics ? entry.quantum_metrics[key] : 0;
    };

    const avgCoherence = displayData.reduce((sum, e) => sum + safeMetric(e, 'coherence'), 0) / (displayData.length || 1);
    const avgPresence = displayData.reduce((sum, e) => sum + safeMetric(e, 'presence'), 0) / (displayData.length || 1);
    const avgEntanglement = displayData.reduce((sum, e) => sum + safeMetric(e, 'entanglement'), 0) / (displayData.length || 1);

    let archetype: ConsciousnessArchetype = 'The Seeker';
    let description = "Bạn đang trên hành trình tìm kiếm sự bình an.";

    if (avgPresence > 0.7 && avgCoherence > 0.7) {
      archetype = 'The Warrior';
      description = "Bạn có khả năng định tâm vững chãi như núi.";
    } else if (avgEntanglement > 0.7) {
      archetype = 'The Healer';
      description = "Trái tim bạn rộng mở và kết nối sâu sắc với vạn vật.";
    } else if (avgCoherence > 0.8) {
      archetype = 'The Observer';
      description = "Bạn nhìn thấu bản chất vấn đề với sự tĩnh lặng.";
    }

    return {
      displayData,
      avgCoherence,
      avgPresence,
      avgEntanglement,
      archetype,
      description
    };
  }, [history]);

  if (!analysis) return null;

  const { displayData, avgCoherence, avgPresence, avgEntanglement, archetype, description } = analysis;

  const emotionAccent: Record<string, string> = {
    anxious: '#f59e0b', sad: '#3b82f6', joyful: '#f97316',
    calm: '#10b981', neutral: '#78716c', stressed: '#ef4444',
    confused: '#06b6d4', lonely: '#6366f1', seeking: '#8b5cf6',
  };

  const handleClear = async () => {
    if (window.confirm('Xóa toàn bộ lịch sử? (Không thể hoàn tác)')) {
      await dbService.clearAll();
      onClear();
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          background: 'var(--glass-frosted, rgba(255,255,255,0.55))',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.45))',
          color: 'var(--zen-stone-dark, #57534e)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
        aria-label="View history"
      >
        {isOpen ? <Map size={17} strokeWidth={1.5} /> : <History size={17} strokeWidth={1.5} />}
      </button>

      {isOpen && (
        <div className="absolute top-20 right-4 z-50 w-80 max-h-[70vh] flex flex-col rounded-[22px] overflow-hidden animate-scaleIn"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(32px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}>
          {/* Header */}
          <div className="p-4 flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, #1c1917, #292524)',
              borderRadius: '22px 22px 0 0',
            }}>
            <div className="flex items-center gap-2.5">
              <Fingerprint size={16} style={{ color: '#f97316' }} strokeWidth={1.5} />
              <h3 className="font-semibold text-[11px] tracking-[0.14em] uppercase text-stone-200">Consciousness DNA</h3>
            </div>
            <button onClick={() => setIsOpen(false)}
              className="p-1 rounded-full transition-colors hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <X size={16} />
            </button>
          </div>

          {/* DNA Profile */}
          <div className="p-5" style={{ borderBottom: '1px solid rgba(120,113,108,0.06)' }}>
            <div className="text-center mb-4">
              <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'var(--zen-stone-light)' }}>Your Archetype</span>
              <h4 className="text-xl font-medium mt-1.5" style={{ fontFamily: 'var(--font-wisdom)', color: 'var(--zen-ink)' }}>
                {archetype}
              </h4>
              <p className="text-[11px] italic mt-1" style={{ fontFamily: 'var(--font-wisdom)', color: 'var(--zen-stone)' }}>
                {description}
              </p>
            </div>

            <div className="space-y-2 mt-4">
              <DnaBar label="Presence" value={avgPresence} color="#10b981" />
              <DnaBar label="Connection" value={avgEntanglement} color="#8b5cf6" />
              <DnaBar label="Clarity" value={avgCoherence} color="#3b82f6" />
            </div>
          </div>

          {/* History list */}
          <div className="overflow-y-auto p-4 space-y-2 flex-1 custom-scrollbar">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={11} style={{ color: 'var(--zen-stone-light)' }} strokeWidth={1.5} />
              <span className="text-[9px] uppercase font-semibold tracking-[0.14em]" style={{ color: 'var(--zen-stone-light)' }}>
                Journey Log
              </span>
            </div>

            {[...displayData].reverse().map((entry) => {
              const date = new Date(entry.timestamp);
              const isToday = date.toDateString() === new Date().toDateString();
              const timeStr = isToday
                ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });

              const accent = emotionAccent[entry.emotion] || '#78716c';

              return (
                <div key={entry.id}
                  className="rounded-[12px] p-3 transition-all duration-300 hover:scale-[1.01]"
                  style={{
                    borderLeft: `3px solid ${accent}`,
                    background: `${accent}05`,
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: accent }}>
                      {entry.emotion}
                    </span>
                    <span className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--zen-stone-light)' }}>
                      {timeStr}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[9px] font-medium" style={{ opacity: 0.6 }}>
                    <span style={{ color: '#3b82f6' }}>C: {Math.round((entry.quantum_metrics?.coherence || 0) * 100)}</span>
                    <span style={{ color: '#8b5cf6' }}>E: {Math.round((entry.quantum_metrics?.entanglement || 0) * 100)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clear button */}
          <div className="p-3" style={{ borderTop: '1px solid rgba(120,113,108,0.06)' }}>
            <button
              onClick={handleClear}
              className="w-full py-2 text-[11px] font-medium rounded-[10px] transition-all duration-300 flex items-center justify-center gap-2"
              style={{ color: 'var(--zen-stone-light)', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--zen-stone-light)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Trash2 size={13} /> Xóa lịch sử
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const DnaBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-[9px] font-semibold w-16 text-right uppercase tracking-[0.1em]" style={{ color: 'var(--zen-stone-light)' }}>
      {label}
    </span>
    <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(120,113,108,0.06)' }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${value * 100}%`,
          background: `linear-gradient(90deg, ${color}90, ${color})`,
          boxShadow: `0 0 6px ${color}25`,
        }}
      />
    </div>
  </div>
);