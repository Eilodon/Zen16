
import React, { useState } from 'react';
import { Languages, Mic, Keyboard, Globe, Wind, CloudRain, Music, Bell, Waves, VolumeX, TreePine, Info } from 'lucide-react';
import { haptic } from '../utils/designSystem';
import { Language, InputMode, CulturalMode } from '../types';

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

const BREATHING_OPTIONS = [
    { id: '4-7-8' as const, label: '4-7-8', desc: 'Thở vào 4s, giữ 7s, thở ra 8s' },
    { id: 'box-breathing' as const, label: 'Box', desc: 'Đều nhịp 4-4-4-4' },
    { id: 'coherent-breathing' as const, label: 'Coherent', desc: 'Thở chậm 5.5 nhịp/phút' },
];

const AMBIENT_OPTIONS = [
    { id: 'rain', icon: <CloudRain size={16} strokeWidth={1.5} />, label: 'Mưa' },
    { id: 'bowl', icon: <Music size={16} strokeWidth={1.5} />, label: 'Singing Bowl' },
    { id: 'bell', icon: <Bell size={16} strokeWidth={1.5} />, label: 'Chuông' },
    { id: 'mekong', icon: <Waves size={16} strokeWidth={1.5} />, label: 'Sông Mekong' },
    { id: 'monsoon', icon: <TreePine size={16} strokeWidth={1.5} />, label: 'Mưa rừng' },
    { id: 'silence', icon: <VolumeX size={16} strokeWidth={1.5} />, label: 'Tĩnh lặng' },
];

export const SettingsSheet: React.FC<Props> = ({
    language, inputMode, culturalMode,
    onLanguageChange, onInputModeChange, onCulturalModeChange,
    onStartBreathing, onAmbientChange, currentAmbient = 'silence',
}) => {
    return (
        <div className="space-y-6 pb-8">
            {/* Section: General */}
            <Section title="Cài đặt chung">
                {/* Language */}
                <SettingRow
                    icon={<Languages size={16} strokeWidth={1.5} />}
                    label="Ngôn ngữ"
                >
                    <TogglePill
                        options={[
                            { id: 'vi', label: 'Tiếng Việt' },
                            { id: 'en', label: 'English' },
                        ]}
                        value={language}
                        onChange={(v) => { onLanguageChange(v as Language); haptic('selection'); }}
                    />
                </SettingRow>

                {/* Input Mode */}
                <SettingRow
                    icon={inputMode === 'voice' ? <Mic size={16} strokeWidth={1.5} /> : <Keyboard size={16} strokeWidth={1.5} />}
                    label="Chế độ nhập"
                >
                    <TogglePill
                        options={[
                            { id: 'voice', label: '🎤 Giọng nói' },
                            { id: 'text', label: '⌨️ Bàn phím' },
                        ]}
                        value={inputMode}
                        onChange={(v) => { onInputModeChange(v as InputMode); haptic('selection'); }}
                    />
                </SettingRow>

                {/* Cultural Mode */}
                <SettingRow
                    icon={<Globe size={16} strokeWidth={1.5} />}
                    label="Chế độ văn hóa"
                >
                    <TogglePill
                        options={[
                            { id: 'Universal', label: '🌏 Universal' },
                            { id: 'VN', label: '🇻🇳 Việt Nam' },
                        ]}
                        value={culturalMode}
                        onChange={(v) => { onCulturalModeChange(v as CulturalMode); haptic('selection'); }}
                    />
                </SettingRow>
            </Section>

            {/* Section: Mindfulness */}
            <Section title="Chánh niệm">
                {/* Breathing */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Wind size={14} strokeWidth={1.5} style={{ color: '#f97316' }} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                            style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
                            Bài tập thở
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {BREATHING_OPTIONS.map((b) => (
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

                {/* Ambient Sound */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Music size={14} strokeWidth={1.5} style={{ color: 'var(--zen-stone)' }} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                            style={{ color: 'var(--zen-stone-dark, #57534e)' }}>
                            Âm thanh nền
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {AMBIENT_OPTIONS.map((a) => {
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

            {/* Section: About */}
            <Section title="Thông tin">
                <div className="flex items-start gap-3 p-3 rounded-[14px]"
                    style={{ background: 'rgba(120,113,108,0.03)', border: '1px solid rgba(120,113,108,0.05)' }}>
                    <Info size={16} strokeWidth={1.5} style={{ color: 'var(--zen-stone-light)', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                        <p className="text-[12px] font-semibold" style={{ color: 'var(--zen-stone-dark)' }}>Thầy.AI v1.0</p>
                        <p className="text-[10px] italic mt-1 leading-relaxed" style={{ fontFamily: 'var(--font-wisdom)', color: 'var(--zen-stone)' }}>
                            "Bước chân bình an trên mặt đất" — Lấy cảm hứng từ Thiền sư Thích Nhất Hạnh
                        </p>
                        <p className="text-[9px] mt-2" style={{ color: 'var(--zen-stone-light)' }}>
                            Zen16 Guardian · Google Gemini Live API · Made with 🧡
                        </p>
                    </div>
                </div>
            </Section>
        </div>
    );
};

/* --- Subcomponents --- */

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
