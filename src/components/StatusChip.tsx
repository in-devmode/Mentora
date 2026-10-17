import React from 'react';
import { CircleDashed, Check, Loader2, MinusCircle } from 'lucide-react';
import { ConceptStatus, HypothesisStatus } from '../lib/engine';

interface ConceptStatusChipProps {
  status: ConceptStatus;
  className?: string;
}

export const ConceptStatusChip: React.FC<ConceptStatusChipProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'not_assessed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[13px] font-medium leading-none ${className}`}
          style={{ backgroundColor: '#EEECE7', color: '#5F646D' }}
        >
          <CircleDashed className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Not assessed</span>
        </span>
      );
    case 'developing':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[13px] font-medium leading-none ${className}`}
          style={{ backgroundColor: '#FBF0D5', color: '#8A5A00' }}
        >
          {/* Half circle */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a6 6 0 0 0 0 12V2z" />
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>Developing</span>
        </span>
      );
    case 'likely_gap':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[13px] font-medium leading-none ${className}`}
          style={{ backgroundColor: '#F9E4DD', color: '#A23B22' }}
        >
          {/* Diamond */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2.5 L13.5 8 L8 13.5 L2.5 8 Z" />
          </svg>
          <span>Likely gap</span>
        </span>
      );
    case 'demonstrated':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[13px] font-medium leading-none ${className}`}
          style={{ backgroundColor: '#E1F1E8', color: '#1F6B47' }}
        >
          <Check className="w-3.5 h-3.5 stroke-[2]" />
          <span>Demonstrated</span>
        </span>
      );
  }
};

interface HypothesisStatusChipProps {
  status: HypothesisStatus;
  className?: string;
}

export const HypothesisStatusChip: React.FC<HypothesisStatusChipProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'untested':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[13px] font-medium leading-none ${className}`}
          style={{ backgroundColor: '#EEECE7', color: '#5F646D' }}
        >
          <CircleDashed className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Untested</span>
        </span>
      );
    case 'testing':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[13px] font-medium leading-none ${className}`}
          style={{ backgroundColor: '#E9EDF8', color: '#27408B' }}
        >
          <Loader2 className="w-3.5 h-3.5 stroke-[1.8] animate-spin" />
          <span>Testing</span>
        </span>
      );
    case 'ruled_out':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[13px] font-medium leading-none ${className}`}
          style={{ backgroundColor: '#EEECE7', color: '#4B505A' }}
        >
          <MinusCircle className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Ruled out for now</span>
        </span>
      );
    case 'likely_gap':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[13px] font-medium leading-none ${className}`}
          style={{ backgroundColor: '#F9E4DD', color: '#A23B22' }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2.5 L13.5 8 L8 13.5 L2.5 8 Z" />
          </svg>
          <span>Likely gap</span>
        </span>
      );
  }
};
