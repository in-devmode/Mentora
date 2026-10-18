import React from 'react';
import { useAuth } from '../context/AuthContext';
import { History, User as UserIcon, LogIn } from 'lucide-react';

interface NavBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  hasActiveSession?: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentPath,
  onNavigate,
}) => {
  const { user, profile, isAnonymous, openAuthModal, openProfileModal, openHistoryModal } = useAuth();

  const navItems = [
    { path: '/', label: 'Overview' },
    { path: '/solve', label: 'Solve Any Math' },
    { path: '/check', label: 'Check' },
    { path: '/map', label: 'Knowledge Map' },
    { path: '/results', label: 'Results' },
  ];

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Profile';
  const initial = displayName.charAt(0).toUpperCase() || 'P';

  return (
    <header className="border-b border-[#E6E1D8] bg-[#FAF8F4]/90 backdrop-blur-xs sticky top-0 z-30">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-baseline gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="font-serif text-[22px] font-medium tracking-tight text-[#16181D] hover:opacity-80 transition-opacity cursor-pointer"
          >
            Mentora
          </button>
          <span className="text-[12px] text-[#666B75] hidden lg:inline border-l border-[#E6E1D8] pl-3">
            Diagnostic math tutor
          </span>
        </div>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 text-[13px]" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`px-2.5 py-1.5 rounded-[6px] transition-colors cursor-pointer ${
                  isActive
                    ? 'font-medium text-[#27408B] bg-[#E9EDF8]'
                    : 'text-[#4B505A] hover:text-[#16181D] hover:bg-[#FAF8F4]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right side: History + Profile / Sign in */}
        <div className="flex items-center gap-2">
          {/* History Button */}
          <button
            type="button"
            onClick={openHistoryModal}
            className="h-[34px] px-3 rounded-[6px] border border-[#E6E1D8] bg-[#FFFFFF] hover:bg-[#FAF8F4] text-[#16181D] text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Browse past math solutions"
          >
            <History className="w-3.5 h-3.5 text-[#27408B]" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Profile / Sign In */}
          {!isAnonymous && user ? (
            <button
              type="button"
              onClick={openProfileModal}
              className="h-[34px] pl-2 pr-3 rounded-[6px] border border-[#E6E1D8] bg-[#FFFFFF] hover:bg-[#FAF8F4] flex items-center gap-2 transition-colors cursor-pointer"
              title="View your profile"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#E9EDF8] text-[#27408B] flex items-center justify-center text-[10px] font-mono font-medium">
                  {initial}
                </div>
              )}
              <span className="text-[13px] font-medium text-[#16181D] max-w-[100px] truncate">
                {displayName}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="h-[34px] px-3 rounded-[6px] bg-[#16181D] text-[#FAF8F4] text-[13px] font-medium hover:bg-[#2C313A] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile subnav */}
      <div className="md:hidden border-t border-[#E6E1D8] px-4 py-2 flex items-center gap-1 overflow-x-auto text-[12px] bg-[#FAF8F4]">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`px-2.5 py-1 rounded-[4px] whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'font-medium text-[#27408B] bg-[#E9EDF8]'
                  : 'text-[#4B505A] hover:text-[#16181D]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
