
import React, { useState, useEffect } from 'react';
import { ArrowRight, Mic, Camera, Check, Shield } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

interface Props {
  onComplete?: () => void;
  onStartInteraction?: () => Promise<void>;
}

// ── Animated Lotus SVG ──
const LotusIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Center petal */}
    <path d="M60 20 C50 45, 50 70, 60 95 C70 70, 70 45, 60 20Z"
      fill="url(#saffronGrad)" opacity="0.9" className="origin-bottom animate-[scaleIn_1s_ease-out_0.2s_both]" />
    {/* Left petals */}
    <path d="M60 35 C40 30, 20 50, 25 75 C35 60, 50 50, 60 45Z"
      fill="url(#saffronGrad)" opacity="0.7" className="origin-bottom-right animate-[scaleIn_1s_ease-out_0.4s_both]" />
    <path d="M60 45 C45 35, 15 45, 15 65 C30 55, 48 48, 60 50Z"
      fill="url(#saffronGrad)" opacity="0.5" className="origin-right animate-[scaleIn_1s_ease-out_0.6s_both]" />
    {/* Right petals */}
    <path d="M60 35 C80 30, 100 50, 95 75 C85 60, 70 50, 60 45Z"
      fill="url(#saffronGrad)" opacity="0.7" className="origin-bottom-left animate-[scaleIn_1s_ease-out_0.4s_both]" />
    <path d="M60 45 C75 35, 105 45, 105 65 C90 55, 72 48, 60 50Z"
      fill="url(#saffronGrad)" opacity="0.5" className="origin-left animate-[scaleIn_1s_ease-out_0.6s_both]" />
    <defs>
      <linearGradient id="saffronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>
  </svg>
);

export const LoadingScreen: React.FC<Props> = ({ onComplete }) => {
  const { requestMediaAccess } = usePermissions();

  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useMic, setUseMic] = useState(true);
  const [useCam, setUseCam] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsReady(true);
          return 100;
        }
        return prev + 2;
      });
    }, 25);

    return () => clearInterval(interval);
  }, []);

  const handleEnter = async () => {
    setIsProcessing(true);
    await requestMediaAccess(useMic, useCam);
    setIsFading(true);
    setTimeout(() => {
      onComplete?.();
    }, 800);
  };

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center transition-all duration-[800ms] ${isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, rgba(254, 215, 170, 0.25) 0%, var(--zen-parchment, #faf8f5) 60%, var(--zen-cream, #f5f0eb) 100%)',
      }}
    >
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />

      {/* Brand */}
      <div className={`flex flex-col items-center transition-all duration-700 ${isReady ? '-translate-y-6' : 'translate-y-0'}`}
        style={{ transitionTimingFunction: 'var(--ease-spring)' }}>

        {/* Lotus */}
        <div className="w-24 h-24 mb-6 animate-float">
          <LotusIcon className="w-full h-full drop-shadow-lg" />
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl font-semibold tracking-tight animate-fadeIn"
          style={{ fontFamily: 'var(--font-wisdom)', color: 'var(--zen-ink, #1c1917)' }}>
          Zen16
        </h1>
        <p className="text-sm mt-2 font-light tracking-wider uppercase animate-fadeIn delay-2"
          style={{ color: 'var(--zen-stone, #78716c)', letterSpacing: '0.15em' }}>
          Đồng hành tỉnh thức
        </p>
      </div>

      {/* PHASE 1: Loading Bar */}
      {!isReady && (
        <div className="mt-12 w-56 animate-fadeIn">
          <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'var(--zen-stone-light, #a8a29e)', opacity: 0.3 }}>
            <div
              className="h-full rounded-full transition-all duration-100 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #f97316, #ea580c)',
              }}
            />
          </div>
          <p className="text-center mt-4 text-[10px] uppercase tracking-[0.2em] animate-breathe"
            style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
            Đang chuẩn bị không gian tĩnh lặng...
          </p>
        </div>
      )}

      {/* PHASE 2: Setup Panel */}
      {isReady && (
        <div className="mt-8 w-full max-w-sm px-6 animate-slideUp">
          <div className="zen-glass-elevated relative zen-noise rounded-[28px] p-6"
            style={{ background: 'rgba(255,255,255,0.88)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6" style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
                <Shield size={12} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Thiết lập kết nối</span>
              </div>

              <div className="space-y-3">
                {/* Mic Toggle */}
                <div
                  onClick={() => setUseMic(!useMic)}
                  className="flex items-center justify-between p-4 rounded-[20px] transition-all duration-300 cursor-pointer active:scale-[0.97]"
                  style={{
                    background: useMic ? 'rgba(249,115,22,0.06)' : 'rgba(120,113,108,0.05)',
                    border: `1px solid ${useMic ? 'rgba(249,115,22,0.2)' : 'rgba(120,113,108,0.1)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full transition-all duration-300"
                      style={{
                        background: useMic ? 'rgba(249,115,22,0.1)' : 'rgba(120,113,108,0.08)',
                        color: useMic ? '#ea580c' : '#a8a29e',
                      }}>
                      <Mic size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: useMic ? 'var(--zen-ink)' : 'var(--zen-stone)' }}>Giọng nói</h3>
                      <p className="text-[10px]" style={{ color: 'var(--zen-stone-light)' }}>Để trò chuyện</p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: useMic ? '#ea580c' : 'transparent',
                      border: `2px solid ${useMic ? '#ea580c' : '#d6d3d1'}`,
                    }}>
                    {useMic && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                </div>

                {/* Camera Toggle */}
                <div
                  onClick={() => setUseCam(!useCam)}
                  className="flex items-center justify-between p-4 rounded-[20px] transition-all duration-300 cursor-pointer active:scale-[0.97]"
                  style={{
                    background: useCam ? 'rgba(249,115,22,0.06)' : 'rgba(120,113,108,0.05)',
                    border: `1px solid ${useCam ? 'rgba(249,115,22,0.2)' : 'rgba(120,113,108,0.1)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full transition-all duration-300"
                      style={{
                        background: useCam ? 'rgba(249,115,22,0.1)' : 'rgba(120,113,108,0.08)',
                        color: useCam ? '#ea580c' : '#a8a29e',
                      }}>
                      <Camera size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: useCam ? 'var(--zen-ink)' : 'var(--zen-stone)' }}>Thị giác</h3>
                      <p className="text-[10px]" style={{ color: 'var(--zen-stone-light)' }}>Để nhận diện không gian</p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: useCam ? '#ea580c' : 'transparent',
                      border: `2px solid ${useCam ? '#ea580c' : '#d6d3d1'}`,
                    }}>
                    {useCam && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
              </div>

              <button
                onClick={handleEnter}
                disabled={isProcessing}
                className="w-full mt-6 py-3.5 text-white rounded-[16px] font-semibold flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-[0.97] disabled:opacity-70 disabled:cursor-wait"
                style={{
                  background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
                  boxShadow: '0 8px 24px rgba(28,25,23,0.25)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(249,115,22,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1c1917 0%, #292524 100%)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(28,25,23,0.25)';
                }}
              >
                <span className="tracking-wide">{isProcessing ? 'Đang khởi tạo...' : 'Bắt đầu hành trình'}</span>
                {!isProcessing && <ArrowRight size={16} />}
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] mt-6 max-w-[220px] mx-auto leading-relaxed"
            style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
            Quyền truy cập chỉ được sử dụng khi bạn cho phép và không lưu trữ dữ liệu cá nhân.
          </p>
        </div>
      )}
    </div>
  );
};
