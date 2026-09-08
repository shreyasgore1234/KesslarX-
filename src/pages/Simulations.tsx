import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Play, Square, RotateCcw, Download, Shield, AlertTriangle, TrendingDown, Activity } from 'lucide-react';
import { simulationPresets } from '../data/mockData';
import { generateDebrisReport, type CollisionEvent } from '../lib/generateDebrisReport';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

export default function Simulations() {
  const [magnitude, setMagnitude] = useState(5);
  const [debrisRate, setDebrisRate] = useState(500);
  const [timeline, setTimeline] = useState(10);
  const [running, setRunning] = useState(false);
  const [debrisCount, setDebrisCount] = useState(0);
  const [collisionEvents, setCollisionEvents] = useState<CollisionEvent[]>([]);
  const [simElapsed, setSimElapsed] = useState(0); // simulation seconds elapsed
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const simStartRef = useRef<number>(0);
  const collisionIdRef = useRef(0);
  
  const magnitudeRef = useRef(magnitude);
  const debrisRateRef = useRef(debrisRate);
  const runningRef = useRef(running);

  useEffect(() => { magnitudeRef.current = magnitude; }, [magnitude]);
  useEffect(() => { debrisRateRef.current = debrisRate; }, [debrisRate]);
  useEffect(() => { runningRef.current = running; }, [running]);

  const initSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cancel any existing animation frame to prevent multiple loops
    cancelAnimationFrame(animRef.current);

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const earthR = 60;

    particlesRef.current = [];
    setDebrisCount(0);
    setCollisionEvents([]);
    setSimElapsed(0);
    collisionIdRef.current = 0;
    simStartRef.current = performance.now();

    // Add initial orbital objects
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const orbit = earthR + 40 + Math.random() * 120;
      const speed = 0.5 + Math.random() * 0.5;
      particlesRef.current.push({
        x: cx + Math.cos(angle) * orbit,
        y: cy + Math.sin(angle) * orbit,
        vx: Math.cos(angle + Math.PI / 2) * speed,
        vy: Math.sin(angle + Math.PI / 2) * speed,
        size: 2 + Math.random() * 2,
        color: '#00AEEF',
        life: 1,
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(5, 8, 22, 0.15)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw Earth
      const earthGrad = ctx.createRadialGradient(cx, cy, earthR * 0.3, cx, cy, earthR);
      earthGrad.addColorStop(0, '#1a3a5c');
      earthGrad.addColorStop(0.7, '#0a2540');
      earthGrad.addColorStop(1, '#050816');
      ctx.beginPath();
      ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
      ctx.fillStyle = earthGrad;
      ctx.fill();

      // Earth glow
      ctx.beginPath();
      ctx.arc(cx, cy, earthR + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 174, 239, 0.15)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Orbit rings
      [100, 140, 180].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, earthR + r * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 174, 239, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Update simulation elapsed time
      if (runningRef.current) {
        const elapsed = (performance.now() - simStartRef.current) / 1000;
        setSimElapsed(elapsed);
      }

      // Generate collision debris when running
      if (runningRef.current && Math.random() < magnitudeRef.current * 0.01) {
        const collisionAngle = Math.random() * Math.PI * 2;
        const collisionR = earthR + 60 + Math.random() * 80;
        const count = Math.floor(debrisRateRef.current * 0.01 * (1 + Math.random()));
        
        // Calculate KesslerX mitigation: early warning + avoidance maneuvers reduce debris by 60-85%
        const mitigationFactor = 0.6 + Math.random() * 0.25; // 60-85% reduction
        const debrisWithSystem = Math.max(1, Math.floor(count * (1 - mitigationFactor)));
        const severity: CollisionEvent['severity'] = 
          count > 15 ? 'CRITICAL' : count > 8 ? 'HIGH' : count > 4 ? 'MEDIUM' : 'LOW';
        
        // Record collision event
        const elapsed = (performance.now() - simStartRef.current) / 1000;
        collisionIdRef.current += 1;
        setCollisionEvents(prev => [...prev, {
          id: collisionIdRef.current,
          timestamp: elapsed,
          debrisGenerated: count,
          debrisWithSystem,
          reductionPercent: Math.round(mitigationFactor * 100),
          severity,
        }]);

        for (let i = 0; i < count; i++) {
          const spread = (Math.random() - 0.5) * magnitudeRef.current * 0.5;
          particlesRef.current.push({
            x: cx + Math.cos(collisionAngle) * collisionR,
            y: cy + Math.sin(collisionAngle) * collisionR,
            vx: (Math.random() - 0.5) * magnitudeRef.current * 0.3 + spread,
            vy: (Math.random() - 0.5) * magnitudeRef.current * 0.3 + spread,
            size: 1 + Math.random() * 1.5,
            color: Math.random() > 0.5 ? '#FF4D4D' : '#FFC107',
            life: 0.5 + Math.random() * 0.5,
          });
          setDebrisCount((c) => c + 1);
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((p) => {
        if (runningRef.current) {
          // Gravity toward center only applies when running to allow pausing
          const dx = cx - p.x;
          const dy = cy - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const grav = 0.02;
          p.vx += (dx / dist) * grav;
          p.vy += (dy / dist) * grav;

          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.0005;
          
          // Check Earth collision
          if (dist < earthR) return false;
        }
        
        if (p.life <= 0) return false;
        if (p.x < 0 || p.x > rect.width || p.y < 0 || p.y > rect.height) return false;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
        ctx.fill();

        // Particle glow
        if (p.color === '#FF4D4D') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 77, 77, 0.1)';
          ctx.fill();
        }

        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, []); // Remove running, magnitude, debrisRate from dependencies

  useEffect(() => {
    initSimulation();
    return () => cancelAnimationFrame(animRef.current);
  }, [initSimulation]);

  const reset = () => {
    setRunning(false);
    initSimulation();
  };

  const applyPreset = (preset: typeof simulationPresets[0]) => {
    setMagnitude(preset.magnitude);
    setDebrisRate(preset.debrisRate);
  };

  // Calculate real-time totals
  const totalDebrisWithout = collisionEvents.reduce((sum, e) => sum + e.debrisGenerated, 0);
  const totalDebrisWith = collisionEvents.reduce((sum, e) => sum + e.debrisWithSystem, 0);
  const totalReduction = totalDebrisWithout > 0 ? Math.round((1 - totalDebrisWith / totalDebrisWithout) * 100) : 0;
  const totalCollisions = collisionEvents.length;

  // PDF Report Generation
  const downloadReport = async () => {
    if (collisionEvents.length === 0) return;
    setIsExporting(true);
    try {
      await generateDebrisReport({
        collisionEvents,
        magnitude,
        debrisRate,
        timeline,
        simElapsed,
        totalDebrisWithout,
        totalDebrisWith,
        totalReduction,
      });
    } catch (e) {
      console.error('Failed to export PDF report', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-orbitron font-bold text-white flex items-center gap-3">
          <FlaskConical className="w-7 h-7" style={{ color: '#00E5FF', filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.5))' }} />
          Kessler Syndrome Simulator
        </h1>
        <p className="text-sm font-space mt-1" style={{ color: '#94A3B8' }}>
          Simulate cascading debris collisions and assess orbital sustainability
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-5 space-y-5"
        >
          <h3 className="text-sm font-space font-semibold tracking-wider" style={{ color: '#94A3B8' }}>
            SIMULATION CONTROLS
          </h3>

          {/* Presets */}
          <div>
            <label className="text-[10px] font-space tracking-wider block mb-2" style={{ color: '#64748B' }}>PRESETS</label>
            <div className="grid grid-cols-2 gap-2">
              {simulationPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="text-[10px] font-space px-3 py-2 rounded-lg text-left transition-all duration-200 hover:scale-105"
                  style={{ background: 'rgba(0,174,239,0.1)', color: '#00AEEF', border: '1px solid rgba(0,174,239,0.2)' }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Magnitude */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>COLLISION MAGNITUDE</label>
              <span className="text-sm font-orbitron" style={{ color: '#00AEEF' }}>{magnitude}</span>
            </div>
            <input
              type="range" min="1" max="10" value={magnitude}
              onChange={(e) => setMagnitude(Number(e.target.value))}
              className="w-full accent-[#00AEEF]"
            />
          </div>

          {/* Debris Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>DEBRIS GENERATION RATE</label>
              <span className="text-sm font-orbitron" style={{ color: '#FFC107' }}>{debrisRate}</span>
            </div>
            <input
              type="range" min="10" max="10000" step="10" value={debrisRate}
              onChange={(e) => setDebrisRate(Number(e.target.value))}
              className="w-full accent-[#FFC107]"
            />
          </div>

          {/* Timeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>TIMELINE (YEARS)</label>
              <span className="text-sm font-orbitron" style={{ color: '#00FF99' }}>{timeline}</span>
            </div>
            <input
              type="range" min="1" max="50" value={timeline}
              onChange={(e) => setTimeline(Number(e.target.value))}
              className="w-full accent-[#00FF99]"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setRunning(!running)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-space font-semibold text-sm tracking-wider transition-all duration-200"
              style={{
                background: running ? 'rgba(255,77,77,0.2)' : 'rgba(0,174,239,0.2)',
                border: `1px solid ${running ? 'rgba(255,77,77,0.4)' : 'rgba(0,174,239,0.4)'}`,
                color: running ? '#FF4D4D' : '#00AEEF',
              }}
            >
              {running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? 'STOP' : 'RUN'}
            </button>
            <button
              onClick={reset}
              className="px-4 py-2.5 rounded-lg transition-all duration-200"
              style={{ background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', color: '#94A3B8' }}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(0,174,239,0.1)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>DEBRIS GENERATED</span>
              <span className="text-sm font-orbitron" style={{ color: '#FF4D4D' }}>{debrisCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>ACTIVE PARTICLES</span>
              <span className="text-sm font-orbitron" style={{ color: '#00AEEF' }}>{particlesRef.current.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>COLLISIONS DETECTED</span>
              <span className="text-sm font-orbitron" style={{ color: '#FFC107' }}>{totalCollisions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>SIM TIME</span>
              <span className="text-sm font-orbitron" style={{ color: '#00E5FF' }}>{simElapsed.toFixed(1)}s</span>
            </div>
          </div>

          {/* Download Report Button */}
          <button
            onClick={downloadReport}
            disabled={collisionEvents.length === 0 || isExporting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-space font-semibold text-sm tracking-wider transition-all duration-300"
            style={{
              background: collisionEvents.length > 0 
                ? 'linear-gradient(135deg, rgba(0,255,153,0.15), rgba(0,174,239,0.15))'
                : 'rgba(148,163,184,0.05)',
              border: `1px solid ${collisionEvents.length > 0 ? 'rgba(0,255,153,0.4)' : 'rgba(148,163,184,0.15)'}`,
              color: collisionEvents.length > 0 ? '#00FF99' : '#4a5568',
              cursor: collisionEvents.length === 0 ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.6 : 1,
            }}
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'GENERATING...' : 'DOWNLOAD DEBRIS REPORT'}
          </button>
        </motion.div>

        {/* Simulation Canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-panel p-1 relative"
        >
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl"
            style={{ height: '520px', background: '#050816' }}
          />
          {/* Status overlay */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${running ? 'status-dot-danger' : 'status-dot-success'}`} />
              <span className="text-[10px] font-space tracking-widest" style={{ color: '#94A3B8' }}>
                {running ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Real-time Debris Impact Panel */}
      <AnimatePresence>
        {collisionEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >
            {/* Impact Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
                className="glass-panel p-4 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #FF4D4D, transparent)' }} />
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: '#FF4D4D' }} />
                  <span className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>WITHOUT KESSLERX</span>
                </div>
                <span className="text-2xl font-orbitron font-bold" style={{ color: '#FF4D4D' }}>
                  {totalDebrisWithout.toLocaleString()}
                </span>
                <p className="text-[10px] font-space mt-1" style={{ color: '#94A3B8' }}>Total debris fragments</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                className="glass-panel p-4 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #00FF99, transparent)' }} />
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" style={{ color: '#00FF99' }} />
                  <span className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>WITH KESSLERX</span>
                </div>
                <span className="text-2xl font-orbitron font-bold" style={{ color: '#00FF99' }}>
                  {totalDebrisWith.toLocaleString()}
                </span>
                <p className="text-[10px] font-space mt-1" style={{ color: '#94A3B8' }}>Mitigated debris count</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}
                className="glass-panel p-4 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #00E5FF, transparent)' }} />
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4" style={{ color: '#00E5FF' }} />
                  <span className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>REDUCTION</span>
                </div>
                <span className="text-2xl font-orbitron font-bold" style={{ color: '#00E5FF' }}>
                  {totalReduction}%
                </span>
                <p className="text-[10px] font-space mt-1" style={{ color: '#94A3B8' }}>Less debris generated</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                className="glass-panel p-4 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #FFC107, transparent)' }} />
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4" style={{ color: '#FFC107' }} />
                  <span className="text-[10px] font-space tracking-wider" style={{ color: '#64748B' }}>PREVENTED</span>
                </div>
                <span className="text-2xl font-orbitron font-bold" style={{ color: '#FFC107' }}>
                  {(totalDebrisWithout - totalDebrisWith).toLocaleString()}
                </span>
                <p className="text-[10px] font-space mt-1" style={{ color: '#94A3B8' }}>Fragments averted</p>
              </motion.div>
            </div>

            {/* Live Collision Event Feed */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-panel p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${running ? 'status-dot-danger' : ''}`}
                    style={{ background: running ? '#FF4D4D' : '#64748B' }} />
                  <h3 className="text-sm font-space font-semibold tracking-wider" style={{ color: '#94A3B8' }}>
                    COLLISION EVENT LOG — REAL-TIME
                  </h3>
                </div>
                <span className="text-[10px] font-space tracking-wider px-2 py-1 rounded-md"
                  style={{ background: 'rgba(0,174,239,0.1)', color: '#00AEEF', border: '1px solid rgba(0,174,239,0.2)' }}
                >
                  {collisionEvents.length} EVENT{collisionEvents.length !== 1 ? 'S' : ''}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0,174,239,0.15)' }}>
                        <th className="text-[9px] font-space tracking-widest py-2 px-3" style={{ color: '#64748B' }}>#</th>
                        <th className="text-[9px] font-space tracking-widest py-2 px-3" style={{ color: '#64748B' }}>TIME</th>
                        <th className="text-[9px] font-space tracking-widest py-2 px-3" style={{ color: '#64748B' }}>SEVERITY</th>
                        <th className="text-[9px] font-space tracking-widest py-2 px-3" style={{ color: '#64748B' }}>WITHOUT SYSTEM</th>
                        <th className="text-[9px] font-space tracking-widest py-2 px-3" style={{ color: '#64748B' }}>WITH KESSLERX</th>
                        <th className="text-[9px] font-space tracking-widest py-2 px-3" style={{ color: '#64748B' }}>REDUCTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...collisionEvents].reverse().map((event, idx) => {
                        const severityColor = {
                          LOW: '#00FF99', MEDIUM: '#FFC107', HIGH: '#FF4D4D', CRITICAL: '#FF003C',
                        }[event.severity];
                        return (
                          <motion.tr
                            key={event.id}
                            initial={idx === 0 ? { opacity: 0, x: -10 } : false}
                            animate={{ opacity: 1, x: 0 }}
                            style={{
                              borderBottom: '1px solid rgba(148,163,184,0.06)',
                              background: idx % 2 === 0 ? 'rgba(0,174,239,0.02)' : 'transparent',
                            }}
                          >
                            <td className="text-[11px] font-orbitron py-2 px-3" style={{ color: '#94A3B8' }}>{event.id}</td>
                            <td className="text-[11px] font-space py-2 px-3" style={{ color: '#00E5FF' }}>{event.timestamp.toFixed(1)}s</td>
                            <td className="py-2 px-3">
                              <span className="text-[9px] font-space font-bold tracking-wider px-2 py-0.5 rounded"
                                style={{ background: `${severityColor}15`, color: severityColor, border: `1px solid ${severityColor}30` }}
                              >
                                {event.severity}
                              </span>
                            </td>
                            <td className="text-[11px] font-orbitron py-2 px-3" style={{ color: '#FF4D4D' }}>
                              {event.debrisGenerated} <span className="text-[9px] font-space" style={{ color: '#64748B' }}>fragments</span>
                            </td>
                            <td className="text-[11px] font-orbitron py-2 px-3" style={{ color: '#00FF99' }}>
                              {event.debrisWithSystem} <span className="text-[9px] font-space" style={{ color: '#64748B' }}>fragments</span>
                            </td>
                            <td className="text-[11px] font-orbitron py-2 px-3" style={{ color: '#00E5FF' }}>-{event.reductionPercent}%</td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
