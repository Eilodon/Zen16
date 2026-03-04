
import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { haptic } from '../utils/designSystem';

// --- 1. SecurityCue ---
interface SecurityCueProps {
  mode: 'on-device' | 'hybrid' | 'cloud';
}
export const SecurityCue: React.FC<SecurityCueProps> = ({ mode }) => {
  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    'on-device': { bg: 'rgba(16,185,129,0.06)', text: '#059669', border: 'rgba(16,185,129,0.15)', label: 'Riêng tư' },
    'hybrid': { bg: 'rgba(59,130,246,0.06)', text: '#2563eb', border: 'rgba(59,130,246,0.15)', label: 'Bảo mật lai' },
    'cloud': { bg: 'rgba(120,113,108,0.04)', text: '#78716c', border: 'rgba(120,113,108,0.1)', label: 'Mã hóa' },
  };
  const c = config[mode] || config['cloud'];

  return (
    <div className="flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[9px] font-semibold uppercase tracking-[0.12em]"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      <ShieldCheck size={9} strokeWidth={2} />
      <span>{c.label}</span>
    </div>
  );
};

// --- 2. FeedbackRow ---
export const FeedbackRow: React.FC = () => {
  const [status, setStatus] = useState<'none' | 'up' | 'down'>('none');

  const handleFeedback = (type: 'up' | 'down') => {
    setStatus(type);
    haptic('selection');
  };

  return (
    <div className="flex items-center gap-2 mt-6 pt-4 animate-fadeIn"
      style={{ borderTop: '1px solid rgba(120,113,108,0.06)' }}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] mr-2"
        style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
        Hữu ích?
      </span>
      <button
        onClick={() => handleFeedback('up')}
        className="p-2 rounded-full transition-all duration-300"
        style={{
          background: status === 'up' ? 'rgba(16,185,129,0.08)' : 'transparent',
          color: status === 'up' ? '#10b981' : '#d6d3d1',
        }}
      >
        <ThumbsUp size={15} strokeWidth={1.5} />
      </button>
      <button
        onClick={() => handleFeedback('down')}
        className="p-2 rounded-full transition-all duration-300"
        style={{
          background: status === 'down' ? 'rgba(120,113,108,0.08)' : 'transparent',
          color: status === 'down' ? '#57534e' : '#d6d3d1',
        }}
      >
        <ThumbsDown size={15} strokeWidth={1.5} />
      </button>
    </div>
  );
};

// --- 3. BottomSheet ---
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, title, children }) => {
  const [isRendered, setIsRendered] = useState(open);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef<number>(0);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => setTranslateY(0));
    } else {
      document.body.style.overflow = '';
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setTranslateY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (translateY > 100) {
      onClose();
      setTranslateY(0);
    } else {
      setTranslateY(0);
    }
  };

  if (!isRendered) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(10,9,8,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col max-h-[85vh] transition-transform duration-300"
        style={{
          transform: open ? `translateY(${translateY}px)` : 'translateY(100%)',
          transitionTimingFunction: 'var(--ease-smooth)',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(32px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -10px 48px rgba(0,0,0,0.12)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="w-full pt-4 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(120,113,108,0.15)' }} />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 flex justify-between items-center shrink-0"
          style={{ borderBottom: '1px solid rgba(120,113,108,0.06)' }}>
          <h3 className="font-medium text-lg tracking-tight" style={{ fontFamily: 'var(--font-wisdom)', color: 'var(--zen-ink)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-all duration-200"
            style={{ background: 'rgba(120,113,108,0.05)', color: 'var(--zen-stone)' }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-12 overscroll-contain custom-scrollbar">
          {children}
        </div>
      </div>
    </>
  );
};
