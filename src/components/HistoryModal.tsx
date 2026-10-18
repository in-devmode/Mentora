import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MathHistoryItem,
  fetchMathHistory,
  deleteMathHistoryItem,
} from '../lib/history';
import { MathView } from './MathView';
import {
  X,
  History,
  Search,
  Trash2,
  ArrowRight,
  BookOpen,
  Sparkles,
  LogIn,
} from 'lucide-react';

interface HistoryModalProps {
  onSelectProblem?: (item: MathHistoryItem) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ onSelectProblem }) => {
  const { isHistoryModalOpen, closeModals, openAuthModal, user, isAnonymous } = useAuth();
  const [items, setItems] = useState<MathHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');

  // Load history when modal opens
  useEffect(() => {
    if (isHistoryModalOpen) {
      setLoading(true);
      fetchMathHistory(user?.uid)
        .then((data) => {
          setItems(data);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isHistoryModalOpen, user?.uid]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHistoryModalOpen) {
        e.preventDefault();
        closeModals();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHistoryModalOpen, closeModals]);

  if (!isHistoryModalOpen) return null;

  const topics = ['All', ...Array.from(new Set(items.map((i) => i.topic).filter(Boolean)))];

  const filteredItems = items.filter((item) => {
    const matchesTopic = selectedTopic === 'All' || item.topic === selectedTopic;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.problemText.toLowerCase().includes(q) ||
      (item.topic && item.topic.toLowerCase().includes(q)) ||
      (item.subtopic && item.subtopic.toLowerCase().includes(q)) ||
      (item.finalAnswerPlain && item.finalAnswerPlain.toLowerCase().includes(q));
    return matchesTopic && matchesSearch;
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteMathHistoryItem(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSelect = (item: MathHistoryItem) => {
    if (onSelectProblem) {
      onSelectProblem(item);
    }
    closeModals();
  };

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-[#FFFFFF] rounded-[10px] border border-[#E6E1D8] shadow-2xl max-w-[800px] w-full max-h-[85vh] flex flex-col text-left animate-in zoom-in-95 duration-150 relative">
        {/* Header */}
        <div className="p-5 border-b border-[#E6E1D8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[6px] bg-[#E9EDF8] text-[#27408B] flex items-center justify-center border border-[#27408B]/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="history-modal-title"
                className="font-serif text-[22px] font-medium text-[#16181D]"
              >
                Math Solving History
              </h2>
              <p className="text-[12px] text-[#666B75]">
                {items.length} {items.length === 1 ? 'problem' : 'problems'} recorded in your notebook
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModals}
            className="text-[#666B75] hover:text-[#16181D] p-1.5 rounded-[4px] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
            aria-label="Close history modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Anonymous sync alert banner */}
        {isAnonymous && (
          <div className="px-5 py-2.5 bg-[#FAF8F4] border-b border-[#E6E1D8] flex items-center justify-between gap-3 text-[12px] text-[#4B505A]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#27408B] shrink-0" />
              <span>
                Saving locally to this browser. Sign in or register to sync your math history across devices.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="text-[#27408B] font-medium hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in</span>
            </button>
          </div>
        )}

        {/* Controls: Search + Topic filters */}
        <div className="p-4 border-b border-[#E6E1D8] space-y-3 bg-[#FFFFFF] shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#666B75]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search math problems, topics, or formulas…"
              className="w-full h-[36px] pl-9 pr-3 rounded-[6px] border border-[#E6E1D8] bg-[#FAF8F4] text-[13px] text-[#16181D] placeholder:text-[#666B75]/50 focus:border-[#27408B] focus:bg-white focus:outline-hidden"
            />
          </div>

          {topics.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[12px] scrollbar-none">
              {topics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTopic(t)}
                  className={`px-2.5 py-1 rounded-[4px] whitespace-nowrap transition-colors cursor-pointer ${
                    selectedTopic === t
                      ? 'bg-[#16181D] text-[#FAF8F4] font-medium'
                      : 'bg-[#FAF8F4] hover:bg-[#E9EDF8] text-[#4B505A] border border-[#E6E1D8]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Problems List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-[13px] text-[#666B75] font-mono">
              Loading your math history…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF8F4] border border-[#E6E1D8] mx-auto flex items-center justify-center text-[#666B75]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-[15px] font-medium text-[#16181D]">No math history found</p>
                <p className="text-[13px] text-[#666B75] max-w-[40ch] mx-auto">
                  {searchQuery
                    ? 'No saved problems match your search.'
                    : 'Solve any math problem using the solver, and your step-by-step solutions will be archived here.'}
                </p>
              </div>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className="group p-4 rounded-[8px] border border-[#E6E1D8] bg-[#FFFFFF] hover:border-[#27408B]/40 hover:bg-[#FAF8F4]/50 transition-all cursor-pointer space-y-2.5 text-left relative"
              >
                {/* Top tags */}
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-[3px] bg-[#E9EDF8] text-[#27408B] font-medium">
                      {item.topic}
                    </span>
                    {item.subtopic && (
                      <span className="px-2 py-0.5 rounded-[3px] bg-[#FAF8F4] text-[#4B505A] border border-[#E6E1D8]">
                        {item.subtopic}
                      </span>
                    )}
                    <span className="text-[#666B75]">
                      {item.steps?.length ?? 0} steps
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[#666B75]">{formatDate(item.createdAt)}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Delete from history"
                      className="p-1 rounded text-[#666B75] hover:text-[#9B1C1C] hover:bg-[#FDE8E8] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Problem math expression */}
                <div className="font-serif text-[18px] text-[#16181D] py-0.5 overflow-x-auto">
                  <MathView content={item.problemLatex || item.problemText} />
                </div>

                {/* Final answer preview and CTA */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E6E1D8]/60 text-[12px]">
                  <div className="flex items-center gap-1.5 text-[#4B505A]">
                    <span className="text-[#666B75] font-mono">Answer:</span>
                    <span className="font-mono font-medium text-[#16181D]">
                      {item.finalAnswerPlain || 'Solved'}
                    </span>
                  </div>

                  <span className="text-[#27408B] font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Review solution</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#E6E1D8] bg-[#FAF8F4] flex items-center justify-between text-[11px] text-[#666B75] shrink-0">
          <span>Click any problem to load its complete step-by-step solution.</span>
          <span>
            Press <kbd className="px-1 py-0.5 rounded bg-[#EEECE7] text-[#16181D] border border-[#E6E1D8]">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
