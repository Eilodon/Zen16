
import React, { useState, useEffect } from 'react';
import { ArrowRight, Mic, Camera, Check, Shield } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';

interface Props {
  onComplete?: () => void;
  onStartInteraction?: () => Promise<void>; // Kept for interface compatibility but unused in new logic
}

export const LoadingScreen: React.FC<Props> = ({ onComplete }) => {
  const { requestMediaAccess } = usePermissions();

  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Permission State
  const [useMic, setUseMic] = useState(true); // Mic ON by default
  const [useCam, setUseCam] = useState(false); // Camera OFF by default

  useEffect(() => {
    // 1. Progress Animation Phase
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
    
    // 2. Request Permissions based on selection
    await requestMediaAccess(useMic, useCam);
    
    // 3. Start exit animation
    setIsFading(true);
    setTimeout(() => {
        onComplete?.();
    }, 800);
  };

  return (
    <div 
      className={`fixed inset-0 z-[70] bg-[#fafaf9] flex flex-col items-center justify-center transition-all duration-800 ease-in-out ${isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}
    >
      {/* Brand */}
      <div className={`flex flex-col items-center transition-all duration-500 ${isReady ? '-translate-y-8' : 'translate-y-0'}`}>
        <div className="text-6xl mb-4 animate-pulse">🪷</div>
        <h1 className="text-3xl font-bold text-stone-800 font-serif tracking-tight">Thầy.AI</h1>
        <p className="text-stone-500 text-sm mt-2 font-light">Đồng hành tỉnh thức</p>
      </div>
      
      {/* PHASE 1: Loading Bar */}
      {!isReady && (
        <div className="mt-12 w-64 h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-orange-500 transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* PHASE 2: Setup Panel */}
      {isReady && (
        <div className="mt-8 w-full max-w-sm px-6 animate-[slideUp_0.4s_ease-out]">
            <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 p-6">
                <div className="flex items-center gap-2 mb-6 text-stone-400">
                    <Shield size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Thiết lập kết nối</span>
                </div>

                <div className="space-y-4">
                    {/* Mic Toggle */}
                    <div 
                        onClick={() => setUseMic(!useMic)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer active:scale-95 ${useMic ? 'border-orange-200 bg-orange-50/50' : 'border-stone-100 bg-stone-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${useMic ? 'bg-orange-100 text-orange-600' : 'bg-stone-200 text-stone-400'}`}>
                                <Mic size={20} />
                            </div>
                            <div>
                                <h3 className={`font-bold text-sm ${useMic ? 'text-stone-800' : 'text-stone-500'}`}>Giọng nói</h3>
                                <p className="text-[10px] text-stone-400">Để trò chuyện với Thầy</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${useMic ? 'bg-orange-500 border-orange-500' : 'border-stone-300 bg-white'}`}>
                            {useMic && <Check size={14} className="text-white" />}
                        </div>
                    </div>

                    {/* Camera Toggle */}
                    <div 
                        onClick={() => setUseCam(!useCam)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer active:scale-95 ${useCam ? 'border-orange-200 bg-orange-50/50' : 'border-stone-100 bg-stone-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${useCam ? 'bg-orange-100 text-orange-600' : 'bg-stone-200 text-stone-400'}`}>
                                <Camera size={20} />
                            </div>
                            <div>
                                <h3 className={`font-bold text-sm ${useCam ? 'text-stone-800' : 'text-stone-500'}`}>Thị giác</h3>
                                <p className="text-[10px] text-stone-400">Để nhận diện không gian</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${useCam ? 'bg-orange-500 border-orange-500' : 'border-stone-300 bg-white'}`}>
                            {useCam && <Check size={14} className="text-white" />}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleEnter}
                    disabled={isProcessing}
                    className="w-full mt-6 py-3.5 bg-stone-800 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-stone-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
                >
                    <span>{isProcessing ? 'Đang khởi tạo...' : 'Bắt đầu hành trình'}</span>
                    {!isProcessing && <ArrowRight size={16} />}
                </button>
            </div>
            
            <p className="text-center text-[10px] text-stone-400 mt-6 max-w-[200px] mx-auto leading-relaxed">
                Quyền truy cập chỉ được sử dụng khi bạn cho phép và không lưu trữ dữ liệu cá nhân.
            </p>
        </div>
      )}
    </div>
  );
};
