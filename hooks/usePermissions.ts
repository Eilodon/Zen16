
import { useCallback } from 'react';
import { useZenStore, useUIStore } from '../store/zenStore';
import { getSharedAudioContext } from '../services/audioContext';

export function usePermissions() {
  const { 
    micStatus, cameraStatus,
    setMicStatus, setCameraStatus 
  } = useZenStore();
  
  const { setSnackbar, setInputMode } = useUIStore();
  const language = useUIStore((state) => state.language);

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
   * Request camera with resilient constraints for desktop/mobile diversity.
   */
  const getVideoStreamSafe = async (preferredFacing: 'user' | 'environment' = 'user') => {
    const fallbackFacing: 'user' | 'environment' =
      preferredFacing === 'user' ? 'environment' : 'user';

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: preferredFacing } } },
      { video: { facingMode: { ideal: fallbackFacing } } },
      { video: true },
    ];

    let lastError: unknown = null;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error: any) {
        lastError = error;
        const shouldTryNext =
          error?.name === 'OverconstrainedError' ||
          error?.name === 'NotFoundError' ||
          error?.name === 'ConstraintNotSatisfiedError';
        if (!shouldTryNext) {
          throw error;
        }
      }
    }

    throw lastError;
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
      const acquiredStreams: MediaStream[] = [];
      let micGranted = !useMic;
      let cameraGranted = !useCamera;

      if (useMic) {
        try {
          const audioStream = await getAudioStreamSafe();
          acquiredStreams.push(audioStream);
          micGranted = true;
        } catch (micErr) {
          console.warn("[Permissions] Mic request failed", micErr);
          micGranted = false;
        }
      }

      if (useCamera) {
        try {
          const cameraStream = await getVideoStreamSafe('user');
          acquiredStreams.push(cameraStream);
          cameraGranted = true;
        } catch (camErr) {
          console.warn("[Permissions] Camera request failed", camErr);
          cameraGranted = false;
        }
      }

      if (useMic) setMicStatus(micGranted ? 'granted' : 'denied');
      if (useCamera) setCameraStatus(cameraGranted ? 'granted' : 'denied');

      if (micGranted) {
        // Warm up AudioContext while still inside user gesture path.
        try {
          const ctx = await getSharedAudioContext();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
        } catch (ctxErr) {
          console.warn("AudioContext resume warning:", ctxErr);
        }
      }

      acquiredStreams.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      console.log("[Permissions] Access flow completed & hardware released");

      if (useMic && !micGranted) {
        setInputMode('text');
      }

    } catch (e: any) {
      console.warn("[Permissions] Request failed or denied completely", e);
      
      if (useMic) setMicStatus('denied');
      if (useCamera) setCameraStatus('denied');
      
      let msg = language === 'vi' ? "Không thể truy cập thiết bị." : "Unable to access device.";
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
         msg = language === 'vi'
           ? "Bạn đã từ chối cấp quyền. Ứng dụng sẽ chuyển sang chế độ Chat."
           : "Permission denied. Switching to chat mode.";
      } else if (e.name === 'NotFoundError') {
         msg = language === 'vi' ? "Không tìm thấy thiết bị." : "Device not found.";
      } else if (e.name === 'OverconstrainedError') {
         msg = language === 'vi'
           ? "Thiết bị không hỗ trợ định dạng này."
           : "This device does not support requested constraints.";
      }

      setSnackbar({ text: msg, kind: "warn" });
      
      if (useMic) {
        setInputMode('text');
      }
    }
  }, [setMicStatus, setCameraStatus, setSnackbar, setInputMode, language]);

  /**
   * Lazy Camera Request
   */
  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (cameraStatus === 'granted') return true;
    
    setCameraStatus('prompting');
    try {
      const stream = await getVideoStreamSafe('environment');
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
