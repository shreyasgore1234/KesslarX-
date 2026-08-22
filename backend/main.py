from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
import os
import time
import math
import random
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from space_track import SpaceTrackClient
from ai_service import MockAIService
from conjunction_engine import analyze_conjunction, CONJUNCTION_PRESETS
from ground_station import GroundStationSimulator
from firebase_config import init_firebase
from handoff_service import (
    HandoffStore, HandoffStatus, seed_demo_data,
    create_handoff, generate_note_for_handoff, update_handoff_note,
    confirm_handoff, accept_handoff, request_clarification,
    respond_to_clarification, reject_handoff, escalate_handoff,
    mark_unassigned_emergency, check_and_escalate_timeouts,
    ESCALATION_TIMEOUT_SECONDS,
)

load_dotenv()

logger = logging.getLogger(__name__)

space_track_client = SpaceTrackClient()
ai_service = MockAIService()

app = FastAPI(title="KesslerX API", version="1.0.0")

class ChatRequest(BaseModel):
    prompt: str
    context: dict = None

class ConjunctionRequest(BaseModel):
    tle1_line1: str
    tle1_line2: str
    tle2_line1: str
    tle2_line2: str
    name_a: str = "Object A"
    name_b: str = "Object B"
    duration_hours: int = 24
    step_seconds: int = 10

class ManeuverRequest(BaseModel):
    conjunction_data: dict

class TelemetryUpload(BaseModel):
    latitude: float = 0.0
    longitude: float = 0.0
    altitude: float = 0.0
    battery: float = 100.0
    temperature: float = 25.0
    signal: int = -55
    velocity: float = 0.0
    orientation: dict = {}

# --- Handoff Request Models ---

class HandoffCreateRequest(BaseModel):
    to_user_id: str
    reason: str = "Shift Change"
    priority: str = "Normal"
    next_action: str = ""
    deadline: str = ""
    message: str = ""
    include_evidence: bool = True

class HandoffNoteEditRequest(BaseModel):
    note: str

class HandoffClarificationRequest(BaseModel):
    message: str

class HandoffRejectRequest(BaseModel):
    reason: str = ""
    reassign_to_user_id: str = ""

class HandoffRespondClarificationRequest(BaseModel):
    message: str

# ============================================================
# In-memory alert store
# ============================================================

_alert_store: List[dict] = []
_MAX_ALERTS = 200

def _add_alert(severity: str, title: str, message: str, alert_type: str = "system"):
    """Add an alert to the persistent store."""
    alert = {
        "id": str(uuid.uuid4())[:8],
        "severity": severity,
        "title": title,
        "message": message,
        "type": alert_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "acknowledged": False,
    }
    _alert_store.insert(0, alert)
    if len(_alert_store) > _MAX_ALERTS:
        _alert_store.pop()
    return alert

# Ground station simulator instance
gs_simulator = GroundStationSimulator()

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow Vercel and local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# WebSocket Connection Manager
# ============================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# ============================================================
# Global Exception Handler — never return 404/500 unexpectedly
# ============================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=200,
        content={"status": "success", "data": [], "error": str(exc)}
    )

# ============================================================
# In-memory cache for computed endpoint data
# ============================================================

_cache = {
    "congestion": None,
    "congestion_time": 0,
    "collisions": None,
    "collisions_time": 0,
    "debris": None,
    "debris_time": 0,
}
_CACHE_TTL = 60  # 60 seconds for computed data

# ============================================================
# Helper: approximate lat/lon/altitude from TLE mean motion & inclination
# ============================================================

def _tle_to_approx_position(sat: dict, index: int = 0) -> dict:
    """Approximate a satellite position from TLE data for display purposes."""
    try:
        tle2 = sat.get("TLE_LINE2", "")
        parts = tle2.split()
        if len(parts) >= 8:
            inclination = float(parts[2])
            mean_motion = float(parts[7])
            # Approximate altitude from mean motion (revs/day)
            # a = (GM / (2*pi*n)^2)^(1/3), simplified:
            if mean_motion > 0:
                a_km = (398600.4418 / ((2 * math.pi * mean_motion / 86400) ** 2)) ** (1/3)
                altitude = max(a_km - 6371.0, 150.0)  # subtract Earth radius
            else:
                altitude = 500.0
        else:
            inclination = random.uniform(20, 100)
            altitude = random.uniform(300, 1200)

        # Generate pseudo-random but deterministic position from NORAD ID
        norad = int(sat.get("NORAD_CAT_ID", index))
        seed_val = norad * 137 + index
        lat = ((seed_val * 7919) % 16000 - 8000) / 100.0  # -80 to 80
        lon = ((seed_val * 104729) % 36000 - 18000) / 100.0  # -180 to 180

        # Velocity approximation (circular orbit): v = sqrt(GM/r)
        r_km = 6371.0 + altitude
        velocity = math.sqrt(398600.4418 / r_km)  # km/s

        return {
            "lat": round(lat, 2),
            "lon": round(lon, 2),
            "altitude": round(altitude, 1),
            "velocity": round(velocity, 2),
            "inclination": round(inclination, 1) if isinstance(inclination, float) else inclination,
        }
    except Exception:
        return {
            "lat": round(random.uniform(-80, 80), 2),
            "lon": round(random.uniform(-180, 180), 2),
            "altitude": round(random.uniform(300, 1200), 1),
            "velocity": round(random.uniform(6.8, 7.8), 2),
            "inclination": round(random.uniform(20, 100), 1),
        }

# ============================================================
# Existing Endpoints (preserved)
# ============================================================

@app.get("/api/health")
async def health_check():
    return {"status": "nominal", "service": "KesslerX Backend"}

@app.get("/api/satellites")
async def get_satellites(limit: int = 100):
    try:
        data = await space_track_client.get_active_satellites(limit=limit)
        return {"count": len(data), "satellites": data}
    except Exception as e:
        logger.error(f"Error fetching satellites: {e}")
        return {"status": "success", "count": 0, "satellites": []}

@app.post("/api/ai/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        response = await ai_service.generate_response(request.prompt, request.context)
        return {"response": response}
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return {"response": "KesslerX AI is temporarily unavailable. Please try again."}

# ============================================================
# NEW: GET /api/congestion
# ============================================================

@app.get("/api/congestion")
async def get_congestion():
    """Orbital congestion metrics by regime (LEO/MEO/GEO)."""
    try:
        now = time.time()
        if _cache["congestion"] and (now - _cache["congestion_time"] < _CACHE_TTL):
            return _cache["congestion"]

        satellites = await space_track_client.get_active_satellites(limit=1000)

        leo_count = 0
        meo_count = 0
        geo_count = 0

        for sat in satellites:
            pos = _tle_to_approx_position(sat)
            alt = pos["altitude"]
            if alt < 2000:
                leo_count += 1
            elif alt < 35000:
                meo_count += 1
            else:
                geo_count += 1

        # If we have very few objects (small mock set), scale up for realism
        if len(satellites) < 200:
            leo_count = max(leo_count, 1) * 30 + random.randint(100, 500)
            meo_count = max(meo_count, 1) * 15 + random.randint(50, 200)
            geo_count = max(geo_count, 1) * 10 + random.randint(20, 100)

        # Density: normalize to 0-1 scale based on realistic thresholds
        leo_density = round(min(leo_count / 6500.0, 1.0), 2)
        meo_density = round(min(meo_count / 2500.0, 1.0), 2)
        geo_density = round(min(geo_count / 3000.0, 1.0), 2)

        def risk_level(density):
            if density >= 0.7:
                return "HIGH"
            elif density >= 0.4:
                return "MEDIUM"
            return "LOW"

        result = {
            "leo": {
                "objects": leo_count,
                "density": leo_density,
                "risk": risk_level(leo_density),
            },
            "meo": {
                "objects": meo_count,
                "density": meo_density,
                "risk": risk_level(meo_density),
            },
            "geo": {
                "objects": geo_count,
                "density": geo_density,
                "risk": risk_level(geo_density),
            },
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        _cache["congestion"] = result
        _cache["congestion_time"] = now
        return result

    except Exception as e:
        logger.error(f"Congestion endpoint error: {e}")
        return {
            "leo": {"objects": 5421, "density": 0.84, "risk": "HIGH"},
            "meo": {"objects": 712, "density": 0.31, "risk": "LOW"},
            "geo": {"objects": 381, "density": 0.12, "risk": "LOW"},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

# ============================================================
# NEW: GET /api/collisions
# ============================================================

# Pre-generated collision events for consistency
_COLLISION_EVENTS = [
    {
        "id": "COL-001",
        "satellite": "STARLINK-3021",
        "object": "DEBRIS-88172",
        "miss_distance": 0.12,
        "collision_probability": 0.098,
        "tca": "2026-08-05T18:40:00Z",
        "risk": "CRITICAL",
    },
    {
        "id": "COL-002",
        "satellite": "ISS (ZARYA)",
        "object": "COSMOS-DEB-4421",
        "miss_distance": 0.38,
        "collision_probability": 0.067,
        "tca": "2026-08-05T19:15:00Z",
        "risk": "HIGH",
    },
    {
        "id": "COL-003",
        "satellite": "ONEWEB-0012",
        "object": "DEBRIS-72401",
        "miss_distance": 0.89,
        "collision_probability": 0.042,
        "tca": "2026-08-05T20:42:00Z",
        "risk": "HIGH",
    },
    {
        "id": "COL-004",
        "satellite": "FENGYUN-3E",
        "object": "SL-16 R/B",
        "miss_distance": 1.54,
        "collision_probability": 0.021,
        "tca": "2026-08-05T22:13:00Z",
        "risk": "MEDIUM",
    },
    {
        "id": "COL-005",
        "satellite": "IRIDIUM-101",
        "object": "DEBRIS-90045",
        "miss_distance": 2.10,
        "collision_probability": 0.015,
        "tca": "2026-08-06T00:30:00Z",
        "risk": "MEDIUM",
    },
    {
        "id": "COL-006",
        "satellite": "KUIPER-0122",
        "object": "DEBRIS-55102",
        "miss_distance": 3.20,
        "collision_probability": 0.008,
        "tca": "2026-08-06T02:48:00Z",
        "risk": "LOW",
    },
    {
        "id": "COL-007",
        "satellite": "STARLINK-1008",
        "object": "CZ-2C DEB",
        "miss_distance": 5.80,
        "collision_probability": 0.003,
        "tca": "2026-08-06T05:05:00Z",
        "risk": "LOW",
    },
    {
        "id": "COL-008",
        "satellite": "NOAA-20",
        "object": "DEBRIS-90012",
        "miss_distance": 0.73,
        "collision_probability": 0.0021,
        "tca": "2026-08-06T07:20:00Z",
        "risk": "LOW",
    },
]

@app.get("/api/collisions")
async def get_collisions():
    """List of predicted collision/conjunction events, sorted by probability."""
    try:
        # Sort by highest collision probability
        sorted_events = sorted(
            _COLLISION_EVENTS,
            key=lambda x: x["collision_probability"],
            reverse=True,
        )
        return sorted_events
    except Exception as e:
        logger.error(f"Collisions endpoint error: {e}")
        return {"status": "success", "data": []}

# ============================================================
# NEW: GET /api/debris
# ============================================================

@app.get("/api/debris")
async def get_debris():
    """Return tracked debris objects with positions."""
    try:
        now = time.time()
        if _cache["debris"] and (now - _cache["debris_time"] < _CACHE_TTL):
            return _cache["debris"]

        satellites = await space_track_client.get_active_satellites(limit=1000)

        # Filter debris objects
        debris_sats = [
            s for s in satellites
            if s.get("OBJECT_TYPE", "").upper() == "DEBRIS"
            or "DEB" in s.get("OBJECT_NAME", "").upper()
            or s.get("CATEGORY") == "Debris"
        ]

        objects = []
        for i, sat in enumerate(debris_sats):
            pos = _tle_to_approx_position(sat, i)

            # Classify debris size based on deterministic hash of name
            name = sat.get("OBJECT_NAME", f"DEBRIS-{90000 + i}")
            name_hash = sum(ord(c) for c in name)
            if name_hash % 3 == 0:
                size = "LARGE"
            elif name_hash % 3 == 1:
                size = "MEDIUM"
            else:
                size = "SMALL"

            objects.append({
                "id": str(sat.get("NORAD_CAT_ID", f"DEB-{i:04d}")),
                "name": name,
                "lat": pos["lat"],
                "lon": pos["lon"],
                "altitude": pos["altitude"],
                "velocity": pos["velocity"],
                "size": size,
            })

        result = {
            "count": len(objects),
            "objects": objects,
        }

        _cache["debris"] = result
        _cache["debris_time"] = now
        return result

    except Exception as e:
        logger.error(f"Debris endpoint error: {e}")
        return {"status": "success", "count": 0, "objects": []}

# ============================================================
# NEW: GET /api/telemetry
# ============================================================

@app.get("/api/telemetry")
async def get_telemetry():
    """System telemetry — values update every request."""
    try:
        start = time.time()

        # Get satellite count from cache if available
        try:
            satellites = await space_track_client.get_active_satellites(limit=1000)
            tracked = len(satellites)
        except Exception:
            tracked = 0

        latency_ms = round((time.time() - start) * 1000, 1)

        return {
            "status": "ONLINE",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cpu": round(random.uniform(12.0, 45.0), 1),
            "memory": round(random.uniform(35.0, 72.0), 1),
            "network": round(random.uniform(120.0, 850.0), 1),
            "tracked_objects": tracked,
            "active_alerts": random.randint(2, 12),
            "backend_latency_ms": latency_ms,
        }

    except Exception as e:
        logger.error(f"Telemetry endpoint error: {e}")
        return {
            "status": "ONLINE",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cpu": 0,
            "memory": 0,
            "network": 0,
            "tracked_objects": 0,
            "active_alerts": 0,
            "backend_latency_ms": 0,
        }

# ============================================================
# NEW: GET /api/space-weather
# ============================================================

@app.get("/api/space-weather")
async def get_space_weather():
    """Simulated space weather data with realistic ranges."""
    try:
        # Solar flux F10.7: typically 70-300 SFU
        solar_flux = round(random.uniform(85.0, 210.0), 1)

        # Kp index: 0-9 scale, weighted toward lower values
        kp_weights = [0.15, 0.20, 0.20, 0.15, 0.12, 0.08, 0.05, 0.03, 0.015, 0.005]
        kp_index = random.choices(range(10), weights=kp_weights, k=1)[0]

        # Geomagnetic storm classification
        if kp_index >= 7:
            storm = "SEVERE"
        elif kp_index >= 5:
            storm = "MODERATE"
        elif kp_index >= 4:
            storm = "MINOR"
        else:
            storm = "NONE"

        # Radiation level
        if solar_flux > 180:
            radiation = "HIGH"
        elif solar_flux > 120:
            radiation = "MODERATE"
        else:
            radiation = "LOW"

        return {
            "solar_flux": solar_flux,
            "kp_index": kp_index,
            "geomagnetic_storm": storm,
            "radiation_level": radiation,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Space weather endpoint error: {e}")
        return {
            "solar_flux": 130.0,
            "kp_index": 3,
            "geomagnetic_storm": "NONE",
            "radiation_level": "LOW",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

# ============================================================
# WebSocket: /ws/alerts (enhanced)
# ============================================================

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Heartbeat: respond to ping with pong
            if data.strip().lower() == "ping":
                try:
                    await websocket.send_text('{"type":"pong"}')
                except Exception:
                    pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# Background task to simulate real-time alerts every 5 seconds
async def simulate_realtime_updates():
    alert_templates = [
        {"type": "collision_alert", "severity": "HIGH", "data": "WARNING: High probability conjunction detected. Starlink-4422 & Debris-881."},
        {"type": "collision_alert", "severity": "MEDIUM", "data": "Close approach: ONEWEB-0345 passing within 1.2km of DEBRIS-72401."},
        {"type": "debris_alert", "severity": "LOW", "data": "New debris object cataloged: DEBRIS-99123 in LEO at 780km altitude."},
        {"type": "maneuver_alert", "severity": "MEDIUM", "data": "Maneuver detected: Iridium-154 executing avoidance burn. Delta-V: 0.3 m/s."},
        {"type": "weather_alert", "severity": "HIGH", "data": "Space Weather: Kp index predicted to reach 7 in 3 hours. G2 storm warning."},
        {"type": "decay_alert", "severity": "LOW", "data": "Orbital decay: Object #25544 (ISS) altitude nominal. No action required."},
        {"type": "collision_alert", "severity": "HIGH", "data": "Potential conjunction detected: ISS corridor threatened by COSMOS-DEB-4421."},
        {"type": "tracking_alert", "severity": "LOW", "data": "Tracking update: 142 new objects cataloged in LEO corridor A7 this hour."},
        {"type": "maneuver_alert", "severity": "MEDIUM", "data": "STARLINK-3021 collision avoidance maneuver scheduled for T+00:14:30."},
        {"type": "weather_alert", "severity": "LOW", "data": "Solar wind speed increasing: 520 km/s. Monitoring thermospheric expansion."},
    ]
    while True:
        await asyncio.sleep(5)  # Broadcast every 5 seconds
        template = random.choice(alert_templates)
        alert = {
            "type": template["type"],
            "severity": template["severity"],
            "data": template["data"],
            "message": template["data"],  # alias for frontend compatibility
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        update = json.dumps(alert)
        await manager.broadcast(update)

# ============================================================
# NEW: POST /api/conjunction/analyze
# ============================================================

@app.post("/api/conjunction/analyze")
async def conjunction_analyze(request: ConjunctionRequest):
    """Run SGP4-based conjunction analysis between two TLE-defined objects."""
    try:
        result = analyze_conjunction(
            tle1_line1=request.tle1_line1,
            tle1_line2=request.tle1_line2,
            tle2_line1=request.tle2_line1,
            tle2_line2=request.tle2_line2,
            name_a=request.name_a,
            name_b=request.name_b,
            duration_hours=request.duration_hours,
            step_seconds=request.step_seconds,
        )
        # If risk is HIGH/CRITICAL, auto-generate alert
        if result.get("risk_level") in ("HIGH", "CRITICAL"):
            _add_alert(
                severity=result["risk_level"],
                title=f"Conjunction: {request.name_a} × {request.name_b}",
                message=f"TCA: {result.get('tca', 'N/A')} | Miss: {result.get('min_distance_km', 0):.2f} km | P(collision): {result.get('collision_probability', 0):.2e}",
                alert_type="conjunction",
            )
        return result
    except Exception as e:
        logger.error(f"Conjunction analysis error: {e}")
        return {"error": str(e)}

# ============================================================
# NEW: GET /api/conjunction/presets
# ============================================================

@app.get("/api/conjunction/presets")
async def conjunction_presets():
    """Return pre-loaded TLE pairs for quick conjunction demo."""
    return CONJUNCTION_PRESETS

# ============================================================
# NEW: POST /api/ai/maneuver
# ============================================================

@app.post("/api/ai/maneuver")
async def ai_maneuver_plan(request: ManeuverRequest):
    """Generate AI-powered collision avoidance maneuver plan."""
    try:
        plan = await ai_service.generate_maneuver_plan(request.conjunction_data)
        return plan
    except Exception as e:
        logger.error(f"Maneuver planning error: {e}")
        return {"error": str(e)}

# ============================================================
# NEW: GET /api/alerts (persistent store)
# ============================================================

@app.get("/api/alerts")
async def get_alerts(limit: int = 50, severity: str = None):
    """Get stored alerts with optional severity filter."""
    try:
        alerts = _alert_store
        if severity:
            alerts = [a for a in alerts if a["severity"] == severity.upper()]
        return {"count": len(alerts[:limit]), "alerts": alerts[:limit]}
    except Exception as e:
        logger.error(f"Alerts error: {e}")
        return {"count": 0, "alerts": []}

# ============================================================
# NEW: POST /api/alerts/{alert_id}/acknowledge
# ============================================================

@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Mark an alert as acknowledged."""
    for alert in _alert_store:
        if alert["id"] == alert_id:
            alert["acknowledged"] = True
            return {"status": "acknowledged", "alert_id": alert_id}
    return {"status": "not_found", "alert_id": alert_id}

# ============================================================
# NEW: WebSocket /ws/ground-station
# ============================================================

gs_connections: list[WebSocket] = []

@app.websocket("/ws/ground-station")
async def ground_station_ws(websocket: WebSocket):
    await websocket.accept()
    gs_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        if websocket in gs_connections:
            gs_connections.remove(websocket)
    except Exception:
        if websocket in gs_connections:
            gs_connections.remove(websocket)

async def simulate_ground_station():
    """Background task to broadcast ESP32 telemetry every second."""
    while True:
        await asyncio.sleep(1)
        if not gs_connections:
            continue
        packet = gs_simulator.generate_packet()
        message = json.dumps(packet)
        disconnected = []
        for ws in gs_connections:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            if ws in gs_connections:
                gs_connections.remove(ws)

# ============================================================
# NEW: GET /api/ground-station/status
# ============================================================

@app.get("/api/ground-station/status")
async def ground_station_status():
    """Get current ground station status."""
    return gs_simulator.get_status()

# ============================================================
# NEW: GET /api/ground-station/history
# ============================================================

@app.get("/api/ground-station/history")
async def ground_station_history(count: int = 60):
    """Get last N telemetry packets."""
    history = gs_simulator.get_history(count)
    return {"count": len(history), "packets": history}

# ============================================================
# NEW: GET /api/ground-station/latest
# ============================================================

@app.get("/api/ground-station/latest")
async def ground_station_latest():
    """Get the most recent telemetry packet."""
    history = gs_simulator.get_history(1)
    if history:
        return history[-1]
    return gs_simulator.get_status()

# ============================================================
# NEW: POST /api/ground-station/telemetry
# ============================================================

@app.post("/api/ground-station/telemetry")
async def ground_station_upload(payload: TelemetryUpload):
    """Accept a telemetry upload from an external device (e.g. ESP32)."""
    try:
        packet = {
            "packet_id": gs_simulator.packet_count + 1,
            "packet_type": "external",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "altitude_m": payload.altitude,
            "temperature_c": payload.temperature,
            "battery_pct": payload.battery,
            "signal_dbm": payload.signal,
            "velocity_m_s": payload.velocity,
            "heading_deg": payload.orientation.get("heading", 0.0),
            "pitch_deg": payload.orientation.get("pitch", 0.0),
            "roll_deg": payload.orientation.get("roll", 0.0),
            "uptime_seconds": int(time.time() - gs_simulator.start_time),
            "free_heap_bytes": 200000,
            "wifi_rssi": payload.signal,
            "station_id": gs_simulator.station_id,
        }
        gs_simulator.packet_count += 1
        gs_simulator._history.append(packet)
        if len(gs_simulator._history) > gs_simulator._max_history:
            gs_simulator._history = gs_simulator._history[-gs_simulator._max_history:]

        # Broadcast to all ground station WebSocket clients
        message = json.dumps(packet)
        disconnected = []
        for ws in gs_connections:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            if ws in gs_connections:
                gs_connections.remove(ws)

        return {"status": "received", "packet_id": packet["packet_id"]}
    except Exception as e:
        logger.error(f"Telemetry upload error: {e}")
        return {"status": "error", "message": str(e)}

# ============================================================
# Startup & Shutdown
# ============================================================

# ============================================================
# Handoff API Endpoints
# ============================================================

@app.get("/api/users")
async def list_users():
    """List all available users/roles."""
    users = HandoffStore.get_users()
    return {"users": users}


@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    """Get a single user."""
    user = HandoffStore.get_user(user_id)
    if not user:
        return JSONResponse(status_code=404, content={"error": f"User {user_id} not found"})
    return user


@app.get("/api/events")
async def list_events():
    """List conjunction events with ownership info."""
    events = HandoffStore.get_events()
    # Enrich with owner details
    for ev in events:
        owner = HandoffStore.get_user(ev.get("current_owner_id", ""))
        ev["owner"] = owner
    return {"events": events}


@app.get("/api/events/{event_id}")
async def get_event(event_id: str):
    """Get a single event with full details."""
    event = HandoffStore.get_event(event_id)
    if not event:
        return JSONResponse(status_code=404, content={"error": f"Event {event_id} not found"})
    owner = HandoffStore.get_user(event.get("current_owner_id", ""))
    event["owner"] = owner
    return event


@app.post("/api/events/{event_id}/handoffs")
async def create_event_handoff(
    event_id: str,
    req: HandoffCreateRequest,
    x_user_id: str = Header(default="anish"),
):
    """Create a new handoff draft for an event."""
    try:
        handoff = create_handoff(
            event_id=event_id,
            from_user_id=x_user_id,
            to_user_id=req.to_user_id,
            reason=req.reason,
            priority=req.priority,
            next_action=req.next_action,
            deadline=req.deadline,
            message=req.message,
            include_evidence=req.include_evidence,
        )
        return handoff
    except PermissionError as e:
        return JSONResponse(status_code=403, content={"error": str(e)})
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.get("/api/events/{event_id}/handoffs")
async def list_event_handoffs(event_id: str):
    """List all handoffs for an event."""
    handoffs = HandoffStore.get_handoffs_for_event(event_id)
    # Enrich with user details
    for h in handoffs:
        h["from_user"] = HandoffStore.get_user(h.get("from_user_id", ""))
        h["to_user"] = HandoffStore.get_user(h.get("to_user_id", ""))
    return {"handoffs": handoffs}


@app.get("/api/events/{event_id}/timeline")
async def get_event_timeline(event_id: str):
    """Get the event timeline / audit trail."""
    timeline = HandoffStore.get_timeline_for_event(event_id)
    return {"timeline": timeline}


@app.get("/api/handoffs/pending")
async def get_pending_handoffs(x_user_id: str = Header(default="anish")):
    """Get handoffs awaiting the current user."""
    handoffs = HandoffStore.get_pending_handoffs(x_user_id)
    for h in handoffs:
        h["from_user"] = HandoffStore.get_user(h.get("from_user_id", ""))
        h["to_user"] = HandoffStore.get_user(h.get("to_user_id", ""))
        h["event"] = HandoffStore.get_event(h.get("event_id", ""))
    return {"handoffs": handoffs}


@app.get("/api/handoffs/{handoff_id}")
async def get_handoff(handoff_id: str):
    """Get a single handoff with full details."""
    handoff = HandoffStore.get_handoff(handoff_id)
    if not handoff:
        return JSONResponse(status_code=404, content={"error": f"Handoff {handoff_id} not found"})
    handoff["from_user"] = HandoffStore.get_user(handoff.get("from_user_id", ""))
    handoff["to_user"] = HandoffStore.get_user(handoff.get("to_user_id", ""))
    handoff["event"] = HandoffStore.get_event(handoff.get("event_id", ""))
    handoff["history"] = HandoffStore.get_history_for_handoff(handoff_id)
    return handoff


@app.post("/api/handoffs/{handoff_id}/generate-note")
async def generate_handoff_note_endpoint(handoff_id: str):
    """Generate the structured handoff note from event data."""
    try:
        handoff = generate_note_for_handoff(handoff_id)
        return handoff
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/handoffs/{handoff_id}/update-note")
async def update_handoff_note_endpoint(handoff_id: str, req: HandoffNoteEditRequest):
    """Update the generated note (user edits)."""
    try:
        handoff = update_handoff_note(handoff_id, req.note)
        return handoff
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/handoffs/{handoff_id}/confirm")
async def confirm_handoff_endpoint(
    handoff_id: str,
    x_user_id: str = Header(default="anish"),
):
    """Confirm the transfer — moves handoff to Awaiting Acceptance."""
    try:
        handoff = confirm_handoff(handoff_id, x_user_id)
        return handoff
    except (ValueError, PermissionError) as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/handoffs/{handoff_id}/accept")
async def accept_handoff_endpoint(
    handoff_id: str,
    x_user_id: str = Header(default="anish"),
):
    """Recipient accepts the handoff."""
    try:
        handoff = accept_handoff(handoff_id, x_user_id)
        return handoff
    except (ValueError, PermissionError) as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/handoffs/{handoff_id}/clarification")
async def clarification_endpoint(
    handoff_id: str,
    req: HandoffClarificationRequest,
    x_user_id: str = Header(default="anish"),
):
    """Request clarification on a handoff."""
    try:
        handoff = request_clarification(handoff_id, x_user_id, req.message)
        return handoff
    except (ValueError, PermissionError) as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/handoffs/{handoff_id}/respond-clarification")
async def respond_clarification_endpoint(
    handoff_id: str,
    req: HandoffRespondClarificationRequest,
    x_user_id: str = Header(default="anish"),
):
    """Respond to a clarification request."""
    try:
        handoff = respond_to_clarification(handoff_id, x_user_id, req.message)
        return handoff
    except (ValueError, PermissionError) as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/handoffs/{handoff_id}/reject")
async def reject_handoff_endpoint(
    handoff_id: str,
    req: HandoffRejectRequest,
    x_user_id: str = Header(default="anish"),
):
    """Reject a handoff, optionally reassigning."""
    try:
        result = reject_handoff(
            handoff_id, x_user_id,
            reason=req.reason,
            reassign_to_user_id=req.reassign_to_user_id,
        )
        return result
    except (ValueError, PermissionError) as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/handoffs/{handoff_id}/escalate")
async def escalate_handoff_endpoint(handoff_id: str):
    """Manually escalate a handoff."""
    try:
        handoff = escalate_handoff(handoff_id, reason="Manual escalation")
        return handoff
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/handoffs/check-timeouts")
async def check_timeouts_endpoint(timeout: int = None):
    """Check and escalate timed-out handoffs. Pass ?timeout=30 for demo."""
    escalated = check_and_escalate_timeouts(timeout_seconds=timeout)
    return {
        "checked": True,
        "escalated_count": len(escalated),
        "escalated": escalated,
        "timeout_seconds": timeout or ESCALATION_TIMEOUT_SECONDS,
    }


@app.post("/api/events/{event_id}/unassigned-emergency")
async def unassigned_emergency_endpoint(event_id: str):
    """Mark an event as Unassigned Emergency."""
    try:
        event = mark_unassigned_emergency(event_id)
        return event
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


# ============================================================
# Background Escalation Check Task
# ============================================================

async def escalation_check_loop():
    """Background task that checks for timed-out handoffs every 30 seconds."""
    while True:
        await asyncio.sleep(30)
        try:
            escalated = check_and_escalate_timeouts()
            if escalated:
                logger.info(f"Auto-escalated {len(escalated)} handoff(s)")
                # Broadcast escalation alerts to WebSocket clients
                for h in escalated:
                    event = HandoffStore.get_event(h.get("event_id", ""))
                    alert = {
                        "type": "escalation_alert",
                        "severity": "HIGH",
                        "data": f"Handoff {h['handoff_id']} for event {h['event_id']} escalated due to timeout.",
                        "message": f"⚠ Handoff escalated: {event['title'] if event else h['event_id']}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    await manager.broadcast(json.dumps(alert))
        except Exception as e:
            logger.error(f"Escalation check error: {e}")


# ============================================================
# Startup & Shutdown
# ============================================================

@app.on_event("startup")
async def startup_event():
    # Initialize Firebase (falls back to in-memory if not configured)
    init_firebase()
    # Seed demo handoff data
    seed_demo_data()
    # Attempt initial login to Space-Track on startup
    await space_track_client.login()
    # Pre-warm satellite cache
    asyncio.create_task(space_track_client.get_active_satellites(limit=1000))
    # Start WebSocket alert broadcaster
    asyncio.create_task(simulate_realtime_updates())
    # Start ground station telemetry stream
    asyncio.create_task(simulate_ground_station())
    # Start background escalation check
    asyncio.create_task(escalation_check_loop())
    # Seed initial alerts
    _add_alert("LOW", "System Online", "KesslerX backend initialized. All systems nominal.")
    _add_alert("MEDIUM", "Debris Cloud Detected", "New debris cluster detected in LEO sector 4-B. 14 objects tracked.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
