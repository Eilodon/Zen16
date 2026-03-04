import React, { useMemo, useEffect, useState } from 'react';
import { Activity, Eye, Heart, Brain, Zap, Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ZenResponse, QuantumMetrics, AwarenessStage } from '../types';

interface Props {
    data: ZenResponse | null;
    isConnected: boolean;
    isSpeaking: boolean;
}

const EMOTION_CONFIG: Record<string, { label: string; labelVi: string; color: string; icon: React.ReactNode }> = {
    anxious: { label: 'Anxious', labelVi: 'Lo âu', color: '#f59e0b', icon: <Activity size={13} strokeWidth={1.5} /> },
    stressed: { label: 'Stressed', labelVi: 'Căng thẳng', color: '#ef4444', icon: <Zap size={13} strokeWidth={1.5} /> },
    sad: { label: 'Sad', labelVi: 'Buồn', color: '#3b82f6', icon: <Heart size={13} strokeWidth={1.5} /> },
    confused: { label: 'Confused', labelVi: 'Bối rối', color: '#06b6d4', icon: <Brain size={13} strokeWidth={1.5} /> },
    lonely: { label: 'Lonely', labelVi: 'Cô đơn', color: '#6366f1', icon: <Heart size={13} strokeWidth={1.5} /> },
    seeking: { label: 'Seeking', labelVi: 'Tìm kiếm', color: '#8b5cf6', icon: <Eye size={13} strokeWidth={1.5} /> },
    neutral: { label: 'Neutral', labelVi: 'Bình thản', color: '#78716c', icon: <Minus size={13} strokeWidth={1.5} /> },
    calm: { label: 'Calm', labelVi: 'An bình', color: '#10b981', icon: <Shield size={13} strokeWidth={1.5} /> },
    joyful: { label: 'Joyful', labelVi: 'Hoan hỷ', color: '#f97316', icon: <Heart size={13} strokeWidth={1.5} /> },
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
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] w-16 text-right"
                style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
                {label}
            </span>
            <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(120,113,108,0.08)' }}>
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                        width: `${value * 100}%`,
                        background: `linear-gradient(90deg, ${color}90, ${color})`,
                        boxShadow: `0 0 8px ${color}30`,
                    }}
                />
            </div>
            <span className="text-[9px] font-mono tabular-nums w-6" style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
                {Math.round(value * 100)}
            </span>
        </div>
    );
}

function StageIndicator({ stage }: { stage: AwarenessStage }) {
    const config = STAGE_CONFIG[stage] || STAGE_CONFIG.reflexive;
    const stages = Object.entries(STAGE_CONFIG);

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
                {stages.map(([key, s], idx) => (
                    <React.Fragment key={key}>
                        <div
                            className="w-[7px] h-[7px] rounded-full transition-all duration-500"
                            style={{
                                backgroundColor: s.level <= config.level ? config.color : 'rgba(120,113,108,0.12)',
                                boxShadow: s.level <= config.level ? `0 0 6px ${config.color}40` : 'none',
                                transform: key === stage ? 'scale(1.5)' : 'scale(1)',
                            }}
                        />
                        {idx < stages.length - 1 && (
                            <div className="w-3 h-px transition-colors duration-500"
                                style={{ background: s.level < config.level ? `${config.color}40` : 'rgba(120,113,108,0.1)' }} />
                        )}
                    </React.Fragment>
                ))}
            </div>
            <span
                className="text-[9px] font-semibold ml-1 uppercase tracking-[0.12em]"
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
    const wellbeing = (qm.coherence + qm.presence + (1 - (data.confidence < 0.5 ? 0.3 : 0))) / 2;
    const trend = qm.presence > 0.7 ? 'up' : qm.presence < 0.4 ? 'down' : 'stable';

    return (
        <div
            className={`w-full max-w-[240px] rounded-[22px] p-3.5 zen-noise relative overflow-hidden transition-all duration-500 ${pulse ? 'scale-[1.02]' : 'scale-100'}`}
            style={{
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(24px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
                border: `1px solid ${emotionConfig.color}18`,
                boxShadow: `0 4px 24px ${emotionConfig.color}10, 0 1px 4px rgba(0,0,0,0.04)`,
            }}
        >
            <div className="relative z-10">
                {/* Header: Emotion + Trend */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
                            style={{
                                background: `${emotionConfig.color}10`,
                                color: emotionConfig.color,
                            }}
                        >
                            {emotionConfig.icon}
                        </div>
                        <span
                            className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                            style={{ color: emotionConfig.color }}
                        >
                            {emotionConfig.labelVi}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {trend === 'up' && <TrendingUp size={11} className="text-emerald-500" strokeWidth={2} />}
                        {trend === 'down' && <TrendingDown size={11} className="text-red-400" strokeWidth={2} />}
                        {trend === 'stable' && <Minus size={11} style={{ color: 'var(--zen-stone-light)' }} strokeWidth={2} />}
                    </div>
                </div>

                {/* Quantum Metrics */}
                <div className="space-y-1.5 mb-3">
                    <MetricBar label="Tỉnh giác" value={qm.coherence} color="#10b981" />
                    <MetricBar label="Tương tức" value={qm.entanglement} color="#6366f1" />
                    <MetricBar label="Hiện diện" value={qm.presence} color="#f97316" />
                </div>

                {/* Awareness Stage — connected journey */}
                <div className="pt-2.5" style={{ borderTop: '1px solid rgba(120,113,108,0.06)' }}>
                    <StageIndicator stage={data.awareness_stage || 'reflexive'} />
                </div>

                {/* Connection Status */}
                <div className="flex items-center justify-between mt-2.5 pt-2.5" style={{ borderTop: '1px solid rgba(120,113,108,0.06)' }}>
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-[5px] h-[5px] rounded-full transition-all duration-300"
                            style={{
                                background: isConnected ? isSpeaking ? '#f97316' : '#10b981' : '#d6d3d1',
                                boxShadow: isConnected ? `0 0 4px ${isSpeaking ? 'rgba(249,115,22,0.4)' : 'rgba(16,185,129,0.4)'}` : 'none',
                            }}
                        />
                        <span className="text-[8px] font-medium uppercase tracking-[0.15em]" style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
                            {isConnected ? isSpeaking ? 'Đang phản hồi' : 'Đang nghe' : 'Chưa kết nối'}
                        </span>
                    </div>
                    <span className="text-[8px] font-mono tabular-nums" style={{ color: 'var(--zen-stone-light, #a8a29e)', opacity: 0.6 }}>
                        {Math.round(wellbeing * 100)}%
                    </span>
                </div>
            </div>
        </div>
    );
};
