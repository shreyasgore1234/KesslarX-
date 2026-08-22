import { useState, useRef } from 'react';
import CesiumGlobe from '../components/dashboard/CesiumGlobe';
import ObjectDetailsPanel from '../components/dashboard/ObjectDetailsPanel';
import { useSatellites, useWebsocket, useSpaceWeather, useCongestion, useCollisions } from '../hooks/useKesslerAPI';
import { useEvents, useUsers } from '../hooks/useHandoffAPI';
import { useCurrentUser } from '../components/handoff/UserContext';
import ReportPreviewModal from '../components/handoff/ReportPreviewModal';

export default function Dashboard() {
  const { satellites, loading } = useSatellites();
  const { alerts, isConnected } = useWebsocket();
  const { data: weather } = useSpaceWeather();
  const { data: congestion } = useCongestion();
  const { data: collisions } = useCollisions();
  const { events } = useEvents();
  const { users } = useUsers();
  const { currentUser } = useCurrentUser();
  
  const [selectedSatellite, setSelectedSatellite] = useState<any>(null);
  const [showDashboardReportModal, setShowDashboardReportModal] = useState(false);
  const globeRef = useRef<any>(null);

  // Stats
  const activeCount = satellites.filter(s => s.OBJECT_TYPE === 'PAYLOAD').length;
  const debrisCount = satellites.filter(s => s.OBJECT_TYPE === 'DEBRIS').length;
  
  // AI Copilot state
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleAiChat = async () => {
    if (!chatInput.trim()) return;
    setIsChatLoading(true);
    setChatResponse(null);
    const query = chatInput;
    setChatInput('');
    try {
      // Assuming Vite proxy or absolute URL setup
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, context: { page: 'dashboard' } })
      });
      const data = await res.json();
      setChatResponse(data.response);
    } catch (e) {
      setChatResponse("Error: Unable to connect to KesslerX AI.");
    } finally {
      setIsChatLoading(false);
    }
  };

  // Toast for interactive buttons
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="grid grid-cols-12 gap-card-gap relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-strong border border-primary px-6 py-3 rounded-xl text-primary font-bold animate-in slide-in-from-top fade-in">
          {toast}
        </div>
      )}

      {/* KPI Row */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-card-gap">
        {/* Active Satellites */}
        <div className="glass p-inner-padding rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined text-3xl">satellite_alt</span>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Active Payloads</div>
            <div className="font-stat-lg text-stat-lg font-bold leading-tight">
              {loading ? '...' : activeCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">trending_up</span> Live
            </div>
          </div>
        </div>
        {/* Tracked Debris */}
        <div className="glass p-inner-padding rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary border border-secondary/20">
            <span className="material-symbols-outlined text-3xl">blur_on</span>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Tracked Debris</div>
            <div className="font-stat-lg text-stat-lg font-bold leading-tight">
              {loading ? '...' : debrisCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">trending_up</span> Live
            </div>
          </div>
        </div>
        {/* Connection Status */}
        <div className="glass p-inner-padding rounded-xl flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${isConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
            <span className="material-symbols-outlined text-3xl">{isConnected ? 'cell_tower' : 'signal_disconnected'}</span>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Telemetry</div>
            <div className="font-stat-lg text-stat-lg font-bold leading-tight">{isConnected ? 'Online' : 'Offline'}</div>
            <div className={`text-[11px] font-bold flex items-center gap-1 ${isConnected ? 'text-emerald-400' : 'text-red-500'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span> {isConnected ? 'Connected' : 'Reconnecting...'}
            </div>
          </div>
        </div>
        {/* Predicted Collisions */}
        <div className="glass p-inner-padding rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500 border border-orange-500/20">
            <span className="material-symbols-outlined text-3xl">cognition</span>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Collisions</div>
            <div className="font-stat-lg text-stat-lg font-bold leading-tight">{(collisions as any[]).length || 0} <span className="text-xs font-medium text-on-surface-variant/60 ml-1">Next 24h</span></div>
            <div className="text-[11px] text-orange-500 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">trending_up</span> Live
            </div>
          </div>
        </div>
        {/* Space Weather */}
        <div className="glass p-inner-padding rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-500 border border-yellow-500/20">
            <span className="material-symbols-outlined text-3xl">wb_sunny</span>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Space Weather</div>
            <div className="font-stat-lg text-stat-lg font-bold leading-tight">{weather.geomagnetic_storm === 'NONE' ? 'Quiet' : weather.geomagnetic_storm === 'MINOR' ? 'Minor' : weather.geomagnetic_storm === 'MODERATE' ? 'Moderate' : 'Severe'}</div>
            <div className="text-[11px] text-on-surface-variant/60 font-bold">Kp {weather.kp_index} Index</div>
          </div>
        </div>
        {/* Orbital Congestion */}
        <div className={`glass p-inner-padding rounded-xl flex items-center gap-4 border-l-4 ${congestion.leo.risk === 'HIGH' ? 'border-l-red-500 glow-error' : 'border-l-yellow-500'}`}>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${congestion.leo.risk === 'HIGH' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
            <span className="material-symbols-outlined text-3xl">hub</span>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Congestion</div>
            <div className={`font-stat-lg text-stat-lg font-bold leading-tight ${congestion.leo.risk === 'HIGH' ? 'text-red-500' : 'text-yellow-500'}`}>{congestion.leo.risk === 'HIGH' ? 'High' : congestion.leo.risk === 'MEDIUM' ? 'Medium' : 'Low'}</div>
            <div className={`text-[11px] font-bold ${congestion.leo.risk === 'HIGH' ? 'text-red-500/80' : 'text-on-surface-variant/60'}`}>{Math.round(congestion.leo.density * 100)}% Density</div>
          </div>
        </div>
      </div>

      {/* Main Section: Map & Sidebar */}
      <div className="col-span-12 lg:col-span-9 flex flex-col gap-card-gap">
        {/* Large Orbital Map */}
        <div className="glass rounded-2xl h-[500px] relative overflow-hidden flex flex-col group">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 map-gradient pointer-events-none"></div>
            <div className="h-full [&>div]:!h-full [&>div>div]:!h-full">
              <CesiumGlobe ref={globeRef} satellites={satellites} onSelectObject={setSelectedSatellite} />
            </div>
          </div>
          
          <ObjectDetailsPanel satelliteData={selectedSatellite} onClose={() => setSelectedSatellite(null)} />

          {/* Map Controls */}
          <div className="absolute top-6 left-6 z-10 glass-darker p-4 rounded-xl w-64 pointer-events-auto">
            <h3 className="font-headline-sm text-headline-sm mb-4">OBJECTS</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input defaultChecked className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary w-4 h-4" type="checkbox"/>
                <span className="text-sm font-medium">Satellites</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input defaultChecked className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary w-4 h-4" type="checkbox"/>
                <span className="text-sm font-medium">Debris</span>
              </label>
            </div>
            <div className="mt-6">
              <label className="text-[11px] font-bold text-on-surface-variant/60 block mb-2 uppercase">Orbit Layers</label>
              <select className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-sm text-on-surface font-medium focus:ring-primary outline-none">
                <option>All Orbits</option>
                <option>LEO - Low Earth</option>
                <option>MEO - Medium Earth</option>
                <option>GEO - Geostationary</option>
              </select>
            </div>
          </div>
          <div className="absolute bottom-6 left-6 z-10 flex gap-2 pointer-events-auto">
            <button onClick={() => globeRef.current?.zenithView()} className="w-10 h-10 glass-darker flex items-center justify-center rounded-lg hover:bg-primary/20 hover:text-primary transition-all" title="Reset View">
              <span className="material-symbols-outlined text-xl">near_me</span>
            </button>
            <button onClick={() => globeRef.current?.toggleAutoRotate()} className="w-10 h-10 glass-darker flex items-center justify-center rounded-lg hover:bg-primary/20 hover:text-primary transition-all" title="Toggle Auto-Rotate">
              <span className="material-symbols-outlined text-xl">sync</span>
            </button>
            <button onClick={() => globeRef.current?.zoomIn()} className="w-10 h-10 glass-darker flex items-center justify-center rounded-lg hover:bg-primary/20 hover:text-primary transition-all" title="Zoom In">
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
            <button onClick={() => globeRef.current?.zoomOut()} className="w-10 h-10 glass-darker flex items-center justify-center rounded-lg hover:bg-primary/20 hover:text-primary transition-all" title="Zoom Out">
              <span className="material-symbols-outlined text-xl">remove</span>
            </button>
          </div>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <h2 className="font-headline-sm text-headline-sm tracking-tight text-white/90 drop-shadow-lg">
              {loading ? "INITIALIZING ORBITAL MODEL..." : "3D ORBITAL MAP"}
            </h2>
          </div>
        </div>

        {/* Bottom Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-card-gap h-72">
          {/* Orbital Congestion */}
          <div className="glass p-inner-padding rounded-xl flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-headline-sm text-headline-sm">ORBITAL CONGESTION</h3>
            </div>
            <div className="space-y-4 flex-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                  <span>LEO (Low Earth Orbit)</span>
                  <span className={congestion.leo.risk === 'HIGH' ? 'text-red-500' : ''}>{Math.round(congestion.leo.density * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-highest/40 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${congestion.leo.risk === 'HIGH' ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.round(congestion.leo.density * 100)}%` }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                  <span>MEO (Medium Earth Orbit)</span>
                  <span>{Math.round(congestion.meo.density * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-highest/40 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round(congestion.meo.density * 100)}%` }}></div>
                </div>
              </div>
            </div>
            <button onClick={() => showToast("Loading full congestion analysis...")} className="mt-4 w-full py-2 bg-surface-container-highest/20 hover:bg-surface-container-highest/40 rounded border border-outline-variant/30 text-[11px] font-bold uppercase tracking-widest transition-all">
              View Full Analysis
            </button>
          </div>
          
          {/* Upcoming Close Approaches */}
          <div className="glass p-inner-padding rounded-xl flex flex-col col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-headline-sm uppercase">Mission Feed (Live WebSocket)</h3>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <span className="text-[10px] font-bold uppercase text-on-surface-variant/60">{isConnected ? 'Receiving Data' : 'Disconnected'}</span>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 max-h-[300px] custom-scrollbar">
              {alerts.length === 0 && (
                 <div className="flex items-center justify-center h-full text-sm text-on-surface-variant/50 italic">Waiting for incoming telemetry...</div>
              )}
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex gap-4 p-2 bg-surface-container-highest/10 hover:bg-surface-container-highest/30 rounded border border-outline-variant/5 transition-colors">
                  <span className="font-label-mono text-[10px] text-on-surface-variant/60 whitespace-nowrap pt-1">LIVE</span>
                  <div className="flex-1">
                    <div className="text-[11px] leading-relaxed">
                      <span className={`w-1.5 h-1.5 rounded-full inline-block mr-2 ${alert.data.includes('WARNING') ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}></span>
                      <span className={alert.data.includes('WARNING') ? 'text-red-400 font-bold' : ''}>{alert.data}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="col-span-12 lg:col-span-3 flex flex-col gap-card-gap">
        {/* Bottom Integrated Actions & Feed */}
        <div className="glass p-inner-padding rounded-xl flex flex-col gap-4 border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/40">
              <span className="material-symbols-outlined text-primary">psychology</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-primary uppercase tracking-widest">KesslerX AI</span>
                <span className="text-[8px] bg-primary/20 text-primary px-1 rounded font-bold uppercase">Online</span>
              </div>
              <div className="text-xs font-medium text-on-surface-variant/80">Domain-specific orbital intelligence</div>
            </div>
          </div>

          {chatResponse && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-white/90 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
              {chatResponse}
            </div>
          )}

          <div className="relative mt-auto">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
              className="w-full bg-surface-container-lowest/50 border border-outline-variant/30 rounded-lg py-2.5 pl-4 pr-12 text-sm focus:ring-1 focus:ring-primary outline-none text-on-surface placeholder:text-on-surface-variant/40" 
              placeholder="Query Kessler AI..." 
              type="text"
              disabled={isChatLoading}
            />
            <button 
              onClick={handleAiChat}
              disabled={isChatLoading}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${isChatLoading ? 'bg-primary/50 cursor-wait' : 'bg-primary text-on-primary hover:bg-primary/80'}`}
            >
              {isChatLoading ? (
                 <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
              ) : (
                 <span className="material-symbols-outlined text-sm">send</span>
              )}
            </button>
          </div>
        </div>
        
        <div className="glass p-inner-padding rounded-xl">
          <h3 className="font-headline-sm text-headline-sm uppercase mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => showToast("Initializing Simulation Engine...")} className="flex flex-col items-center justify-center gap-2 bg-surface-container-highest/20 hover:bg-surface-container-highest/50 border border-outline-variant/30 px-3 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:border-primary/50 group">
              <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">rocket_launch</span>
              Simulate
            </button>
            <button onClick={() => setShowDashboardReportModal(true)} className="flex flex-col items-center justify-center gap-2 bg-surface-container-highest/20 hover:bg-surface-container-highest/50 border border-outline-variant/30 px-3 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:border-primary/50 group">
              <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">description</span>
              Report
            </button>
            <button onClick={() => showToast("Opening Manual Tracking Form")} className="flex flex-col items-center justify-center gap-2 bg-surface-container-highest/20 hover:bg-surface-container-highest/50 border border-outline-variant/30 px-3 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:border-primary/50 group">
              <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">add_circle</span>
              Add TLE
            </button>
            <button onClick={() => showToast("Configuring Collision Thresholds")} className="flex flex-col items-center justify-center gap-2 bg-surface-container-highest/20 hover:bg-surface-container-highest/50 border border-outline-variant/30 px-3 py-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:border-primary/50 group">
              <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">notifications_active</span>
              Alerts
            </button>
          </div>
        </div>

        {/* Space Weather Detailed */}
        <div className="glass p-inner-padding rounded-xl flex flex-col flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-headline-sm uppercase">Space Weather</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full relative overflow-hidden border border-yellow-500/20 group shrink-0">
              <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(234,179,8,0.4)] pointer-events-none"></div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-y-2 gap-x-2">
              <div>
                <div className="text-[9px] font-bold text-on-surface-variant/60 uppercase">Solar Activity</div>
                <div className="text-[10px] font-bold">{weather.geomagnetic_storm === 'NONE' ? 'Quiet' : weather.geomagnetic_storm}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-on-surface-variant/60 uppercase">Kp Index</div>
                <div className="text-[10px] font-bold text-yellow-500">{weather.kp_index}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-on-surface-variant/60 uppercase">Solar Flux</div>
                <div className="text-[10px] font-bold text-emerald-400">{weather.solar_flux} SFU</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-on-surface-variant/60 uppercase">Radiation</div>
                <div className="text-[10px] font-bold">{weather.radiation_level}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Report Preview Modal */}
      {showDashboardReportModal && events.length > 0 && currentUser && (
        <ReportPreviewModal
          event={events[0]}
          handoffs={[]}
          timeline={[]}
          currentUser={currentUser}
          users={users}
          isOpen={showDashboardReportModal}
          onClose={() => setShowDashboardReportModal(false)}
        />
      )}
    </div>
  );
}
