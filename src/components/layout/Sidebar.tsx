import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/orbital-map', label: 'Orbital Map', icon: 'public' },
  { path: '/collision-monitor', label: 'Collision Monitor', icon: 'warning' },
  { path: '/transfer', label: 'Transfer Responsibility', icon: 'swap_horiz', badge: 'New' },
  { path: '/handoffs', label: 'Pending Handoffs', icon: 'assignment_ind', badge: 'New' },
  { path: '/conjunction-analysis', label: 'Conjunction Analysis', icon: 'track_changes', badge: 'New' },
  { path: '/analytics', label: 'Analytics', icon: 'bar_chart' },
  { path: '/space-weather', label: 'Space Weather', icon: 'wb_sunny' },
  { path: '/simulations', label: 'Simulations', icon: 'model_training' },
  { path: '/ground-station', label: 'Ground Station', icon: 'cell_tower', badge: 'New' },
  { path: '/ai-copilot', label: 'AI Copilot', icon: 'smart_toy', badge: 'Beta' },
  { path: '/alert-center', label: 'Alert Center', icon: 'notifications_active', count: 7 },
  { path: '/reports', label: 'Reports', icon: 'description' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        flex flex-col h-full w-64 bg-surface-container-lowest/40 backdrop-blur-2xl border-r border-outline-variant/10 py-section-padding space-y-element-stack
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
      <div className="px-inner-padding mb-8 flex flex-col gap-1">
        <span className="font-display-lg text-display-lg text-primary uppercase tracking-widest">KesslerX</span>
        <span className="font-label-mono text-label-mono text-on-surface-variant/60">Orbital Management</span>
      </div>
      <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `px-inner-padding py-3 flex items-center gap-3 transition-all duration-300 relative ${
                isActive
                  ? 'bg-primary-container/20 text-primary border-l-4 border-primary translate-x-1'
                  : 'text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container-highest/20 hover:backdrop-blur-md'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span 
                  className="material-symbols-outlined" 
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-body-md text-body-md">{item.label}</span>
                  {item.badge && (
                    <span className="bg-primary/20 text-primary text-[10px] px-1 rounded font-bold uppercase tracking-tighter">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.count && (
                  <span className="absolute right-4 bg-tertiary-container text-on-tertiary-container text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                    {item.count}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-inner-padding pt-6 mt-auto">
        <div className="glass p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-primary text-xl">rocket_launch</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All Systems Clear
            </div>
            <div className="text-[12px] text-on-surface-variant/70">KesslerX v2.1.0</div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
