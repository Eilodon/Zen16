
import { useCallback } from 'react';
import { useZenStore, useUIStore } from '../store/zenStore';
import { getSharedAudioContext } from '../services/audioContext';

export function usePermissions() {
  const { 
    micStatus, cameraStatus,
    setMicStatus, setCameraStatus 
  } = useZenStore();
  
  const { setSnackbar, setInputMode } = useUIStore();

  /**
   * Helper to request audio with fallback
   */
  const getAudioStreamSafe = async () => {
    // 1. Try High Quality Constraints
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (e) {
      console.warn("[Permissions] High-quality audio constraints failed, trying basic...", e);
      // 2. Fallback to Basic Constraints
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  };

  /**
   * Unified Request Handler
   */
  const requestMediaAccess = useCallback(async (useMic: boolean, useCamera: boolean) => {
    // If nothing selected, just return (Text mode implied)
    if (!useMic && !useCamera) {
      setInputMode('text');
      return;
    }

    if (useMic) setMicStatus('prompting');
    if (useCamera) setCameraStatus('prompting');

    try {
      console.log(`[Permissions] Requesting - Mic: ${useMic}, Cam: ${useCamera}`);
      
      let stream: MediaStream | null = null;

      // Request logic split to handle partial failures gracefully
      if (useMic && useCamera) {
          // Try both
          try {
             // Combine constraints (Ideal scenario)
             stream = await navigator.mediaDevices.getUserMedia({
                 audio: { echoCancellation: true, noiseSuppression: true },
                 video: { facingMode: 'environment' }
             });
          } catch (e) {
             console.warn("[Permissions] Combined request failed, falling back to separate requests.");
             // Fallback strategy could go here, but for simplicity in 'Loading' phase, 
             // we prioritze Audio if mixed fails.
             stream = await getAudioStreamSafe();
             // Mark camera as failed silently here to allow app entry
             useCamera = false; 
             setCameraStatus('denied');
          }
      } else if (useMic) {
          stream = await getAudioStreamSafe();
      } else if (useCamera) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      }

      if (stream) {
          // Success Handling
          if (useMic) {
            setMicStatus('granted');
            // Warm up Audio Context
            try {
              const ctx = await getSharedAudioContext();
              if (ctx.state === 'suspended') {
                await ctx.resume();
              }
            } catch (ctxErr) {
              console.warn("AudioContext resume warning:", ctxErr);
            }
          }
          
          if (useCamera) {
            setCameraStatus('granted');
          }

          // Important: Stop tracks to release hardware locks on mobile
          stream.getTracks().forEach(t => t.stop());
          console.log("[Permissions] Access Granted & Hardware Released");
      }

    } catch (e: any) {
      console.warn("[Permissions] Request failed or denied completely", e);
      
      if (useMic) setMicStatus('denied');
      if (useCamera) setCameraStatus('denied');
      
      let msg = "Không thể truy cập thiết bị.";
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
         msg = "Bạn đã từ chối cấp quyền. Ứng dụng sẽ chuyển sang chế độ Chat.";
      } else if (e.name === 'NotFoundError') {
         msg = "Không tìm thấy thiết bị.";
      } else if (e.name === 'OverconstrainedError') {
         msg = "Thiết bị không hỗ trợ định dạng này.";
      }

      setSnackbar({ text: msg, kind: "warn" });
      
      if (useMic) {
        setInputMode('text');
      }
    }
  }, [setMicStatus, setCameraStatus, setSnackbar, setInputMode]);

  /**
   * Lazy Camera Request
   */
  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (cameraStatus === 'granted') return true;
    
    setCameraStatus('prompting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStatus('granted');
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (e) {
      console.warn("Camera request failed", e);
      setCameraStatus('denied');
      return false;
    }
  }, [cameraStatus, setCameraStatus]);

  return {
    micStatus,
    cameraStatus,
    requestMediaAccess,
    requestCamera
  };
}
