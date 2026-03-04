import React, { useState, useEffect } from 'react';
import { ArrowRight, Mic, Camera, Check, Shield, User as UserIcon, LogIn, Heart } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useUIStore } from '../store/zenStore';
import { haptic } from '../utils/designSystem';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface Props {
    onComplete?: () => void;
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

export const OnboardingFlow: React.FC<Props> = ({ onComplete }) => {
    const { requestMediaAccess } = usePermissions();
    const { setUser, setIsOnboardingComplete } = useUIStore();

    const [step, setStep] = useState<'splash' | 'auth' | 'permissions'>('splash');
    const [progress, setProgress] = useState(0);
    const [isFading, setIsFading] = useState(false);

    // Auth state
    const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Permission state
    const [useMic, setUseMic] = useState(true);
    const [useCam, setUseCam] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (step === 'splash') {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setStep('auth'), 400);
                        return 100;
                    }
                    return prev + 2;
                });
            }, 25);
            return () => clearInterval(interval);
        }
    }, [step]);

    const handleGuest = () => {
        haptic('success');
        setUser({ name: 'Khách', email: '', isGuest: true });
        setStep('permissions');
    };

    const handleGoogleAuth = async () => {
        setAuthError('');
        setIsAuthenticating(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            haptic('success');
            setUser({
                name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
                email: result.user.email || '',
                isGuest: false
            });
            setStep('permissions');
        } catch (error: any) {
            haptic('warn');
            console.error("Google Auth error:", error);
            setAuthError('Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        if (authMode === 'signup' && !name) return;

        setAuthError('');
        setIsAuthenticating(true);

        try {
            if (authMode === 'signup') {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                haptic('success');
                setUser({
                    name,
                    email: userCredential.user.email || '',
                    isGuest: false
                });
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                haptic('success');
                setUser({
                    name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'User',
                    email: userCredential.user.email || '',
                    isGuest: false
                });
            }
            setStep('permissions');
        } catch (error: any) {
            haptic('warn');
            let errorMsg = 'Đã có lỗi xảy ra. Hãy thở sâu và thử lại.';
            if (error.code === 'auth/email-already-in-use') errorMsg = 'Email này đã được sử dụng.';
            else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') errorMsg = 'Email hoặc mật khẩu không chính xác.';
            else if (error.code === 'auth/weak-password') errorMsg = 'Mật khẩu quá yếu.';
            else if (error.code === 'auth/invalid-email') errorMsg = 'Email không hợp lệ.';
            setAuthError(errorMsg);
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleEnter = async () => {
        haptic('selection');
        setIsProcessing(true);
        await requestMediaAccess(useMic, useCam);
        setIsFading(true);
        setTimeout(() => {
            setIsOnboardingComplete(true);
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

            {/* Brand Header */}
            <div className={`flex flex-col items-center transition-all duration-700 ${step !== 'splash' ? '-translate-y-6' : 'translate-y-0'}`}
                style={{ transitionTimingFunction: 'var(--ease-spring)' }}>
                <div className="w-24 h-24 mb-6 animate-float">
                    <LotusIcon className="w-full h-full drop-shadow-lg" />
                </div>
                <h1 className="text-4xl font-semibold tracking-tight animate-fadeIn"
                    style={{ fontFamily: 'var(--font-wisdom)', color: 'var(--zen-ink, #1c1917)' }}>
                    Zen16
                </h1>
                <p className="text-sm mt-2 font-light tracking-wider uppercase animate-fadeIn delay-2"
                    style={{ color: 'var(--zen-stone, #78716c)', letterSpacing: '0.15em' }}>
                    Đồng hành tỉnh thức
                </p>
            </div>

            {/* STEP 1: SPLASH */}
            {step === 'splash' && (
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

            {/* STEP 2: AUTHENTICATION */}
            {step === 'auth' && (
                <div className="mt-8 w-full max-w-sm px-6 animate-slideUp">
                    <div className="zen-glass-elevated relative zen-noise rounded-[28px] p-6"
                        style={{ background: 'rgba(255,255,255,0.88)' }}>

                        {!authMode ? (
                            <div className="flex flex-col gap-3">
                                <button onClick={() => setAuthMode('login')} className="w-full py-3.5 rounded-[16px] font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.97]"
                                    style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', boxShadow: '0 8px 32px rgba(249,115,22,0.25)' }}>
                                    <LogIn size={18} /> Đăng nhập bằng Email
                                </button>
                                <button onClick={() => setAuthMode('signup')} className="w-full py-3.5 rounded-[16px] font-semibold flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.97]"
                                    style={{ background: 'rgba(249,115,22,0.08)', color: '#ea580c' }}>
                                    <UserIcon size={18} /> Đăng ký thành viên mới
                                </button>
                                <div className="relative my-2">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                    <div className="relative flex justify-center text-xs"><span className="bg-[#fcfaf8] px-2 text-gray-400">hoặc</span></div>
                                </div>
                                <button onClick={handleGoogleAuth} disabled={isAuthenticating} className="w-full py-3.5 rounded-[16px] font-semibold text-gray-700 flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.97] border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-70 disabled:cursor-wait">
                                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" /><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" /><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" /><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" /></g></svg>
                                    Đăng nhập với Google
                                </button>
                                <button onClick={handleGuest} className="w-full py-3.5 rounded-[16px] font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-gray-100 active:scale-[0.97]"
                                    style={{ color: 'var(--zen-stone)' }}>
                                    <Heart size={16} /> Trải nghiệm ẩn danh (Guest)
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4 animate-fadeIn">
                                {authMode === 'signup' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest pl-1">Tên gọi</label>
                                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tên của bạn" required
                                            className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all" />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest pl-1">Email</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email của bạn" required
                                        className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest pl-1">Mật khẩu</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                                        className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all" />
                                </div>
                                {authError && (
                                    <div className="text-red-500 text-xs px-1 animate-pulse">
                                        {authError}
                                    </div>
                                )}
                                <button type="submit" disabled={isAuthenticating} className="w-full mt-2 py-3.5 rounded-[16px] font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.97] disabled:opacity-70 disabled:cursor-wait"
                                    style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)', boxShadow: '0 8px 24px rgba(28,25,23,0.25)' }}>
                                    {isAuthenticating ? 'Đang xử lý...' : (authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')} {!isAuthenticating && <ArrowRight size={16} />}
                                </button>
                                <button type="button" onClick={() => setAuthMode(null)} className="text-xs text-gray-400 hover:text-gray-600 mt-2">
                                    Quay lại
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* STEP 3: PERMISSIONS */}
            {step === 'permissions' && (
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
                                            style={{ background: useMic ? 'rgba(249,115,22,0.1)' : 'rgba(120,113,108,0.08)', color: useMic ? '#ea580c' : '#a8a29e' }}>
                                            <Mic size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm" style={{ color: useMic ? 'var(--zen-ink)' : 'var(--zen-stone)' }}>Giọng nói</h3>
                                            <p className="text-[10px]" style={{ color: 'var(--zen-stone-light)' }}>Để trò chuyện</p>
                                        </div>
                                    </div>
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                                        style={{ background: useMic ? '#ea580c' : 'transparent', border: `2px solid ${useMic ? '#ea580c' : '#d6d3d1'}` }}>
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
                                            style={{ background: useCam ? 'rgba(249,115,22,0.1)' : 'rgba(120,113,108,0.08)', color: useCam ? '#ea580c' : '#a8a29e' }}>
                                            <Camera size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm" style={{ color: useCam ? 'var(--zen-ink)' : 'var(--zen-stone)' }}>Thị giác</h3>
                                            <p className="text-[10px]" style={{ color: 'var(--zen-stone-light)' }}>Đo nhịp thở & Căng thẳng</p>
                                        </div>
                                    </div>
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                                        style={{ background: useCam ? '#ea580c' : 'transparent', border: `2px solid ${useCam ? '#ea580c' : '#d6d3d1'}` }}>
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
                            >
                                <span className="tracking-wide">{isProcessing ? 'Đang khởi tạo...' : 'Bắt đầu hành trình'}</span>
                                {!isProcessing && <ArrowRight size={16} />}
                            </button>
                        </div>
                    </div>
                    <p className="text-center text-[10px] mt-6 max-w-[220px] mx-auto leading-relaxed"
                        style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
                        Các quyền riêng tư được xử lý hoàn toàn Offline
                    </p>
                </div>
            )}
        </div>
    );
};
