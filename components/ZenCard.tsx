
import React from 'react';
import { ZenResponse } from '../types';
import { MessageSquareQuote, Share2, Wind } from 'lucide-react';
import { useStreamingText, TOKENS, haptic, EMOTION_ACCENT } from '../utils/designSystem';
import { SecurityCue, FeedbackRow } from './PandoraParts';

interface Props {
  data: ZenResponse;
  isGenerating?: boolean;
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  reflexive: { color: '#ef4444', label: 'Phản xạ' },
  aware: { color: '#f59e0b', label: 'Nhận biết' },
  mindful: { color: '#10b981', label: 'Chánh niệm' },
  contemplative: { color: '#8b5cf6', label: 'Quán chiếu' }
};

export const ZenCard: React.FC<Props> = ({ data, isGenerating = false }) => {
  const { stream, isDone } = useStreamingText(data.wisdom_text, isGenerating);
  const emotionAccent = EMOTION_ACCENT[data.emotion] || '#78716c';
  const stage = STAGE_CONFIG[data.awareness_stage || 'reflexive'];

  const caret = (
    <span
      className="inline-block w-[3px] h-5 ml-1 align-middle rounded-full animate-pulse"
      style={{ background: emotionAccent, opacity: 0.8 }}
      aria-hidden="true"
    />
  );

  return (
    <div
      className="relative w-full transition-all duration-500 group rounded-[28px] md:rounded-[36px] flex flex-col zen-noise overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.82)',
        boxShadow: `0 8px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03), 0 0 0 1px rgba(255,255,255,0.6)`,
        backdropFilter: 'blur(28px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
      }}
    >
      {/* Top Bar: Emotion & Status */}
      <div className="flex flex-wrap items-center justify-between p-5 pb-3 gap-2 relative z-10 shrink-0"
        style={{ borderBottom: '1px solid rgba(120,113,108,0.06)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <SecurityCue mode="cloud" />

          {/* Emotion Pill with gradient dot */}
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{
              background: `${emotionAccent}10`,
              color: emotionAccent,
              border: `1px solid ${emotionAccent}20`,
            }}>
            <span className="w-1.5 h-1.5 rounded-full animate-dot-breathe" style={{ background: emotionAccent }} />
            {data.emotion}
          </span>

          {data.breathing && data.breathing !== 'none' && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{
                background: 'rgba(6,182,212,0.06)',
                color: '#0891b2',
                border: '1px solid rgba(6,182,212,0.12)',
              }}>
              <Wind size={8} className="animate-spin-slow" />
              Breath
            </span>
          )}
        </div>

        <button
          onClick={() => haptic('selection')}
          className="p-2 rounded-full transition-all duration-300 hover:scale-110"
          style={{ color: 'var(--zen-stone-light, #a8a29e)' }}
          title="Share"
        >
          <Share2 size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-8 relative z-10 flex-1 min-h-0 flex flex-col">
        <div className="relative flex-1 min-h-[100px]">
          {/* Quote watermark */}
          <MessageSquareQuote className="absolute -top-2 -left-2 pointer-events-none"
            style={{ width: 56, height: 56, color: `${emotionAccent}08` }} />

          {/* SCROLLABLE CONTENT AREA */}
          <div className="relative max-h-[55vh] overflow-y-auto custom-scrollbar pr-2">
            <div
              className="text-[19px] md:text-[23px] leading-[1.7] font-medium"
              style={{ fontFamily: 'var(--font-wisdom)', color: 'var(--zen-ink, #1c1917)' }}
            >
              {stream}
              {!isDone && caret}
            </div>

            {/* English Translation */}
            {isDone && data.wisdom_english && (
              <div className="mt-6 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                <p className="text-[13px] italic leading-relaxed"
                  style={{
                    fontFamily: 'var(--font-wisdom)',
                    color: 'var(--zen-stone, #78716c)',
                    opacity: 0.7,
                  }}>
                  "{data.wisdom_english}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Row (Only when done) */}
        {isDone && <FeedbackRow />}
      </div>

      {/* User Transcript */}
      <div className="p-4 shrink-0 rounded-b-[28px] md:rounded-b-[36px]"
        style={{
          background: 'rgba(245,240,235,0.5)',
          borderTop: '1px solid rgba(120,113,108,0.06)',
        }}>
        <div className="flex items-start gap-3" style={{ opacity: 0.65 }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 text-[7px] font-bold tracking-wider"
            style={{
              background: 'rgba(120,113,108,0.1)',
              color: 'var(--zen-stone, #78716c)',
            }}>
            YOU
          </div>
          <p className="text-xs leading-relaxed line-clamp-2 italic"
            style={{
              fontFamily: 'var(--font-wisdom)',
              color: 'var(--zen-stone, #78716c)',
            }}>
            "{data.user_transcript}"
          </p>
        </div>
      </div>

      {/* Shimmer Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 pointer-events-none z-0 rounded-[28px] md:rounded-[36px] overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 60%, transparent 100%)',
            }} />
        </div>
      )}
    </div>
  );
};
