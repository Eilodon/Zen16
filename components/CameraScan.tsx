
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Loader2, ScanEye } from 'lucide-react';
import { analyzeEnvironment } from '../services/liveAgent';
import { CulturalMode } from '../types';
import { useUIStore } from '../store/zenStore';
import { usePermissions } from '../hooks/usePermissions';

interface Props {
  onModeChange: (mode: CulturalMode, items: string[]) => void;
  currentMode: CulturalMode;
}

export const CameraScan: React.FC<Props> = ({ onModeChange, currentMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { setSnackbar } = useUIStore();
  const { requestCamera } = usePermissions();

  const startCamera = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const granted = await requestCamera();

    if (granted) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = s;
        setIsOpen(true);
      } catch (err: any) {
        console.error("Camera start error", err);
        setSnackbar({ text: "Lỗi camera không mong muốn.", kind: "error" });
      }
    } else {
      setSnackbar({ text: "Cần quyền Camera để sử dụng tính năng này.", kind: "warn" });
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.warn);
    }
  }, [isOpen]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;

    setIsScanning(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    const MAX_DIMENSION = 800;
    let w = video.videoWidth;
    let h = video.videoHeight;

    if (w > h) {
      if (w > MAX_DIMENSION) {
        h = Math.round(h * (MAX_DIMENSION / w));
        w = MAX_DIMENSION;
      }
    } else {
      if (h > MAX_DIMENSION) {
        w = Math.round(w * (MAX_DIMENSION / h));
        h = MAX_DIMENSION;
      }
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

      try {
        const result = await analyzeEnvironment("", base64);
        onModeChange(result.mode, result.detected_items);
        closeCamera();
      } catch (e: any) {
        console.error(e);
        if (e.message.includes("API_KEY_MISSING")) {
          setSnackbar({ text: "Cần API Key để phân tích", kind: "warn" });
        } else {
          setSnackbar({ text: "Lỗi phân tích hình ảnh", kind: "error" });
        }
      } finally {
        setIsScanning(false);
      }
    } else {
      setIsScanning(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={(e) => !isOpen && startCamera(e)}
          className="p-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: currentMode === 'VN' ? 'rgba(245,158,11,0.1)' : 'var(--glass-frosted, rgba(255,255,255,0.55))',
            color: currentMode === 'VN' ? '#b45309' : 'var(--zen-stone-dark, #57534e)',
            border: `1px solid ${currentMode === 'VN' ? 'rgba(245,158,11,0.2)' : 'var(--glass-border, rgba(255,255,255,0.45))'}`,
            backdropFilter: 'blur(12px)',
          }}
          aria-label="Scan Environment"
          title="Quét không gian để chọn Mode"
        >
          <Camera size={18} strokeWidth={1.5} />
        </button>
        <span className="text-[9px] font-semibold px-2 py-1 rounded-full mt-1.5 tracking-[0.1em]"
          style={{
            background: currentMode === 'VN' ? '#b45309' : 'var(--zen-stone-dark, #57534e)',
            color: 'white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}>
          {currentMode}
        </span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 animate-fadeIn"
          style={{ background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(8px)' }}>
          <div className="relative w-full max-w-md overflow-hidden rounded-[24px]"
            style={{
              background: 'rgba(28,25,23,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}>
            {!isScanning ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                {/* Scan frame corners */}
                <div className="absolute inset-4 pointer-events-none" style={{ border: '1.5px solid rgba(249,115,22,0.3)', borderRadius: '12px' }}>
                  <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-orange-500 rounded-tl-lg" />
                  <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-orange-500 rounded-tr-lg" />
                  <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-orange-500 rounded-bl-lg" />
                  <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-orange-500 rounded-br-lg" />
                </div>
              </div>
            ) : (
              <div className="w-full h-64 flex items-center justify-center" style={{ background: 'rgba(28,25,23,0.9)' }}>
                <ScanEye className="animate-pulse w-14 h-14" style={{ color: '#f97316' }} strokeWidth={1.5} />
              </div>
            )}

            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Ảnh được gửi ẩn danh để AI phân tích bối cảnh và bị xóa ngay lập tức.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={closeCamera}
                  disabled={isScanning}
                  className="px-5 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <X size={14} /> Hủy
                </button>
                <button
                  onClick={captureAndAnalyze}
                  disabled={isScanning}
                  className="px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-semibold text-white transition-all duration-300 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
                  }}
                >
                  {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Quét
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
