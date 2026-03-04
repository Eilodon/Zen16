import React, { useCallback, useState } from 'react';
import { Mic, SendHorizontal, Sparkles } from 'lucide-react';
import { AppState, Language } from '../types';

interface InputDockProps {
  language: Language;
  status: AppState;
  showPractices: boolean;
  onTogglePractices: () => void;
  onSendText: (text: string) => Promise<boolean>;
  onToggleInputMode: () => void;
}

function InputDockComponent({
  language,
  status,
  showPractices,
  onTogglePractices,
  onSendText,
  onToggleInputMode,
}: InputDockProps) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || status === 'processing') return;

    const sent = await onSendText(trimmed);
    if (sent) setInputText('');
  }, [inputText, onSendText, status]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        void handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex items-center gap-2 px-2 w-full max-w-md">
      <button
        onClick={onTogglePractices}
        className="p-2.5 rounded-full transition-all duration-300 shrink-0"
        style={{
          background: showPractices ? 'rgba(249,115,22,0.08)' : 'transparent',
          color: showPractices ? '#ea580c' : 'var(--zen-stone-light, #a8a29e)',
        }}
        title="Gợi ý thực hành"
      >
        <Sparkles size={18} strokeWidth={1.5} />
      </button>

      <div className="w-px h-5 rounded-full" style={{ background: 'rgba(120,113,108,0.08)' }} />

      <div className="flex-1 relative">
        <input
          type="text"
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={language === 'vi' ? 'Chia sẻ với tôi...' : 'Share with me...'}
          className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-base py-3 px-2"
          style={{
            fontFamily: 'var(--font-wisdom)',
            color: 'var(--zen-ink, #1c1917)',
            caretColor: '#f97316',
          }}
          autoFocus
        />
      </div>

      <button
        onClick={() => void handleSubmit()}
        disabled={!inputText.trim() || status === 'processing'}
        className="p-3 rounded-full text-white transition-all duration-300 disabled:opacity-40 active:scale-95"
        style={{
          background: inputText.trim() ? 'linear-gradient(135deg, #1c1917, #292524)' : '#d6d3d1',
          boxShadow: inputText.trim() ? '0 4px 16px rgba(28,25,23,0.2)' : 'none',
        }}
      >
        <SendHorizontal size={18} />
      </button>

      <div className="w-px h-5 rounded-full" style={{ background: 'rgba(120,113,108,0.08)' }} />

      <button
        onClick={onToggleInputMode}
        className="p-2 transition-colors duration-300 shrink-0"
        style={{ color: 'var(--zen-stone-light, #a8a29e)' }}
      >
        <Mic size={20} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export const InputDock = React.memo(InputDockComponent);
