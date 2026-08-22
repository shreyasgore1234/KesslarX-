import { useNavigate } from 'react-router-dom';
import { useEvents } from '../hooks/useHandoffAPI';

export default function CollisionMonitor() {
  const navigate = useNavigate();
  const { events, loading: eventsLoading } = useEvents();

  const severityStyle: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
    CRITICAL: { border: 'border-l-error', bg: 'bg-primary-container/10', badge: 'bg-error/20 text-error', badgeText: 'CRITICAL' },
    HIGH: { border: 'border-l-secondary', bg: '', badge: 'bg-secondary/20 text-secondary', badgeText: 'ELEVATED' },
    MEDIUM: { border: 'border-l-on-surface-variant/30', bg: 'opacity-70', badge: 'bg-on-surface-variant/20 text-on-surface-variant', badgeText: 'NOMINAL' },
    LOW: { border: 'border-l-on-surface-variant/20', bg: 'opacity-50', badge: 'bg-on-surface-variant/15 text-on-surface-variant', badgeText: 'LOW' },
  };

  return (
    <div className="space-y-card-gap">
      {/* Dashboard Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">Collision Monitor</h2>
          <p className="text-on-surface-variant/80">Real-time tracking of conjunction events and orbital safety metrics.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {}} className="px-4 py-2 glass rounded-lg flex items-center gap-2 text-sm hover:bg-surface-container-highest transition-all">
            <span className="material-symbols-outlined text-sm">filter_alt</span> Filters
          </button>
          <button onClick={() => {}} className="px-4 py-2 bg-primary-container text-white rounded-lg flex items-center gap-2 text-sm hover:brightness-110 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-sm">add</span> Add Tracking Object
          </button>
        </div>
      </div>

      {/* Upper Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-card-gap">
        <div className="glass p-4 rounded-xl flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded">warning</span>
            <span className="text-error font-label-mono text-[10px]">+12.4%</span>
          </div>
          <p className="text-xs text-on-surface-variant uppercase tracking-wide">Critical Alerts</p>
          <p className="font-stat-lg text-stat-lg">24</p>
        </div>
        <div className="glass p-4 rounded-xl flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <span className="material-symbols-outlined text-secondary bg-secondary/10 p-2 rounded">near_me</span>
            <span className="text-on-surface-variant font-label-mono text-[10px]">T-24h</span>
          </div>
          <p className="text-xs text-on-surface-variant uppercase tracking-wide">Close Approaches</p>
          <p className="font-stat-lg text-stat-lg">1,482</p>
        </div>
        <div className="glass p-4 rounded-xl flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <span className="material-symbols-outlined text-tertiary bg-tertiary/10 p-2 rounded">analytics</span>
            <span className="text-primary font-label-mono text-[10px]">99.8%</span>
          </div>
          <p className="text-xs text-on-surface-variant uppercase tracking-wide">Mean Miss Distance</p>
          <p className="font-stat-lg text-stat-lg">42.5 km</p>
        </div>
        <div className="glass p-4 rounded-xl flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <span className="material-symbols-outlined text-on-surface-variant bg-surface-container-highest p-2 rounded">explore</span>
            <span className="text-secondary font-label-mono text-[10px]">LEO-01</span>
          </div>
          <p className="text-xs text-on-surface-variant uppercase tracking-wide">High Risk Zone</p>
          <p className="font-stat-lg text-stat-lg">Polar LEO</p>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-12 gap-card-gap h-auto">
        {/* Upcoming Close Approaches List — now dynamic */}
        <div className="col-span-12 xl:col-span-4 glass rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">format_list_bulleted</span>
              Conjunction Queue
            </h3>
            <span className="text-[10px] font-label-mono bg-surface-container-highest px-2 py-0.5 rounded">AUTO-REFRESH: ON</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px]">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
            ) : events.length > 0 ? (
              events.map(ev => {
                const s = severityStyle[ev.severity] || severityStyle.MEDIUM;
                return (
                  <div
                    key={ev.event_id}
                    onClick={() => navigate(`/event/${ev.event_id}`)}
                    className={`p-4 border-b border-outline-variant/10 ${s.bg} border-l-4 ${s.border} cursor-pointer hover:bg-primary-container/20 transition-all`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-sm">{ev.title}</h4>
                        <p className="text-xs text-on-surface-variant">Conjunction ID: {ev.event_id}</p>
                      </div>
                      <span className={`${s.badge} text-[10px] px-2 py-0.5 rounded-full font-bold`}>{s.badgeText}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">schedule</span> TCA: {ev.tca_minutes} min
                      </div>
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">monitoring</span> Risk: {((ev.collision_probability || 0) * 100).toFixed(1)}%
                      </div>
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">straighten</span> Miss: {ev.miss_distance_km} km
                      </div>
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">person</span>
                        <span className="truncate">{ev.owner?.name || 'Unassigned'}</span>
                      </div>
                    </div>
                    {ev.status === 'Unassigned Emergency' && (
                      <div className="mt-2 text-[10px] text-error font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">warning</span>
                        UNASSIGNED EMERGENCY
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* Fallback static events if API fails */
              <>
                <div onClick={() => navigate('/event/CX-9921-A')} className="p-4 border-b border-outline-variant/10 bg-primary-container/10 border-l-4 border-l-error cursor-pointer hover:bg-primary-container/20 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm">STARLINK-3021 vs DEBRIS-88172</h4>
                      <p className="text-xs text-on-surface-variant">Conjunction ID: CX-9921-A</p>
                    </div>
                    <span className="bg-error/20 text-error text-[10px] px-2 py-0.5 rounded-full font-bold">CRITICAL</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">schedule</span> TCA: 12 min
                    </div>
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">monitoring</span> Risk: 9.8%
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={() => {}} className="w-full p-3 text-xs text-primary font-bold hover:bg-primary/10 transition-all border-t border-outline-variant/10">VIEW ALL COLLISION EVENTS</button>
        </div>

        {/* 3D Encounter Details View */}
        <div className="col-span-12 xl:col-span-8 space-y-card-gap">
          <div className="glass rounded-xl p-6 relative overflow-hidden h-[400px]">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-60 mix-blend-screen">
              <iframe
                className="w-full h-full object-cover scale-150"
                src="https://www.youtube.com/embed/oFDeNcu3mnc?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=oFDeNcu3mnc"
                title="ISS Live Stream"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-headline-sm text-headline-sm">Active Encounter Visualization</h3>
                  <p className="font-label-mono text-[10px] text-error flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span> MONITORING LIVE INTERSECTION
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {}} className="p-2 glass rounded hover:bg-surface-container-highest"><span className="material-symbols-outlined text-sm">videocam</span></button>
                  <button onClick={() => {}} className="p-2 glass rounded hover:bg-surface-container-highest"><span className="material-symbols-outlined text-sm">fullscreen</span></button>
                </div>
              </div>
              <div className="mt-auto grid grid-cols-3 gap-4">
                <div className="p-3 glass bg-surface-container-lowest/60 rounded-lg">
                  <p className="text-[10px] text-on-surface-variant uppercase">Relative Velocity</p>
                  <p className="text-xl font-bold">14.2 km/s</p>
                </div>
                <div className="p-3 glass bg-surface-container-lowest/60 rounded-lg border-l-4 border-l-error">
                  <p className="text-[10px] text-error uppercase">Miss Distance</p>
                  <p className="text-xl font-bold">120m</p>
                </div>
                <div className="p-3 glass bg-surface-container-lowest/60 rounded-lg">
                  <p className="text-[10px] text-on-surface-variant uppercase">Collision Prob.</p>
                  <p className="text-xl font-bold">1 in 10.2</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Tabs & Graphs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-card-gap">
            {/* Probability Heatmap/History */}
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">show_chart</span> Probability Trend (24h)
              </h3>
              <div className="h-40 flex items-end justify-between gap-1 px-2">
                {/* Mock Sparkline */}
                <div className="w-full h-full relative">
                  <svg className="w-full h-full" viewBox="0 0 400 100">
                    <path className="trajectory-line" d="M0 80 Q 50 70, 100 85 T 200 40 T 300 20 T 400 5" fill="none" stroke="url(#lineGradient)" strokeWidth="2"></path>
                    <defs>
                      <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#b4c5ff"></stop>
                        <stop offset="100%" stopColor="#ffb4ab"></stop>
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute top-0 left-0 text-[8px] text-on-surface-variant flex flex-col h-full justify-between py-2">
                    <span>10.0%</span>
                    <span>5.0%</span>
                    <span>1.0%</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-on-surface-variant px-4">
                <span>-24H</span>
                <span>-12H</span>
                <span>NOW</span>
              </div>
            </div>
            {/* Risk Zones Map */}
            <div className="glass rounded-xl p-4 overflow-hidden relative">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">map</span> Global Risk Heatmap
              </h3>
              <div className="relative rounded-lg overflow-hidden h-40 bg-surface-container-low border border-outline-variant/10">
                <img alt="Risk Map" className="w-full h-full object-cover mix-blend-screen opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJiHLG9E_810m401A_GAaXOA8hQsIyulpMKfgTWRAoHx5U9kpSx9x_QVbGq9QLifRI8zi6YOGVVjMEyx4ulMw9eWlejUW37hWW-ygsPFgmOBcmPU6fKCUrwh0U0SUbMwxe7d1e_FFr1SfrUXDyNB2ygGZvVezMe2OwjgiwWQ5yDnsZMd2q4M1tipkWOOSJOdIozZ3SyY2vSJpjmaFl1vunKy8NgTH5Xt8B8gKeVb6jj8ThPQZHKWsNDPyjgBfxmgsCH3pSt6pTVb4"/>
                {/* Hotspots overlay */}
                <div className="absolute top-1/4 left-1/2 w-8 h-8 bg-error/40 rounded-full animate-ping"></div>
                <div className="absolute bottom-1/3 left-1/4 w-4 h-4 bg-secondary/40 rounded-full animate-ping" style={{ animationDelay: '75ms' }}></div>
                <div className="absolute top-1/2 right-1/3 w-6 h-6 bg-error/30 rounded-full animate-ping" style={{ animationDelay: '150ms' }}></div>
              </div>
              <div className="flex justify-between mt-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-error"></div>
                  <span className="text-[10px] text-on-surface-variant uppercase">Critical Density</span>
                </div>
                <button onClick={() => {}} className="text-[10px] text-primary uppercase font-bold hover:underline">Full Analysis</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Copilot Quick Assist */}
      <div className="glass rounded-xl p-4 border-l-4 border-l-primary flex items-center gap-6 mt-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <span className="material-symbols-outlined">smart_toy</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-primary">Kessler AI Insight</p>
          <p className="text-xs text-on-surface-variant leading-relaxed">The conjunction event <span className="text-on-surface font-mono">CX-9921-A</span> has reached a risk threshold. Recommend executing a 0.5m/s retrograde burn on STARLINK-3021 at <span className="text-on-surface font-mono">12:55:10 UTC</span> to increase radial separation by 450m.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {}} className="px-4 py-2 bg-surface-container-highest hover:bg-outline-variant text-white text-xs rounded transition-all">Dismiss</button>
          <button onClick={() => {}} className="px-4 py-2 bg-primary-container hover:brightness-110 text-white text-xs rounded font-bold transition-all">Execute Advice</button>
        </div>
      </div>
    </div>
  );
}
