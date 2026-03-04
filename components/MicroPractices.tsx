
import React from 'react';
import { Coffee, Car, Footprints, Briefcase, Moon, Utensils } from 'lucide-react';
import { haptic } from '../utils/designSystem';
import { Language } from '../types';

interface Props {
  onSelect: (context: string) => void;
  disabled: boolean;
  lang: Language;
}

const PRACTICES = [
  {
    id: 'coffee',
    icon: <Coffee size={15} strokeWidth={1.5} />,
    vi: { label: 'Uống trà', prompt: 'Tôi đang uống trà. Hãy dạy tôi nhìn thấy cả vũ trụ trong chén trà này.' },
    en: { label: 'Morning Tea', prompt: 'I am drinking tea. Teach me to see the universe in this cup.' }
  },
  {
    id: 'traffic',
    icon: <Car size={15} strokeWidth={1.5} />,
    vi: { label: 'Kẹt xe', prompt: 'Tôi đang kẹt xe và thấy bực bội. Hãy giúp tôi biến tiếng còi xe thành tiếng chuông chánh niệm.' },
    en: { label: 'In Traffic', prompt: 'I am stuck in traffic and feeling frustrated. Transform this into a bell of mindfulness.' }
  },
  {
    id: 'walking',
    icon: <Footprints size={15} strokeWidth={1.5} />,
    vi: { label: 'Thiền hành', prompt: 'Tôi đang bước đi. Hãy hướng dẫn tôi hôn mặt đất bằng bàn chân mình.' },
    en: { label: 'Walking', prompt: 'I am walking. Guide me to kiss the earth with my feet.' }
  },
  {
    id: 'stress',
    icon: <Briefcase size={15} strokeWidth={1.5} />,
    vi: { label: 'Áp lực', prompt: 'Công việc làm tôi căng thẳng quá. Hãy giúp tôi trở về nương tựa nơi hơi thở.' },
    en: { label: 'Work Stress', prompt: 'I am overwhelmed at work. Help me return to the present moment.' }
  },
  {
    id: 'eating',
    icon: <Utensils size={15} strokeWidth={1.5} />,
    vi: { label: 'Ăn cơm', prompt: 'Tôi đang ăn. Hãy giúp tôi ăn trong chánh niệm và biết ơn muôn loài.' },
    en: { label: 'Mindful Eating', prompt: 'I am eating. Help me eat with gratitude for all beings who made this food.' }
  },
  {
    id: 'sleep',
    icon: <Moon size={15} strokeWidth={1.5} />,
    vi: { label: 'Mất ngủ', prompt: 'Tôi trằn trọc không ngủ được. Hãy ru tôi vào đại dương bình an.' },
    en: { label: 'Sleep', prompt: 'I cannot sleep. Guide me to rest in the ocean of consciousness.' }
  },
];

export const MicroPractices: React.FC<Props> = ({ onSelect, disabled, lang }) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex gap-2.5 px-3 min-w-max">
        {PRACTICES.map((p) => {
          const content = p[lang];
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                haptic('selection');
                onSelect(content.prompt);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 active:scale-95"
              style={{
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: disabled ? 'rgba(120,113,108,0.05)' : 'rgba(255,255,255,0.8)',
                border: `1px solid ${disabled ? 'rgba(120,113,108,0.1)' : 'rgba(120,113,108,0.1)'}`,
                color: disabled ? 'var(--zen-stone-light)' : 'var(--zen-stone-dark, #57534e)',
                boxShadow: disabled ? 'none' : '0 1px 4px rgba(0,0,0,0.03)',
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.background = 'rgba(249,115,22,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(249,115,22,0.15)';
                  e.currentTarget.style.color = '#ea580c';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(249,115,22,0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.borderColor = 'rgba(120,113,108,0.1)';
                  e.currentTarget.style.color = 'var(--zen-stone-dark, #57534e)';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.03)';
                }
              }}
            >
              {p.icon}
              <span className="text-[12px] font-medium whitespace-nowrap">{content.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
