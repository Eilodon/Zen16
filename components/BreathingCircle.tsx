
import React, { useEffect, useState } from 'react';

interface Props {
  type: '4-7-8' | 'box-breathing' | 'coherent-breathing' | 'none' | null;
  isActive: boolean;
  onComplete?: () => void;
}

export const BreathingCircle: React.FC<Props> = ({ type, isActive, onComplete }) => {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');
  const [countdown, setCountdown] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);

  const timings = type === '4-7-8'
    ? { inhale: 4, hold: 7, exhale: 8, rest: 0 }
    : type === 'coherent-breathing'
      ? { inhale: 5, hold: 0, exhale: 5, rest: 0 }
      : { inhale: 4, hold: 4, exhale: 4, rest: 4 };

  useEffect(() => {
    if (!isActive || !type || type === 'none') {
      setPhase('inhale');
      setCycleCount(0);
      setCountdown(4);
      return;
    }

    setPhase('inhale');
    setCountdown(timings.inhale);
    setCycleCount(0);

    let currentPhase: typeof phase = 'inhale';

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          let nextPhase: typeof phase = 'inhale';

          if (currentPhase === 'inhale') {
            nextPhase = timings.hold > 0 ? 'hold' : 'exhale';
          } else if (currentPhase === 'hold') {
            nextPhase = 'exhale';
          } else if (currentPhase === 'exhale') {
            nextPhase = (timings.rest > 0) ? 'rest' : 'inhale';
            if (nextPhase === 'inhale') setCycleCount(c => c + 1);
          } else if (currentPhase === 'rest') {
            nextPhase = 'inhale';
            setCycleCount(c => c + 1);
          }

          currentPhase = nextPhase;
          setPhase(nextPhase);
          return timings[nextPhase];
        }
        return prev - 1;
      });
    }, 1000);

    const cycleDuration = (timings.inhale + timings.hold + timings.exhale + timings.rest);
    const totalDuration = cycleDuration * 3 * 1000;

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, totalDuration + 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimer);
    };
  }, [isActive, type]);

  if (!isActive || !type || type === 'none') return null;

  const getScale = () => {
    switch (phase) {
      case 'inhale': return 1.8;
      case 'hold': return 1.8;
      case 'exhale': return 1.0;
      default: return 1.0;
    }
  };

  const getTransitionDuration = () => {
    if (phase === 'inhale') return `${timings.inhale}s`;
    if (phase === 'exhale') return `${timings.exhale}s`;
    return '0.5s';
  };

  const phaseText: Record<string, string> = {
    inhale: 'Hít vào',
    hold: 'Giữ',
    exhale: 'Thở ra',
    rest: 'Nghỉ'
  };

  const phaseTextEn: Record<string, string> = {
    inhale: 'Inhale',
    hold: 'Hold',
    exhale: 'Exhale',
    rest: 'Rest'
  };

  const phaseColors: Record<string, { primary: string; glow: string }> = {
    inhale: { primary: '#06b6d4', glow: 'rgba(6,182,212,0.25)' },
    hold: { primary: '#8b5cf6', glow: 'rgba(139,92,246,0.25)' },
    exhale: { primary: '#10b981', glow: 'rgba(16,185,129,0.25)' },
    rest: { primary: '#78716c', glow: 'rgba(120,113,108,0.15)' }
  };

  const currentColor = phaseColors[phase];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center animate-fadeIn touch-none"
      style={{ background: 'rgba(10,9,8,0.88)', backdropFilter: 'blur(20px)' }}>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full animate-float"
            style={{
              background: currentColor.primary,
              opacity: 0.15 + Math.random() * 0.15,
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }} />
        ))}
      </div>

      {/* Progress */}
      <div className="absolute top-14 flex items-center gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full transition-all duration-500"
              style={{
                background: i <= cycleCount ? currentColor.primary : 'rgba(255,255,255,0.15)',
                boxShadow: i <= cycleCount ? `0 0 8px ${currentColor.glow}` : 'none',
              }} />
          </div>
        ))}
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] ml-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Chu kỳ {Math.min(cycleCount + 1, 3)} / 3
        </span>
      </div>

      {/* Main Breathing Circle — 3 concentric rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer glow ring */}
        <div className="absolute rounded-full transition-all ease-in-out"
          style={{
            width: 240, height: 240,
            transform: `scale(${getScale() * 1.15})`,
            transitionDuration: getTransitionDuration(),
            background: `radial-gradient(circle, ${currentColor.glow} 0%, transparent 70%)`,
          }} />

        {/* Middle ring */}
        <div className="absolute rounded-full transition-all ease-in-out"
          style={{
            width: 200, height: 200,
            transform: `scale(${getScale()})`,
            transitionDuration: getTransitionDuration(),
            border: `1px solid ${currentColor.primary}30`,
            background: `${currentColor.primary}08`,
          }} />

        {/* Core circle */}
        <div className="rounded-full flex items-center justify-center transition-all ease-in-out"
          style={{
            width: 160, height: 160,
            transform: `scale(${getScale()})`,
            transitionDuration: getTransitionDuration(),
            background: `radial-gradient(circle at 40% 35%, ${currentColor.primary}35 0%, ${currentColor.primary}15 60%, transparent 100%)`,
            border: `1.5px solid ${currentColor.primary}50`,
            boxShadow: `0 0 60px ${currentColor.glow}, inset 0 0 40px ${currentColor.glow}`,
          }}>
          <span className="text-white font-light text-6xl tabular-nums"
            style={{ fontFamily: 'var(--font-wisdom)', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            {countdown}
          </span>
        </div>
      </div>

      {/* Instruction */}
      <div className="mt-14 text-center">
        <p className="text-white text-2xl font-light tracking-[0.15em]"
          style={{ fontFamily: 'var(--font-wisdom)' }}>
          {phaseText[phase]}
        </p>
        <p className="text-white/30 text-xs mt-2 tracking-[0.2em] uppercase font-medium">
          {phaseTextEn[phase]}
        </p>
      </div>

      {/* Skip */}
      <button
        onClick={onComplete}
        className="absolute bottom-14 px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 touch-manipulation"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(8px)',
        }}
      >
        Bỏ qua
      </button>
    </div>
  );
};
