
import { useEffect, useState, useRef } from "react";

/**
 * Zen16 Guardian — Design Kit v2.0 "Wabi-Sabi Futurism"
 * Philosophy: Glass, Air, Stone, Saffron (Cà Sa)
 * Typography: Be Vietnam Pro (body) + Cormorant Garamond (wisdom)
 */

export const TOKENS = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, '3xl': 40, '4xl': 48 },
  radius: { 
    chip: 12, 
    card: 28, 
    cardLg: 36, 
    button: 16, 
    round: 999 
  },
  elevation: { 
    chip: "0 1px 3px rgba(0,0,0,0.06)", 
    card: "var(--glass-shadow)",
    cardElevated: "var(--glass-shadow-elevated)",
    float: "0 12px 48px rgba(0,0,0,0.12)",
    saffron: "var(--glass-shadow-saffron)",
    glow: (color: string, opacity = 0.25) => `0 0 24px rgba(${color}, ${opacity})`,
  },
  typography: { 
    label: { size: 12, weight: 600, family: 'var(--font-body)' },
    body: { size: 15, weight: 400, family: 'var(--font-body)' },
    bodyLg: { size: 17, weight: 400, family: 'var(--font-body)' },
    wisdom: { size: 22, weight: 500, family: 'var(--font-wisdom)' },
    wisdomLg: { size: 28, weight: 500, family: 'var(--font-wisdom)' },
    heading: { size: 24, weight: 600, family: 'var(--font-body)' },
    micro: { size: 10, weight: 700, family: 'var(--font-body)' },
  },
  duration: { fast: 150, in: 300, out: 200, slow: 500, spring: 600 },
  easing: {
    spring: 'var(--ease-spring)',
    smooth: 'var(--ease-smooth)',
    outExpo: 'var(--ease-out-expo)',
    inOut: 'var(--ease-in-out)',
    bounce: 'var(--ease-bounce)',
  },
  materials: { 
    glassLight: 'var(--glass-clear)', 
    glassDark: 'var(--glass-frosted)',
    glassSubtle: 'var(--glass-subtle)',
    borderLight: 'var(--glass-border)',
    borderStrong: 'var(--glass-border-strong)',
  },
  colors: {
    primary: "#f97316",       // Saffron
    primaryDeep: "#ea580c",   // Deep Saffron
    primaryLight: "#fb923c",  // Light Saffron
    primaryGlow: "#fed7aa",   // Saffron Glow
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
    text: {
      primary: "#1c1917",
      secondary: "#57534e",
      muted: "#a8a29e",
      whisper: "#d6d3d1",
    }
  }
};

// ── Emotion → Gradient Map ──
export const EMOTION_GRADIENTS: Record<string, string> = {
  neutral: 'var(--grad-neutral)',
  joyful: 'var(--grad-joyful)',
  sad: 'var(--grad-sad)',
  anxious: 'var(--grad-anxious)',
  calm: 'var(--grad-calm)',
  seeking: 'var(--grad-seeking)',
  stressed: 'var(--grad-stressed)',
  confused: 'var(--grad-confused)',
  lonely: 'var(--grad-lonely)',
};

// ── Emotion → Accent Color ──
export const EMOTION_ACCENT: Record<string, string> = {
  neutral: '#78716c',
  joyful: '#f59e0b',
  sad: '#3b82f6',
  anxious: '#ea580c',
  calm: '#10b981',
  seeking: '#8b5cf6',
  stressed: '#f43f5e',
  confused: '#06b6d4',
  lonely: '#6366f1',
};

// ----- Haptics util -----
export function haptic(kind: 'success' | 'warn' | 'error' | 'selection' | 'light' = 'selection') {
  try {
    if (!('vibrate' in navigator)) return;
    
    switch (kind) {
      case 'success': navigator.vibrate([10, 30, 10]); break;
      case 'warn': navigator.vibrate([15, 50, 15]); break;
      case 'error': navigator.vibrate([50, 100, 50]); break;
      case 'light': navigator.vibrate(5); break;
      case 'selection': navigator.vibrate(10); break;
    }
  } catch (e) {
    // Ignore haptic errors
  }
}

// ----- Long Press util -----
export function useLongPress(callback = () => {}, ms = 500) {
  const timerRef = useRef<any>(null);
  
  const start = () => { 
    timerRef.current = setTimeout(() => {
      haptic('success');
      callback();
    }, ms); 
  };
  
  const clear = () => { 
    if (timerRef.current) { 
      clearTimeout(timerRef.current); 
      timerRef.current = null; 
    } 
  };

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear
  };
}

// ----- Streaming Text Hook -----
export function useStreamingText(content: string, isGenerating: boolean, speed = 28) {
  const [stream, setStream] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!content) {
      setStream("");
      return;
    }
    
    if (!isGenerating && stream === content) return;

    setStream("");
    setIsDone(false);
    
    let i = 0;
    const textToType = content; 
    
    const id = setInterval(() => {
      setStream(s => {
        const next = textToType.slice(0, i + 1);
        return next;
      });
      i++;
      if (i >= textToType.length) {
        clearInterval(id);
        setIsDone(true);
      }
    }, speed);

    return () => clearInterval(id);
  }, [content, isGenerating]);

  return { stream, isDone };
}

// ----- CSS Variable Helper -----
export function cssVar(name: string): string {
  return `var(--${name})`;
}
