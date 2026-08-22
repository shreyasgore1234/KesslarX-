import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import * as satellite from 'satellite.js';

// ── Follow Mode Types ───────────────────────────────────────
export type CameraMode = 'FREE' | 'FOCUSING' | 'FOLLOWING';

export interface FollowState {
  mode: CameraMode;
  targetId?: string;
  targetName?: string;
}

// Set CESIUM_BASE_URL before importing Cesium so Workers/Assets can be located
// vite-plugin-cesium defines CESIUM_BASE_URL via Vite's `define` in dev mode
if (!(window as any).CESIUM_BASE_URL) {
  (window as any).CESIUM_BASE_URL = '/cesium/';
}

import * as CesiumModule from 'cesium';

// Ensure Cesium is available globally for both dev and build modes
if (!(window as any).Cesium) {
  (window as any).Cesium = CesiumModule;
}

interface CesiumGlobeProps {
  satellites: any[];
  onSelectObject?: (sat: any | null) => void;
  filters?: Record<string, boolean>;
  onFollowStateChange?: (state: FollowState) => void;
}

export interface CesiumGlobeRef {
  zoomIn: () => void;
  zoomOut: () => void;
  zenithView: () => void;
  toggleAutoRotate: () => void;
  flyToSatellite: (noradId: string) => void;
  stopFollowing: () => void;
  getFollowState: () => FollowState;
}

// Wait for the global Cesium object to be available (loaded by vite-plugin-cesium via script tag)
function waitForCesium(timeout = 15000): Promise<any> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const C = (window as any).Cesium;
      if (C && C.Viewer) {
        resolve(C);
      } else if (Date.now() - start > timeout) {
        reject(new Error('Cesium failed to load within timeout'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// ── SGP4 Propagation Helpers ─────────────────────────────────────
// Propagate a satellite record to a JS Date, returning geodetic {lon, lat, height}
function propagateToDate(satrec: satellite.SatRec, date: Date) {
  const pv = satellite.propagate(satrec, date);
  if (!pv || !pv.position || typeof pv.position === 'boolean') return null;
  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
  return {
    lon: satellite.degreesLong(gd.longitude),
    lat: satellite.degreesLat(gd.latitude),
    height: gd.height, // km
  };
}

// Build a SampledPositionProperty from TLE over a time window
function buildSampledPosition(
  Cesium: any,
  satrec: satellite.SatRec,
  startDate: Date,
  durationMinutes: number,
  stepSeconds: number,
) {
  const property = new Cesium.SampledPositionProperty();
  property.setInterpolationOptions({
    interpolationDegree: 5,
    interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
  });

  const steps = Math.floor((durationMinutes * 60) / stepSeconds);
  for (let i = 0; i <= steps; i++) {
    const t = new Date(startDate.getTime() + i * stepSeconds * 1000);
    const pos = propagateToDate(satrec, t);
    if (!pos) continue;
    const cesiumTime = Cesium.JulianDate.fromDate(t);
    const cartesian = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.height * 1000);
    property.addSample(cesiumTime, cartesian);
  }

  return property;
}

// Build a polyline positions array for the orbital path
function buildOrbitPath(
  Cesium: any,
  satrec: satellite.SatRec,
  startDate: Date,
  durationMinutes: number,
  stepSeconds: number,
) {
  const positions: any[] = [];
  const steps = Math.floor((durationMinutes * 60) / stepSeconds);
  for (let i = 0; i <= steps; i++) {
    const t = new Date(startDate.getTime() + i * stepSeconds * 1000);
    const pos = propagateToDate(satrec, t);
    if (!pos) continue;
    positions.push(Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.height * 1000));
  }
  return positions;
}

const CesiumGlobe = forwardRef<CesiumGlobeRef, CesiumGlobeProps>(({ satellites, onSelectObject, filters, onFollowStateChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const entitiesRef = useRef<any[]>([]);
  const autoRotateEnabledRef = useRef<boolean>(true);
  const autoRotateWasEnabledRef = useRef<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cesiumReady, setCesiumReady] = useState(false);
  const followStateRef = useRef<FollowState>({ mode: 'FREE' });
  const selectedEntityOriginalRef = useRef<{ pixelSize: number; outlineWidth: number; entity: any } | null>(null);
  const onFollowStateChangeRef = useRef(onFollowStateChange);
  onFollowStateChangeRef.current = onFollowStateChange;

  const emitFollowState = useCallback((state: FollowState) => {
    followStateRef.current = state;
    onFollowStateChangeRef.current?.(state);
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.camera.moveForward(2000000);
      }
    },
    zoomOut: () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.camera.moveBackward(2000000);
      }
    },
    zenithView: () => {
      const Cesium = (window as any).Cesium;
      if (viewerRef.current && !viewerRef.current.isDestroyed() && Cesium) {
        // Exit follow mode first
        if (followStateRef.current.mode !== 'FREE') {
          viewerRef.current.trackedEntity = undefined;
          emitFollowState({ mode: 'FREE' });
          autoRotateEnabledRef.current = autoRotateWasEnabledRef.current;
        }
        viewerRef.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(20, 20, 20000000),
          duration: 1.5,
        });
      }
    },
    toggleAutoRotate: () => {
      autoRotateEnabledRef.current = !autoRotateEnabledRef.current;
      autoRotateWasEnabledRef.current = autoRotateEnabledRef.current;
    },
    flyToSatellite: (noradId: string) => {
      const viewer = viewerRef.current;
      const Cesium = (window as any).Cesium;
      if (!viewer || viewer.isDestroyed() || !Cesium) return;

      // Find the entity by NORAD ID
      const entity = viewer.entities.getById(noradId);
      if (!entity) return;

      // Restore previous highlighted entity
      restoreEntityHighlight();

      // Highlight the new entity
      highlightEntity(Cesium, entity);

      // Save auto-rotate state and disable during follow
      autoRotateWasEnabledRef.current = autoRotateEnabledRef.current;
      autoRotateEnabledRef.current = false;

      // Determine camera offset based on satellite altitude
      // Get current position to estimate altitude
      let offset = 200000; // default 200km offset
      try {
        const currentTime = viewer.clock.currentTime;
        const pos = entity.position?.getValue(currentTime);
        if (pos) {
          const carto = Cesium.Cartographic.fromCartesian(pos);
          const altKm = carto.height / 1000;
          // Scale offset: LEO (~500km) → 150km offset, GEO (~36000km) → 2000km offset
          offset = Math.max(100000, Math.min(3000000, altKm * 300));
        }
      } catch (_e) { /* use default offset */ }

      // Emit FOCUSING state
      emitFollowState({
        mode: 'FOCUSING',
        targetId: noradId,
        targetName: entity.name || noradId,
      });

      // Use Cesium's native flyTo then set trackedEntity
      viewer.flyTo(entity, {
        duration: 2.0,
        offset: new Cesium.HeadingPitchRange(
          0,
          Cesium.Math.toRadians(-30),
          offset
        ),
      }).then(() => {
        if (viewer.isDestroyed()) return;
        // Set tracked entity — Cesium will continuously follow it
        viewer.trackedEntity = entity;
        emitFollowState({
          mode: 'FOLLOWING',
          targetId: noradId,
          targetName: entity.name || noradId,
        });
      });
    },
    stopFollowing: () => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      viewer.trackedEntity = undefined;
      autoRotateEnabledRef.current = autoRotateWasEnabledRef.current;
      emitFollowState({ mode: 'FREE' });
      // Note: we do NOT restore entity highlight here — satellite stays selected/highlighted
    },
    getFollowState: () => followStateRef.current,
  }));

  // ── Entity Highlight Helpers ──────────────────────────────
  function highlightEntity(Cesium: any, entity: any) {
    if (!entity?.point) return;
    // Save original values
    selectedEntityOriginalRef.current = {
      pixelSize: entity.point.pixelSize?.getValue(viewerRef.current?.clock?.currentTime) || 6,
      outlineWidth: entity.point.outlineWidth?.getValue(viewerRef.current?.clock?.currentTime) || 1,
      entity,
    };
    // Apply highlight
    entity.point.pixelSize = 14;
    entity.point.outlineWidth = 3;
    entity.point.outlineColor = Cesium.Color.fromCssColorString('#00AEEF').withAlpha(0.9);
    // Make label always visible when selected
    entity.label.scaleByDistance = new Cesium.NearFarScalar(1e3, 1.2, 5e7, 0.6);
    entity.label.translucencyByDistance = new Cesium.NearFarScalar(1e3, 1, 5e7, 0.8);
  }

  function restoreEntityHighlight() {
    const Cesium = (window as any).Cesium;
    const prev = selectedEntityOriginalRef.current;
    if (prev?.entity && !prev.entity.entityCollection?._owner?.isDestroyed?.()) {
      try {
        prev.entity.point.pixelSize = prev.pixelSize;
        prev.entity.point.outlineWidth = prev.outlineWidth;
        prev.entity.point.outlineColor = Cesium.Color.fromCssColorString('#ffffff').withAlpha(0.3);
        prev.entity.label.scaleByDistance = new Cesium.NearFarScalar(1.5e7, 1, 3e7, 0);
        prev.entity.label.translucencyByDistance = new Cesium.NearFarScalar(1.5e7, 1, 3e7, 0);
      } catch (_e) { /* entity may have been removed */ }
    }
    selectedEntityOriginalRef.current = null;
  }

  useEffect(() => {
    let viewer: any = null;
    let animFrameId: number;
    let isCancelled = false;

    const initCesium = async () => {
      try {
        // Wait for global Cesium to be loaded by the <script> tag from vite-plugin-cesium
        const Cesium = await waitForCesium();

        if (isCancelled || !containerRef.current) return;

        // Prevent multiple viewers by clearing the container
        containerRef.current.innerHTML = '';

        // Set the Ion token - try env var first, fall back to hardcoded token
        const token = import.meta.env.VITE_CESIUM_ION_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NjQzNWE3My00YWJmLTQ1YTAtOWVmZS1jMTM1YzRkOGU5MTgiLCJpZCI6NDQzNjc4LCJzdWIiOiJhbmlzaG1vZ2FtIiwiaXNzIjoiaHR0cHM6Ly9hcGkuY2VzaXVtLmNvbSIsImF1ZCI6Iktlc3NsZXJYIiwiaWF0IjoxNzgxMjcyMDUyfQ._xCHPWsHMzcudUf9saBFMRCNK0z-UIgTJYo2KPPLXeA';
        if (token) {
          Cesium.Ion.defaultAccessToken = token;
        }

        // ── Time window: propagate 180 minutes (2 full LEO orbits) ──
        const now = new Date();
        const startJD = Cesium.JulianDate.fromDate(now);
        const stopJD = Cesium.JulianDate.addMinutes(startJD, 180, new Cesium.JulianDate());

        viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          fullscreenButton: false,
          vrButton: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: document.createElement('div'),
          skyBox: false,
          skyAtmosphere: false,
          imageryProvider: false as any,
          contextOptions: {
            webgl: {
              alpha: true,
              preserveDrawingBuffer: true,
            },
          },
        });

        if (isCancelled) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;

        // ── Configure Cesium clock for accelerated satellite animation ──
        // At 60x speed: 1 real second = 1 simulated minute
        // A LEO satellite (90-min orbit) completes a full orbit in ~90 real seconds
        viewer.clock.startTime = startJD.clone();
        viewer.clock.stopTime = stopJD.clone();
        viewer.clock.currentTime = startJD.clone();
        viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        viewer.clock.multiplier = 60;       // 60x speed — satellites visibly move
        viewer.clock.shouldAnimate = true;   // start animating immediately

        // Continuous rendering needed for clock-driven animation
        viewer.scene.requestRenderMode = false;

        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#050816');
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1628');
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.globe.enableLighting = false;

        // Add imagery - try Cesium Ion first (Bing Maps), then fall back to OSM tiles
        try {
          const imageryProvider = await Cesium.IonImageryProvider.fromAssetId(2);
          viewer.imageryLayers.addImageryProvider(imageryProvider);
        } catch (_e) {
          try {
            viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
              url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              maximumLevel: 19
            }));
          } catch (_e2) {
            console.warn("All imagery providers failed, globe will show base color only");
          }
        }

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(20, 20, 20000000),
        });

        // Auto-rotate enabled — globe spins while satellites move along their own orbits
        autoRotateEnabledRef.current = true;
        const rotate = () => {
          if (viewer && !viewer.isDestroyed() && autoRotateEnabledRef.current) {
            viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0002);
          }
          animFrameId = requestAnimationFrame(rotate);
        };
        animFrameId = requestAnimationFrame(rotate);

        // ── Add satellites with real orbital trajectories ──
        addEntities(Cesium, viewer, now);

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: any) => {
          const picked = viewer.scene.pick(movement.position);
          if (Cesium.defined(picked) && picked.id) {
            const sat = satellites.find((s) => s.NORAD_CAT_ID.toString() === picked.id.id);
            if (sat && onSelectObject) {
              // Restore previous highlight
              restoreEntityHighlight();
              // Highlight new entity
              const entity = viewer.entities.getById(sat.NORAD_CAT_ID.toString());
              if (entity) highlightEntity(Cesium, entity);
              onSelectObject(sat);
            }
          } else if (onSelectObject) {
            restoreEntityHighlight();
            // Exit follow mode when clicking empty space
            if (followStateRef.current.mode !== 'FREE') {
              viewer.trackedEntity = undefined;
              autoRotateEnabledRef.current = autoRotateWasEnabledRef.current;
              emitFollowState({ mode: 'FREE' });
            }
            onSelectObject(null);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // ── Detect user camera interaction to exit follow mode ──
        // When user drags/zooms while following, Cesium clears trackedEntity.
        // We listen for this and update our state accordingly.
        let lastTrackedEntity: any = undefined;
        viewer.scene.preRender.addEventListener(() => {
          const currentTracked = viewer.trackedEntity;
          if (lastTrackedEntity && !currentTracked && followStateRef.current.mode === 'FOLLOWING') {
            // User interacted — Cesium cleared tracking
            autoRotateEnabledRef.current = autoRotateWasEnabledRef.current;
            emitFollowState({ mode: 'FREE' });
          }
          lastTrackedEntity = currentTracked;
        });

        setCesiumReady(true);
        setError(null);
      } catch (err: any) {
        console.error('Failed to initialize Cesium:', err);
        setError(err.message || 'Failed to load 3D globe');
      }
    };

    const addEntities = (Cesium: any, viewer: any, now: Date) => {
      viewer.entities.removeAll();
      entitiesRef.current = [];

      satellites.forEach((sat) => {
        const name = sat.OBJECT_NAME || sat.name || `Unknown (${sat.NORAD_CAT_ID})`;
        const category = sat.CATEGORY || sat.type || sat.OBJECT_TYPE || 'Unknown';
        const isDebris = category.toUpperCase() === 'DEBRIS';

        try {
          let positionProperty: any = null;
          let orbitPathPositions: any[] | null = null;

          if (sat.TLE_LINE1 && sat.TLE_LINE2) {
            const satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);

            // Verify TLE is valid by propagating to current time
            const testPos = propagateToDate(satrec, now);
            if (!testPos) return;

            // Debris: fewer samples, no orbit path line
            // Payloads: more samples + orbit path polyline
            const durationMin = 180; // 2 full LEO orbits
            const stepSec = isDebris ? 60 : 30;

            positionProperty = buildSampledPosition(Cesium, satrec, now, durationMin, stepSec);

            // Build orbit path polyline for non-debris objects
            if (!isDebris) {
              orbitPathPositions = buildOrbitPath(Cesium, satrec, now, durationMin, 60);
            }
          } else if (sat.lat !== undefined && sat.lon !== undefined && sat.altitude !== undefined) {
            // Fallback: static position for satellites without TLE data
            positionProperty = Cesium.Cartesian3.fromDegrees(sat.lon, sat.lat, sat.altitude * 1000);
          } else {
            return; // Cannot render without position data
          }

          const color = getColor(Cesium, category);
          const size = isDebris ? 4 : 6;
          const isVisible = filters && category ? filters[category] !== false : true;

          // Add the satellite entity with time-varying position
          // Entity config: time-varying position + trailing path for non-debris
          const entityConfig: any = {
            id: sat.NORAD_CAT_ID.toString(),
            name: name,
            show: isVisible,
            position: positionProperty,
            point: {
              pixelSize: size,
              color: color,
              outlineColor: Cesium.Color.fromCssColorString('#ffffff').withAlpha(0.3),
              outlineWidth: 1,
              scaleByDistance: new Cesium.NearFarScalar(1.5e7, 1.5, 4e7, 0.5),
            },
            label: {
              text: name,
              font: '11px "Space Grotesk"',
              fillColor: Cesium.Color.WHITE.withAlpha(0.8),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -12),
              scaleByDistance: new Cesium.NearFarScalar(1.5e7, 1, 3e7, 0),
              translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1, 3e7, 0),
            },
          };

          // Add a trailing path behind moving satellites (shows where they've been)
          if (!isDebris && sat.TLE_LINE1) {
            entityConfig.path = {
              resolution: 120,                              // sample every 120 sim-seconds
              material: color.withAlpha(0.4),
              width: 1.5,
              leadTime: 2700,                               // 45 min ahead
              trailTime: 2700,                              // 45 min behind
            };
          }

          const entity = viewer.entities.add(entityConfig);

          entitiesRef.current.push({ entity, category: category });

          // Draw the orbit path as a faint polyline
          if (orbitPathPositions && orbitPathPositions.length > 1) {
            viewer.entities.add({
              polyline: {
                positions: orbitPathPositions,
                width: 1,
                material: color.withAlpha(0.25),
                show: isVisible,
              },
              // Store reference for filter toggling
              properties: {
                orbitPathFor: sat.NORAD_CAT_ID.toString(),
                category: category,
              },
            });
          }
        } catch (_e) {
          // Ignore invalid TLE data
        }
      });
    };

    initCesium();

    return () => {
      isCancelled = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites]);

  // Update entity visibility when filters change
  useEffect(() => {
    entitiesRef.current.forEach(({ entity, category }) => {
      const shouldShow = filters ? filters[category] !== false : true;
      if (entity.show !== shouldShow) {
        entity.show = shouldShow;
      }
    });
    // Also toggle orbit path polylines
    if (viewerRef.current && !viewerRef.current.isDestroyed()) {
      const entities = viewerRef.current.entities.values;
      for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        if (e.properties && e.properties.category) {
          const cat = e.properties.category.getValue();
          const shouldShow = filters ? filters[cat] !== false : true;
          if (e.polyline) {
            e.polyline.show = shouldShow;
          }
        }
      }
    }
  }, [filters]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative rounded-xl overflow-hidden"
      style={{
        border: '1px solid rgba(0, 174, 239, 0.12)',
        boxShadow: '0 0 30px rgba(0, 174, 239, 0.06)',
      }}
    >
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#050816]/90">
          <div className="text-center p-6">
            <span className="material-symbols-outlined text-4xl text-error mb-2 block">error</span>
            <p className="text-error font-body-md">{error}</p>
            <p className="text-outline text-sm mt-2">Check browser console for details</p>
          </div>
        </div>
      )}
      {!cesiumReady && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#050816]">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-t-transparent mx-auto mb-3 border-primary/30"
              style={{ borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            <span className="text-sm font-label-mono text-outline uppercase tracking-widest">Initializing Globe...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-[500px]" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 50%, rgba(5,8,22,0.4) 100%)',
        }}
      />

      <div className="absolute top-3 left-3 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00FF99', boxShadow: '0 0 6px #00FF99' }} />
          <span className="text-[10px] font-bold tracking-widest text-slate-400">
            LIVE TRACKING
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 pointer-events-none">
        <span className="text-[10px] font-bold text-primary">
          {satellites.length} OBJECTS
        </span>
      </div>
    </motion.div>
  );
});

export default CesiumGlobe;

function getColor(Cesium: any, category: string) {
  switch (category) {
    case 'Communication': return Cesium.Color.fromCssColorString('#00AEEF');
    case 'Debris': return Cesium.Color.fromCssColorString('#FF4D4D').withAlpha(0.6);
    case 'ISS': return Cesium.Color.fromCssColorString('#FFFFFF');
    case 'Weather': return Cesium.Color.fromCssColorString('#EAB308'); // yellow-500
    case 'Military': return Cesium.Color.fromCssColorString('#F97316'); // orange-500
    case 'GPS': return Cesium.Color.fromCssColorString('#10B981'); // emerald-500
    case 'Scientific': return Cesium.Color.fromCssColorString('#A855F7'); // purple-500
    default: return Cesium.Color.fromCssColorString('#94A3B8');
  }
}
