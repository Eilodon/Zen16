import React, { useMemo, useEffect, useState } from 'react';
import { Activity, Eye, Heart, Brain, Zap, Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ZenResponse, QuantumMetrics, AwarenessStage } from '../types';

interface Props {
    data: ZenResponse | null;
    isConnected: boolean;
    isSpeaking: boolean;
}

const EMOTION_CONFIG: Record<string, { label: string; labelVi: string; color: string; bgGlow: string; icon: React.ReactNode }> = {
    anxious: { label: 'Anxious', labelVi: 'Lo âu', color: '#f59e0b', bgGlow: 'rgba(245,158,11,0.15)', icon: <Activity size={14} /> },
    stressed: { label: 'Stressed', labelVi: 'Căng thẳng', color: '#ef4444', bgGlow: 'rgba(239,68,68,0.15)', icon: <Zap size={14} /> },
    sad: { label: 'Sad', labelVi: 'Buồn', color: '#3b82f6', bgGlow: 'rgba(59,130,246,0.15)', icon: <Heart size={14} /> },
    confused: { label: 'Confused', labelVi: 'Bối rối', color: '#06b6d4', bgGlow: 'rgba(6,182,212,0.15)', icon: <Brain size={14} /> },
    lonely: { label: 'Lonely', labelVi: 'Cô đơn', color: '#6366f1', bgGlow: 'rgba(99,102,241,0.15)', icon: <Heart size={14} /> },
    seeking: { label: 'Seeking', labelVi: 'Tìm kiếm', color: '#8b5cf6', bgGlow: 'rgba(139,92,246,0.15)', icon: <Eye size={14} /> },
    neutral: { label: 'Neutral', labelVi: 'Bình thản', color: '#78716c', bgGlow: 'rgba(120,113,108,0.15)', icon: <Minus size={14} /> },
    calm: { label: 'Calm', labelVi: 'An bình', color: '#10b981', bgGlow: 'rgba(16,185,129,0.15)', icon: <Shield size={14} /> },
    joyful: { label: 'Joyful', labelVi: 'Hoan hỷ', color: '#f97316', bgGlow: 'rgba(249,115,22,0.15)', icon: <Heart size={14} /> },
};

const STAGE_CONFIG: Record<string, { label: string; level: number; color: string }> = {
    reflexive: { label: 'Phản xạ', level: 1, color: '#ef4444' },
    aware: { label: 'Nhận biết', level: 2, color: '#f59e0b' },
    mindful: { label: 'Chánh niệm', level: 3, color: '#10b981' },
    contemplative: { label: 'Quán chiếu', level: 4, color: '#8b5cf6' },
};

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 w-16 text-right">
                {label}
            </span>
            <div className="flex-1 h-1.5 bg-stone-200/50 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${value * 100}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-[9px] font-mono text-stone-400 w-6">
                {Math.round(value * 100)}
            </span>
        </div>
    );
}

function StageIndicator({ stage }: { stage: AwarenessStage }) {
    const config = STAGE_CONFIG[stage] || STAGE_CONFIG.reflexive;
    const stages = Object.entries(STAGE_CONFIG);

    return (
        <div className="flex items-center gap-1.5">
            {stages.map(([key, s]) => (
                <div key={key} className="flex flex-col items-center gap-0.5">
                    <div
                        className="w-2 h-2 rounded-full transition-all duration-500"
                        style={{
                            backgroundColor: s.level <= config.level ? config.color : '#e7e5e4',
                            boxShadow: s.level <= config.level ? `0 0 6px ${config.color}` : 'none',
                            transform: key === stage ? 'scale(1.4)' : 'scale(1)',
                        }}
                    />
                </div>
            ))}
            <span
                className="text-[9px] font-bold ml-1 uppercase tracking-wider"
                style={{ color: config.color }}
            >
                {config.label}
            </span>
        </div>
    );
}

export const StressIndicator: React.FC<Props> = ({ data, isConnected, isSpeaking }) => {
    const [pulse, setPulse] = useState(false);
    const [prevEmotion, setPrevEmotion] = useState<string>('');

    // Pulse animation when emotion changes
    useEffect(() => {
        if (data?.emotion && data.emotion !== prevEmotion) {
            setPulse(true);
            setPrevEmotion(data.emotion);
            const timer = setTimeout(() => setPulse(false), 600);
            return () => clearTimeout(timer);
        }
    }, [data?.emotion, prevEmotion]);

    if (!data) return null;

    const emotionConfig = EMOTION_CONFIG[data.emotion] || EMOTION_CONFIG.neutral;
    const qm = data.quantum_metrics || { coherence: 0, entanglement: 0, presence: 0 };

    // Compute overall wellbeing score
    const wellbeing = (qm.coherence + qm.presence + (1 - (data.confidence < 0.5 ? 0.3 : 0))) / 2;
    const trend = qm.presence > 0.7 ? 'up' : qm.presence < 0.4 ? 'down' : 'stable';

    return (
        <div
            className={`
        w-full max-w-[260px] rounded-[20px] p-3 backdrop-blur-xl
        border transition-all duration-500 
        ${pulse ? 'scale-[1.02]' : 'scale-100'}
      `}
            style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.7))`,
                borderColor: `${emotionConfig.color}30`,
                boxShadow: `0 4px 24px ${emotionConfig.bgGlow}, 0 1px 3px rgba(0,0,0,0.06)`,
            }}
        >
            {/* Header: Emotion + Trend */}
            <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                            backgroundColor: emotionConfig.bgGlow,
                            color: emotionConfig.color,
                        }}
                    >
                        {emotionConfig.icon}
                    </div>
                    <div>
                        <span
                            className="text-[11px] font-bold uppercase tracking-wide"
                            style={{ color: emotionConfig.color }}
                        >
                            {emotionConfig.labelVi}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {trend === 'up' && <TrendingUp size={12} className="text-emerald-500" />}
                    {trend === 'down' && <TrendingDown size={12} className="text-red-400" />}
                    {trend === 'stable' && <Minus size={12} className="text-stone-400" />}
                </div>
            </div>

            {/* Quantum Metrics */}
            <div className="space-y-1 mb-2.5">
                <MetricBar label="Tỉnh giác" value={qm.coherence} color="#10b981" />
                <MetricBar label="Tương tức" value={qm.entanglement} color="#6366f1" />
                <MetricBar label="Hiện diện" value={qm.presence} color="#f97316" />
            </div>

            {/* Awareness Stage */}
            <div className="pt-2 border-t border-stone-100/50">
                <StageIndicator stage={data.awareness_stage || 'reflexive'} />
            </div>

            {/* Connection Pulse */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100/50">
                <div className="flex items-center gap-1.5">
                    <div
                        className={`w-1.5 h-1.5 rounded-full ${isConnected
                                ? isSpeaking
                                    ? 'bg-orange-500 animate-pulse'
                                    : 'bg-emerald-500'
                                : 'bg-stone-300'
                            }`}
                    />
                    <span className="text-[8px] font-medium text-stone-400 uppercase tracking-widest">
                        {isConnected
                            ? isSpeaking
                                ? 'Thầy đang nói'
                                : 'Đang nghe'
                            : 'Chưa kết nối'}
                    </span>
                </div>
                <span className="text-[8px] font-mono text-stone-300">
                    {Math.round(wellbeing * 100)}%
                </span>
            </div>
        </div>
    );
};
