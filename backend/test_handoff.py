"""
KesslerX Handoff Service — Comprehensive API Tests
Tests all endpoints, state machine transitions, note generation, escalation, and timeline.
"""
from fastapi.testclient import TestClient
from main import app
from handoff_service import seed_demo_data

client = TestClient(app)


def test_users():
    seed_demo_data()
    response = client.get("/api/users")
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert len(data["users"]) >= 4
    user_ids = [u["user_id"] for u in data["users"]]
    assert "anish" in user_ids
    assert "madhura" in user_ids
    assert "ravi" in user_ids
    assert "priya" in user_ids


def test_events_list_and_detail():
    seed_demo_data()
    response = client.get("/api/events")
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert len(data["events"]) >= 3
    event_id = data["events"][0]["event_id"]

    detail_res = client.get(f"/api/events/{event_id}")
    assert detail_res.status_code == 200
    event = detail_res.json()
    assert event["event_id"] == event_id
    assert "owner" in event
    assert "work_completed" in event


def test_handoff_lifecycle_accept():
    seed_demo_data()
    event_id = "CX-9921-A"

    # 1. Create Handoff Draft
    create_res = client.post(
        f"/api/events/{event_id}/handoffs",
        json={
            "to_user_id": "madhura",
            "reason": "Shift Change",
            "priority": "High",
            "next_action": "Validate Scenario B and prepare burn plan",
            "deadline": "2026-08-22T18:00:00Z",
            "message": "Please monitor STARLINK-3021 conjunction closely.",
            "include_evidence": True,
        },
        headers={"x-user-id": "anish"},
    )
    assert create_res.status_code == 200, create_res.text
    handoff = create_res.json()
    handoff_id = handoff["handoff_id"]
    assert handoff["status"] == "Draft"
    assert handoff["from_user_id"] == "anish"
    assert handoff["to_user_id"] == "madhura"

    # 2. Generate Note
    gen_res = client.post(f"/api/handoffs/{handoff_id}/generate-note")
    assert gen_res.status_code == 200
    note_data = gen_res.json()
    assert len(note_data["generated_note"]) > 0
    assert "KESSLERX RESPONSIBILITY HANDOFF NOTE" in note_data["generated_note"]

    # 3. Edit Note
    edited_text = note_data["generated_note"] + "\n\n**Analyst Addendum**: Verified radar cross-section."
    edit_res = client.post(
        f"/api/handoffs/{handoff_id}/update-note",
        json={"note": edited_text},
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["generated_note"] == edited_text

    # 4. Confirm Handoff
    confirm_res = client.post(
        f"/api/handoffs/{handoff_id}/confirm",
        headers={"x-user-id": "anish"},
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "Awaiting Acceptance"

    # 5. Check Pending for Madhura
    pending_res = client.get("/api/handoffs/pending", headers={"x-user-id": "madhura"})
    assert pending_res.status_code == 200
    pending_ids = [h["handoff_id"] for h in pending_res.json()["handoffs"]]
    assert handoff_id in pending_ids

    # 6. Madhura Accepts
    accept_res = client.post(
        f"/api/handoffs/{handoff_id}/accept",
        headers={"x-user-id": "madhura"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "Accepted"

    # 7. Check Event Ownership Transfer
    event_res = client.get(f"/api/events/{event_id}")
    assert event_res.status_code == 200
    assert event_res.json()["current_owner_id"] == "madhura"

    # 8. Check Timeline has audit entries
    timeline_res = client.get(f"/api/events/{event_id}/timeline")
    assert timeline_res.status_code == 200
    entries = timeline_res.json()["timeline"]
    assert len(entries) >= 2


def test_handoff_clarification_flow():
    seed_demo_data()
    event_id = "CX-9921-A"

    # 1. Create, Generate Note & Confirm Handoff
    create_res = client.post(
        f"/api/events/{event_id}/handoffs",
        json={"to_user_id": "ravi", "reason": "Expertise Needed"},
        headers={"x-user-id": "anish"},
    )
    handoff_id = create_res.json()["handoff_id"]
    client.post(f"/api/handoffs/{handoff_id}/generate-note")
    confirm_res = client.post(f"/api/handoffs/{handoff_id}/confirm", headers={"x-user-id": "anish"})
    assert confirm_res.status_code == 200

    # 2. Ravi Requests Clarification
    clar_res = client.post(
        f"/api/handoffs/{handoff_id}/clarification",
        json={"message": "What is the latest TCA uncertainty ellipsoid?"},
        headers={"x-user-id": "ravi"},
    )
    assert clar_res.status_code == 200, clar_res.text
    assert clar_res.json()["status"] == "Clarification Requested"

    # 3. Anish Responds
    resp_res = client.post(
        f"/api/handoffs/{handoff_id}/respond-clarification",
        json={"message": "Radial uncertainty is +/- 15m. SGP4 propagation updated."},
        headers={"x-user-id": "anish"},
    )
    assert resp_res.status_code == 200, resp_res.text
    assert resp_res.json()["status"] == "Awaiting Acceptance"


def test_handoff_rejection_flow():
    seed_demo_data()
    event_id = "CX-9921-A"

    create_res = client.post(
        f"/api/events/{event_id}/handoffs",
        json={"to_user_id": "madhura", "reason": "Shift Change"},
        headers={"x-user-id": "anish"},
    )
    handoff_id = create_res.json()["handoff_id"]
    client.post(f"/api/handoffs/{handoff_id}/generate-note")
    confirm_res = client.post(f"/api/handoffs/{handoff_id}/confirm", headers={"x-user-id": "anish"})
    assert confirm_res.status_code == 200

    reject_res = client.post(
        f"/api/handoffs/{handoff_id}/reject",
        json={"reason": "Currently handling high-priority Cosmos-2251 fragmentation.", "reassign_to_user_id": ""},
        headers={"x-user-id": "madhura"},
    )
    assert reject_res.status_code == 200, reject_res.text
    assert reject_res.json()["status"] == "Rejected"


def test_escalation_flow():
    seed_demo_data()
    event_id = "CX-9921-A"

    create_res = client.post(
        f"/api/events/{event_id}/handoffs",
        json={"to_user_id": "madhura", "reason": "Shift Change"},
        headers={"x-user-id": "anish"},
    )
    handoff_id = create_res.json()["handoff_id"]
    client.post(f"/api/handoffs/{handoff_id}/generate-note")
    confirm_res = client.post(f"/api/handoffs/{handoff_id}/confirm", headers={"x-user-id": "anish"})
    assert confirm_res.status_code == 200

    # Manual escalation
    esc_res = client.post(f"/api/handoffs/{handoff_id}/escalate")
    assert esc_res.status_code == 200, esc_res.text
    assert esc_res.json()["status"] == "Escalated"
    assert esc_res.json()["to_user_id"] == "priya"  # Safety lead


def test_unassigned_emergency():
    seed_demo_data()
    event_id = "CX-9921-A"

    emerg_res = client.post(f"/api/events/{event_id}/unassigned-emergency")
    assert emerg_res.status_code == 200
    event = emerg_res.json()
    assert event["status"] == "Unassigned Emergency"
    assert event["current_owner_id"] == ""


if __name__ == "__main__":
    test_users()
    print("[OK] test_users passed")
    test_events_list_and_detail()
    print("[OK] test_events_list_and_detail passed")
    test_handoff_lifecycle_accept()
    print("[OK] test_handoff_lifecycle_accept passed")
    test_handoff_clarification_flow()
    print("[OK] test_handoff_clarification_flow passed")
    test_handoff_rejection_flow()
    print("[OK] test_handoff_rejection_flow passed")
    test_escalation_flow()
    print("[OK] test_escalation_flow passed")
    test_unassigned_emergency()
    print("[OK] test_unassigned_emergency passed")
    print("\nALL 7 HANDOFF TEST SUITES PASSED!")
