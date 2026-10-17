import React from 'react';

interface MentoraNoteProps {
  label?: string;
  source?: 'ai' | 'builtin';
  children: React.ReactNode;
  className?: string;
}

export const MentoraNote: React.FC<MentoraNoteProps> = ({
  label = 'Mentora',
  source = 'builtin',
  children,
  className = '',
}) => {
  return (
    <aside
      className={`border-l border-[#E6E1D8] pl-3.5 py-1 text-[14px] leading-relaxed ${className}`}
      role="note"
      aria-label={label}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#666B75]">
          {label}
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[#EEECE7] text-[#5F646D]">
          {source === 'ai' ? 'AI · Gemini' : 'Built-in'}
        </span>
      </div>
      <div className="text-[#16181D]">{children}</div>
    </aside>
  );
};
