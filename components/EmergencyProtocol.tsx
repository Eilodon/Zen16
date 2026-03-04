import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AlertCircle, Phone, HeartHandshake } from 'lucide-react';
import { playEmergencyAlert } from '../services/emergencyAudio';
import { useUIStore } from '../store/zenStore';

interface Props {
  isActive: boolean;
  onComplete: () => void;
}

export const EmergencyProtocol: React.FC<Props> = ({ isActive, onComplete }) => {
  const [phase, setPhase] = useState<'alert' | 'breathing' | 'resources'>('alert');
  const [breathCount, setBreathCount] = useState(4);
  const language = useUIStore((state) => state.language);

  const alertTimerRef = useRef<number | null>(null);
  const resourceTimerRef = useRef<number | null>(null);
  const breathingIntervalRef = useRef<number | null>(null);

  const copy = useMemo(() => (language === 'vi'
    ? {
      alertTitle: 'Bạn không một mình',
      alertSubtitle: 'Cảm xúc này sẽ qua. Hãy cùng thở nhé...',
      in: 'HÍT VÀO',
      hold: 'GIỮ',
      out: 'THỞ RA',
      safe: 'Tập trung vào lồng ngực. Bạn đang an toàn.',
      better: 'Tôi đã đỡ hơn',
      resourceTitle: 'Bạn đã làm rất tốt',
      resourceDescription: 'Cơn bão cảm xúc đang đi qua. Nếu bạn vẫn cảm thấy bế tắc, hãy chia sẻ với chuyên gia:',
      hotline: 'Tổng đài tâm lý 24/7',
      hotlineDesc: 'Hỗ trợ khủng hoảng (VN)',
      back: 'Quay lại trò chuyện',
      disclaimer: 'Zen16 là công cụ hỗ trợ tinh thần, không thay thế chuyên gia y tế.',
    }
    : {
      alertTitle: 'You are not alone',
      alertSubtitle: 'This feeling will pass. Let us breathe together...',
      in: 'INHALE',
      hold: 'HOLD',
      out: 'EXHALE',
      safe: 'Focus on your chest. You are safe right now.',
      better: 'I feel better',
      resourceTitle: 'You are doing well',
      resourceDescription: 'The emotional storm is passing. If you still feel overwhelmed, please contact a professional:',
      hotline: '24/7 Mental Health Hotline',
      hotlineDesc: 'Crisis support (Vietnam)',
      back: 'Back to conversation',
      disclaimer: 'Zen16 is a wellbeing support tool, not a replacement for medical care.',
    }), [language]);

  const [instruction, setInstruction] = useState(copy.in);

  useEffect(() => {
    setInstruction(copy.in);
  }, [copy.in, isActive]);

  useEffect(() => {
    if (!isActive) {
      setPhase('alert');
      return;
    }

    if (phase === 'alert') {
      playEmergencyAlert();
      alertTimerRef.current = window.setTimeout(() => setPhase('breathing'), 3000);
    }

    if (phase === 'breathing') {
      let counter = 4;
      let cycleState: 'in' | 'hold' | 'out' = 'in';

      const runBreathing = () => {
        if (counter <= 1) {
          if (cycleState === 'in') {
            cycleState = 'hold';
            counter = 4;
            setInstruction(copy.hold);
          } else if (cycleState === 'hold') {
            cycleState = 'out';
            counter = 4;
            setInstruction(copy.out);
          } else {
            cycleState = 'in';
            counter = 4;
            setInstruction(copy.in);
          }
        } else {
          counter--;
        }
        setBreathCount(counter);
      };

      breathingIntervalRef.current = window.setInterval(runBreathing, 1000);
      resourceTimerRef.current = window.setTimeout(() => setPhase('resources'), 45000);
    }

    return () => {
      if (alertTimerRef.current !== null) clearTimeout(alertTimerRef.current);
      if (resourceTimerRef.current !== null) clearTimeout(resourceTimerRef.current);
      if (breathingIntervalRef.current !== null) clearInterval(breathingIntervalRef.current);
    };
  }, [isActive, phase, copy]);

  if (!isActive) return null;

  if (phase === 'alert') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center text-white p-8 animate-fadeIn"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(127,29,29,0.95) 0%, rgba(69,10,10,0.98) 100%)', backdropFilter: 'blur(20px)' }}>
        <div className="p-8 rounded-full mb-8 animate-breathe"
          style={{ background: 'rgba(255,255,255,0.08)', boxShadow: '0 0 60px rgba(239,68,68,0.3)' }}>
          <AlertCircle className="w-16 h-16 text-white/90" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl md:text-4xl font-medium mb-4 text-center tracking-tight"
          style={{ fontFamily: 'var(--font-wisdom)' }}>
          {copy.alertTitle}
        </h1>
        <p className="text-center text-base text-white/85">{copy.alertSubtitle}</p>
      </div>
    );
  }

  if (phase === 'breathing') {
    const isInhale = instruction === copy.in;
    const isHold = instruction === copy.hold;

    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center text-white p-8 transition-all duration-1000"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(30,27,75,0.95) 0%, rgba(15,23,42,0.98) 100%)' }}>

        <div className="relative">
          <div className="absolute inset-[-40px] rounded-full transition-all duration-1000"
            style={{
              background: `radial-gradient(circle, ${isInhale ? 'rgba(6,182,212,0.12)' : isHold ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.12)'} 0%, transparent 70%)`,
              transform: `scale(${isInhale || isHold ? 1.2 : 0.9})`,
            }} />

          <div className="w-56 h-56 rounded-full flex items-center justify-center transition-all duration-1000"
            style={{
              border: `1.5px solid ${isInhale ? 'rgba(6,182,212,0.5)' : isHold ? 'rgba(139,92,246,0.5)' : 'rgba(16,185,129,0.5)'}`,
              background: `radial-gradient(circle at 40% 35%, ${isInhale ? 'rgba(6,182,212,0.15)' : isHold ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)'} 0%, transparent 70%)`,
              transform: `scale(${isInhale || isHold ? 1.1 : 1.0})`,
              boxShadow: `0 0 80px ${isInhale ? 'rgba(6,182,212,0.15)' : isHold ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)'}`,
            }}>
            <span className="text-7xl font-light tabular-nums" style={{ fontFamily: 'var(--font-wisdom)', textShadow: '0 2px 16px rgba(0,0,0,0.3)' }}>
              {breathCount}
            </span>
          </div>
        </div>

        <p className="text-2xl font-light mt-12 mb-4 tracking-[0.15em]"
          style={{ fontFamily: 'var(--font-wisdom)' }}>
          {instruction}
        </p>

        <p className="text-sm font-light mt-6 max-w-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {copy.safe}
        </p>

        <button
          onClick={() => setPhase('resources')}
          className="absolute bottom-10 px-6 py-3 rounded-full font-medium transition-all duration-300"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {copy.better}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center text-white p-8 animate-fadeIn"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(6,78,59,0.95) 0%, rgba(2,44,34,0.98) 100%)' }}>

      <HeartHandshake className="w-14 h-14 mb-6" style={{ color: 'rgba(167,243,208,0.7)' }} strokeWidth={1.5} />

      <h2 className="text-2xl md:text-3xl font-medium mb-5 text-center"
        style={{ fontFamily: 'var(--font-wisdom)' }}>
        {copy.resourceTitle}
      </h2>

      <p className="text-base mb-8 text-center max-w-md leading-relaxed font-light" style={{ color: 'rgba(167,243,208,0.6)' }}>
        {copy.resourceDescription}
      </p>

      <div className="rounded-[24px] p-6 mb-4 w-full max-w-sm"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(16,185,129,0.15)',
          backdropFilter: 'blur(12px)',
        }}>
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 rounded-full" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <Phone className="w-5 h-5" style={{ color: 'rgba(167,243,208,0.8)' }} />
          </div>
          <div>
            <span className="font-semibold text-base block">{copy.hotline}</span>
            <span className="text-xs" style={{ color: 'rgba(167,243,208,0.5)' }}>{copy.hotlineDesc}</span>
          </div>
        </div>
        <a href="tel:19009095"
          className="block text-3xl font-bold text-white text-center py-3 rounded-[16px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{ fontFamily: 'var(--font-body)', background: 'rgba(16,185,129,0.1)' }}>
          1900 9095
        </a>
      </div>

      <p className="text-[11px] text-center max-w-sm mb-7" style={{ color: 'rgba(167,243,208,0.55)' }}>
        {copy.disclaimer}
      </p>

      <button
        onClick={onComplete}
        className="w-full max-w-xs px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 active:scale-[0.97]"
        style={{
          background: 'rgba(255,255,255,0.95)',
          color: '#064e3b',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {copy.back}
      </button>
    </div>
  );
};
