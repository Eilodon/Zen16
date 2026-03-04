
import * as React from 'react';
import { useState, useRef, useEffect, Suspense } from 'react';
import { VoiceButton } from './components/VoiceButton';
import { ZenCard } from './components/ZenCard';
import { Snackbar } from './components/Snackbar';
import { CameraScan } from './components/CameraScan';
import { BottomSheet } from './components/PandoraParts';
const AudioEngine = React.lazy(() => import('./components/AudioEngine'));
import { OnboardingFlow } from './components/OnboardingFlow';
import { ProfilePanel } from './components/ProfilePanel';
import { LiveStatusBar } from './components/LiveStatusBar';
import { MicroPractices } from './components/MicroPractices';
import { InputDock } from './components/InputDock';
import { ConversationEntry, ZenResponse } from './types';
import { detectEmergency } from './data/emergencyKeywords';
import { BUDDHIST_TEACHINGS } from './data/buddhistTeachings';
import { Keyboard, Languages, Brain, Sparkles, RotateCcw, Settings, Activity } from 'lucide-react';
import { haptic } from './utils/designSystem';
import { dbService } from './services/db';
import { useZenSession } from './hooks/useZenSession';
import { useUIStore, useZenStore } from './store/zenStore';
import { usePermissions } from './hooks/usePermissions';
import { useShallow } from 'zustand/react/shallow';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const OrbViz = React.lazy(() => import('./components/OrbViz'));
const BreathingCircle = React.lazy(() => import('./components/BreathingCircle').then(module => ({ default: module.BreathingCircle })));
const EmergencyProtocol = React.lazy(() => import('./components/EmergencyProtocol').then(module => ({ default: module.EmergencyProtocol })));
const HistoryPanel = React.lazy(() => import('./components/HistoryPanel').then(module => ({ default: module.HistoryPanel })));
const StressIndicator = React.lazy(() => import('./components/StressIndicator').then(module => ({ default: module.StressIndicator })));
const ReasoningPanel = React.lazy(() => import('./components/ReasoningPanel').then(module => ({ default: module.ReasoningPanel })));
const SettingsSheet = React.lazy(() => import('./components/SettingsSheet').then(module => ({ default: module.SettingsSheet })));

export default function App() {
  // --- Global State ---
  const {
    culturalMode, language, inputMode, snackbar, isLoading, showBreathing, emergencyActive, isOnboardingComplete,
    setCulturalMode, setLanguage, setInputMode, setSnackbar, setIsLoading, setShowBreathing, setEmergencyActive
  } = useUIStore(useShallow((state) => ({
    culturalMode: state.culturalMode,
    language: state.language,
    inputMode: state.inputMode,
    snackbar: state.snackbar,
    isLoading: state.isLoading,
    showBreathing: state.showBreathing,
    emergencyActive: state.emergencyActive,
    isOnboardingComplete: state.isOnboardingComplete,
    setCulturalMode: state.setCulturalMode,
    setLanguage: state.setLanguage,
    setInputMode: state.setInputMode,
    setSnackbar: state.setSnackbar,
    setIsLoading: state.setIsLoading,
    setShowBreathing: state.setShowBreathing,
    setEmergencyActive: state.setEmergencyActive,
  })));

  const { status, connectionState, zenData, history, setHistory, addToHistory, setZenData } = useZenStore(useShallow((state) => ({
    status: state.status,
    connectionState: state.connectionState,
    zenData: state.zenData,
    history: state.history,
    setHistory: state.setHistory,
    addToHistory: state.addToHistory,
    setZenData: state.setZenData,
  })));

  // --- Permissions Hook ---
  const { requestMediaAccess, micStatus, cameraStatus } = usePermissions();

  // --- Local UI State ---
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [showPractices, setShowPractices] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStressSheetOpen, setIsStressSheetOpen] = useState(false);
  const [currentAmbient, setCurrentAmbient] = useState<string>('silence');
  const [shouldLoadOrb, setShouldLoadOrb] = useState(false);

  // Audio Viz State
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(64));
  const animationFrameRef = useRef<number | null>(null);

  // --- Session Hook ---
  const {
    connect,
    disconnect,
    sendText,
    analyserRef
  } = useZenSession({
    onEmergencyDetected: () => setEmergencyActive(true),
    onError: (msg, kind) => {
      haptic('light');
      setSnackbar({ text: msg, kind });
    }
  });


  useEffect(() => {
    dbService.getAllEntries().then(entries => {
      setHistory(entries);
    }).catch(e => {
      console.error("DB Load failed", e);
    });
  }, [setHistory]);

  // Sync Firebase Auth with UI Store
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const { user, setUser } = useUIStore.getState();

      // If we have a firebase user, sync it to zustand
      if (firebaseUser) {
        setUser({
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          isGuest: false
        });
      } else {
        // Only clear if the user is NOT a guest. If they manually opted into Guest mode,
        // we don't want Firebase logging them out of Guest mode.
        if (!user?.isGuest) {
          setUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Auto-rotate idle teachings every 8 seconds
  useEffect(() => {
    if (zenData || status !== 'idle') return;
    const interval = setInterval(() => {
      setQuoteIndex(i => (i + 1) % BUDDHIST_TEACHINGS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [zenData, status]);

  useEffect(() => {
    if (zenData && zenData.emotion && zenData.quantum_metrics && zenData.reasoning_steps) {
      if (zenData.reasoning_steps[0] === 'Offline Mode') return;
      const newEntry: ConversationEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        emotion: zenData.emotion!,
        quantum_metrics: zenData.quantum_metrics!,
        stage: zenData.awareness_stage,
        consciousness_dimensions: zenData.consciousness_dimensions
      };
      const last = history[history.length - 1];
      if (!last || Date.now() - last.timestamp > 5000) {
        dbService.saveEntry(newEntry);
        addToHistory(newEntry);
      }
    }
    if (zenData?.breathing && zenData.breathing !== 'none') {
      setShowBreathing(true);
    }
  }, [zenData, history, addToHistory, setShowBreathing]);

  // Visualizer Loop
  useEffect(() => {
    const updateViz = () => {
      if (!analyserRef.current && status === 'processing' && inputMode === 'text') {
        const data = new Uint8Array(64).map(() => Math.random() * 50 + 50);
        setFrequencyData(data);
        animationFrameRef.current = requestAnimationFrame(updateViz);
        return;
      }
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      if (Date.now() % 33 < 16) {
        setFrequencyData(dataArray.slice(0, 64));
      }
      animationFrameRef.current = requestAnimationFrame(updateViz);
    };

    if (status !== 'idle') {
      if (!animationFrameRef.current) updateViz();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        setFrequencyData(new Uint8Array(64));
      }
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [status, inputMode, analyserRef]);

  // --- Handlers ---

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const uiText = language === 'vi'
    ? {
      micDenied: 'Bạn đã từ chối quyền Micro. Vui lòng cấp lại trong cài đặt.',
      mode: 'Chế độ',
      offline: 'Bạn đang ở chế độ Offline (Nội quán).',
      newSession: 'Bắt đầu phiên mới',
      language: 'Ngôn ngữ',
      cannotProcess: 'Không thể xử lý yêu cầu',
    }
    : {
      micDenied: 'Microphone permission was denied. Please enable it in settings.',
      mode: 'Mode',
      offline: 'You are currently in Offline mode.',
      newSession: 'Started a new session',
      language: 'Language',
      cannotProcess: 'Unable to process request',
    };

  const toggleConnection = () => {
    if (status === 'idle') {
      if (micStatus === 'granted') {
        connect();
      } else if (micStatus === 'denied') {
        setSnackbar({ text: uiText.micDenied, kind: "error" });
      } else {
        requestMediaAccess(true, false).then(() => connect());
      }
    } else {
      disconnect();
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setSnackbar({ text: newLang === 'vi' ? "Ngôn ngữ: Tiếng Việt" : "Language: English", kind: "success" });
    if (status !== 'idle') {
      disconnect();
      setTimeout(() => connect(), 500);
    }
  };

  const toggleInputMode = () => {
    disconnect();
    setInputMode(inputMode === 'voice' ? 'text' : 'voice');
    haptic('selection');
  };

  const handleModeChange = (mode: any, items: string[]) => {
    setCulturalMode(mode);
    setSnackbar({ text: `${uiText.mode}: ${mode}`, kind: "success" });
    haptic('success');
    if (status !== 'idle') {
      disconnect();
      setTimeout(() => connect(), 500);
    }
  };

  const handleSendText = async (text: string): Promise<boolean> => {
    if (!text.trim()) return false;

    // Improved offline handler with clear status notification
    if (!navigator.onLine) {
      setSnackbar({ text: uiText.offline, kind: "info" });
    }

    const response = await sendText(text);
    if (response) {
      if (detectEmergency(text) || detectEmergency(response.wisdom_text)) {
        setEmergencyActive(true);
      }
      return true;
    }
    return false;
  };

  const handlePracticeSelect = (txt: string) => {
    setShowPractices(false);
    void handleSendText(txt);
  };

  const handleResetSession = () => {
    haptic('warn');
    setZenData(null);
    setSnackbar({ text: uiText.newSession, kind: 'info' });
  };

  useEffect(() => {
    if (!isOnboardingComplete) {
      setShouldLoadOrb(false);
      return;
    }

    let cancelled = false;
    const loadOrb = () => {
      if (!cancelled) setShouldLoadOrb(true);
    };

    if (typeof (window as any).requestIdleCallback === 'function') {
      const idleId = (window as any).requestIdleCallback(loadOrb, { timeout: 1200 });
      return () => {
        cancelled = true;
        if ((window as any).cancelIdleCallback) {
          (window as any).cancelIdleCallback(idleId);
        }
      };
    }

    const timer = setTimeout(loadOrb, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOnboardingComplete]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden select-none"
      style={{ fontFamily: 'var(--font-body)', color: 'var(--zen-ink, #1c1917)' }}>

      {/* --- LAYER 0: Background & Overlays --- */}
      {!isOnboardingComplete && (
        <OnboardingFlow
          onComplete={() => setIsLoading(false)}
        />
      )}

      <div className="absolute inset-0 z-0">
        {shouldLoadOrb ? (
          <Suspense fallback={<div className="absolute inset-0" style={{ background: 'var(--bg-gradient)' }} />}>
            <OrbViz
              analyser={analyserRef.current}
              emotion={zenData?.emotion || 'neutral'}
              frequencyData={frequencyData}
            />
          </Suspense>
        ) : (
          <div className="absolute inset-0" style={{ background: 'var(--bg-gradient)' }} />
        )}
      </div>

      <Suspense fallback={null}>
        <AudioEngine
          emotion={zenData?.emotion}
          breathing={zenData?.breathing}
          ambientSound={zenData?.ambient_sound}
          isSpeaking={status === 'speaking'}
          isEmergency={emergencyActive}
        />
      </Suspense>

      {showBreathing && (
        <Suspense fallback={null}>
          <BreathingCircle
            type={zenData?.breathing || '4-7-8'}
            isActive={showBreathing}
            onComplete={() => setShowBreathing(false)}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <EmergencyProtocol
          isActive={emergencyActive}
          onComplete={() => {
            setEmergencyActive(false);
            disconnect();
          }}
        />
      </Suspense>

      {/* --- LAYER 1: Top Floating Bar --- */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-6 z-50 pointer-events-none flex justify-between items-start">
        {/* Left: Tools */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-full p-1 transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'var(--glass-frosted, rgba(255,255,255,0.55))',
            backdropFilter: 'blur(20px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
            border: '1px solid var(--glass-border, rgba(255,255,255,0.45))',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}>
          <CameraScan onModeChange={handleModeChange} currentMode={culturalMode} />
          <div className="h-4 w-px mx-0.5" style={{ background: 'rgba(120,113,108,0.12)' }}></div>
          <button
            onClick={toggleLanguage}
            className="p-2.5 rounded-full transition-all duration-300 hover:scale-105"
            style={{ color: 'var(--zen-stone-dark, #57534e)' }}
            aria-label="Toggle Language"
          >
            <Languages size={17} strokeWidth={1.5} />
          </button>
        </div>

        {/* Right: Settings, History & Reset */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'var(--glass-frosted, rgba(255,255,255,0.55))',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.45))',
              color: 'var(--zen-stone-dark, #57534e)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
            aria-label="Settings"
            title="Cài đặt"
          >
            <Settings size={17} strokeWidth={1.5} />
          </button>

          {zenData && (
            <button
              onClick={handleResetSession}
              className="p-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 animate-fadeIn"
              style={{
                background: 'var(--glass-frosted, rgba(255,255,255,0.55))',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border, rgba(255,255,255,0.45))',
                color: 'var(--zen-stone-dark, #57534e)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              aria-label="New Session"
              title="Bắt đầu phiên mới"
            >
              <RotateCcw size={17} strokeWidth={1.5} />
            </button>
          )}
          {/* History Button with badge */}
          <div className="relative">
            <Suspense fallback={<div className="w-9 h-9" />}>
              <HistoryPanel history={history} onClear={() => setHistory([])} />
            </Suspense>
            {history.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[7px] font-bold flex items-center justify-center text-white"
                style={{ background: '#f97316', boxShadow: '0 1px 4px rgba(249,115,22,0.3)' }}>
                {history.length > 9 ? '9+' : history.length}
              </span>
            )}
          </div>
          <div className="w-px h-6 mx-1" style={{ background: 'rgba(120,113,108,0.15)' }}></div>
          {/* Profile Panel */}
          <ProfilePanel />
        </div>
      </div>

      {/* ROW B: Live Status Bar (Centered) */}
      <div className="absolute top-20 left-0 right-0 z-40 pointer-events-none flex justify-center">
        <div className="pointer-events-auto">
          <LiveStatusBar
            status={status}
            connectionState={connectionState}
            hasCamera={cameraStatus === 'granted'}
            emotion={zenData?.emotion}
            language={language}
          />
        </div>
      </div>

      {/* LAYER: Stress Indicator (Desktop: floating left, Mobile: pill button) */}
      {zenData && status !== 'idle' && (
        <>
          {/* Desktop */}
          <div className="absolute top-36 left-4 z-40 pointer-events-none hidden lg:block animate-fadeInUp"
            style={{ animationDelay: '0.3s' }}>
            <div className="pointer-events-auto">
              <Suspense fallback={null}>
                <StressIndicator
                  data={zenData}
                  isConnected={connectionState === 'connected'}
                  isSpeaking={status === 'speaking'}
                />
              </Suspense>
            </div>
          </div>
          {/* Mobile: floating pill */}
          <div className="absolute top-[7rem] left-4 z-40 lg:hidden animate-fadeInUp">
            <button
              onClick={() => setIsStressSheetOpen(true)}
              className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 active:scale-95"
              style={{
                background: 'var(--glass-frosted, rgba(255,255,255,0.55))',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border, rgba(255,255,255,0.45))',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <Activity size={13} strokeWidth={1.5} style={{ color: '#f97316' }} />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--zen-stone-dark)' }}>
                {zenData.emotion}
              </span>
            </button>
          </div>
        </>
      )}

      {/* --- LAYER 2: Main Content (Scrollable) --- */}
      <div className="absolute inset-0 z-30 flex flex-col items-center pointer-events-none">
        <div className="w-full h-full pointer-events-auto overflow-y-auto no-scrollbar pt-32 pb-48 px-4 flex flex-col items-center">
          <div className="w-full max-w-lg flex flex-col gap-6 my-auto">
            {zenData ? (
              <>
                <ZenCard data={zenData} isGenerating={status === 'processing' || status === 'speaking' || connectionState === 'reconnecting'} />

                <button
                  onClick={() => setIsReasoningOpen(true)}
                  className="self-center flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'var(--glass-frosted, rgba(255,255,255,0.55))',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid var(--glass-border, rgba(255,255,255,0.45))',
                    color: 'var(--zen-stone, #78716c)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ea580c'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(249,115,22,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--zen-stone, #78716c)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                >
                  <Brain size={13} strokeWidth={1.5} />
                  Xem phân tích tâm thức
                </button>
              </>
            ) : (
              /* IDLE STATE: Quote in a glass card — separated from orb */
              <div className="mt-auto" />
            )}
          </div>
        </div>
      </div>

      {/* --- LAYER 2.5: Idle Quote Card (above dock, below orb) --- */}
      {!zenData && (
        <div className="absolute bottom-28 left-0 right-0 z-40 pointer-events-none flex justify-center px-4">
          <div
            key={quoteIndex}
            className="pointer-events-auto max-w-md w-full rounded-[24px] p-6 text-center zen-noise relative overflow-hidden animate-fadeInUp"
            style={{
              background: 'rgba(255, 255, 255, 0.82)',
              backdropFilter: 'blur(28px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div className="relative z-10">
              <p
                className="text-lg md:text-xl italic leading-relaxed tracking-wide mb-3"
                style={{
                  fontFamily: 'var(--font-wisdom)',
                  color: 'var(--zen-ink, #1c1917)',
                }}
              >
                "{BUDDHIST_TEACHINGS[quoteIndex % BUDDHIST_TEACHINGS.length].text_vi}"
              </p>
              <p className="text-[13px] italic mb-2"
                style={{
                  fontFamily: 'var(--font-wisdom)',
                  color: 'var(--zen-stone, #78716c)',
                  opacity: 0.6,
                }}>
                "{BUDDHIST_TEACHINGS[quoteIndex % BUDDHIST_TEACHINGS.length].text_en}"
              </p>
              <p className="text-[9px] uppercase tracking-[0.2em] mt-3"
                style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
                — {BUDDHIST_TEACHINGS[quoteIndex % BUDDHIST_TEACHINGS.length].source}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- LAYER 3: Bottom Floating Dock --- */}
      <div className="absolute bottom-8 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4">

        {/* Popup: Micro Practices with header */}
        {showPractices && (
          <div className="pointer-events-auto mb-4 rounded-[24px] animate-slideUp origin-bottom zen-noise relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(28px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
              border: '1px solid var(--glass-border-strong, rgba(255,255,255,0.65))',
              boxShadow: 'var(--glass-shadow-elevated)',
              maxWidth: '420px',
              width: '100%',
            }}>
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} style={{ color: '#f97316' }} strokeWidth={1.5} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
                    Gợi ý thực hành
                  </span>
                </div>
                <button
                  onClick={() => setShowPractices(false)}
                  className="p-1.5 rounded-full transition-all duration-200"
                  style={{ color: 'var(--zen-stone-light, #a8a29e)', background: 'rgba(120,113,108,0.06)' }}
                >
                  <span className="text-[10px] font-medium">✕</span>
                </button>
              </div>
              {/* Scroll indicator hint */}
              <div className="px-4 pb-1">
                <div className="flex items-center gap-1">
                  <div className="h-px flex-1" style={{ background: 'rgba(120,113,108,0.06)' }} />
                  <span className="text-[8px] uppercase tracking-[0.15em]" style={{ color: 'var(--zen-stone-light, #a8a29e)', opacity: 0.6 }}>← vuốt →</span>
                  <div className="h-px flex-1" style={{ background: 'rgba(120,113,108,0.06)' }} />
                </div>
              </div>
              <MicroPractices
                onSelect={handlePracticeSelect}
                disabled={status !== 'idle' && navigator.onLine}
                lang={language}
              />
            </div>
          </div>
        )}

        {/* Dock Container */}
        <div
          className="pointer-events-auto rounded-[28px] p-2 flex items-center justify-center gap-4 transition-all duration-300"
          style={{
            background: 'var(--glass-clear, rgba(255,255,255,0.72))',
            backdropFilter: 'blur(28px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
            border: '1px solid var(--glass-border-strong, rgba(255,255,255,0.65))',
            boxShadow: 'var(--glass-shadow-saffron)',
            minWidth: inputMode === 'voice' ? '240px' : '320px',
          }}
        >
          {inputMode === 'voice' ? (
            <>
              <button
                onClick={() => setShowPractices(!showPractices)}
                className="p-4 rounded-full transition-all duration-300"
                style={{
                  background: showPractices ? 'rgba(249,115,22,0.08)' : 'transparent',
                  color: showPractices ? '#ea580c' : 'var(--zen-stone, #78716c)',
                  boxShadow: showPractices ? '0 2px 8px rgba(249,115,22,0.08)' : 'none',
                }}
                title="Gợi ý thực hành"
              >
                <Sparkles size={22} strokeWidth={1.5} />
              </button>

              {/* Voice Button */}
              <div className="-my-4">
                <VoiceButton state={connectionState === 'reconnecting' ? 'processing' : status} onClick={toggleConnection} />
              </div>

              <button
                onClick={toggleInputMode}
                className="p-4 rounded-full transition-all duration-300"
                style={{ color: 'var(--zen-stone, #78716c)' }}
                title="Chuyển sang gõ phím"
              >
                <Keyboard size={22} strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <InputDock
              language={language}
              status={status}
              showPractices={showPractices}
              onTogglePractices={() => setShowPractices(!showPractices)}
              onSendText={handleSendText}
              onToggleInputMode={toggleInputMode}
            />
          )}
        </div>
      </div>

      {/* --- LAYER 4: Overlays --- */}
      <BottomSheet
        open={isReasoningOpen}
        onClose={() => setIsReasoningOpen(false)}
        title="Phân tích Tâm thức"
      >
        <Suspense fallback={null}>
          {zenData && <ReasoningPanel data={zenData} onBack={() => setIsReasoningOpen(false)} />}
        </Suspense>
      </BottomSheet>

      <BottomSheet
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Cài đặt"
      >
        <Suspense fallback={null}>
          <SettingsSheet
            language={language}
            inputMode={inputMode}
            culturalMode={culturalMode}
            onLanguageChange={(lang) => {
              setLanguage(lang);
              setSnackbar({ text: `${uiText.language}: ${lang === 'vi' ? 'Tiếng Việt' : 'English'}`, kind: 'success' });
              if (status !== 'idle') { disconnect(); setTimeout(() => connect(), 500); }
            }}
            onInputModeChange={(mode) => {
              disconnect();
              setInputMode(mode);
            }}
            onCulturalModeChange={(mode) => {
              setCulturalMode(mode);
              setSnackbar({ text: `${uiText.mode}: ${mode}`, kind: 'success' });
              if (status !== 'idle') { disconnect(); setTimeout(() => connect(), 500); }
            }}
            onStartBreathing={(type) => {
              setShowBreathing(true);
              setIsSettingsOpen(false);
              // Set breathing type — use existing zenData or create minimal stub
              const breathingData: ZenResponse = zenData ? { ...zenData, breathing: type } : {
                emotion: 'calm', wisdom_text: '', wisdom_english: '', user_transcript: '',
                breathing: type, confidence: 1, reasoning_steps: ['Manual Breathing'],
                quantum_metrics: { coherence: 0.8, entanglement: 0.5, presence: 0.9 },
                awareness_stage: 'mindful' as const,
                consciousness_dimensions: { contextual: 0.5, emotional: 0.5, cultural: 0.5, wisdom: 0.5, uncertainty: 0.5, relational: 0.5 },
              };
              setZenData(breathingData);
            }}
            onAmbientChange={(sound) => setCurrentAmbient(sound)}
            currentAmbient={currentAmbient}
          />
        </Suspense>
      </BottomSheet>

      {/* StressIndicator Mobile Sheet */}
      <BottomSheet
        open={isStressSheetOpen}
        onClose={() => setIsStressSheetOpen(false)}
        title="Trạng thái Tâm thức"
      >
        <Suspense fallback={null}>
          {zenData && (
            <StressIndicator
              data={zenData}
              isConnected={connectionState === 'connected'}
              isSpeaking={status === 'speaking'}
            />
          )}
        </Suspense>
      </BottomSheet>

      {snackbar && (
        <Snackbar
          text={snackbar.text}
          kind={snackbar.kind}
          onClose={() => setSnackbar(null)}
        />
      )}
    </div>
  );
}
