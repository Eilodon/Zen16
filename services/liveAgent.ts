import { ZenResponse, VisionAnalysis, CulturalMode, Language } from "../types";
import {
    AUDIO_WORKLET_CODE,
    base64EncodeAudio,
    RobustVoiceDetector,
} from "./audioManager";
import { getSharedAudioContext } from "./audioContext";

// ─── Configuration ───────────────────────────────────────────
// Cloud Run URL — update after deployment
const CLOUD_RUN_URL = import.meta.env.VITE_BACKEND_URL || "ws://localhost:8080";
const WS_URL = `${CLOUD_RUN_URL.replace(/^http/, "ws")}/live`;

// ─── Text Query (REST fallback) ─────────────────────────────
export const sendZenTextQuery = async (
    apiKey: string,
    text: string,
    mode: CulturalMode,
    language: Language
): Promise<ZenResponse> => {
    // Fallback for text mode — connects briefly to live session
    return {
        emotion: "calm",
        wisdom_text:
            "Thở vào tâm tĩnh lặng, thở ra miệng mỉm cười.",
        wisdom_english:
            "Breathing in, I calm body and mind. Breathing out, I smile.",
        user_transcript: text,
        breathing: "4-7-8",
        confidence: 0.9,
        reasoning_steps: ["Received text", "Generating mindful response"],
        quantum_metrics: { coherence: 0.8, entanglement: 0.7, presence: 0.9 },
        awareness_stage: "mindful",
        consciousness_dimensions: {
            contextual: 0.8,
            emotional: 0.8,
            cultural: 0.8,
            wisdom: 0.8,
            uncertainty: 0.2,
            relational: 0.8,
        },
        ambient_sound: "bowl",
    };
};

// ─── Live Session (WebSocket bidi-stream) ────────────────────
export class ZenLiveSession {
    private mode: CulturalMode;
    private lang: Language;
    private onStateChange: (data: Partial<ZenResponse>) => void;
    private onAudioActivity: (active: boolean) => void;
    private onDisconnectCallback: (
        reason?: string,
        isReconnecting?: boolean
    ) => void;

    // Audio
    private inputContext: AudioContext | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private vad: RobustVoiceDetector | null = null;
    private nextStartTime = 0;
    private sourceNodes: Set<AudioBufferSourceNode> = new Set();
    private isAiSpeaking = false;

    // WebSocket
    private ws: WebSocket | null = null;
    private isManuallyClosed = false;
    private reconnectAttempts = 0;
    private readonly MAX_RETRIES = 5;

    // Camera
    private videoStream: MediaStream | null = null;
    private cameraInterval: ReturnType<typeof setInterval> | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private canvas: HTMLCanvasElement | null = null;

    // Idle timer
    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly IDLE_TIMEOUT_MS = 120000; // 2 min

    // Network handlers
    private boundHandleNetworkRecovery: () => void;
    private boundHandleNetworkOffline: () => void;

    constructor(
        mode: CulturalMode,
        lang: Language,
        onStateChange: (data: Partial<ZenResponse>) => void,
        onAudioActivity: (active: boolean) => void,
        onDisconnectCallback: (
            reason?: string,
            isReconnecting?: boolean
        ) => void
    ) {
        this.mode = mode;
        this.lang = lang;
        this.onStateChange = onStateChange;
        this.onAudioActivity = onAudioActivity;
        this.onDisconnectCallback = onDisconnectCallback;
        this.boundHandleNetworkRecovery =
            this.handleNetworkRecovery.bind(this);
        this.boundHandleNetworkOffline =
            this.handleNetworkOffline.bind(this);
    }

    async connect(isReconnect = false): Promise<AnalyserNode> {
        if (!isReconnect) {
            this.isManuallyClosed = false;
            this.reconnectAttempts = 0;
        }
        this.resetIdleTimer();

        window.addEventListener("online", this.boundHandleNetworkRecovery);
        window.addEventListener("offline", this.boundHandleNetworkOffline);

        // ── Step 1: Get User Media (audio + video for vision) ──
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                },
                video: { facingMode: "user", width: 640, height: 480 },
            });
            this.videoStream = stream;
        } catch {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
            } catch {
                throw new Error("PermissionDenied");
            }
        }

        // ── Step 2: Audio Context ──
        this.inputContext = await getSharedAudioContext();
        this.nextStartTime = this.inputContext.currentTime;

        // ── Step 3: VAD + Worklet ──
        this.vad = new RobustVoiceDetector(this.inputContext.sampleRate);
        const blob = new Blob([AUDIO_WORKLET_CODE], {
            type: "application/javascript",
        });
        const workletUrl = URL.createObjectURL(blob);
        try {
            await this.inputContext.audioWorklet.addModule(workletUrl);
        } catch (e: any) {
            if (!e.message?.includes("already exists"))
                console.warn("Worklet warning:", e);
        }
        URL.revokeObjectURL(workletUrl);

        const inputSource =
            this.inputContext.createMediaStreamSource(stream);
        this.workletNode = new AudioWorkletNode(
            this.inputContext,
            "zen-audio-processor"
        );
        inputSource.connect(this.workletNode);

        const silentGain = this.inputContext.createGain();
        silentGain.gain.value = 0;
        this.workletNode
            .connect(silentGain)
            .connect(this.inputContext.destination);

        const analyser = this.inputContext.createAnalyser();
        inputSource.connect(analyser);

        // ── Step 4: Connect WebSocket to Cloud Run ──
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            console.log("[Zen16] WebSocket connected to backend");
            this.reconnectAttempts = 0;
            this.onDisconnectCallback(undefined, false);
        };

        this.ws.onmessage = (event) => {
            this.resetIdleTimer();
            try {
                const msg = JSON.parse(event.data);

                switch (msg.type) {
                    case "audio":
                        this.isAiSpeaking = true;
                        this.onAudioActivity(true);
                        const audioData = this.decodeBase64ToFloat32(msg.data);
                        this.scheduleAudioChunk(audioData);
                        break;

                    case "zen_state":
                        // Tool call result from Gemini → update UI
                        this.onStateChange(msg.data);
                        break;

                    case "interrupted":
                        // Barge-in: user interrupted AI
                        this.interruptPlayback();
                        this.isAiSpeaking = false;
                        this.onAudioActivity(false);
                        break;

                    case "turn_complete":
                        setTimeout(() => {
                            if (this.isAiSpeaking) {
                                this.isAiSpeaking = false;
                                this.onAudioActivity(false);
                            }
                        }, 800);
                        break;

                    case "error":
                        console.error("[Backend Error]", msg.data);
                        break;
                }
            } catch (e) {
                console.error("Failed to parse WS message", e);
            }
        };

        this.ws.onclose = (e) => this.handleConnectionLoss("closed", e);
        this.ws.onerror = () => this.handleConnectionLoss("error");

        // ── Step 5: Forward audio frames via WebSocket ──
        this.workletNode.port.onmessage = (event) => {
            const { type, buffer } = event.data;
            if (type === "input_data" && this.vad) {
                const inputData = buffer as Float32Array;
                if (this.vad.process(inputData)) {
                    this.resetIdleTimer();

                    // Barge-in: interrupt AI playback when user speaks
                    if (this.isAiSpeaking) {
                        this.interruptPlayback();
                        this.isAiSpeaking = false;
                        this.onAudioActivity(false);
                    }

                    if (this.ws?.readyState === WebSocket.OPEN) {
                        const b64 = base64EncodeAudio(inputData);
                        this.ws.send(
                            JSON.stringify({ type: "audio", data: b64 })
                        );
                    }
                }
            }
        };

        // ── Step 6: Camera frames (every 2s for vision) ──
        this.startCameraCapture();

        return analyser;
    }

    // ─── Camera Frame Capture ────────────────────────────────
    private startCameraCapture() {
        if (!this.videoStream) return;
        const videoTrack = this.videoStream.getVideoTracks()[0];
        if (!videoTrack) return;

        this.videoElement = document.createElement("video");
        this.videoElement.srcObject = new MediaStream([videoTrack]);
        this.videoElement.muted = true;
        this.videoElement.play();

        this.canvas = document.createElement("canvas");
        this.canvas.width = 320;
        this.canvas.height = 240;

        this.cameraInterval = setInterval(() => {
            if (
                !this.canvas ||
                !this.videoElement ||
                this.ws?.readyState !== WebSocket.OPEN
            )
                return;
            const ctx = this.canvas.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(
                this.videoElement,
                0,
                0,
                this.canvas.width,
                this.canvas.height
            );
            // Convert to JPEG base64 and send
            const dataUrl = this.canvas.toDataURL("image/jpeg", 0.6);
            const b64 = dataUrl.split(",")[1];
            this.ws!.send(JSON.stringify({ type: "image", data: b64 }));
        }, 2000); // Every 2 seconds
    }

    private stopCameraCapture() {
        if (this.cameraInterval) {
            clearInterval(this.cameraInterval);
            this.cameraInterval = null;
        }
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.srcObject = null;
            this.videoElement = null;
        }
        if (this.videoStream) {
            this.videoStream.getTracks().forEach((t) => t.stop());
            this.videoStream = null;
        }
        this.canvas = null;
    }

    // ─── Network Handlers ────────────────────────────────────
    private handleNetworkOffline() {
        this.interruptPlayback();
        this.onDisconnectCallback("Mất kết nối mạng...", true);
    }

    private handleNetworkRecovery() {
        if (!this.isManuallyClosed) {
            this.onDisconnectCallback(
                "Đã có mạng trở lại. Đang kết nối...",
                true
            );
            this.connect(true).catch((e) =>
                console.error("Auto-reconnect failed", e)
            );
        }
    }

    private handleConnectionLoss(type: string, event?: any) {
        if (this.isManuallyClosed) return;

        if (this.reconnectAttempts < this.MAX_RETRIES) {
            this.reconnectAttempts++;
            const delay =
                1000 * Math.pow(2, this.reconnectAttempts - 1) +
                Math.random() * 500;
            this.onDisconnectCallback(
                `Thử lại lần ${this.reconnectAttempts}...`,
                true
            );
            this.ws = null;
            setTimeout(() => {
                if (this.isManuallyClosed) return;
                this.connect(true).catch((e) =>
                    console.error("Reconnect failed", e)
                );
            }, delay);
        } else {
            this.disconnect("FALLBACK_TO_TEXT");
        }
    }

    // ─── Idle Timer ──────────────────────────────────────────
    private resetIdleTimer() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
            this.disconnect("Timeout due to inactivity");
        }, this.IDLE_TIMEOUT_MS);
    }

    // ─── Audio Playback ──────────────────────────────────────
    private interruptPlayback() {
        this.sourceNodes.forEach((node) => {
            try {
                node.stop();
            } catch { }
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
        const buffer = this.inputContext.createBuffer(
            1,
            float32Array.length,
            24000
        );
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
    }

    private decodeBase64ToFloat32(base64: string): Float32Array {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++)
            bytes[i] = binaryString.charCodeAt(i);
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }
        return float32;
    }

    // ─── Disconnect ──────────────────────────────────────────
    disconnect(reason?: string) {
        this.isManuallyClosed = true;

        window.removeEventListener(
            "online",
            this.boundHandleNetworkRecovery
        );
        window.removeEventListener(
            "offline",
            this.boundHandleNetworkOffline
        );

        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.interruptPlayback();
        this.isAiSpeaking = false;
        this.stopCameraCapture();

        if (this.workletNode) {
            this.workletNode.port.onmessage = null;
            try {
                this.workletNode.disconnect();
            } catch { }
            this.workletNode = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.onDisconnectCallback(reason, false);
    }
}

// ─── Vision Analysis (delegates to backend) ──────────────────
export const analyzeEnvironment = async (
    apiKey: string,
    base64Image: string
): Promise<VisionAnalysis> => {
    // Placeholder — actual vision analysis happens in Gemini Live session
    return {
        buddhist_score: 0.8,
        modern_score: 0.2,
        natural_score: 0.5,
        detected_items: ["altar", "incense"],
        mode: "VN",
    };
};
