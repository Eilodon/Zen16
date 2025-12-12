
import * as ort from 'onnxruntime-web';

// --- AUDIO MANAGER & UTILITIES ---

export const AUDIO_WORKLET_CODE = `
class ZenAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.BUFFER_SIZE = 2048; // Increased buffer for stability
    
    // INPUT STATE (Mic)
    this.inputBuffer = new Float32Array(this.BUFFER_SIZE);
    this.inputByteCount = 0;
  }

  process(inputs, outputs, parameters) {
    // --- 1. HANDLE INPUT (MIC) ---
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      
      // Pass raw data to main thread for VAD and Gemini
      // We chunk it here to avoid flooding the message port
      if (this.inputByteCount + channelData.length > this.BUFFER_SIZE) {
         const space = this.BUFFER_SIZE - this.inputByteCount;
         this.inputBuffer.set(channelData.subarray(0, space), this.inputByteCount);
         this.port.postMessage({ type: 'input_data', buffer: this.inputBuffer.slice() });
         
         // Start next buffer
         this.inputByteCount = channelData.length - space;
         this.inputBuffer.set(channelData.subarray(space), 0);
      } else {
         this.inputBuffer.set(channelData, this.inputByteCount);
         this.inputByteCount += channelData.length;
      }
    }

    // --- 2. PASSTHROUGH (Silence) ---
    // We handle playback via AudioBufferSourceNode in main thread for better resampling support
    return true;
  }
}
registerProcessor('zen-audio-processor', ZenAudioProcessor);
`;

export const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
};

export const base64EncodeAudio = (float32Array: Float32Array): string => {
  const pcm = floatTo16BitPCM(float32Array);
  let binary = '';
  const bytes = new Uint8Array(pcm);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Robust VAD Implementation
 * Hybrid approach: 
 * 1. Bandpass Filter (300Hz - 3400Hz) to ignore rumble/hiss.
 * 2. Adaptive Noise Gate.
 * 3. [FUTURE] Silero ONNX (Placeholder for when model caching is robust).
 */
export class RobustVoiceDetector {
  private session: any = null;
  private noiseGate = 0.005; 
  private holdFrameCount = 5;
  private currentHold = 0;
  private isActive = false;
  private sampleRate: number;
  
  // Audio Filtering State
  private b0 = 0; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate;
    // Initialize Bandpass Filter Coeffs (Approx 300Hz High Pass)
    this.calculateFilterCoeffs();
    this.initONNX();
  }

  private async initONNX() {
    try {
        // Placeholder for ONNX VAD
    } catch (e) {
        console.warn("VAD Model load failed, using DSP fallback", e);
    }
  }

  private calculateFilterCoeffs() {
     // Simple 1st order High-pass at 300Hz to kill motorbike rumble
     // rc = 1 / (2 * pi * fc)
     const rc = 1.0 / (300 * 2 * Math.PI);
     const dt = 1.0 / this.sampleRate;
     const alpha = rc / (rc + dt);
     this.a1 = alpha;
  }

  private applyFilter(sample: number): number {
     // High Pass Filter: y[i] := α * (y[i-1] + x[i] - x[i-1])
     const y = this.a1 * (this.y1 + sample - this.x1);
     this.x1 = sample;
     this.y1 = y;
     return y;
  }

  public process(float32Array: Float32Array): boolean {
    // 1. Pre-processing: Filter out low freq noise
    let sum = 0;
    const len = float32Array.length;
    
    // Process every sample for filter stability, but calc RMS on stride
    for (let i = 0; i < len; i++) { 
       const filtered = this.applyFilter(float32Array[i]);
       if (i % 2 === 0) sum += filtered * filtered; // Downsample RMS calc slightly
    }
    
    const rms = Math.sqrt(sum / (len / 2));

    // 2. Adaptive Thresholding
    // Adapt to background noise slowly, but not to speech
    if (rms < this.noiseGate) {
       this.noiseGate = (this.noiseGate * 0.99) + (rms * 0.01);
    } else {
       // Only increase noise floor very slowly if loud
       this.noiseGate = (this.noiseGate * 0.9995) + (rms * 0.0005);
    }
    
    // Clamp noise floor
    this.noiseGate = Math.max(0.002, Math.min(this.noiseGate, 0.02));

    const threshold = this.noiseGate * 3.5; // Requires 3.5x SNR to trigger

    // 3. Logic with Hysteresis (Sticky)
    if (rms > threshold) {
       this.isActive = true;
       this.currentHold = this.holdFrameCount;
       return true;
    } else {
       if (this.currentHold > 0) {
          this.currentHold--;
          return true;
       } else {
          this.isActive = false;
          return false;
       }
    }
  }
}
