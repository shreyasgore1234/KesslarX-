import { useState, useEffect } from 'react';
import { useCurrentUser } from '../handoff/UserContext';
import { usePendingHandoffs } from '../../hooks/useHandoffAPI';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick?: () => void;
}

export default function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [utcTime, setUtcTime] = useState('');
  const [utcDate, setUtcDate] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { currentUser, allUsers, setCurrentUser } = useCurrentUser();
  const { handoffs: pendingHandoffs } = usePendingHandoffs(currentUser?.user_id || '');
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${h}:${m}:${s} UTC`);
      
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      setUtcDate(now.toLocaleDateString('en-US', options));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = pendingHandoffs.length;

  return (
    <header className="flex justify-between items-center w-full px-container-margin py-4 bg-background/20 backdrop-blur-xl border-b border-outline-variant/10 z-30 sticky top-0">
      <div className="flex items-center gap-4 md:gap-8 flex-1">
        <button 
          className="md:hidden p-2 -ml-2 text-on-surface hover:bg-surface-container-highest/30 rounded-full flex items-center justify-center"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div 
          onClick={onSearchClick}
          className="relative w-full max-w-xl group hidden md:block cursor-pointer"
        >
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-hover:text-primary transition-colors">search</span>
          <div className="w-full bg-surface-container-low/50 border border-outline-variant/30 rounded-lg py-2 pl-10 pr-12 text-sm group-hover:ring-1 group-hover:ring-primary group-hover:border-primary transition-all font-label-mono text-on-surface-variant flex items-center">
            Search satellites, debris, events, missions...
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 border border-outline-variant/40 rounded px-1.5 py-0.5 pointer-events-none group-hover:border-primary/40 transition-colors">
            <span className="text-[10px] font-bold text-on-surface-variant/50 group-hover:text-primary/70">⌘</span>
            <span className="text-[10px] font-bold text-on-surface-variant/50 group-hover:text-primary/70">K</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end mr-4">
          <div className="font-label-mono text-label-mono text-primary uppercase font-bold tracking-widest">{utcTime}</div>
          <div className="text-[10px] text-on-surface-variant/60 font-medium">{utcDate}</div>
        </div>
        <div className="flex items-center gap-4 border-l border-outline-variant/20 pl-6">
          {/* Handoff notification bell */}
          <button
            onClick={() => navigate('/handoffs')}
            className="relative w-10 h-10 flex items-center justify-center hover:bg-surface-container-highest/30 rounded-full transition-all group active:scale-90"
            title={`${pendingCount} pending handoff${pendingCount !== 1 ? 's' : ''}`}
          >
            <span className="material-symbols-outlined text-on-surface-variant">swap_horiz</span>
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-error text-white text-[9px] font-bold rounded-full px-1 border-2 border-background animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
          <button onClick={() => {}} className="relative w-10 h-10 flex items-center justify-center hover:bg-surface-container-highest/30 rounded-full transition-all group active:scale-90">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-tertiary-container rounded-full border border-background"></span>
          </button>
          <button onClick={() => {}} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-highest/30 rounded-full transition-all group active:scale-90">
            <span className="material-symbols-outlined text-on-surface-variant">hub</span>
          </button>

          {/* User Switcher */}
          <div className="relative">
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 ml-2 hover:bg-surface-container-highest/20 p-1 rounded-full pr-4 transition-all cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border ${
                currentUser?.status === 'Offline' ? 'bg-error/20 text-error border-error/40' : 'bg-primary/20 text-primary border-primary/40'
              }`}>
                {currentUser?.avatar_initials || '??'}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-bold leading-none text-on-surface">{currentUser?.name || 'Loading...'}</div>
                <div className="text-[10px] text-on-surface-variant font-label-mono mt-0.5">{currentUser?.role || ''}</div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-sm hidden lg:block">expand_more</span>
            </div>

            {/* Dropdown */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 glass rounded-xl border border-primary/20 shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-outline-variant/10">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Switch Demo User</p>
                  </div>
                  {allUsers.map(user => (
                    <button
                      key={user.user_id}
                      onClick={() => { setCurrentUser(user); setShowUserMenu(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-highest/30 transition-all text-left ${
                        currentUser?.user_id === user.user_id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        user.status === 'Offline' ? 'bg-error/20 text-error' : 'bg-primary/20 text-primary'
                      }`}>
                        {user.avatar_initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{user.name}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">{user.role}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        user.status === 'Offline' ? 'bg-error/20 text-error' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {user.status}
                      </span>
                      {currentUser?.user_id === user.user_id && (
                        <span className="material-symbols-outlined text-primary text-sm">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
