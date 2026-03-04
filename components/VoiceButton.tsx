
import React from 'react';
import { Mic, Volume2, Sparkles, Radio } from 'lucide-react';
import { AppState } from '../types';
import { haptic, TOKENS } from '../utils/designSystem';

interface Props {
  state: AppState;
  onClick: () => void;
}

export const VoiceButton: React.FC<Props> = ({ state, onClick }) => {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isProcessing = state === 'processing';
  const isIdle = state === 'idle';

  const handleClick = () => {
    if (isListening) haptic('warn');
    else haptic('success');
    onClick();
  };

  return (
    <div className="relative flex items-center justify-center group touch-manipulation" style={{ transform: 'scale(1.1)' }}>

      {/* Outer Ripple Rings (Listening) */}
      {isListening && (
        <>
          <div className="absolute inset-[-8px] rounded-full animate-pulse-ring"
            style={{ border: '1.5px solid rgba(239, 68, 68, 0.25)' }} />
          <div className="absolute inset-[-20px] rounded-full animate-pulse-ring"
            style={{ border: '1px solid rgba(239, 68, 68, 0.15)', animationDelay: '0.5s' }} />
          <div className="absolute inset-[-32px] rounded-full animate-pulse-ring"
            style={{ border: '1px solid rgba(239, 68, 68, 0.08)', animationDelay: '1s' }} />
        </>
      )}

      {/* Ambient Glow (Speaking) */}
      {isSpeaking && (
        <div className="absolute inset-[-12px] rounded-full animate-breathe"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)' }} />
      )}

      {/* Gradient Glow Ring (Idle) */}
      {isIdle && (
        <div className="absolute inset-[-3px] rounded-full animate-gentle-spin opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'conic-gradient(from 0deg, #f97316, #ea580c, #f97316, transparent, #f97316)' }}>
          <div className="absolute inset-[1.5px] rounded-full" style={{ background: 'var(--zen-parchment, #faf8f5)' }} />
        </div>
      )}

      {/* Main Button */}
      <button
        onClick={handleClick}
        className="relative z-10 w-[72px] h-[72px] md:w-[84px] md:h-[84px] rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/50"
        style={{
          background: isListening
            ? 'rgba(254,226,226,0.9)'
            : isProcessing
              ? 'rgba(245,245,244,0.9)'
              : 'linear-gradient(145deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
          color: isListening ? '#ef4444' : isProcessing ? '#78716c' : '#ffffff',
          boxShadow: isIdle
            ? '0 8px 32px rgba(249,115,22,0.3), 0 2px 8px rgba(249,115,22,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
            : isListening
              ? '0 4px 16px rgba(239,68,68,0.2)'
              : '0 4px 12px rgba(0,0,0,0.08)',
          border: isListening ? '1.5px solid rgba(239,68,68,0.15)' : 'none',
          backdropFilter: isProcessing ? 'blur(12px)' : 'none',
        }}
        aria-label={isListening ? "Dừng nghe" : "Bắt đầu"}
      >
        {isIdle && <Mic size={30} strokeWidth={1.5} />}

        {isListening && (
          <div className="flex items-center justify-center">
            <Radio className="animate-pulse" size={30} strokeWidth={1.5} />
          </div>
        )}

        {isProcessing && <Sparkles size={26} className="animate-spin-slow" strokeWidth={1.5} />}

        {isSpeaking && <Volume2 size={30} className="animate-pulse" strokeWidth={1.5} />}
      </button>

      {/* Label Capsule */}
      <div className={`
        absolute -bottom-11 px-4 py-1.5 rounded-full backdrop-blur-xl
        text-[11px] font-medium tracking-wide transition-all duration-500
        ${isIdle ? 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0' : 'opacity-100 translate-y-0'}
      `}
        style={{
          background: 'var(--glass-frosted, rgba(255,255,255,0.55))',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.45))',
          color: 'var(--zen-stone-dark, #57534e)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          transitionTimingFunction: 'var(--ease-spring)',
        }}>
        {isListening ? 'Đang nghe...' : isSpeaking ? 'Đang phản hồi' : isProcessing ? 'Đang suy ngẫm' : 'Chạm để nói'}
      </div>
    </div>
  );
};
