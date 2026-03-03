import { ZenResponse, VisionAnalysis, CulturalMode, Language } from "../types";
import { AUDIO_WORKLET_CODE, base64EncodeAudio, RobustVoiceDetector } from "./audioManager";
import { getSharedAudioContext } from "./audioContext";

// Configuration for Backend
const WS_URL = "wss://zen16-guardian.run.app/live";
// Use local ws for dev if needed: const WS_URL = "ws://localhost:8000/live";

export const sendZenTextQuery = async (
    apiKey: string,
    text: string,
    mode: CulturalMode,
    language: Language
): Promise<ZenResponse> => {
    // Tạm thời fallback text query về một fake response hoặc WebSocket call (tuỳ implementation)
    // Để giữ blueprint đơn giản, cho text query fake response hoặc gọi HTTP /text-query nếu có.
    return {
        emotion: 'calm',
        wisdom_text: "Thở vào tâm tĩnh lặng, thở ra miệng mỉm cười.",
        wisdom_english: "Breathing in, I calm body and mind. Breathing out, I smile.",
        user_transcript: text,
        breathing: '4-7-8',
        confidence: 0.9,
        reasoning_steps: ['Received text', 'Generating mindful response'],
        quantum_metrics: { coherence: 0.8, entanglement: 0.7, presence: 0.9 },
        awareness_stage: 'mindful',
        consciousness_dimensions: { contextual: 0.8, emotional: 0.8, cultural: 0.8, wisdom: 0.8, uncertainty: 0.2, relational: 0.8 },
        ambient_sound: 'bowl'
    };
};

export class ZenLiveSession {
    private mode: CulturalMode;
    private lang: Language;
    private onStateChange: (data: Partial<ZenResponse>) => void;
    private onAudioActivity: (active: boolean) => void;
    private onDisconnectCallback: (reason?: string, isReconnecting?: boolean) => void;

    private inputContext: AudioContext | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private vad: RobustVoiceDetector | null = null;

    private ws: WebSocket | null = null;
    private nextStartTime = 0;
    private sourceNodes: Set<AudioBufferSourceNode> = new Set();
    private isAiSpeaking = false;

    constructor(
        mode: CulturalMode,
        lang: Language,
        onStateChange: (data: Partial<ZenResponse>) => void,
        onAudioActivity: (active: boolean) => void,
        onDisconnectCallback: (reason?: string, isReconnecting?: boolean) => void
    ) {
        this.mode = mode;
        this.lang = lang;
        this.onStateChange = onStateChange;
        this.onAudioActivity = onAudioActivity;
        this.onDisconnectCallback = onDisconnectCallback;
    }

    async connect(isReconnect = false): Promise<AnalyserNode> {
        // 1. Setup Audio Input
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); // Requesting video too as per vision blueprint
        } catch (err) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        this.inputContext = await getSharedAudioContext();
        this.nextStartTime = this.inputContext.currentTime;

        this.vad = new RobustVoiceDetector(this.inputContext.sampleRate);
        const blob = new Blob([AUDIO_WORKLET_CODE], { type: "application/javascript" });
        const workletUrl = URL.createObjectURL(blob);
        await this.inputContext.audioWorklet.addModule(workletUrl);

        const inputSource = this.inputContext.createMediaStreamSource(stream);
        this.workletNode = new AudioWorkletNode(this.inputContext, 'zen-audio-processor');
        inputSource.connect(this.workletNode);

        // Silence output to prevent echo
        const silentGain = this.inputContext.createGain();
        silentGain.gain.value = 0;
        this.workletNode.connect(silentGain).connect(this.inputContext.destination);

        const analyser = this.inputContext.createAnalyser();
        inputSource.connect(analyser);

        // 2. Setup WebSocket to Cloud Run
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            console.log("WebSocket connected to Cloud Run");
            this.onDisconnectCallback(undefined, false);
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Xử lý Audio
                if (data.audio) {
                    this.isAiSpeaking = true;
                    this.onAudioActivity(true);
                    const audioData = this.decodeBase64ToFloat32(data.audio);
                    this.scheduleAudioChunk(audioData);
                }

                // Xử lý Visual state / Animation
                if (data.visual) {
                    try {
                        const visualState = typeof data.visual === 'string' ? JSON.parse(data.visual) : data.visual;
                        // Trigger state change (orb animation etc.)
                        // Mocking a ZenResponse change
                        this.onStateChange({
                            emotion: 'calm',
                            // Map specific actions...
                        });
                    } catch (e) { }
                }
            } catch (e) {
                console.error("Failed to parse WS message", e);
            }
        };

        this.ws.onclose = () => {
            this.disconnect("WebSocket closed");
        };

        // 3. Send audio frames via WebSocket
        this.workletNode.port.onmessage = (event) => {
            const { type, buffer } = event.data;
            if (type === 'input_data' && this.vad) {
                const inputData = buffer as Float32Array;
                if (this.vad.process(inputData)) {
                    if (this.isAiSpeaking) {
                        this.interruptPlayback();
                        this.isAiSpeaking = false;
                        this.onAudioActivity(false);
                    }
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        // Gửi binary audio frame qua websocket
                        // backend mong nhận byte array hoặc json
                        // Ở đây mình gửi raw byte array
                        const encoded = new Uint8Array(inputData.buffer as ArrayBuffer);
                        this.ws.send(encoded);
                    }
                }
            }
        };

        return analyser;
    }

    private interruptPlayback() {
        this.sourceNodes.forEach(node => {
            try { node.stop(); } catch (e) { }
        });
        this.sourceNodes.clear();
        if (this.inputContext) {
            this.nextStartTime = this.inputContext.currentTime;
        }
    }

    private scheduleAudioChunk(float32Array: Float32Array) {
        if (!this.inputContext) return;
        const now = this.inputContext.currentTime;
        if (this.nextStartTime < now) {
            this.nextStartTime = now + 0.05;
        }
        const buffer = this.inputContext.createBuffer(1, float32Array.length, 24000);
        buffer.copyToChannel(float32Array, 0);

        const source = this.inputContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.inputContext.destination);
        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;

        this.sourceNodes.add(source);
        source.onended = () => {
            this.sourceNodes.delete(source);
        };

        // Stop AI speaking state when audio queue finishes approximately
        setTimeout(() => {
            if (this.isAiSpeaking && this.sourceNodes.size === 0) {
                this.isAiSpeaking = false;
                this.onAudioActivity(false);
            }
        }, (buffer.duration * 1000) + 100);
    }

    private decodeBase64ToFloat32(base64: string): Float32Array {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }
        return float32;
    }

    disconnect(reason?: string) {
        this.interruptPlayback();
        this.isAiSpeaking = false;

        if (this.workletNode) {
            this.workletNode.port.onmessage = null;
            try { this.workletNode.disconnect(); } catch (e) { }
            this.workletNode = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.onDisconnectCallback(reason, false);
    }
}

export const analyzeEnvironment = async (apiKey: string, base64Image: string): Promise<VisionAnalysis> => {
    // Fake response cho compile, thực tế Cloud Run sẽ xử lý vision
    return {
        buddhist_score: 0.8,
        modern_score: 0.2,
        natural_score: 0.5,
        detected_items: ['altar', 'incense'],
        mode: 'VN'
    };
};
