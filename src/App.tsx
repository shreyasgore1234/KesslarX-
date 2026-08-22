import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import SearchModal from './components/ui/SearchModal';
import { UserProvider } from './components/handoff/UserContext';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OrbitalMap = lazy(() => import('./pages/OrbitalMap'));
const CollisionMonitor = lazy(() => import('./pages/CollisionMonitor'));
const Analytics = lazy(() => import('./pages/Analytics'));
const SpaceWeather = lazy(() => import('./pages/SpaceWeather'));
const AICopilot = lazy(() => import('./pages/AICopilot'));
const Simulations = lazy(() => import('./pages/Simulations'));
const AlertCenter = lazy(() => import('./pages/AlertCenter'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const ConjunctionAnalysis = lazy(() => import('./pages/ConjunctionAnalysis'));
const GroundStation = lazy(() => import('./pages/GroundStation'));
const EventWorkspace = lazy(() => import('./pages/EventWorkspace'));
const PendingHandoffs = lazy(() => import('./pages/PendingHandoffs'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 w-full">
      <div className="text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
        <span className="text-sm font-label-mono text-on-surface-variant/60 uppercase tracking-widest">
          Loading Module...
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <UserProvider>
      <BrowserRouter>
        <div className="flex h-screen w-full font-body-md text-body-md overflow-hidden text-on-surface bg-background">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          
          <main className="flex-1 flex flex-col overflow-hidden relative z-0">
            <Header onMenuClick={() => setIsSidebarOpen(true)} onSearchClick={() => setIsSearchOpen(true)} />
            
            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
            
            <div className="flex-1 overflow-y-auto p-container-margin relative">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/orbital-map" element={<OrbitalMap />} />
                  <Route path="/collision-monitor" element={<CollisionMonitor />} />
                  <Route path="/conjunction-analysis" element={<ConjunctionAnalysis />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/space-weather" element={<SpaceWeather />} />
                  <Route path="/ai-copilot" element={<AICopilot />} />
                  <Route path="/simulations" element={<Simulations />} />
                  <Route path="/ground-station" element={<GroundStation />} />
                  <Route path="/alert-center" element={<AlertCenter />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/event/:eventId" element={<EventWorkspace />} />
                  <Route path="/handoffs" element={<PendingHandoffs />} />
                </Routes>
              </Suspense>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}
