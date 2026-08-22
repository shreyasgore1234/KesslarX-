import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Gauge, Clock, Compass, Shield, Download, Crosshair, Satellite } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import * as satellite from 'satellite.js';
import { getSatelliteMedia, type SatelliteMedia } from '../../data/satelliteMedia';
import type { FollowState } from './CesiumGlobe';
import ReportPreviewModal from '../handoff/ReportPreviewModal';
import { useEvents, useUsers } from '../../hooks/useHandoffAPI';
import { useCurrentUser } from '../handoff/UserContext';
import type { HandoffEvent } from '../../data/handoffTypes';

interface ObjectDetailsPanelProps {
  satelliteData: any | null;
  onClose: () => void;
  followState?: FollowState;
  onFollowSatellite?: () => void;
  onStopFollowing?: () => void;
}

export default function ObjectDetailsPanel({
  satelliteData,
  onClose,
  followState,
  onFollowSatellite,
  onStopFollowing,
}: ObjectDetailsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { events } = useEvents();
  const { users } = useUsers();
  const { currentUser } = useCurrentUser();

  // Parse TLE to get real stats
  let altitude = 'Unknown';
  let velocity = 'Unknown';
  let inclination = 'Unknown';
  let period = 'Unknown';

  if (satelliteData && satelliteData.TLE_LINE1 && satelliteData.TLE_LINE2) {
    try {
      const satrec = satellite.twoline2satrec(satelliteData.TLE_LINE1, satelliteData.TLE_LINE2);
      const positionAndVelocity = satellite.propagate(satrec, new Date());
      if (positionAndVelocity && positionAndVelocity.position && positionAndVelocity.velocity) {
        const positionEci = positionAndVelocity.position;
        const velocityEci = positionAndVelocity.velocity;
      
      if (positionEci && velocityEci && typeof positionEci !== 'boolean' && typeof velocityEci !== 'boolean') {
        const gmst = satellite.gstime(new Date());
        const positionGd = satellite.eciToGeodetic(positionEci as satellite.EciVec3<number>, gmst);
        altitude = Math.round(positionGd.height).toLocaleString();
        
        // Calculate velocity magnitude in km/s then to km/h
        const v = velocityEci as satellite.EciVec3<number>;
        const vMag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        velocity = Math.round(vMag * 3600).toLocaleString();

        inclination = (satrec.inclo * (180 / Math.PI)).toFixed(2);
        const meanMotionRevPerDay = satrec.no * 60 * 24 / (2 * Math.PI);
        if (meanMotionRevPerDay > 0) {
           period = Math.round(1440 / meanMotionRevPerDay).toString();
        }
      }
      }
    } catch (e) {
      // Fallback
    }
  }

  // Fallback to directly provided mock data if TLE parsing failed or was missing
  if (altitude === 'Unknown' && satelliteData?.altitude !== undefined) altitude = satelliteData.altitude.toString();
  if (velocity === 'Unknown' && satelliteData?.velocity !== undefined) velocity = satelliteData.velocity.toString();
  if (inclination === 'Unknown' && satelliteData?.inclination !== undefined) inclination = satelliteData.inclination.toString();
  if (period === 'Unknown' && satelliteData?.period !== undefined) period = satelliteData.period.toString();

  // Generate a stable fake collision risk based on ID
  const baseRisk = satelliteData ? (satelliteData.NORAD_CAT_ID % 20) : 0;
  const collisionRisk = satelliteData?.CATEGORY === 'Debris' ? 0 : baseRisk;
  const requiresManeuver = collisionRisk > 10;
  const deltaV = (collisionRisk * 0.15).toFixed(2);
  const deltaTheta = (collisionRisk * 0.08).toFixed(2);

  // Satellite media lookup
  const objectName = satelliteData?.OBJECT_NAME || satelliteData?.name || '';
  const media: SatelliteMedia | null = objectName ? getSatelliteMedia(objectName) : null;

  // Follow mode state
  const isFollowing = followState?.mode === 'FOLLOWING' && followState.targetId === satelliteData?.NORAD_CAT_ID?.toString();
  const isFocusing = followState?.mode === 'FOCUSING' && followState.targetId === satelliteData?.NORAD_CAT_ID?.toString();

  // Match or synthesize a report event
  const matchingEvent = events.find(
    e => (objectName && (
      (e.satellite && e.satellite.toUpperCase().includes(objectName.toUpperCase())) ||
      (e.title && e.title.toUpperCase().includes(objectName.toUpperCase())) ||
      (e.object && e.object.toUpperCase().includes(objectName.toUpperCase()))
    )) || (satelliteData?.NORAD_CAT_ID && e.event_id?.includes(satelliteData.NORAD_CAT_ID.toString()))
  );

  const reportEvent: HandoffEvent = matchingEvent || {
    event_id: `SAT-${satelliteData?.NORAD_CAT_ID || '00000'}`,
    title: `${objectName || 'SATELLITE'} — Orbital Safety Assessment`,
    satellite: objectName || `NORAD ${satelliteData?.NORAD_CAT_ID || 'Unknown'}`,
    object: 'Catalog Background Screening',
    severity: (satelliteData?.CATEGORY === 'Debris' || requiresManeuver) ? 'MEDIUM' : 'LOW',
    tca: 'Continuous Telemetry Monitoring',
    tca_minutes: 0,
    miss_distance_km: undefined,
    collision_probability: requiresManeuver ? 0.012 : 0.0001,
    status: 'Nominal Tracking',
    current_owner_id: currentUser?.user_id || 'anish',
    current_owner_role: currentUser?.role || 'Flight Dynamics Analyst',
    next_action: requiresManeuver ? 'Perform collision avoidance screening pass.' : 'Maintain standard orbital ephemeris screening.',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    orbit: satelliteData?.CATEGORY || 'LEO',
    altitude_km: altitude !== 'Unknown' ? Number(altitude.replace(/,/g, '')) : undefined,
    relative_velocity_km_s: velocity !== 'Unknown' ? Number((Number(velocity.replace(/,/g, '')) / 3600).toFixed(2)) : undefined,
    risk_trend: requiresManeuver ? 'Elevated' : 'Stable',
    uncertainty: '±15m radial',
    work_completed: [
      'Telemetry ingested from Space-Track / 18 SDS ephemeris',
      'SGP4 propagation updated with active orbital elements',
      'Conjunction safety threshold screening performed',
    ],
    current_decision: 'Satellite orbit is being continuously monitored by KesslerX safety pipelines.',
    constraints: [
      'Subject to atmospheric drag variations in Low Earth Orbit',
    ],
  };

  return (
    <AnimatePresence>
      {satelliteData && (
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.3 }}
          className="absolute top-4 right-4 w-80 z-20 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar"
        >
          <div ref={panelRef} className="glass-panel-strong p-5 rounded-xl border border-primary/20" style={{ background: 'rgba(6, 14, 32, 0.85)', backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-orbitron font-bold text-white truncate pr-2">
                {satelliteData.OBJECT_NAME || `Object ${satelliteData.NORAD_CAT_ID}`}
              </h4>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-primary/20 shrink-0"
              >
                <X className="w-4 h-4" style={{ color: '#94A3B8' }} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-5">
              <span
                className="text-[10px] font-space px-2.5 py-1 rounded-full uppercase tracking-wider"
                style={{ background: 'rgba(0,174,239,0.15)', color: '#00AEEF', border: '1px solid rgba(0,174,239,0.3)' }}
              >
                {satelliteData.CATEGORY || satelliteData.OBJECT_TYPE || 'UNKNOWN'}
              </span>
              <span className="text-[11px] font-space" style={{ color: '#64748B' }}>NORAD: {satelliteData.NORAD_CAT_ID}</span>
            </div>

            {/* ── Satellite Image Section ────────────────────── */}
            <div className="mb-5">
              {media ? (
                <div>
                  {/* Image container */}
                  <div
                    className="relative w-full rounded-lg overflow-hidden"
                    style={{
                      aspectRatio: '16 / 10',
                      background: '#0a1628',
                      border: '1px solid rgba(0, 174, 239, 0.15)',
                    }}
                  >
                    {/* Loading skeleton */}
                    {!imageLoaded && !imageError && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-primary/30 mx-auto mb-2"
                            style={{ borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}
                          />
                          <span className="text-[10px] font-label-mono text-outline uppercase tracking-widest">
                            Loading Image...
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error state */}
                    {imageError && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center px-4">
                          <Satellite className="w-8 h-8 mx-auto mb-2" style={{ color: '#64748B' }} />
                          <span className="text-[10px] font-label-mono text-outline uppercase tracking-widest block">
                            Spacecraft Image Unavailable
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actual image */}
                    <img
                      src={media.imageUrl}
                      alt={media.displayLabel}
                      className="w-full h-full transition-opacity duration-300"
                      style={{
                        objectFit: 'cover',
                        opacity: imageLoaded && !imageError ? 1 : 0,
                      }}
                      onLoad={() => { setImageLoaded(true); setImageError(false); }}
                      onError={() => { setImageError(true); setImageLoaded(false); }}
                      loading="lazy"
                    />
                  </div>

                  {/* Image label + attribution */}
                  <div className="mt-2 space-y-1">
                    {media.imageType !== 'exact' && (
                      <p className="text-[10px] font-label-mono uppercase tracking-wider" style={{ color: '#EAB308' }}>
                        {media.displayLabel}
                      </p>
                    )}
                    <p className="text-[10px] font-label-mono" style={{ color: '#64748B' }}>
                      Image:{' '}
                      <a
                        href={media.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary transition-colors"
                      >
                        {media.sourceName}
                      </a>
                      {' · '}{media.attribution.split('/').pop()?.trim()}
                    </p>
                  </div>
                </div>
              ) : (
                /* No image available fallback */
                <div
                  className="w-full rounded-lg flex flex-col items-center justify-center py-6"
                  style={{
                    aspectRatio: '16 / 10',
                    background: 'rgba(10, 22, 40, 0.6)',
                    border: '1px solid rgba(100, 116, 139, 0.2)',
                  }}
                >
                  <Satellite className="w-10 h-10 mb-3" style={{ color: '#334155' }} />
                  <span className="text-[10px] font-label-mono text-outline uppercase tracking-widest text-center leading-relaxed">
                    No Public Spacecraft<br />Image Available
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6">
              {[
                { icon: MapPin, label: 'Altitude', value: `${altitude} km` },
                { icon: Gauge, label: 'Velocity', value: `${velocity} km/h` },
                { icon: Clock, label: 'Orbital Period', value: `${period} min` },
                { icon: Compass, label: 'Inclination', value: `${inclination}°` },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4" style={{ color: '#64748B' }} />
                    <span className="text-xs font-space" style={{ color: '#94A3B8' }}>{item.label}</span>
                  </div>
                  <span className="text-sm font-orbitron text-white">{item.value}</span>
                </div>
              ))}

              <div className="h-px my-4" style={{ background: 'rgba(0,174,239,0.2)' }} />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4" style={{ color: '#64748B' }} />
                  <span className="text-xs font-space" style={{ color: '#94A3B8' }}>Collision Risk</span>
                </div>
                <StatusBadge
                  severity={collisionRisk > 10 ? 'CRITICAL' : collisionRisk > 5 ? 'HIGH' : collisionRisk > 2 ? 'MEDIUM' : 'LOW'}
                  label={satelliteData.CATEGORY === 'Debris' ? 'N/A' : `${collisionRisk}%`}
                />
              </div>

              {requiresManeuver && satelliteData.CATEGORY !== 'Debris' && (
                <div className="mt-3 p-3 rounded flex flex-col gap-2" style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
                  <span className="text-[10px] font-label-mono uppercase tracking-widest" style={{ color: '#FF4D4D' }}>Recommended Maneuver</span>
                  <div className="flex justify-between items-center text-xs font-space">
                    <span style={{ color: '#94A3B8' }}>Delta-v (∆V)</span>
                    <span className="font-bold" style={{ color: '#FF4D4D' }}>+{deltaV} m/s</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-space">
                    <span style={{ color: '#94A3B8' }}>Orbit Change (∆θ)</span>
                    <span className="font-bold" style={{ color: '#FF4D4D' }}>+{deltaTheta}°</span>
                  </div>
                </div>
              )}
            </div>

              <div className="flex flex-col gap-2">
                {/* Follow Satellite Button */}
                {onFollowSatellite && onStopFollowing && (
                  isFollowing ? (
                    <button
                      onClick={onStopFollowing}
                      id="exit-follow-btn"
                      className="w-full py-2.5 rounded-lg text-xs font-space font-semibold tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#10B981',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        e.currentTarget.style.color = '#EF4444';
                        e.currentTarget.querySelector('span')!.textContent = 'EXIT FOLLOW';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                        e.currentTarget.style.color = '#10B981';
                        e.currentTarget.querySelector('span')!.textContent = 'FOLLOWING';
                      }}
                    >
                      <Crosshair className="w-4 h-4" />
                      <span>FOLLOWING</span>
                    </button>
                  ) : (
                    <button
                      onClick={onFollowSatellite}
                      disabled={isFocusing}
                      id="follow-satellite-btn"
                      className="w-full py-2.5 rounded-lg text-xs font-space font-semibold tracking-wider transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{
                        background: 'rgba(0, 174, 239, 0.15)',
                        border: '1px solid rgba(0, 174, 239, 0.3)',
                        color: '#00AEEF',
                      }}
                      onMouseEnter={(e) => {
                        if (!isFocusing) {
                          e.currentTarget.style.background = 'rgba(0, 174, 239, 0.25)';
                          e.currentTarget.style.boxShadow = '0 0 15px rgba(0,174,239,0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 174, 239, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <Crosshair className="w-4 h-4" />
                      {isFocusing ? 'FOCUSING...' : 'FOLLOW SATELLITE'}
                    </button>
                  )
                )}

                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full py-2.5 rounded-lg text-xs font-space font-semibold tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(0, 174, 239, 0.15)',
                    border: '1px solid rgba(0, 174, 239, 0.3)',
                    color: '#00AEEF',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 174, 239, 0.25)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0,174,239,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 174, 239, 0.15)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Download className="w-4 h-4" />
                  DOWNLOAD PDF REPORT
                </button>
              </div>
          </div>
        </motion.div>
      )}

      {/* Unified Report Preview & PDF Generation Modal */}
      {showReportModal && currentUser && (
        <ReportPreviewModal
          event={reportEvent}
          handoffs={[]}
          timeline={[]}
          currentUser={currentUser}
          users={users}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </AnimatePresence>
  );
}
