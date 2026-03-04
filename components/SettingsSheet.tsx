import React from 'react';
import {
    Languages,
    Mic,
    Keyboard,
    Globe,
    Wind,
    CloudRain,
    Music,
    Bell,
    Waves,
    VolumeX,
    TreePine,
    Info,
    Gauge,
    ShieldAlert,
    RefreshCcw,
    Eye,
} from 'lucide-react';
import { haptic } from '../utils/designSystem';
import { Language, InputMode, CulturalMode } from '../types';
import { useZenStore } from '../store/zenStore';
import { useShallow } from 'zustand/react/shallow';

interface Props {
    language: Language;
    inputMode: InputMode;
    culturalMode: CulturalMode;
    onLanguageChange: (lang: Language) => void;
    onInputModeChange: (mode: InputMode) => void;
    onCulturalModeChange: (mode: CulturalMode) => void;
    onStartBreathing: (type: '4-7-8' | 'box-breathing' | 'coherent-breathing') => void;
    onAmbientChange: (sound: string) => void;
    currentAmbient?: string;
}

const COPY = {
    vi: {
        general: 'Cài đặt chung',
        language: 'Ngôn ngữ',
        inputMode: 'Chế độ nhập',
        cultureMode: 'Chế độ văn hóa',
        mindfulness: 'Chánh niệm',
        breathing: 'Bài tập thở',
        ambient: 'Âm thanh nền',
        about: 'Thông tin',
        appTitle: 'Zen16 Guardian v2.0',
        aboutQuote: '"Bước chân bình an trên mặt đất" — Lấy cảm hứng từ Thiền sư Thích Nhất Hạnh',
        metrics: 'Chất lượng realtime',
        ttfb: 'TTFB âm thanh',
        reconnectRate: 'Tỷ lệ reconnect',
        authFailureRate: 'Tỷ lệ lỗi auth',
        visionDelivery: 'Khung hình thị giác',
        voice: '🎤 Giọng nói',
        keyboard: '⌨️ Bàn phím',
        universal: '🌏 Universal',
        vn: '🇻🇳 Việt Nam',
        rain: 'Mưa',
        bowl: 'Singing Bowl',
        bell: 'Chuông',
        mekong: 'Sông Mekong',
        monsoon: 'Mưa rừng',
        silence: 'Tĩnh lặng',
        noData: 'Chưa có dữ liệu',
        frames: 'khung',
        avg: 'TB',
    },
    en: {
        general: 'General',
        language: 'Language',
        inputMode: 'Input mode',
        cultureMode: 'Cultural mode',
        mindfulness: 'Mindfulness',
        breathing: 'Breathing practices',
        ambient: 'Ambient sound',
        about: 'About',
        appTitle: 'Zen16 Guardian v2.0',
        aboutQuote: '"Peace is every step" — Inspired by Thich Nhat Hanh',
        metrics: 'Realtime quality',
        ttfb: 'Audio TTFB',
        reconnectRate: 'Reconnect rate',
        authFailureRate: 'Auth failure rate',
        visionDelivery: 'Vision frame delivery',
        voice: '🎤 Voice',
        keyboard: '⌨️ Keyboard',
        universal: '🌏 Universal',
        vn: '🇻🇳 Vietnam',
        rain: 'Rain',
        bowl: 'Singing Bowl',
        bell: 'Bell',
        mekong: 'Mekong River',
        monsoon: 'Monsoon',
        silence: 'Silence',
        noData: 'No data yet',
        frames: 'frames',
        avg: 'Avg',
    },
} as const;

const BREATHING_OPTIONS = {
    vi: [
        { id: '4-7-8' as const, label: '4-7-8', desc: 'Thở vào 4s, giữ 7s, thở ra 8s' },
        { id: 'box-breathing' as const, label: 'Box', desc: 'Đều nhịp 4-4-4-4' },
        { id: 'coherent-breathing' as const, label: 'Coherent', desc: 'Thở chậm 5.5 nhịp/phút' },
    ],
    en: [
        { id: '4-7-8' as const, label: '4-7-8', desc: 'Inhale 4s, hold 7s, exhale 8s' },
        { id: 'box-breathing' as const, label: 'Box', desc: 'Balanced 4-4-4-4 cycle' },
        { id: 'coherent-breathing' as const, label: 'Coherent', desc: 'Slow 5.5 breaths/minute' },
    ],
} as const;

export const SettingsSheet: React.FC<Props> = ({
    language, inputMode, culturalMode,
    onLanguageChange, onInputModeChange, onCulturalModeChange,
    onStartBreathing, onAmbientChange, currentAmbient = 'silence',
}) => {
    const copy = COPY[language];
    const breathingOptions = BREATHING_OPTIONS[language];
    const metrics = useZenStore(useShallow((state) => state.metrics));

    const reconnectRate = metrics.reconnectAttempts > 0
        ? (metrics.reconnectSuccesses / metrics.reconnectAttempts) * 100
        : null;

    const authTotal = metrics.authRequests + metrics.authFailures;
    const authFailureRate = authTotal > 0
        ? (metrics.authFailures / authTotal) * 100
        : null;

    const visionTotal = metrics.visionFramesSent + metrics.visionFramesDropped;
    const visionDeliveryRate = visionTotal > 0
        ? (metrics.visionFramesSent / visionTotal) * 100
        : null;

    const ambientOptions = [
        { id: 'rain', icon: <CloudRain size={16} strokeWidth={1.5} />, label: copy.rain },
        { id: 'bowl', icon: <Music size={16} strokeWidth={1.5} />, label: copy.bowl },
        { id: 'bell', icon: <Bell size={16} strokeWidth={1.5} />, label: copy.bell },
        { id: 'mekong', icon: <Waves size={16} strokeWidth={1.5} />, label: copy.mekong },
        { id: 'monsoon', icon: <TreePine size={16} strokeWidth={1.5} />, label: copy.monsoon },
        { id: 'silence', icon: <VolumeX size={16} strokeWidth={1.5} />, label: copy.silence },
    ];

    return (
        <div className="space-y-6 pb-8">
            <Section title={copy.general}>
                <SettingRow icon={<Languages size={16} strokeWidth={1.5} />} label={copy.language}>
                    <TogglePill
                        options={[
                            { id: 'vi', label: 'Tiếng Việt' },
                            { id: 'en', label: 'English' },
                        ]}
                        value={language}
                        onChange={(v) => { onLanguageChange(v as Language); haptic('selection'); }}
                    />
                </SettingRow>

                <SettingRow
                    icon={inputMode === 'voice' ? <Mic size={16} strokeWidth={1.5} /> : <Keyboard size={16} strokeWidth={1.5} />}
                    label={copy.inputMode}
                >
                    <TogglePill
                        options={[
                            { id: 'voice', label: copy.voice },
                            { id: 'text', label: copy.keyboard },
                        ]}
                        value={inputMode}
                        onChange={(v) => { onInputModeChange(v as InputMode); haptic('selection'); }}
                    />
                </SettingRow>

                <SettingRow icon={<Globe size={16} strokeWidth={1.5} />} label={copy.cultureMode}>
                    <TogglePill
                        options={[
                            { id: 'Universal', label: copy.universal },
                            { id: 'VN', label: copy.vn },
                        ]}
                        value={culturalMode}
                        onChange={(v) => { onCulturalModeChange(v as CulturalMode); haptic('selection'); }}
                    />
                </SettingRow>
            </Section>

            <Section title={copy.mindfulness}>
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Wind size={14} strokeWidth={1.5} style={{ color: '#f97316' }} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                            style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
                            {copy.breathing}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {breathingOptions.map((b) => (
                            <button
                                key={b.id}
                                onClick={() => { onStartBreathing(b.id); haptic('success'); }}
                                className="flex flex-col items-center p-3 rounded-[14px] transition-all duration-300 active:scale-95 hover:scale-[1.02]"
                                style={{
                                    background: 'rgba(249,115,22,0.04)',
                                    border: '1px solid rgba(249,115,22,0.1)',
                                }}
                            >
                                <Wind size={18} strokeWidth={1.5} style={{ color: '#f97316', marginBottom: '6px' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--zen-stone-dark)' }}>{b.label}</span>
                                <span className="text-[8px] mt-0.5 text-center leading-tight" style={{ color: 'var(--zen-stone-light)', opacity: 0.7 }}>{b.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Music size={14} strokeWidth={1.5} style={{ color: 'var(--zen-stone)' }} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                            style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
                            {copy.ambient}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {ambientOptions.map((a) => {
                            const isActive = currentAmbient === a.id;
                            return (
                                <button
                                    key={a.id}
                                    onClick={() => { onAmbientChange(a.id); haptic('selection'); }}
                                    className="flex flex-col items-center p-3 rounded-[14px] transition-all duration-300 active:scale-95"
                                    style={{
                                        background: isActive ? 'rgba(249,115,22,0.08)' : 'rgba(120,113,108,0.03)',
                                        border: `1px solid ${isActive ? 'rgba(249,115,22,0.2)' : 'rgba(120,113,108,0.06)'}`,
                                    }}
                                >
                                    <div style={{ color: isActive ? '#f97316' : 'var(--zen-stone-light)', marginBottom: '4px' }}>
                                        {a.icon}
                                    </div>
                                    <span className="text-[10px] font-medium" style={{ color: isActive ? '#ea580c' : 'var(--zen-stone)' }}>
                                        {a.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Section>

            <Section title={copy.metrics}>
                <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                        icon={<Gauge size={14} strokeWidth={1.5} />}
                        label={copy.ttfb}
                        value={metrics.avgTtfbMs !== null ? `${Math.round(metrics.avgTtfbMs)} ms (${copy.avg})` : copy.noData}
                    />
                    <MetricCard
                        icon={<RefreshCcw size={14} strokeWidth={1.5} />}
                        label={copy.reconnectRate}
                        value={reconnectRate !== null ? `${Math.round(reconnectRate)}%` : copy.noData}
                    />
                    <MetricCard
                        icon={<ShieldAlert size={14} strokeWidth={1.5} />}
                        label={copy.authFailureRate}
                        value={authFailureRate !== null ? `${Math.round(authFailureRate)}%` : copy.noData}
                    />
                    <MetricCard
                        icon={<Eye size={14} strokeWidth={1.5} />}
                        label={copy.visionDelivery}
                        value={visionDeliveryRate !== null
                            ? `${Math.round(visionDeliveryRate)}% · ${metrics.visionFramesSent} ${copy.frames}`
                            : copy.noData}
                    />
                </div>
            </Section>

            <Section title={copy.about}>
                <div className="flex items-start gap-3 p-3 rounded-[14px]"
                    style={{ background: 'rgba(120,113,108,0.03)', border: '1px solid rgba(120,113,108,0.05)' }}>
                    <Info size={16} strokeWidth={1.5} style={{ color: 'var(--zen-stone-light)', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                        <p className="text-[12px] font-semibold" style={{ color: 'var(--zen-stone-dark)' }}>{copy.appTitle}</p>
                        <p className="text-[10px] italic mt-1 leading-relaxed" style={{ fontFamily: 'var(--font-wisdom)', color: 'var(--zen-stone)' }}>
                            {copy.aboutQuote}
                        </p>
                        <p className="text-[9px] mt-2" style={{ color: 'var(--zen-stone-light)' }}>
                            Zen16 Guardian · Google Gemini Live API · Built for Live Agents Challenge
                        </p>
                    </div>
                </div>
            </Section>
        </div>
    );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] mb-3 px-1"
            style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
            {title}
        </h4>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const SettingRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between p-3 rounded-[14px]"
        style={{ background: 'rgba(120,113,108,0.03)', border: '1px solid rgba(120,113,108,0.05)' }}>
        <div className="flex items-center gap-2.5">
            <div style={{ color: 'var(--zen-stone)' }}>{icon}</div>
            <span className="text-[13px] font-medium" style={{ color: 'var(--zen-stone-dark, #57534e)' }}>{label}</span>
        </div>
        {children}
    </div>
);

const MetricCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="rounded-[14px] p-3"
        style={{ background: 'rgba(120,113,108,0.03)', border: '1px solid rgba(120,113,108,0.05)' }}>
        <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--zen-stone-light)' }}>
            {icon}
            <span className="text-[9px] uppercase tracking-[0.12em]">{label}</span>
        </div>
        <p className="text-[12px] font-semibold" style={{ color: 'var(--zen-stone-dark)' }}>{value}</p>
    </div>
);

const TogglePill = ({ options, value, onChange }: {
    options: { id: string; label: string }[];
    value: string;
    onChange: (id: string) => void;
}) => (
    <div className="flex rounded-full p-0.5" style={{ background: 'rgba(120,113,108,0.06)' }}>
        {options.map((opt) => (
            <button
                key={opt.id}
                onClick={() => onChange(opt.id)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
                style={{
                    background: value === opt.id ? 'white' : 'transparent',
                    color: value === opt.id ? 'var(--zen-ink)' : 'var(--zen-stone-light)',
                    boxShadow: value === opt.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
            >
                {opt.label}
            </button>
        ))}
    </div>
);
