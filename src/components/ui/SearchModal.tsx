// ============================================================
// KesslerX — Global Command & Search Modal
// Real-time search across pages, live satellites, conjunction events & tools
// ============================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSatellites } from '../../hooks/useKesslerAPI';
import { useEvents } from '../../hooks/useHandoffAPI';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'Page' | 'Satellite' | 'Conjunction Event' | 'Action';
  icon: string;
  path?: string;
  noradId?: string;
  action?: () => void;
}

const STATIC_PAGES: SearchItem[] = [
  { id: 'p1', title: 'Dashboard', subtitle: 'Mission Overview & Real-Time Stats', type: 'Page', icon: 'dashboard', path: '/' },
  { id: 'p2', title: 'Orbital Map', subtitle: '3D Cesium Satellite Tracking Engine', type: 'Page', icon: 'public', path: '/orbital-map' },
  { id: 'p3', title: 'Collision Monitor', subtitle: 'Live Conjunction Risk Monitoring', type: 'Page', icon: 'warning', path: '/collision-monitor' },
  { id: 'p4', title: 'Transfer Responsibility', subtitle: 'Handoff Management & Ownership Transfer', type: 'Page', icon: 'swap_horiz', path: '/transfer' },
  { id: 'p5', title: 'Pending Handoffs', subtitle: 'Awaiting Operator Acceptance', type: 'Page', icon: 'mark_email_unread', path: '/handoffs' },
  { id: 'p6', title: 'Analytics', subtitle: 'Debris Density Trends & Orbital Flux', type: 'Page', icon: 'analytics', path: '/analytics' },
  { id: 'p7', title: 'Space Weather', subtitle: 'Solar Wind, Kp Index & Geomagnetic Storms', type: 'Page', icon: 'routine', path: '/space-weather' },
  { id: 'p8', title: 'AI Copilot', subtitle: 'KesslerX Autonomous Orbital Assistant', type: 'Page', icon: 'smart_toy', path: '/ai-copilot' },
  { id: 'p9', title: 'Simulations', subtitle: 'Kessler Cascade Physics Engine', type: 'Page', icon: 'science', path: '/simulations' },
  { id: 'p10', title: 'Alert Center', subtitle: 'Active Operational Alarms & Thresholds', type: 'Page', icon: 'notifications_active', path: '/alert-center' },
  { id: 'p11', title: 'Ground Station', subtitle: 'Antenna Pointing & Pass Predictor', type: 'Page', icon: 'cell_tower', path: '/ground-station' },
];

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { satellites } = useSatellites();
  const { events } = useEvents();

  // Dynamically compile search corpus from real API data
  const dynamicItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [...STATIC_PAGES];

    // Conjunction Events
    events.forEach(evt => {
      items.push({
        id: `event-${evt.event_id}`,
        title: evt.title || `${evt.satellite || 'SATELLITE'} vs ${evt.object || 'DEBRIS'}`,
        subtitle: `${evt.event_id} · ${evt.severity} Risk · Owner: ${evt.current_owner_id || 'Unassigned'}`,
        type: 'Conjunction Event',
        icon: 'crisis_alert',
        path: `/event/${evt.event_id}`,
      });
    });

    // Real Satellites from active catalog
    satellites.forEach(sat => {
      const name = sat.OBJECT_NAME || sat.name || `Object ${sat.NORAD_CAT_ID}`;
      const norad = sat.NORAD_CAT_ID?.toString() || sat.id || '';
      const cat = sat.CATEGORY || sat.OBJECT_TYPE || 'SATELLITE';
      items.push({
        id: `sat-${norad || name}`,
        title: name,
        subtitle: `NORAD ${norad} · ${cat} · Live 3D Orbit`,
        type: 'Satellite',
        icon: cat === 'DEBRIS' ? 'grain' : 'satellite_alt',
        path: `/orbital-map?select=${norad || name}`,
        noradId: norad,
      });
    });

    return items;
  }, [satellites, events]);

  // Filter items matching query
  const filteredData = useMemo(() => {
    if (!query.trim()) {
      // Return top pages and first few events/satellites
      return dynamicItems.slice(0, 15);
    }
    const q = query.toLowerCase().trim();
    return dynamicItems.filter(item => {
      const searchStr = `${item.title} ${item.subtitle} ${item.type}`.toLowerCase();
      return searchStr.includes(q);
    }).slice(0, 25);
  }, [dynamicItems, query]);

  // Grouping
  const groups = useMemo(() => {
    return filteredData.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, SearchItem[]>);
  }, [filteredData]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const handleSelect = (item: SearchItem) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filteredData.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredData.length) % Math.max(filteredData.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredData.length > 0 && filteredData[selectedIndex]) {
          handleSelect(filteredData[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredData, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4" style={{ isolation: 'isolate' }}>
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-2xl bg-surface-container/95 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          style={{ background: 'rgba(6, 14, 32, 0.95)', border: '1px solid rgba(180, 197, 255, 0.2)' }}
        >
          {/* Search Input */}
          <div className="flex items-center px-4 py-3.5 border-b border-outline-variant/20 bg-surface-container-lowest/40">
            <span className="material-symbols-outlined text-primary text-xl mr-3">search</span>
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-white font-label-mono text-base outline-none placeholder:text-on-surface-variant/40"
              placeholder="Search satellites (e.g. Starlink, ISS), conjunctions, pages..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 text-on-surface-variant hover:text-white mr-2 transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
            <div className="flex items-center gap-1 border border-outline-variant/40 rounded px-1.5 py-0.5 pointer-events-none">
              <span className="text-[10px] font-bold text-on-surface-variant/60 font-label-mono">ESC</span>
            </div>
          </div>

          {/* Results Area */}
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-3 space-y-4 flex-1">
            {filteredData.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50 text-primary">satellite_alt</span>
                <p className="font-label-mono text-sm opacity-80">No satellites or assets found for "{query}"</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">Try searching by object name, NORAD catalog ID, or mission title.</p>
              </div>
            ) : (
              Object.entries(groups).map(([type, items]) => (
                <div key={type} className="mb-3 last:mb-0">
                  <div className="px-2 py-1 text-[10px] font-label-mono uppercase tracking-widest text-primary/80 font-bold flex items-center gap-1.5">
                    <span>{type}s</span>
                    <span className="text-on-surface-variant/50">({items.length})</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {items.map((item) => {
                      const globalIndex = filteredData.findIndex(i => i.id === item.id);
                      const isSelected = selectedIndex === globalIndex;
                      
                      return (
                        <div
                          key={item.id}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          onClick={() => handleSelect(item)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-primary/20 border border-primary/40 text-white shadow-sm' 
                              : 'hover:bg-surface-container-highest/40 border border-transparent text-on-surface'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-primary text-black' : 'bg-surface-container-highest/60 text-primary'
                            }`}>
                              <span className="material-symbols-outlined text-lg">
                                {item.icon}
                              </span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-on-surface'}`}>
                                {item.title}
                              </span>
                              <span className="text-[10px] font-label-mono text-on-surface-variant/70 truncate">
                                {item.subtitle}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {item.type === 'Satellite' && (
                              <span className="text-[9px] font-label-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                View Orbit
                              </span>
                            )}
                            <span className={`material-symbols-outlined text-sm ${isSelected ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                              arrow_forward
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-outline-variant/10 bg-surface-container-lowest/40 flex items-center justify-between text-[10px] font-label-mono text-on-surface-variant/60 shrink-0">
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><span className="border border-outline-variant/30 rounded px-1 text-white">↑↓</span> navigate</span>
              <span className="flex items-center gap-1"><span className="border border-outline-variant/30 rounded px-1 text-white">↵</span> select & fly</span>
              <span className="flex items-center gap-1"><span className="border border-outline-variant/30 rounded px-1 text-white">esc</span> close</span>
            </div>
            <span className="text-primary font-bold">KesslerX Search Engine</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
