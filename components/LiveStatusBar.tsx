import React, { useState, useEffect, useMemo } from 'react';
import { Wifi, WifiOff, Radio, Volume2, Mic, Eye } from 'lucide-react';
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

    // Start timer when connected
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

    return (
        <div
            className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl
        border transition-all duration-500 animate-[fadeIn_0.3s_ease-out]
      `}
            style={{
                background: isReconnecting
                    ? 'rgba(251,191,36,0.12)'
                    : isSpeaking
                        ? 'rgba(249,115,22,0.12)'
                        : 'rgba(255,255,255,0.7)',
                borderColor: isReconnecting
                    ? 'rgba(251,191,36,0.3)'
                    : isSpeaking
                        ? 'rgba(249,115,22,0.2)'
                        : 'rgba(255,255,255,0.5)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
        >
            {/* Connection dot */}
            <div className="relative">
                <div
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${isReconnecting
                            ? 'bg-amber-500 animate-pulse'
                            : isConnected
                                ? 'bg-emerald-500'
                                : 'bg-stone-300'
                        }`}
                />
                {isListening && (
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
            </div>

            {/* Status icon */}
            {isReconnecting && <WifiOff size={10} className="text-amber-600" />}
            {isListening && <Mic size={10} className="text-emerald-600" />}
            {isSpeaking && <Volume2 size={10} className="text-orange-600 animate-pulse" />}
            {status === 'processing' && <Radio size={10} className="text-stone-500 animate-spin" />}

            {/* Status text */}
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
                {isReconnecting
                    ? 'Đang kết nối lại'
                    : isSpeaking
                        ? 'Thầy đang nói'
                        : isListening
                            ? 'Đang nghe'
                            : status === 'processing'
                                ? 'Đang suy ngẫm'
                                : 'Live'}
            </span>

            {/* Emotion emoji */}
            {emotion && (
                <span className="text-xs" title={emotion}>
                    {EMOTION_EMOJI[emotion] || '🧘'}
                </span>
            )}

            {/* Camera indicator */}
            {hasCamera && (
                <Eye size={8} className="text-stone-400" />
            )}

            {/* Timer */}
            <span className="text-[9px] font-mono text-stone-400 tabular-nums">
                {formatTime(elapsed)}
            </span>
        </div>
    );
};
