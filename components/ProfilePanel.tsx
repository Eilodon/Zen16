import React, { useState } from 'react';
import { User as UserIcon, LogOut, X } from 'lucide-react';
import { useUIStore, useZenStore } from '../store/zenStore';
import { haptic } from '../utils/designSystem';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

export const ProfilePanel: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, setUser, setIsOnboardingComplete } = useUIStore();
    const { history } = useZenStore();

    const handleLogout = async () => {
        if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            haptic('warn');
            try {
                if (!user?.isGuest && auth) {
                    await signOut(auth);
                }
                setUser(null);
                setIsOnboardingComplete(false);
                setIsOpen(false);
            } catch (error) {
                console.error("Logout error:", error);
            }
        }
    };

    const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : 'U';

    const sessionCount = history.length;
    const totalCoherence = history.reduce((acc, curr) => acc + (curr.quantum_metrics?.coherence || 0), 0);
    const avgCoherence = sessionCount > 0 ? (totalCoherence / sessionCount) * 100 : 0;

    return (
        <>
            <button
                onClick={() => { haptic('light'); setIsOpen(!isOpen); }}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(234,88,12,0.3)',
                }}
            >
                <span className="text-xs font-bold tracking-wider">{getInitials(user?.name || '')}</span>
            </button>

            {isOpen && (
                <div className="absolute top-16 right-4 z-50 w-72 flex flex-col rounded-[22px] overflow-hidden animate-scaleIn"
                    style={{
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(32px) saturate(1.5)',
                        WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
                        boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(255,255,255,0.6)',
                    }}>
                    {/* Header */}
                    <div className="p-5 text-center relative"
                        style={{ borderBottom: '1px solid rgba(120,113,108,0.06)' }}>
                        <button onClick={() => setIsOpen(false)}
                            className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 transition-colors"
                            style={{ color: 'var(--zen-stone-light, #a8a29e)' }}>
                            <X size={16} />
                        </button>
                        <div className="w-16 h-16 mx-auto mb-3 flex flex-col items-center justify-center rounded-full"
                            style={{ background: 'linear-gradient(135deg, #fcfaf8 0%, #f5f0eb 100%)', border: '1px solid #e7e5e4' }}>
                            <UserIcon size={24} style={{ color: '#ea580c' }} />
                        </div>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--zen-ink)' }}>{user?.name || 'Khách'}</h3>
                        <p className="text-[11px]" style={{ color: 'var(--zen-stone)' }}>{user?.isGuest ? 'Đang trải nghiệm ẩn danh' : (user?.email || 'Zen16 Member')}</p>
                    </div>

                    {/* Stats */}
                    <div className="flex px-4 py-5 gap-4" style={{ borderBottom: '1px solid rgba(120,113,108,0.06)' }}>
                        <div className="flex-1 text-center">
                            <div className="text-2xl font-light" style={{ fontFamily: 'var(--font-wisdom)', color: '#ea580c' }}>{sessionCount}</div>
                            <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--zen-stone-light)' }}>Phiên tĩnh tại</div>
                        </div>
                        <div className="w-px h-10" style={{ background: 'rgba(120,113,108,0.1)' }} />
                        <div className="flex-1 text-center">
                            <div className="text-2xl font-light" style={{ fontFamily: 'var(--font-wisdom)', color: '#3b82f6' }}>{Math.round(avgCoherence)}<span className="text-sm">%</span></div>
                            <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--zen-stone-light)' }}>Sự tập trung</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-3">
                        <button
                            onClick={handleLogout}
                            className="w-full py-2.5 text-[12px] font-medium rounded-[12px] transition-all duration-300 flex items-center justify-center gap-2 hover:bg-stone-50"
                            style={{ color: '#ef4444' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <LogOut size={14} /> Đăng xuất
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
