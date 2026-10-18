import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOutUser } from '../lib/auth';
import { X, User, History, LogOut, CheckCircle2, Sparkles } from 'lucide-react';

export const ProfileModal: React.FC = () => {
  const { isProfileModalOpen, user, profile, closeModals, openHistoryModal } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProfileModalOpen) {
        e.preventDefault();
        closeModals();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileModalOpen, closeModals]);

  if (!isProfileModalOpen || !user) return null;

  const displayName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Student';
  const email = user.email || profile?.email || 'Anonymous Account';
  const initial = displayName.charAt(0).toUpperCase() || 'S';

  const handleSignOut = async () => {
    await signOutUser();
    closeModals();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-[#FFFFFF] rounded-[10px] border border-[#E6E1D8] shadow-xl max-w-[440px] w-full p-6 text-left space-y-6 animate-in zoom-in-95 duration-150 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeModals}
          className="absolute top-4 right-4 text-[#666B75] hover:text-[#16181D] p-1.5 rounded-[4px] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Header */}
        <div className="flex items-center gap-4 border-b border-[#E6E1D8] pb-5">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="w-14 h-14 rounded-full border border-[#E6E1D8] object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#E9EDF8] text-[#27408B] flex items-center justify-center font-serif text-[22px] font-medium border border-[#27408B]/20">
              {initial}
            </div>
          )}
          <div className="space-y-0.5">
            <h2 id="profile-modal-title" className="font-serif text-[20px] font-medium text-[#16181D]">
              {displayName}
            </h2>
            <p className="text-[13px] text-[#4B505A] font-mono">{email}</p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#E9EDF8] text-[#27408B]">
              <Sparkles className="w-3 h-3" />
              <span>Mentora Profile Active</span>
            </div>
          </div>
        </div>

        {/* Learning Statistics */}
        <div className="space-y-2.5">
          <div className="text-[12px] font-mono uppercase tracking-wider text-[#666B75]">
            Learning Activity
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-[8px] bg-[#FAF8F4] border border-[#E6E1D8] text-left">
              <div className="text-[20px] font-serif font-medium text-[#16181D]">
                {profile?.mathSolvedCount ?? 0}
              </div>
              <div className="text-[12px] text-[#666B75]">Math problems solved</div>
            </div>
            <div className="p-3.5 rounded-[8px] bg-[#FAF8F4] border border-[#E6E1D8] text-left">
              <div className="text-[20px] font-serif font-medium text-[#16181D]">
                {profile?.sessionsCompletedCount ?? 0}
              </div>
              <div className="text-[12px] text-[#666B75]">Diagnostic checks finished</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t border-[#E6E1D8]">
          <button
            type="button"
            onClick={() => {
              closeModals();
              openHistoryModal();
            }}
            className="w-full h-[40px] px-4 rounded-[6px] bg-[#FAF8F4] hover:bg-[#E9EDF8] border border-[#E6E1D8] hover:border-[#27408B]/30 text-[13px] font-medium text-[#16181D] flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#27408B]" />
              <span>Browse old math solving history</span>
            </span>
            <span className="text-[11px] font-mono text-[#666B75]">Open</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full h-[40px] px-4 rounded-[6px] border border-transparent hover:border-[#F8B4B4] text-[13px] font-medium text-[#9B1C1C] hover:bg-[#FDE8E8] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
