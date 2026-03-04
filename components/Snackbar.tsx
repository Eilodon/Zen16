
import React, { useEffect, useState } from 'react';
import { TOKENS } from '../utils/designSystem';
import { Check, AlertCircle, Info, X } from 'lucide-react';

interface SnackbarProps {
  kind?: "success" | "warn" | "error" | "info";
  text: string;
  onClose?: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ kind = "success", text, onClose }) => {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const SHOW_TIME = 4000;
    const t1 = setTimeout(() => setClosing(true), Math.max(0, SHOW_TIME - 300));
    const t2 = setTimeout(() => onClose?.(), SHOW_TIME);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  const configs: Record<string, { bg: string; border: string; text: string; iconBg: string; iconColor: string }> = {
    success: {
      bg: 'rgba(240,253,244,0.92)', border: 'rgba(16,185,129,0.2)',
      text: '#065f46', iconBg: 'rgba(16,185,129,0.1)', iconColor: '#10b981'
    },
    warn: {
      bg: 'rgba(255,251,235,0.92)', border: 'rgba(245,158,11,0.2)',
      text: '#78350f', iconBg: 'rgba(245,158,11,0.1)', iconColor: '#f59e0b'
    },
    error: {
      bg: 'rgba(254,242,242,0.92)', border: 'rgba(239,68,68,0.2)',
      text: '#7f1d1d', iconBg: 'rgba(239,68,68,0.1)', iconColor: '#ef4444'
    },
    info: {
      bg: 'rgba(255,255,255,0.92)', border: 'rgba(120,113,108,0.12)',
      text: '#1c1917', iconBg: 'rgba(120,113,108,0.06)', iconColor: '#78716c'
    },
  };

  const c = configs[kind] || configs.info;

  const icons: Record<string, React.ReactNode> = {
    success: <Check size={14} strokeWidth={2.5} />,
    warn: <AlertCircle size={14} strokeWidth={2} />,
    error: <AlertCircle size={14} strokeWidth={2} />,
    info: <Info size={14} strokeWidth={2} />,
  };

  return (
    <>
      <style>{`
        @keyframes snackIn {
          from { opacity: 0; transform: translate(-50%, 16px) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes snackOut {
          from { opacity: 1; transform: translate(-50%, 0) scale(1); }
          to { opacity: 0; transform: translate(-50%, 8px) scale(0.96); }
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        className="fixed left-1/2 bottom-24 z-[100] min-w-[280px] max-w-[90vw] rounded-[14px] px-4 py-3 flex items-center justify-between gap-3"
        style={{
          transform: 'translateX(-50%)',
          background: c.bg,
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          border: `1px solid ${c.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
          color: c.text,
          animation: `${closing ? 'snackOut' : 'snackIn'} ${closing ? 200 : 400}ms ${closing ? 'var(--ease-in-out)' : 'var(--ease-spring)'} forwards`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-full" style={{ background: c.iconBg, color: c.iconColor }}>
            {icons[kind]}
          </div>
          <span className="text-[13px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>{text}</span>
        </div>
        <button onClick={() => setClosing(true)} className="p-1 rounded-full transition-opacity" style={{ opacity: 0.35 }}>
          <X size={13} />
        </button>
      </div>
    </>
  );
};
