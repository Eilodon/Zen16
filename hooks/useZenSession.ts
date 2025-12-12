
import * as React from 'react';
import { useRef, useCallback } from 'react';
import { ZenLiveSession, sendZenTextQuery } from '../services/geminiService';
import { ZenResponse } from '../types';
import { haptic } from '../utils/designSystem';
import { detectEmergency } from '../data/emergencyKeywords';
import { useUIStore, useZenStore } from '../store/zenStore';

interface UseZenSessionProps {
  onEmergencyDetected: () => void;
  onError: (msg: string, type: 'error' | 'warn' | 'info') => void;
}

export function useZenSession({ 
  onEmergencyDetected, 
  onError 
}: UseZenSessionProps) {
  
  // Select state from stores to avoid prop drilling
  const { culturalMode, language, setInputMode, setEmergencyActive } = useUIStore();
  const { status, setStatus, setZenData, setConnectionState } = useZenStore();
  
  const liveSessionRef = useRef<ZenLiveSession | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Handle session disconnects & reconnects
  const handleDisconnect = React.useCallback((reason?: string, isReconnecting?: boolean) => {
    if (isReconnecting) {
        setConnectionState('reconnecting');
        if (reason) onError(reason, "warn"); // Show "Reconnecting..."
        return;
    }
    
    // Fallback if connection fails permanently
    if (reason === "FALLBACK_TO_TEXT") {
        onError("Mạng yếu, chuyển sang chế độ chat.", "info");
        setInputMode('text');
        haptic('warn');
        setConnectionState('disconnected');
    } else if (reason) {
       onError(reason === "Timeout due to inactivity" ? "Đã ngắt kết nối (Tự động)" : reason, "info");
       setConnectionState('disconnected');
    } else {
       // Clean disconnect
       setConnectionState('disconnected');
    }

    liveSessionRef.current = null;
    analyserRef.current = null;
    setStatus('idle');
  }, [onError, setStatus, setInputMode, setConnectionState]);

  // Handle incoming data updates from Gemini
  const handleStateChange = React.useCallback((data: Partial<ZenResponse>) => {
     useZenStore.setState((prev) => {
        const newData = prev.zenData ? { ...prev.zenData, ...data } : data as ZenResponse;
        
        // Emergency Check
        if (newData.wisdom_text && detectEmergency(newData.wisdom_text)) {
           setEmergencyActive(true);
           onEmergencyDetected();
           liveSessionRef.current?.disconnect();
        }
        return { zenData: newData };
     });
  }, [onEmergencyDetected, setEmergencyActive]);

  // Connect Function
  const connect = React.useCallback(async () => {
    if (status !== 'idle') {
        liveSessionRef.current?.disconnect();
        return;
    }

    try {
        // NOTE: We do NOT initialize AudioContext here anymore.
        // It must be done INSIDE ZenLiveSession.connect() after getUserMedia 
        // to ensure the permission prompt is triggered by the user gesture immediately.

        liveSessionRef.current = new ZenLiveSession(
          culturalMode,
          language,
          handleStateChange,
          (active) => setStatus(active ? 'speaking' : 'listening'),
          handleDisconnect
        );
        
        haptic('success');
        setStatus('listening');
        setConnectionState('reconnecting'); // Initial connecting state
        
        if (liveSessionRef.current) {
            // This call will trigger the mic permission prompt first
            const analyser = await liveSessionRef.current.connect();
            analyserRef.current = analyser;
            setConnectionState('connected');
        }

    } catch (e: any) {
        // Suppress console error for expected permission issues to keep logs clean
        const isPermissionIssue = e.message?.includes("PermissionDenied") || e.message?.includes("NoMicrophone");
        if (!isPermissionIssue) {
             console.error("Connection failed:", e);
        }

        setStatus('idle');
        setConnectionState('disconnected');
        
        // Specific Error Handling
        if (e.message.includes("PermissionDenied")) {
            onError("Không có quyền Microphone. Đã chuyển sang chế độ Chat.", "warn");
            setInputMode('text'); // Auto-switch to text
        } else if (e.message.includes("NoMicrophone")) {
            onError("Không tìm thấy Microphone.", "error");
            setInputMode('text');
        } else if (e.message.includes("API_KEY_MISSING")) {
             onError("Vui lòng nhập API Key.", "warn");
        } else {
             onError("Lỗi kết nối micro hoặc mạng.", "error");
        }
        
        liveSessionRef.current?.disconnect();
    }
  }, [status, culturalMode, language, handleStateChange, handleDisconnect, onError, setStatus, setConnectionState, setInputMode]);

  // Manual Disconnect
  const disconnect = React.useCallback(() => {
     if (liveSessionRef.current) {
         liveSessionRef.current.disconnect();
         haptic('warn');
     }
  }, []);

  // Text Query Function
  const sendText = React.useCallback(async (text: string) => {
    if (!text.trim()) return null;
    if (liveSessionRef.current) liveSessionRef.current.disconnect();

    try {
      haptic('selection');
      setStatus('processing');
      
      const apiKey = ""; 
      const response = await sendZenTextQuery(apiKey, text, culturalMode, language);
      
      setZenData(response);
      haptic('success');
      setStatus('idle');
      
      return response;
    } catch (e: any) {
      console.error(e);
      if (e.message.includes("API_KEY_MISSING")) {
          onError("Vui lòng nhập API Key để tiếp tục.", "warn");
      } else {
          onError("Không thể xử lý yêu cầu", "error");
      }
      setStatus('idle');
      return null;
    }
  }, [culturalMode, language, onError, setStatus, setZenData]);

  return {
    connect,
    disconnect,
    sendText,
    analyserRef
  };
}
