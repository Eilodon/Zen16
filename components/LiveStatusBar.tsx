import React, { useState, useEffect } from 'react';
import { WifiOff, Radio, Volume2, Mic, Eye } from 'lucide-react';
import { AppState, ConnectionState } from '../types';

interface Props {
    status: AppState;
    connectionState: ConnectionState;
    hasCamera: boolean;
    emotion?: string;
}

const EMOTION_EMOJI: Record<string, string> = {
    anxious: '😰', stressed: '😤', sad: '😢', confused: '🤔',
    lonely: '🥺', seeking: '🔍', neutral: '😌', calm: '🧘', joyful: '😊',
};

export const LiveStatusBar: React.FC<Props> = ({
    status,
    connectionState,
    hasCamera,
    emotion,
}) => {
    const [elapsed, setElapsed] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (status === 'idle') {
            setElapsed(0);
            setIsVisible(false);
            return;
        }
        setIsVisible(true);
        const start = Date.now();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [status === 'idle']);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (!isVisible) return null;

    const isConnected = connectionState === 'connected';
    const isReconnecting = connectionState === 'reconnecting';
    const isListening = status === 'listening';
    const isSpeaking = status === 'speaking';

    // Dynamic Island-inspired styling
    const getBarStyle = () => {
        if (isReconnecting) return {
            bg: 'rgba(251,191,36,0.1)',
            border: 'rgba(251,191,36,0.2)',
            glow: '0 2px 16px rgba(251,191,36,0.1)',
        };
        if (isSpeaking) return {
            bg: 'rgba(249,115,22,0.08)',
            border: 'rgba(249,115,22,0.15)',
            glow: '0 2px 16px rgba(249,115,22,0.08)',
        };
        return {
            bg: 'var(--glass-clear, rgba(255,255,255,0.72))',
            border: 'var(--glass-border, rgba(255,255,255,0.45))',
            glow: '0 2px 12px rgba(0,0,0,0.06)',
        };
    };

    const barStyle = getBarStyle();

    return (
        <div
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-full backdrop-blur-xl transition-all duration-500 animate-fadeInDown"
            style={{
                background: barStyle.bg,
                border: `1px solid ${barStyle.border}`,
                boxShadow: barStyle.glow,
            }}
        >
            {/* Connection dot */}
            <div className="relative">
                <div
                    className="w-[6px] h-[6px] rounded-full transition-colors duration-500"
                    style={{
                        background: isReconnecting ? '#f59e0b' : isConnected ? '#10b981' : '#d6d3d1',
                    }}
                />
                {isListening && (
                    <div className="absolute inset-[-2px] rounded-full animate-dot-breathe"
                        style={{ background: 'rgba(16,185,129,0.4)' }} />
                )}
                {isReconnecting && (
                    <div className="absolute inset-[-2px] rounded-full animate-pulse"
                        style={{ background: 'rgba(245,158,11,0.3)' }} />
                )}
            </div>

            {/* Status icon */}
            {isReconnecting && <WifiOff size={10} className="text-amber-600" />}
            {isListening && <Mic size={10} className="text-emerald-600" />}
            {isSpeaking && <Volume2 size={10} className="text-orange-600 animate-pulse" />}
            {status === 'processing' && <Radio size={10} className="text-stone-500 animate-spin-slow" />}

            {/* Status text */}
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
                {isReconnecting
                    ? 'Đang kết nối lại'
                    : isSpeaking
                        ? 'Đang phản hồi'
                        : isListening
                            ? 'Đang nghe'
                            : status === 'processing'
                                ? 'Đang suy ngẫm'
                                : 'Live'}
            </span>

            {/* Divider */}
            <div className="w-px h-3 rounded-full" style={{ background: 'rgba(120,113,108,0.15)' }} />

            {/* Emotion emoji */}
            {emotion && (
                <span className="text-[11px]" title={emotion}>
                    {EMOTION_EMOJI[emotion] || '🧘'}
                </span>
            )}

            {/* Camera indicator */}
            {hasCamera && (
                <Eye size={8} style={{ color: 'var(--zen-stone-light, #a8a29e)' }} />
            )}

            {/* Timer */}
            <span className="text-[9px] font-mono tabular-nums" style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
                {formatTime(elapsed)}
            </span>
        </div>
    );
};
