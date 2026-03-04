import { ZenResponse, VisionAnalysis, CulturalMode, Language } from "../types";
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { getRandomTeaching, BUDDHIST_TEACHINGS } from "../data/buddhistTeachings";
import {
    AUDIO_WORKLET_CODE,
    floatTo16BitPCM,
    RobustVoiceDetector,
} from "./audioManager";
import { getSharedAudioContext } from "./audioContext";
import { buildWsUrlWithToken, getWebSocketAccessToken } from "./wsAuth";
import { telemetry } from "./telemetry";

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
    // Basic emotion matching heuristic from text
    const lowerText = text.toLowerCase();
    let detectedEmotion: ZenResponse['emotion'] = 'neutral';
    let teaching = null;

    // Direct context matching for micro-practices and specific topics
    if (lowerText.includes('trà') || lowerText.includes('tea')) {
        teaching = BUDDHIST_TEACHINGS.find(t => t.id === 'hh-02');
        detectedEmotion = 'calm';
    } else if (lowerText.includes('bước đi') || lowerText.includes('walking')) {
        teaching = BUDDHIST_TEACHINGS.find(t => t.id === 'hp-02');
        detectedEmotion = 'calm';
    } else if (lowerText.includes('ăn') || lowerText.includes('eating')) {
        teaching = BUDDHIST_TEACHINGS.find(t => t.id === 'cn-03');
        detectedEmotion = 'calm';
    } else if (lowerText.includes('kẹt xe') || lowerText.includes('traffic')) {
        teaching = BUDDHIST_TEACHINGS.find(t => t.id === 'hp-01');
        detectedEmotion = 'stressed';
    } else if (lowerText.includes('ngủ') || lowerText.includes('sleep')) {
        teaching = BUDDHIST_TEACHINGS.find(t => t.id === 'hp-03');
        detectedEmotion = 'anxious';
    } else {
        // Safe word matching to avoid partial matches (e.g. "chán" in "chánh niệm")
        const hasWord = (words: string) => new RegExp(`(^|\\s|[.,?!])(${words})(?=[\\s.,?!]|$)`, 'i').test(lowerText);

        if (hasWord('buồn|khóc|chán|mất|cô đơn|sad|lonely|cry|lost')) detectedEmotion = 'sad';
        else if (hasWord('giận|ghét|bực|tức|angry|hate|frustrated')) detectedEmotion = 'stressed';
        else if (hasWord('lo âu|sợ|căng thẳng|áp lực|stress|anxious|fear')) detectedEmotion = 'anxious';
        else if (hasWord('vui|hạnh phúc|happy|joy')) detectedEmotion = 'joyful';

        teaching = getRandomTeaching(detectedEmotion) || getRandomTeaching('neutral');
    }

    return {
        emotion: detectedEmotion,
        wisdom_text: language === 'vi' ? (teaching?.text_vi || "Hãy thở chậm lại.") : (teaching?.text_en || "Breathe slowly."),
        wisdom_english: teaching?.text_en || "Breathe slowly.",
        user_transcript: text,
        breathing: (teaching?.practice as ZenResponse['breathing']) || "4-7-8",
        confidence: 0.8,
        reasoning_steps: ["Offline Mode", `Detected emotion: ${detectedEmotion}`, "Selected matching teaching"],
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
        ambient_sound: "rain",
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
    private inputSource: MediaStreamAudioSourceNode | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private vad: RobustVoiceDetector | null = null;
    private nextStartTime = 0;
    private sourceNodes: Set<AudioBufferSourceNode> = new Set();
    private isAiSpeaking = false;

    // WebSocket
    private ws: WebSocket | null = null;
    private isManuallyClosed = false;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly MAX_RETRIES = 5;

    // Camera & Vision
    private videoStream: MediaStream | null = null;
    private cameraInterval: ReturnType<typeof setInterval> | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private faceLandmarker: FaceLandmarker | null = null;
    private blinkHistory: number[] = [];
    private lastContextSend = 0;
    private lastVisionFrameSend = 0;
    private pendingInterruptionAt: number | null = null;
    private readonly VISION_FRAME_INTERVAL_MS = 3000;

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
        telemetry.markSessionStart();
        this.pendingInterruptionAt = null;
        this.teardownConnectionState(true);
        this.resetIdleTimer();

        window.removeEventListener("online", this.boundHandleNetworkRecovery);
        window.removeEventListener("offline", this.boundHandleNetworkOffline);
        window.addEventListener("online", this.boundHandleNetworkRecovery);
        window.addEventListener("offline", this.boundHandleNetworkOffline);

        try {
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

            this.inputSource =
                this.inputContext.createMediaStreamSource(stream);
            this.workletNode = new AudioWorkletNode(
                this.inputContext,
                "zen-audio-processor"
            );
            this.inputSource.connect(this.workletNode);

            const silentGain = this.inputContext.createGain();
            silentGain.gain.value = 0;
            this.workletNode
                .connect(silentGain)
                .connect(this.inputContext.destination);

            const analyser = this.inputContext.createAnalyser();
            this.inputSource.connect(analyser);

            // ── Step 4.5: Init Face Landmarker (Background) ──
            this.initFaceLandmarker();

            // ── Step 5: Connect WebSocket to Cloud Run ──
            const wsAccessToken = await getWebSocketAccessToken();
            this.ws = new WebSocket(buildWsUrlWithToken(WS_URL, wsAccessToken));
            this.ws.binaryType = "arraybuffer";

            this.ws.onopen = () => {
                console.log("[Zen16] WebSocket connected to backend");
                if (this.reconnectAttempts > 0) {
                    telemetry.markReconnectSuccess();
                }
                this.reconnectAttempts = 0;
                this.onDisconnectCallback(undefined, false);
            };

            this.ws.onmessage = async (event) => {
                this.resetIdleTimer();
                if (event.data instanceof ArrayBuffer) {
                    // Incoming binary audio from Gemini
                    telemetry.markFirstAudioChunk();
                    if (this.pendingInterruptionAt) {
                        const recoveryMs = Math.max(0, Date.now() - this.pendingInterruptionAt);
                        telemetry.markInterruptionRecovery(recoveryMs);
                        this.pendingInterruptionAt = null;
                    }
                    this.isAiSpeaking = true;
                    this.onAudioActivity(true);
                    const audioData = this.decodeInt16ToFloat32(event.data);
                    this.scheduleAudioChunk(audioData);
                    return;
                }

                try {
                    const msg = JSON.parse(event.data as string);

                    switch (msg.type) {
                        case "zen_state":
                            // Tool call result from Gemini → update UI
                            this.onStateChange(msg.data);
                            break;

                        case "interrupted":
                            // Barge-in: user interrupted AI
                            this.pendingInterruptionAt = Date.now();
                            telemetry.markInterruption();
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
                            const buffer = floatTo16BitPCM(inputData);
                            this.ws.send(buffer);
                        }
                    }
                }
            };

            // ── Step 6: Camera frames (every 2s for vision) ──
            this.startCameraCapture();

            return analyser;
        } catch (error) {
            this.teardownConnectionState(true);
            throw error;
        }
    }

    // ─── Camera Frame & Vision Context Capture ────────────────
    private async initFaceLandmarker() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                    delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 1
            });
            console.log("[Zen16] FaceLandmarker initialized");
        } catch (e) {
            console.warn("Failed to init FaceLandmarker", e);
        }
    }

    private startCameraCapture() {
        if (!this.videoStream) return;
        const videoTrack = this.videoStream.getVideoTracks()[0];
        if (!videoTrack) return;

        this.videoElement = document.createElement("video");
        this.videoElement.srcObject = new MediaStream([videoTrack]);
        this.videoElement.muted = true;
        this.videoElement.play();

        this.cameraInterval = setInterval(() => {
            if (!this.videoElement) return;

            // 1. Process local vision tracking
            if (this.videoElement.videoWidth > 0 && this.faceLandmarker) {
                const results = this.faceLandmarker.detectForVideo(this.videoElement, performance.now());
                if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                    const shapes = results.faceBlendshapes[0].categories;
                    const blinkLeft = shapes.find(s => s.categoryName === 'eyeBlinkLeft')?.score || 0;
                    const blinkRight = shapes.find(s => s.categoryName === 'eyeBlinkRight')?.score || 0;

                    if (blinkLeft > 0.4 && blinkRight > 0.4) {
                        this.blinkHistory.push(Date.now());
                        // Keep only last 60 seconds
                        this.blinkHistory = this.blinkHistory.filter(t => Date.now() - t < 60000);
                    }

                    // Simple posture check via landmarks
                    // Nose (1), Top Head (10), Chin (152)
                    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                        const lm = results.faceLandmarks[0];
                        // If nose is closer to chin than top head in Y axis, looking down
                        // This is a naive heuristic
                        const lookingDown = lm[1].y > 0.7; // Lower on the screen

                        // Send telemetry to Gemini if significant
                        const now = Date.now();
                        if (now - this.lastContextSend > 10000 && this.ws?.readyState === WebSocket.OPEN) { // Throttle 10s
                            let contextMsg = "";
                            const bpm = this.blinkHistory.length;
                            if (bpm > 25) contextMsg += `[SYSTEM: User is blinking rapidly (${bpm} bpm). High cognitive load/anxiety possible.] `;
                            if (lookingDown) contextMsg += `[SYSTEM: User is looking down heavily. Suggest compassion/lifting spirits.] `;

                            if (contextMsg) {
                                // Send as text to inject context silently
                                this.ws.send(JSON.stringify({
                                    client_content: { turn: { parts: [{ text: contextMsg }] } }
                                }));
                                this.lastContextSend = now;
                            }
                        }
                    }
                }
            }

            // 2. Send compact JPEG frame to Gemini Live for real visual grounding
            if (
                this.ws?.readyState === WebSocket.OPEN &&
                this.videoElement.videoWidth > 0 &&
                Date.now() - this.lastVisionFrameSend >= this.VISION_FRAME_INTERVAL_MS
            ) {
                if (!this.canvas) {
                    this.canvas = document.createElement("canvas");
                }
                const width = 320;
                const aspect = this.videoElement.videoHeight / this.videoElement.videoWidth;
                const height = Math.max(180, Math.round(width * aspect));
                this.canvas.width = width;
                this.canvas.height = height;
                const ctx = this.canvas.getContext("2d");
                if (!ctx) {
                    telemetry.markVisionFrame(false);
                    return;
                }

                try {
                    ctx.drawImage(this.videoElement, 0, 0, width, height);
                    const dataUrl = this.canvas.toDataURL("image/jpeg", 0.6);
                    const base64Data = dataUrl.split(",")[1];
                    if (!base64Data) {
                        telemetry.markVisionFrame(false);
                        return;
                    }
                    this.ws.send(
                        JSON.stringify({
                            type: "image",
                            data: base64Data,
                        })
                    );
                    this.lastVisionFrameSend = Date.now();
                    telemetry.markVisionFrame(true);
                } catch (error) {
                    console.warn("[Zen16 Vision] Failed to send image frame", error);
                    telemetry.markVisionFrame(false);
                }
            }
        }, 1000); // 1 FPS analysis is enough for background context
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
        this.teardownConnectionState(false);

        if (this.reconnectAttempts < this.MAX_RETRIES) {
            telemetry.markReconnectAttempt();
            this.reconnectAttempts++;
            const delay =
                1000 * Math.pow(2, this.reconnectAttempts - 1) +
                Math.random() * 500;
            this.onDisconnectCallback(
                `Thử lại lần ${this.reconnectAttempts}...`,
                true
            );
            this.clearReconnectTimer();
            this.reconnectTimer = setTimeout(() => {
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
        // @ts-ignore - TS complains about ArrayBufferLike vs ArrayBuffer for float32Array
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

    private decodeInt16ToFloat32(buffer: ArrayBuffer): Float32Array {
        const int16 = new Int16Array(buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
        }
        return float32;
    }

    // ─── Disconnect ──────────────────────────────────────────
    disconnect(reason?: string) {
        this.isManuallyClosed = true;
        this.teardownConnectionState(true);
        this.onDisconnectCallback(reason, false);
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private teardownConnectionState(closeSocket: boolean) {
        this.clearReconnectTimer();
        this.pendingInterruptionAt = null;
        this.lastVisionFrameSend = 0;
        window.removeEventListener(
            "online",
            this.boundHandleNetworkRecovery
        );
        window.removeEventListener(
            "offline",
            this.boundHandleNetworkOffline
        );

        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }

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

        if (this.inputSource) {
            try {
                this.inputSource.disconnect();
            } catch { }
            this.inputSource = null;
        }

        if (this.ws) {
            const socket = this.ws;
            this.ws = null;
            socket.onclose = null;
            socket.onerror = null;
            if (closeSocket && socket.readyState < WebSocket.CLOSING) {
                try {
                    socket.close();
                } catch { }
            }
        }
    }
}

// ─── Vision Analysis (delegates to backend) ──────────────────
// DEPRECATED/PLACEHOLDER: Vision analysis is now handled natively by Gemini Live API
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
