"""
KesslerX Handoff Service
========================
Core business logic for the Responsibility Transfer / Handoff workflow.

Provides:
- User/role management (seeded demo users)
- Event ownership tracking
- Handoff state machine (Draft → Awaiting Acceptance → Accepted/Rejected/Escalated)
- Deterministic handoff note generation (no AI fabrication of facts)
- Escalation logic with configurable timeout
- Complete audit trail

Storage: Uses Firestore if available, otherwise in-memory dicts.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from firebase_config import get_firestore, is_firebase_available

logger = logging.getLogger(__name__)

# ============================================================
# Configuration
# ============================================================

ESCALATION_TIMEOUT_SECONDS = int(__import__("os").getenv("HANDOFF_TIMEOUT_SECONDS", "300"))
ESCALATION_TARGET_ROLE = "On-Call Safety Analyst"
ESCALATION_TARGET_USER = "priya"
BACKUP_ESCALATION_USER = "ravi"

# ============================================================
# Handoff States
# ============================================================

class HandoffStatus:
    DRAFT = "Draft"
    AWAITING_ACCEPTANCE = "Awaiting Acceptance"
    ACCEPTED = "Accepted"
    CLARIFICATION_REQUESTED = "Clarification Requested"
    REJECTED = "Rejected"
    ESCALATED = "Escalated"
    UNASSIGNED_EMERGENCY = "Unassigned Emergency"
    CLOSED = "Closed"

VALID_TRANSITIONS = {
    HandoffStatus.DRAFT: [HandoffStatus.AWAITING_ACCEPTANCE],
    HandoffStatus.AWAITING_ACCEPTANCE: [
        HandoffStatus.ACCEPTED,
        HandoffStatus.CLARIFICATION_REQUESTED,
        HandoffStatus.REJECTED,
        HandoffStatus.ESCALATED,
    ],
    HandoffStatus.CLARIFICATION_REQUESTED: [
        HandoffStatus.AWAITING_ACCEPTANCE,
        HandoffStatus.REJECTED,
    ],
    HandoffStatus.REJECTED: [HandoffStatus.DRAFT, HandoffStatus.UNASSIGNED_EMERGENCY],
    HandoffStatus.ESCALATED: [
        HandoffStatus.ACCEPTED,
        HandoffStatus.UNASSIGNED_EMERGENCY,
    ],
    HandoffStatus.UNASSIGNED_EMERGENCY: [HandoffStatus.ACCEPTED],
}

# ============================================================
# Seeded Demo Users
# ============================================================

DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "anish": {
        "user_id": "anish",
        "name": "Anish",
        "role": "Flight Dynamics Analyst",
        "status": "Available",
        "avatar_initials": "AN",
    },
    "madhura": {
        "user_id": "madhura",
        "name": "Madhura",
        "role": "Mission Operations Lead",
        "status": "Available",
        "avatar_initials": "MA",
    },
    "ravi": {
        "user_id": "ravi",
        "name": "Ravi",
        "role": "Mission Manager",
        "status": "Available",
        "avatar_initials": "RA",
    },
    "priya": {
        "user_id": "priya",
        "name": "Priya",
        "role": "On-Call Safety Analyst",
        "status": "Available",
        "avatar_initials": "PR",
    },
    "offline_user": {
        "user_id": "offline_user",
        "name": "Vikram",
        "role": "Flight Dynamics Team",
        "status": "Offline",
        "avatar_initials": "VI",
    },
}

# ============================================================
# Seeded Events (extends existing _COLLISION_EVENTS)
# ============================================================

DEMO_EVENTS: Dict[str, Dict[str, Any]] = {
    "CX-9921-A": {
        "event_id": "CX-9921-A",
        "title": "STARLINK-3021 vs DEBRIS-88172",
        "satellite": "STARLINK-3021",
        "object": "DEBRIS-88172",
        "severity": "CRITICAL",
        "tca_minutes": 12,
        "miss_distance_km": 0.12,
        "collision_probability": 0.098,
        "status": "Under Review",
        "current_owner_id": "anish",
        "current_owner_role": "Flight Dynamics Analyst",
        "next_action": "Validate Scenario B",
        "deadline": None,  # Set dynamically
        "orbit": "LEO",
        "altitude_km": 542,
        "relative_velocity_km_s": 14.2,
        "risk_trend": "Increasing",
        "uncertainty": "±15m radial, ±45m along-track",
        "work_completed": [
            "Initial CDM processed from 18 SDS",
            "SGP4 propagation run with latest TLE set",
            "3 Monte Carlo scenarios analyzed (A, B, C)",
            "Scenario A: nominal miss 142m, Pc = 9.8e-2",
            "Scenario B: perturbed drag, pending validation",
            "Notification sent to STARLINK operations team",
        ],
        "current_decision": "Awaiting Scenario B validation before recommending CAM. Drag coefficient uncertainty may significantly alter miss distance prediction.",
        "constraints": [
            "Scenario B uses estimated drag coefficient (no recent calibration)",
            "STARLINK-3021 has limited propellant margin",
            "Debris object has no active tracking beacon",
            "TCA window does not allow multiple maneuver attempts",
        ],
        "updated_at": None,
    },
    "CX-8840-B": {
        "event_id": "CX-8840-B",
        "title": "ONEWEB-1160 vs DEBRIS-77319",
        "satellite": "ONEWEB-1160",
        "object": "DEBRIS-77319",
        "severity": "HIGH",
        "tca_minutes": 18,
        "miss_distance_km": 0.34,
        "collision_probability": 0.046,
        "status": "Under Review",
        "current_owner_id": "anish",
        "current_owner_role": "Flight Dynamics Analyst",
        "next_action": "Review updated CDM",
        "deadline": None,
        "orbit": "LEO",
        "altitude_km": 1200,
        "relative_velocity_km_s": 11.3,
        "risk_trend": "Stable",
        "uncertainty": "±25m radial, ±80m along-track",
        "work_completed": [
            "Initial CDM processed",
            "Tracking data correlated with latest observations",
            "Preliminary risk assessment completed",
        ],
        "current_decision": "Monitoring for updated CDM from JSpOC. Current risk level warrants continued observation.",
        "constraints": [
            "OneWeb satellite has autonomous collision avoidance capability",
            "Need confirmation from OneWeb operations before manual intervention",
        ],
        "updated_at": None,
    },
    "CX-4122-C": {
        "event_id": "CX-4122-C",
        "title": "GPS IIF-11 vs DEBRIS-12444",
        "satellite": "GPS IIF-11",
        "object": "DEBRIS-12444",
        "severity": "MEDIUM",
        "tca_minutes": 195,
        "miss_distance_km": 2.8,
        "collision_probability": 0.012,
        "status": "Monitoring",
        "current_owner_id": "madhura",
        "current_owner_role": "Mission Operations Lead",
        "next_action": "Monitor next CDM update",
        "deadline": None,
        "orbit": "MEO",
        "altitude_km": 20200,
        "relative_velocity_km_s": 5.1,
        "risk_trend": "Decreasing",
        "uncertainty": "±200m radial",
        "work_completed": [
            "Initial CDM received and processed",
            "Risk assessed as moderate — monitoring",
        ],
        "current_decision": "No action required at this time. Risk trending downward.",
        "constraints": ["GPS constellation maneuvers require USSF approval"],
        "updated_at": None,
    },
}

# ============================================================
# In-Memory Storage (fallback when Firebase unavailable)
# ============================================================

_mem_users: Dict[str, dict] = {uid: {**u} for uid, u in DEMO_USERS.items()}
_mem_events: Dict[str, dict] = {}
_mem_handoffs: Dict[str, dict] = {}
_mem_history: List[dict] = []
_mem_timeline: List[dict] = []

# ============================================================
# Storage Abstraction
# ============================================================

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _generate_id(prefix: str = "HO") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


class HandoffStore:
    """Abstracts storage: Firestore or in-memory."""

    @staticmethod
    def _db():
        return get_firestore()

    # --- Users ---
    @staticmethod
    def get_users() -> List[dict]:
        db = HandoffStore._db()
        if db:
            docs = db.collection("users").stream()
            return [doc.to_dict() for doc in docs]
        return list(_mem_users.values())

    @staticmethod
    def get_user(user_id: str) -> Optional[dict]:
        db = HandoffStore._db()
        if db:
            doc = db.collection("users").document(user_id).get()
            return doc.to_dict() if doc.exists else None
        return _mem_users.get(user_id)

    @staticmethod
    def save_user(user: dict):
        db = HandoffStore._db()
        if db:
            db.collection("users").document(user["user_id"]).set(user)
        else:
            _mem_users[user["user_id"]] = user

    # --- Events ---
    @staticmethod
    def get_events() -> List[dict]:
        db = HandoffStore._db()
        if db:
            docs = db.collection("events").stream()
            return [doc.to_dict() for doc in docs]
        return list(_mem_events.values())

    @staticmethod
    def get_event(event_id: str) -> Optional[dict]:
        db = HandoffStore._db()
        if db:
            doc = db.collection("events").document(event_id).get()
            return doc.to_dict() if doc.exists else None
        return _mem_events.get(event_id)

    @staticmethod
    def save_event(event: dict):
        db = HandoffStore._db()
        if db:
            db.collection("events").document(event["event_id"]).set(event)
        else:
            _mem_events[event["event_id"]] = event

    # --- Handoffs ---
    @staticmethod
    def get_handoff(handoff_id: str) -> Optional[dict]:
        db = HandoffStore._db()
        if db:
            doc = db.collection("handoffs").document(handoff_id).get()
            return doc.to_dict() if doc.exists else None
        return _mem_handoffs.get(handoff_id)

    @staticmethod
    def save_handoff(handoff: dict):
        db = HandoffStore._db()
        if db:
            db.collection("handoffs").document(handoff["handoff_id"]).set(handoff)
        else:
            _mem_handoffs[handoff["handoff_id"]] = handoff

    @staticmethod
    def get_handoffs_for_event(event_id: str) -> List[dict]:
        db = HandoffStore._db()
        if db:
            docs = db.collection("handoffs").where("event_id", "==", event_id).stream()
            results = [doc.to_dict() for doc in docs]
            return sorted(results, key=lambda h: h.get("created_at", ""), reverse=True)
        return sorted(
            [h for h in _mem_handoffs.values() if h["event_id"] == event_id],
            key=lambda h: h.get("created_at", ""),
            reverse=True,
        )

    @staticmethod
    def get_pending_handoffs(user_id: str) -> List[dict]:
        db = HandoffStore._db()
        if db:
            docs = (
                db.collection("handoffs")
                .where("to_user_id", "==", user_id)
                .where("status", "in", [
                    HandoffStatus.AWAITING_ACCEPTANCE,
                    HandoffStatus.ESCALATED,
                ])
                .stream()
            )
            results = [doc.to_dict() for doc in docs]
            return sorted(results, key=lambda h: h.get("created_at", ""), reverse=True)
        return sorted(
            [
                h for h in _mem_handoffs.values()
                if h["to_user_id"] == user_id
                and h["status"] in (HandoffStatus.AWAITING_ACCEPTANCE, HandoffStatus.ESCALATED)
            ],
            key=lambda h: h.get("created_at", ""),
            reverse=True,
        )

    @staticmethod
    def get_all_pending_handoffs() -> List[dict]:
        """Get all handoffs in Awaiting Acceptance (for timeout checks)."""
        db = HandoffStore._db()
        if db:
            docs = (
                db.collection("handoffs")
                .where("status", "==", HandoffStatus.AWAITING_ACCEPTANCE)
                .stream()
            )
            return [doc.to_dict() for doc in docs]
        return [
            h for h in _mem_handoffs.values()
            if h["status"] == HandoffStatus.AWAITING_ACCEPTANCE
        ]

    # --- History ---
    @staticmethod
    def add_history(entry: dict):
        db = HandoffStore._db()
        if db:
            db.collection("handoff_history").document(entry["history_id"]).set(entry)
        else:
            _mem_history.append(entry)

    @staticmethod
    def get_history_for_handoff(handoff_id: str) -> List[dict]:
        db = HandoffStore._db()
        if db:
            docs = (
                db.collection("handoff_history")
                .where("handoff_id", "==", handoff_id)
                .stream()
            )
            results = [doc.to_dict() for doc in docs]
            return sorted(results, key=lambda h: h.get("timestamp", ""))
        return sorted(
            [h for h in _mem_history if h["handoff_id"] == handoff_id],
            key=lambda h: h.get("timestamp", ""),
        )

    # --- Timeline ---
    @staticmethod
    def add_timeline(entry: dict):
        db = HandoffStore._db()
        if db:
            db.collection("event_timeline").document(entry["timeline_id"]).set(entry)
        else:
            _mem_timeline.append(entry)

    @staticmethod
    def get_timeline_for_event(event_id: str) -> List[dict]:
        db = HandoffStore._db()
        if db:
            docs = (
                db.collection("event_timeline")
                .where("event_id", "==", event_id)
                .stream()
            )
            results = [doc.to_dict() for doc in docs]
            return sorted(results, key=lambda h: h.get("timestamp", ""), reverse=True)
        return sorted(
            [t for t in _mem_timeline if t["event_id"] == event_id],
            key=lambda t: t.get("timestamp", ""),
            reverse=True,
        )


# ============================================================
# Timeline / History Helpers
# ============================================================

def _add_timeline_entry(
    event_id: str,
    action: str,
    actor_id: str,
    previous_owner: str = "",
    new_owner: str = "",
    comment: str = "",
    handoff_id: str = "",
):
    actor = HandoffStore.get_user(actor_id)
    actor_name = actor["name"] if actor else actor_id
    actor_role = actor["role"] if actor else ""

    entry = {
        "timeline_id": _generate_id("TL"),
        "event_id": event_id,
        "handoff_id": handoff_id,
        "action": action,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "actor_role": actor_role,
        "previous_owner": previous_owner,
        "new_owner": new_owner,
        "timestamp": _now_iso(),
        "comment": comment,
    }
    HandoffStore.add_timeline(entry)
    return entry


def _add_history_entry(
    handoff_id: str,
    event_id: str,
    action: str,
    actor_id: str,
    previous_owner: str = "",
    new_owner: str = "",
    comment: str = "",
):
    entry = {
        "history_id": _generate_id("HH"),
        "handoff_id": handoff_id,
        "event_id": event_id,
        "action": action,
        "actor_id": actor_id,
        "previous_owner": previous_owner,
        "new_owner": new_owner,
        "timestamp": _now_iso(),
        "comment": comment,
    }
    HandoffStore.add_history(entry)
    return entry


# ============================================================
# Seed Data
# ============================================================

def seed_demo_data():
    """Seed demo users and events. Safe to call multiple times."""
    logger.info("Seeding demo data...")

    # Seed users
    for user in DEMO_USERS.values():
        HandoffStore.save_user({**user})

    # Seed events with dynamic deadlines
    now = datetime.now(timezone.utc)
    for event_id, event in DEMO_EVENTS.items():
        ev = {**event}
        tca_dt = now + timedelta(minutes=ev["tca_minutes"])
        ev["tca"] = tca_dt.isoformat()
        ev["deadline"] = (tca_dt - timedelta(minutes=2)).isoformat()
        ev["updated_at"] = _now_iso()
        HandoffStore.save_event(ev)

    # Add initial timeline entries
    _add_timeline_entry(
        "CX-9921-A", "Event created and assigned", "anish",
        new_owner="Anish — Flight Dynamics Analyst",
        comment="Critical conjunction detected. Initial assignment to Flight Dynamics.",
    )
    _add_timeline_entry(
        "CX-8840-B", "Event created and assigned", "anish",
        new_owner="Anish — Flight Dynamics Analyst",
        comment="High-risk conjunction. Assigned for review.",
    )
    _add_timeline_entry(
        "CX-4122-C", "Event created and assigned", "madhura",
        new_owner="Madhura — Mission Operations Lead",
        comment="Moderate conjunction. Assigned for monitoring.",
    )

    logger.info("Demo data seeded successfully.")


# ============================================================
# Handoff Note Generation (Deterministic)
# ============================================================

def generate_handoff_note(handoff: dict, event: dict) -> str:
    """
    Generate a structured handoff note using ONLY actual event data.
    No AI fabrication of numerical facts.
    """
    from_user = HandoffStore.get_user(handoff["from_user_id"])
    to_user = HandoffStore.get_user(handoff["to_user_id"])

    from_name = f"{from_user['name']} — {from_user['role']}" if from_user else handoff["from_user_id"]
    to_name = f"{to_user['name']} — {to_user['role']}" if to_user else handoff["to_user_id"]

    # Build work completed section
    work_lines = ""
    if event.get("work_completed"):
        for item in event["work_completed"]:
            work_lines += f"  • {item}\n"
    else:
        work_lines = "  • No work items recorded for this event.\n"

    # Build constraints section
    constraints_lines = ""
    if event.get("constraints"):
        for item in event["constraints"]:
            constraints_lines += f"  • {item}\n"
    else:
        constraints_lines = "  • No specific constraints documented.\n"

    note = f"""═══════════════════════════════════════════════════
  KESSLERX RESPONSIBILITY HANDOFF NOTE
  ⚠ DECISION SUPPORT — REQUIRES HUMAN REVIEW
═══════════════════════════════════════════════════

HANDOFF HEADER
──────────────
  Handoff ID:    {handoff['handoff_id']}
  Event ID:      {event['event_id']}
  Created:       {handoff['created_at']}
  From:          {from_name}
  To:            {to_name}
  Reason:        {handoff.get('reason', 'Not specified')}
  Priority:      {handoff.get('priority', 'Normal')}

SITUATION
─────────
  Conjunction event {event['event_id']}: {event['title']}
  A {event['severity']} conjunction has been detected between
  {event.get('satellite', 'Unknown')} and {event.get('object', 'Unknown')}
  in {event.get('orbit', 'Unknown')} orbit at {event.get('altitude_km', 'N/A')} km altitude.

CURRENT RISK
────────────
  Severity:              {event['severity']}
  TCA:                   {event.get('tca', 'N/A')} ({event.get('tca_minutes', 'N/A')} minutes)
  Miss Distance:         {event.get('miss_distance_km', 'N/A')} km
  Collision Probability: {event.get('collision_probability', 'N/A')}
  Relative Velocity:     {event.get('relative_velocity_km_s', 'N/A')} km/s
  Risk Trend:            {event.get('risk_trend', 'N/A')}
  Uncertainty:           {event.get('uncertainty', 'N/A')}

WORK COMPLETED
──────────────
{work_lines}
CURRENT DECISION
────────────────
  {event.get('current_decision', 'No decision recorded.')}

NEXT ACTION
───────────
  {handoff.get('next_action', event.get('next_action', 'Not specified'))}

DEADLINE
────────
  {handoff.get('deadline', event.get('deadline', 'Not specified'))}

EVIDENCE
────────
  • Event Workspace: /event/{event['event_id']}
  • Conjunction data: {event['title']}
  • Orbit: {event.get('orbit', 'N/A')} at {event.get('altitude_km', 'N/A')} km
  • Collision probability: {event.get('collision_probability', 'N/A')}

CONSTRAINTS
───────────
{constraints_lines}
ADDITIONAL MESSAGE
──────────────────
  {handoff.get('message', 'None')}

RECIPIENT ACTION REQUIRED
─────────────────────────
  [ ] Accept responsibility
  [ ] Request clarification
  [ ] Reject / Reassign

═══════════════════════════════════════════════════
  This note was generated from verified event data.
  All numerical values are from the event record.
  Recommendations require human review before action.
═══════════════════════════════════════════════════"""

    return note


# ============================================================
# Core Handoff Operations
# ============================================================

def create_handoff(
    event_id: str,
    from_user_id: str,
    to_user_id: str,
    reason: str = "",
    priority: str = "Normal",
    next_action: str = "",
    deadline: str = "",
    message: str = "",
    include_evidence: bool = True,
) -> dict:
    """Create a new handoff draft."""
    event = HandoffStore.get_event(event_id)
    if not event:
        raise ValueError(f"Event {event_id} not found")

    from_user = HandoffStore.get_user(from_user_id)
    if not from_user:
        raise ValueError(f"User {from_user_id} not found")

    to_user = HandoffStore.get_user(to_user_id)
    if not to_user:
        raise ValueError(f"Recipient {to_user_id} not found")

    # Only current owner can initiate handoff
    if event.get("current_owner_id") != from_user_id:
        raise PermissionError(
            f"User {from_user_id} is not the current owner of event {event_id}. "
            f"Current owner: {event.get('current_owner_id')}"
        )

    handoff_id = _generate_id("HO")
    handoff = {
        "handoff_id": handoff_id,
        "event_id": event_id,
        "from_user_id": from_user_id,
        "from_role": from_user["role"],
        "to_user_id": to_user_id,
        "to_role": to_user["role"],
        "reason": reason,
        "priority": priority,
        "next_action": next_action or event.get("next_action", ""),
        "deadline": deadline or event.get("deadline", ""),
        "message": message,
        "include_evidence": include_evidence,
        "generated_note": "",
        "status": HandoffStatus.DRAFT,
        "created_at": _now_iso(),
        "confirmed_at": None,
        "accepted_at": None,
        "rejected_at": None,
        "escalated_at": None,
        "escalation_target": None,
        "clarification_messages": [],
    }

    HandoffStore.save_handoff(handoff)

    _add_history_entry(
        handoff_id, event_id, "Handoff draft created",
        actor_id=from_user_id,
        new_owner=f"{to_user['name']} — {to_user['role']}",
        comment=f"Reason: {reason}",
    )

    _add_timeline_entry(
        event_id,
        f"{from_user['name']} started handoff to {to_user['name']}",
        from_user_id,
        previous_owner=f"{from_user['name']} — {from_user['role']}",
        new_owner=f"{to_user['name']} — {to_user['role']}",
        comment=f"Transfer reason: {reason}",
        handoff_id=handoff_id,
    )

    return handoff


def generate_note_for_handoff(handoff_id: str) -> dict:
    """Generate the structured handoff note."""
    handoff = HandoffStore.get_handoff(handoff_id)
    if not handoff:
        raise ValueError(f"Handoff {handoff_id} not found")

    event = HandoffStore.get_event(handoff["event_id"])
    if not event:
        raise ValueError(f"Event {handoff['event_id']} not found")

    note = generate_handoff_note(handoff, event)
    handoff["generated_note"] = note
    HandoffStore.save_handoff(handoff)

    return handoff


def update_handoff_note(handoff_id: str, edited_note: str) -> dict:
    """Update the handoff note (user edits before confirming)."""
    handoff = HandoffStore.get_handoff(handoff_id)
    if not handoff:
        raise ValueError(f"Handoff {handoff_id} not found")
    if handoff["status"] not in (HandoffStatus.DRAFT, HandoffStatus.AWAITING_ACCEPTANCE):
        raise ValueError("Cannot edit note after handoff is finalized")

    handoff["generated_note"] = edited_note
    HandoffStore.save_handoff(handoff)
    return handoff


def confirm_handoff(handoff_id: str, actor_id: str) -> dict:
    """Confirm the transfer — moves to Awaiting Acceptance."""
    handoff = HandoffStore.get_handoff(handoff_id)
    if not handoff:
        raise ValueError(f"Handoff {handoff_id} not found")

    if handoff["status"] != HandoffStatus.DRAFT:
        raise ValueError(f"Cannot confirm handoff in state: {handoff['status']}")

    if handoff["from_user_id"] != actor_id:
        raise PermissionError("Only the sender can confirm the handoff")

    if not handoff.get("generated_note"):
        raise ValueError("Handoff note must be generated before confirming")

    event = HandoffStore.get_event(handoff["event_id"])

    # Atomic state update
    handoff["status"] = HandoffStatus.AWAITING_ACCEPTANCE
    handoff["confirmed_at"] = _now_iso()
    HandoffStore.save_handoff(handoff)

    # Update event status
    if event:
        event["status"] = "Handoff Pending"
        event["updated_at"] = _now_iso()
        HandoffStore.save_event(event)

    from_user = HandoffStore.get_user(handoff["from_user_id"])
    to_user = HandoffStore.get_user(handoff["to_user_id"])

    _add_history_entry(
        handoff_id, handoff["event_id"], "Handoff confirmed — awaiting acceptance",
        actor_id=actor_id,
        previous_owner=f"{from_user['name']} — {from_user['role']}" if from_user else "",
        new_owner=f"{to_user['name']} — {to_user['role']}" if to_user else "",
    )

    _add_timeline_entry(
        handoff["event_id"],
        "Handoff awaiting acceptance",
        actor_id,
        previous_owner=f"{from_user['name']} — {from_user['role']}" if from_user else "",
        new_owner=f"{to_user['name']} — {to_user['role']}" if to_user else "",
        comment=f"Transfer confirmed. Awaiting {to_user['name']}'s acceptance." if to_user else "",
        handoff_id=handoff_id,
    )

    return handoff


def accept_handoff(handoff_id: str, actor_id: str) -> dict:
    """Recipient accepts the handoff."""
    handoff = HandoffStore.get_handoff(handoff_id)
    if not handoff:
        raise ValueError(f"Handoff {handoff_id} not found")

    if handoff["status"] not in (HandoffStatus.AWAITING_ACCEPTANCE, HandoffStatus.ESCALATED):
        raise ValueError(f"Cannot accept handoff in state: {handoff['status']}")

    if handoff["to_user_id"] != actor_id:
        raise PermissionError("Only the designated recipient can accept the handoff")

    event = HandoffStore.get_event(handoff["event_id"])
    to_user = HandoffStore.get_user(actor_id)
    from_user = HandoffStore.get_user(handoff["from_user_id"])

    # Update handoff
    handoff["status"] = HandoffStatus.ACCEPTED
    handoff["accepted_at"] = _now_iso()
    HandoffStore.save_handoff(handoff)

    # Transfer event ownership
    if event:
        prev_owner = event.get("current_owner_id", "")
        event["current_owner_id"] = actor_id
        event["current_owner_role"] = to_user["role"] if to_user else ""
        event["status"] = "Under Review"
        event["updated_at"] = _now_iso()
        if handoff.get("next_action"):
            event["next_action"] = handoff["next_action"]
        HandoffStore.save_event(event)

    from_name = f"{from_user['name']} — {from_user['role']}" if from_user else handoff["from_user_id"]
    to_name = f"{to_user['name']} — {to_user['role']}" if to_user else actor_id

    _add_history_entry(
        handoff_id, handoff["event_id"], "Handoff accepted",
        actor_id=actor_id,
        previous_owner=from_name,
        new_owner=to_name,
        comment=f"Responsibility transferred. {to_user['name'] if to_user else actor_id} is now accountable.",
    )

    _add_timeline_entry(
        handoff["event_id"],
        f"Responsibility transferred from {from_name} to {to_name}",
        actor_id,
        previous_owner=from_name,
        new_owner=to_name,
        comment=f"Handoff accepted at {handoff['accepted_at']}.",
        handoff_id=handoff_id,
    )

    return handoff


def request_clarification(handoff_id: str, actor_id: str, message: str) -> dict:
    """Recipient requests clarification."""
    handoff = HandoffStore.get_handoff(handoff_id)
    if not handoff:
        raise ValueError(f"Handoff {handoff_id} not found")

    if handoff["status"] not in (HandoffStatus.AWAITING_ACCEPTANCE, HandoffStatus.ESCALATED):
        raise ValueError(f"Cannot request clarification in state: {handoff['status']}")

    if handoff["to_user_id"] != actor_id:
        raise PermissionError("Only the designated recipient can request clarification")

    handoff["status"] = HandoffStatus.CLARIFICATION_REQUESTED
    handoff["clarification_messages"].append({
        "from": actor_id,
        "message": message,
        "timestamp": _now_iso(),
    })
    HandoffStore.save_handoff(handoff)

    to_user = HandoffStore.get_user(actor_id)

    _add_history_entry(
        handoff_id, handoff["event_id"], "Clarification requested",
        actor_id=actor_id,
        comment=message,
    )

    _add_timeline_entry(
        handoff["event_id"],
        f"Clarification requested by {to_user['name'] if to_user else actor_id}",
        actor_id,
        comment=message,
        handoff_id=handoff_id,
    )

    return handoff


def respond_to_clarification(handoff_id: str, actor_id: str, message: str) -> dict:
    """Sender responds to clarification request."""
    handoff = HandoffStore.get_handoff(handoff_id)
    if not handoff:
        raise ValueError(f"Handoff {handoff_id} not found")

    if handoff["status"] != HandoffStatus.CLARIFICATION_REQUESTED:
        raise ValueError("Handoff is not in Clarification Requested state")

    if handoff["from_user_id"] != actor_id:
        raise PermissionError("Only the sender can respond to clarification")

    handoff["status"] = HandoffStatus.AWAITING_ACCEPTANCE
    handoff["clarification_messages"].append({
        "from": actor_id,
        "message": message,
        "timestamp": _now_iso(),
    })
    HandoffStore.save_handoff(handoff)

    from_user = HandoffStore.get_user(actor_id)

    _add_history_entry(
        handoff_id, handoff["event_id"], "Clarification provided",
        actor_id=actor_id,
        comment=message,
    )

    _add_timeline_entry(
        handoff["event_id"],
        f"Clarification provided by {from_user['name'] if from_user else actor_id}",
        actor_id,
        comment=message,
        handoff_id=handoff_id,
    )

    return handoff


def reject_handoff(
    handoff_id: str,
    actor_id: str,
    reason: str = "",
    reassign_to_user_id: str = "",
) -> dict:
    """Recipient rejects the handoff, optionally reassigning."""
    handoff = HandoffStore.get_handoff(handoff_id)
    if not handoff:
        raise ValueError(f"Handoff {handoff_id} not found")

    if handoff["status"] not in (HandoffStatus.AWAITING_ACCEPTANCE, HandoffStatus.ESCALATED):
        raise ValueError(f"Cannot reject handoff in state: {handoff['status']}")

    if handoff["to_user_id"] != actor_id:
        raise PermissionError("Only the designated recipient can reject the handoff")

    to_user = HandoffStore.get_user(actor_id)

    handoff["status"] = HandoffStatus.REJECTED
    handoff["rejected_at"] = _now_iso()
    HandoffStore.save_handoff(handoff)

    _add_history_entry(
        handoff_id, handoff["event_id"], "Handoff rejected",
        actor_id=actor_id,
        comment=f"Reason: {reason}",
    )

    _add_timeline_entry(
        handoff["event_id"],
        f"Handoff rejected by {to_user['name'] if to_user else actor_id}",
        actor_id,
        comment=f"Rejection reason: {reason}",
        handoff_id=handoff_id,
    )

    event = HandoffStore.get_event(handoff["event_id"])

    # Handle reassignment
    if reassign_to_user_id:
        reassign_user = HandoffStore.get_user(reassign_to_user_id)
        if not reassign_user:
            raise ValueError(f"Reassignment target {reassign_to_user_id} not found")

        # Create a new handoff for the reassignment
        new_handoff = create_handoff(
            event_id=handoff["event_id"],
            from_user_id=handoff["from_user_id"],  # original sender
            to_user_id=reassign_to_user_id,
            reason=f"Reassigned after rejection by {to_user['name'] if to_user else actor_id}: {reason}",
            priority=handoff.get("priority", "Normal"),
            next_action=handoff.get("next_action", ""),
            deadline=handoff.get("deadline", ""),
            message=handoff.get("message", ""),
        )
        # Auto-generate note and confirm
        generate_note_for_handoff(new_handoff["handoff_id"])
        # Re-read to get updated version with note
        new_handoff = HandoffStore.get_handoff(new_handoff["handoff_id"])
        confirm_handoff(new_handoff["handoff_id"], handoff["from_user_id"])

        return HandoffStore.get_handoff(new_handoff["handoff_id"])
    else:
        # No reassignment — check for unassigned emergency
        if event and event.get("severity") in ("CRITICAL", "HIGH"):
            # Restore ownership to sender to avoid ownerless state
            event["status"] = "Handoff Rejected"
            event["updated_at"] = _now_iso()
            HandoffStore.save_event(event)

            _add_timeline_entry(
                handoff["event_id"],
                "Handoff rejected — original owner retained",
                actor_id,
                comment="Responsibility remains with the original sender.",
                handoff_id=handoff_id,
            )

    return handoff


def escalate_handoff(handoff_id: str, reason: str = "Timeout") -> dict:
    """Escalate a handoff that was not accepted in time."""
    handoff = HandoffStore.get_handoff(handoff_id)
    if not handoff:
        raise ValueError(f"Handoff {handoff_id} not found")

    if handoff["status"] != HandoffStatus.AWAITING_ACCEPTANCE:
        raise ValueError(f"Cannot escalate handoff in state: {handoff['status']}")

    event = HandoffStore.get_event(handoff["event_id"])
    original_to = HandoffStore.get_user(handoff["to_user_id"])

    # Determine escalation target
    escalation_user_id = ESCALATION_TARGET_USER
    if handoff["to_user_id"] == ESCALATION_TARGET_USER:
        escalation_user_id = BACKUP_ESCALATION_USER

    escalation_user = HandoffStore.get_user(escalation_user_id)

    # Mark current handoff as escalated
    handoff["status"] = HandoffStatus.ESCALATED
    handoff["escalated_at"] = _now_iso()
    handoff["escalation_target"] = escalation_user_id

    # Redirect the handoff to the escalation target
    handoff["to_user_id"] = escalation_user_id
    handoff["to_role"] = escalation_user["role"] if escalation_user else ESCALATION_TARGET_ROLE

    # Append escalation info to note
    esc_note = f"""

═══════════════════════════════════════════════════
  ⚠ ESCALATION NOTICE
═══════════════════════════════════════════════════
  Original recipient: {original_to['name'] if original_to else 'Unknown'} — {original_to['role'] if original_to else ''}
  Escalation reason:  {reason}
  Escalated at:       {handoff['escalated_at']}
  Escalated to:       {escalation_user['name'] if escalation_user else escalation_user_id} — {escalation_user['role'] if escalation_user else ESCALATION_TARGET_ROLE}
  
  The original handoff was not accepted within the configured timeout.
  TCA for this event: {event.get('tca', 'N/A')}
  
  IMMEDIATE ACTION REQUIRED.
═══════════════════════════════════════════════════"""

    handoff["generated_note"] = (handoff.get("generated_note", "") + esc_note)
    HandoffStore.save_handoff(handoff)

    if event:
        event["status"] = "Escalated"
        event["updated_at"] = _now_iso()
        HandoffStore.save_event(event)

    _add_history_entry(
        handoff_id, handoff["event_id"], "Handoff escalated",
        actor_id="system",
        previous_owner=f"{original_to['name']} — {original_to['role']}" if original_to else "",
        new_owner=f"{escalation_user['name']} — {escalation_user['role']}" if escalation_user else escalation_user_id,
        comment=f"Escalation reason: {reason}. Original recipient did not accept in time.",
    )

    _add_timeline_entry(
        handoff["event_id"],
        f"Handoff escalated to {escalation_user['name'] if escalation_user else escalation_user_id} — {escalation_user['role'] if escalation_user else ESCALATION_TARGET_ROLE}",
        "system",
        previous_owner=f"{original_to['name']} — {original_to['role']}" if original_to else "",
        new_owner=f"{escalation_user['name']} — {escalation_user['role']}" if escalation_user else escalation_user_id,
        comment=f"Handoff to {original_to['name'] if original_to else 'recipient'} was not accepted within timeout. {reason}.",
        handoff_id=handoff_id,
    )

    return handoff


def mark_unassigned_emergency(event_id: str) -> dict:
    """Mark an event as Unassigned Emergency when nobody accepts."""
    event = HandoffStore.get_event(event_id)
    if not event:
        raise ValueError(f"Event {event_id} not found")

    event["status"] = "Unassigned Emergency"
    event["current_owner_id"] = ""
    event["current_owner_role"] = ""
    event["updated_at"] = _now_iso()
    HandoffStore.save_event(event)

    _add_timeline_entry(
        event_id,
        "⚠ Event entered Unassigned Emergency state",
        "system",
        comment="No owner has accepted responsibility. CRITICAL: This event requires immediate attention.",
    )

    return event


# ============================================================
# Timeout/Escalation Check
# ============================================================

def check_and_escalate_timeouts(timeout_seconds: int = None) -> List[dict]:
    """
    Check all pending handoffs for timeouts and escalate if necessary.
    Returns list of escalated handoffs.
    """
    if timeout_seconds is None:
        timeout_seconds = ESCALATION_TIMEOUT_SECONDS

    escalated = []
    pending = HandoffStore.get_all_pending_handoffs()
    now = datetime.now(timezone.utc)

    for handoff in pending:
        confirmed_at = handoff.get("confirmed_at")
        if not confirmed_at:
            continue

        try:
            confirmed_dt = datetime.fromisoformat(confirmed_at.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue

        elapsed = (now - confirmed_dt).total_seconds()

        if elapsed >= timeout_seconds:
            event = HandoffStore.get_event(handoff["event_id"])
            tca_info = ""
            if event and event.get("tca"):
                try:
                    tca_dt = datetime.fromisoformat(event["tca"].replace("Z", "+00:00"))
                    remaining = (tca_dt - now).total_seconds() / 60
                    tca_info = f" TCA is now {remaining:.0f} minutes away."
                except (ValueError, TypeError):
                    pass

            reason = f"Not accepted within {timeout_seconds} seconds.{tca_info}"

            try:
                result = escalate_handoff(handoff["handoff_id"], reason=reason)
                escalated.append(result)
                logger.info(
                    f"Escalated handoff {handoff['handoff_id']} for event {handoff['event_id']}"
                )
            except Exception as e:
                logger.error(f"Failed to escalate handoff {handoff['handoff_id']}: {e}")

    return escalated
