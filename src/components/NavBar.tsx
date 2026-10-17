import React from 'react';

interface NavBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  hasActiveSession?: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentPath,
  onNavigate,
  hasActiveSession = false,
}) => {
  const navItems = [
    { path: '/', label: 'Overview' },
    { path: '/solve', label: 'Solve Any Math' },
    { path: '/check', label: 'Check' },
    { path: '/map', label: 'Knowledge Map' },
    { path: '/results', label: 'Results' },
  ];

  return (
    <header className="border-b border-[#E6E1D8] bg-[#FAF8F4]/90 backdrop-blur-xs sticky top-0 z-30">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-baseline gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="font-serif text-[22px] font-medium tracking-tight text-[#16181D] hover:opacity-80 transition-opacity cursor-pointer"
          >
            Mentora
          </button>
          <span className="text-[12px] text-[#666B75] hidden md:inline border-l border-[#E6E1D8] pl-3">
            Diagnostic math tutor
          </span>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-1 sm:gap-2 text-[13px]" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer ${
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
      </div>
    </header>
  );
};
