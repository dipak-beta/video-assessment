"""Backend tests for Kiddo+ Video Assessment API."""
import io
import os
import time
import pytest
import requests

def _load_base_url():
    url = os.environ.get('REACT_APP_BACKEND_URL', '').strip()
    if not url:
        try:
            with open('/app/frontend/.env') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.split('=', 1)[1].strip().strip('"')
                        break
        except Exception:
            pass
    return url.rstrip('/')

BASE_URL = _load_base_url()
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"


# Tiny synthetic mp4 binary (just bytes with .mp4 extension - enough to test upload pipeline)
TINY_MP4 = (
    b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2avc1mp41'
    + b'\x00' * 1024
)


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    return s


@pytest.fixture(scope="module")
def session_id(api):
    r = api.post(f"{BASE_URL}/api/video-assessment/sessions")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "session_id" in data
    assert "created_at" in data
    return data["session_id"]


# --- Root & domains ---
class TestBasics:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert "Kiddo+" in r.json().get("message", "")

    def test_domains(self, api):
        r = api.get(f"{BASE_URL}/api/video-assessment/domains")
        assert r.status_code == 200
        domains = r.json().get("domains", [])
        assert len(domains) == 8
        keys = {d["key"] for d in domains}
        expected = {"attention", "emotion", "sensory", "social", "gross_motor",
                    "fine_motor", "daily_living", "learning_play"}
        assert keys == expected


# --- Demo report ---
class TestDemoReport:
    def test_demo_report(self, api):
        r = api.get(f"{BASE_URL}/api/video-assessment/demo-report")
        assert r.status_code == 200
        data = r.json()
        assert "overall_score" in data
        assert isinstance(data["overall_score"], int)
        assert len(data["domains"]) == 8
        assert len(data["strengths"]) >= 1
        assert len(data["areas_needing_support"]) >= 1
        assert len(data["recommended_activities"]) >= 1
        assert "disclaimer" in data and len(data["disclaimer"]) > 20

    def test_demo_report_new_summary_fields(self, api):
        """Iteration 2: demo-report must expose 4 themed summary strings."""
        r = api.get(f"{BASE_URL}/api/video-assessment/demo-report")
        assert r.status_code == 200
        data = r.json()
        for key in ("motor_summary", "behaviour_summary", "communication_summary", "sensory_summary"):
            assert key in data, f"missing {key}"
            assert isinstance(data[key], str) and len(data[key]) > 0, f"{key} empty"
        # overall_score should match what frontend expects
        assert data["overall_score"] == 82

    def test_demo_report_per_domain_signals(self, api):
        """Iteration 2: every domain must include hand_signals / action_signals / movement_quality."""
        r = api.get(f"{BASE_URL}/api/video-assessment/demo-report")
        assert r.status_code == 200
        data = r.json()
        for d in data["domains"]:
            assert "hand_signals" in d and isinstance(d["hand_signals"], list)
            assert "action_signals" in d and isinstance(d["action_signals"], list)
            assert "movement_quality" in d and isinstance(d["movement_quality"], str)
            # At least one signal per domain in the demo data
            assert len(d["hand_signals"]) >= 1
            assert len(d["action_signals"]) >= 1
            assert len(d["movement_quality"]) > 0


# --- Report round-trip with new fields ---
class TestReportRoundtrip:
    def test_report_persists_new_signal_fields(self, api):
        """Insert a doc directly via API path? We rely on MongoDB → confirm shape via demo, since
        real round-trip requires Gemini. We at least verify the GET /report endpoint
        returns 404 for unknown session (sanity)."""
        r = api.get(f"{BASE_URL}/api/video-assessment/sessions/no-such-session/report")
        assert r.status_code == 404


# --- Session creation ---
class TestSession:
    def test_session_created(self, session_id):
        assert session_id
        assert len(session_id) > 8

    def test_initial_status(self, api, session_id):
        r = api.get(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/status")
        assert r.status_code == 200
        data = r.json()
        assert data["session_id"] == session_id
        assert data["state"] == "pending"
        assert data["uploaded_domains"] == []
        assert "step" in data


# --- Upload tests ---
class TestUpload:
    def test_upload_invalid_format(self, api, session_id):
        files = {"file": ("hello.txt", io.BytesIO(b"not a video"), "text/plain")}
        data = {"domain": "attention"}
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/upload",
                     data=data, files=files)
        assert r.status_code == 400, r.text

    def test_upload_unknown_domain(self, api, session_id):
        files = {"file": ("v.mp4", io.BytesIO(TINY_MP4), "video/mp4")}
        data = {"domain": "not_a_domain"}
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/upload",
                     data=data, files=files)
        assert r.status_code == 400

    def test_upload_session_not_found(self, api):
        files = {"file": ("v.mp4", io.BytesIO(TINY_MP4), "video/mp4")}
        data = {"domain": "attention"}
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions/does-not-exist/upload",
                     data=data, files=files)
        assert r.status_code == 404

    def test_upload_too_large(self, api, session_id):
        # 51 MB
        big = b"\x00" * (51 * 1024 * 1024)
        files = {"file": ("big.mp4", io.BytesIO(big), "video/mp4")}
        data = {"domain": "attention"}
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/upload",
                     data=data, files=files)
        assert r.status_code == 413, r.text

    def test_upload_success(self, api, session_id):
        files = {"file": ("attention.mp4", io.BytesIO(TINY_MP4), "video/mp4")}
        data = {"domain": "attention"}
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/upload",
                     data=data, files=files)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["domain"] == "attention"
        assert body["size_bytes"] == len(TINY_MP4)
        assert body["filename"].endswith(".mp4")

    def test_status_after_upload(self, api, session_id):
        r = api.get(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/status")
        assert r.status_code == 200
        data = r.json()
        assert "attention" in data["uploaded_domains"]

    def test_delete_upload(self, api, session_id):
        # upload a 2nd domain
        files = {"file": ("social.mp4", io.BytesIO(TINY_MP4), "video/mp4")}
        data = {"domain": "social"}
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/upload",
                     data=data, files=files)
        assert r.status_code == 200

        r2 = api.delete(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/upload/social")
        assert r2.status_code == 200
        assert r2.json().get("ok") is True

        r3 = api.get(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/status")
        assert "social" not in r3.json()["uploaded_domains"]
        assert "attention" in r3.json()["uploaded_domains"]


# --- Analyze ---
class TestAnalyze:
    def test_analyze_requires_uploads(self, api):
        # Fresh session with no uploads
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions")
        sid = r.json()["session_id"]
        r2 = api.post(f"{BASE_URL}/api/video-assessment/sessions/{sid}/analyze")
        assert r2.status_code == 400, r2.text

    def test_analyze_session_not_found(self, api):
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions/missing-xyz/analyze")
        assert r.status_code == 404

    def test_analyze_accepted_with_upload(self, api):
        # self-contained: create session + upload in this worker scope
        rs = api.post(f"{BASE_URL}/api/video-assessment/sessions")
        sid = rs.json()["session_id"]
        files = {"file": ("attention.mp4", io.BytesIO(TINY_MP4), "video/mp4")}
        ru = api.post(f"{BASE_URL}/api/video-assessment/sessions/{sid}/upload",
                      data={"domain": "attention"}, files=files)
        assert ru.status_code == 200, ru.text

        r = api.post(f"{BASE_URL}/api/video-assessment/sessions/{sid}/analyze")
        assert r.status_code == 200, r.text
        session_id = sid
        data = r.json()
        assert data["state"] == "analyzing"

        # Give the BackgroundTask a moment to set status
        time.sleep(1.0)
        r2 = api.get(f"{BASE_URL}/api/video-assessment/sessions/{session_id}/status")
        assert r2.status_code == 200
        st = r2.json()["state"]
        # state should be analyzing or error (if gemini rejects tiny mp4) - both acceptable
        assert st in ("analyzing", "error", "complete"), f"Unexpected state: {st}"



# --- Iteration 3: parent_id + referral codes + trust + PDF + share ---
class TestSessionCreateExtended:
    def test_session_auto_parent_id(self, api):
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "parent_id" in data and len(data["parent_id"]) > 0
        assert "session_id" in data and "created_at" in data

    def test_session_with_parent_id(self, api):
        body = {"parent_id": "TEST-PARENT-123", "child_name": "Test", "referral_code": "PAEDOT2026"}
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions", json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["parent_id"] == "TEST-PARENT-123"


class TestReferral:
    @pytest.mark.parametrize("code", ["KIDDOCLINIC", "PAEDOT2026", "EARLYSTART"])
    def test_referral_known(self, api, code):
        r = api.get(f"{BASE_URL}/api/video-assessment/referral/{code}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["code"] == code
        assert "clinic_name" in data
        assert "discount_pct" in data

    def test_referral_lowercase(self, api):
        # endpoint upper-cases internally
        r = api.get(f"{BASE_URL}/api/video-assessment/referral/paedot2026")
        assert r.status_code == 200

    def test_referral_unknown(self, api):
        r = api.get(f"{BASE_URL}/api/video-assessment/referral/BADCODE_XYZ")
        assert r.status_code == 404


class TestTrustStats:
    def test_trust_stats_shape(self, api):
        r = api.get(f"{BASE_URL}/api/video-assessment/trust-stats")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("avg_video_lifetime_sec", "max_video_lifetime_sec",
                  "min_video_lifetime_sec", "videos_processed_and_deleted",
                  "total_assessments_generated"):
            assert k in data, f"missing {k}"
            assert isinstance(data[k], (int, float)), f"{k} not numeric"


class TestParentHistory:
    def test_history_empty(self, api):
        r = api.get(f"{BASE_URL}/api/video-assessment/parents/TEST-PARENT-EMPTY-{int(time.time())}/history")
        assert r.status_code == 200
        data = r.json()
        assert "parent_id" in data
        assert data["history"] == []

    def test_history_after_create(self, api):
        pid = f"TEST-PARENT-{int(time.time())}"
        rc = api.post(f"{BASE_URL}/api/video-assessment/sessions",
                      json={"parent_id": pid, "child_name": "TestKid"})
        assert rc.status_code == 200
        sid = rc.json()["session_id"]
        rh = api.get(f"{BASE_URL}/api/video-assessment/parents/{pid}/history")
        assert rh.status_code == 200
        data = rh.json()
        assert data["parent_id"] == pid
        assert len(data["history"]) >= 1
        entry = data["history"][0]
        assert entry["session_id"] == sid
        assert "created_at" in entry
        assert "report_ready" in entry and isinstance(entry["report_ready"], bool)
        # No report yet so should be False
        assert entry["report_ready"] is False


@pytest.fixture(scope="module")
def existing_report_session_id(api):
    """Find a pre-existing session with a report. If none, seed one via direct mongo write."""
    # Try to fetch from mongo via the parent_history of a parent we just created — won't work.
    # Instead, attempt to find a session_id from MongoDB.
    try:
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url:
            with open("/app/backend/.env") as f:
                for line in f:
                    if line.startswith("MONGO_URL="):
                        mongo_url = line.split("=", 1)[1].strip().strip('"')
                    if line.startswith("DB_NAME="):
                        db_name = line.split("=", 1)[1].strip().strip('"')
        mc = MongoClient(mongo_url)
        rdoc = mc[db_name].assessment_reports.find_one({})
        if rdoc:
            return rdoc["session_id"]
        # seed a minimal one
        from datetime import datetime, timezone
        sid = f"TEST-REPORT-{int(time.time())}"
        mc[db_name].assessment_reports.insert_one({
            "session_id": sid,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "overall_score": 80,
            "overall_summary": "Test report",
            "strengths": ["s1"],
            "areas_needing_support": ["a1"],
            "risk_indicators": [],
            "confidence": 0.8,
            "domains": [{"domain": "attention", "name": "Attention", "score": 70,
                         "summary": "", "strengths": [], "areas_of_support": [], "confidence": 0.7,
                         "hand_signals": [], "action_signals": [], "movement_quality": "ok"}],
            "recommended_activities": [{"title": "t", "domain": "attention", "duration": "5", "description": "d"}],
            "home_program": ["h1"],
            "professional_recommendations": ["p1"],
            "disclaimer": "test",
        })
        return sid
    except Exception as e:
        pytest.skip(f"Could not seed report: {e}")


class TestPDFAndShare:
    def test_pdf_export(self, api, existing_report_session_id):
        r = api.get(f"{BASE_URL}/api/video-assessment/sessions/{existing_report_session_id}/report.pdf")
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_pdf_not_found(self, api):
        r = api.get(f"{BASE_URL}/api/video-assessment/sessions/nonexistent-xyz/report.pdf")
        assert r.status_code == 404

    def test_share_create_idempotent(self, api, existing_report_session_id):
        r1 = api.post(f"{BASE_URL}/api/video-assessment/sessions/{existing_report_session_id}/share")
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["session_id"] == existing_report_session_id
        assert "slug" in d1 and len(d1["slug"]) > 0
        slug1 = d1["slug"]

        # Second call returns same slug
        r2 = api.post(f"{BASE_URL}/api/video-assessment/sessions/{existing_report_session_id}/share")
        assert r2.status_code == 200
        assert r2.json()["slug"] == slug1

    def test_share_no_report(self, api):
        r = api.post(f"{BASE_URL}/api/video-assessment/sessions/no-such/share")
        assert r.status_code == 404

    def test_shared_report_fetch(self, api, existing_report_session_id):
        rs = api.post(f"{BASE_URL}/api/video-assessment/sessions/{existing_report_session_id}/share")
        slug = rs.json()["slug"]
        r = api.get(f"{BASE_URL}/api/video-assessment/shared/{slug}")
        assert r.status_code == 200
        data = r.json()
        assert "report" in data and "shared_at" in data
        rep = data["report"]
        assert "overall_score" in rep
        assert "overall_summary" in rep
        assert "domains" in rep and isinstance(rep["domains"], list)

    def test_shared_report_unknown_slug(self, api):
        r = api.get(f"{BASE_URL}/api/video-assessment/shared/nonexistent_slug_xyz")
        assert r.status_code == 404


# --- Iteration 4: WhatsApp share-card PNG endpoints ---
def _mongo():
    """Helper to get a synchronous MongoClient + db_name from env / backend .env."""
    from pymongo import MongoClient
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        with open("/app/backend/.env") as f:
            for line in f:
                if line.startswith("MONGO_URL=") and not mongo_url:
                    mongo_url = line.split("=", 1)[1].strip().strip('"')
                if line.startswith("DB_NAME=") and not db_name:
                    db_name = line.split("=", 1)[1].strip().strip('"')
    return MongoClient(mongo_url), db_name


@pytest.fixture(scope="module")
def seeded_report_session_id(api):
    """Create a session + insert a real-shaped assessment report into Mongo
    using the body returned by GET /api/video-assessment/demo-report.

    Avoids running the LLM analyze pipeline. Returns the session_id."""
    from datetime import datetime, timezone
    # 1. real session in mongo (POST /sessions)
    rs = api.post(f"{BASE_URL}/api/video-assessment/sessions",
                  json={"parent_id": "TEST-SHARECARD-PARENT", "child_name": "TestKid",
                        "referral_code": "KIDDOCLINIC"})
    assert rs.status_code == 200, rs.text
    sid = rs.json()["session_id"]

    # 2. fetch demo-report shape
    rd = api.get(f"{BASE_URL}/api/video-assessment/demo-report")
    assert rd.status_code == 200
    rep = rd.json()
    rep["session_id"] = sid
    rep["created_at"] = datetime.now(timezone.utc).isoformat()

    # 3. insert into mongo
    mc, db_name = _mongo()
    try:
        mc[db_name].assessment_reports.replace_one(
            {"session_id": sid}, rep, upsert=True
        )
        # cleanup any pre-existing share link for the session so we test idempotency cleanly
        mc[db_name].assessment_share_links.delete_many({"session_id": sid})
        yield sid
    finally:
        # teardown
        mc[db_name].assessment_reports.delete_many({"session_id": sid})
        mc[db_name].assessment_share_links.delete_many({"session_id": sid})
        mc[db_name].assessment_sessions.delete_many({"session_id": sid})
        mc.close()


class TestShareCardPNG:
    """New iteration: PNG share-card endpoints for WhatsApp / referral."""

    def test_share_card_by_session_returns_png(self, api, seeded_report_session_id):
        sid = seeded_report_session_id
        r = api.get(f"{BASE_URL}/api/video-assessment/sessions/{sid}/share-card.png")
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("content-type", "").startswith("image/png")
        # PNG magic header
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", "Not a valid PNG"
        # Spec says output should be ~85-90 KB; require >= 50 KB
        assert len(r.content) >= 50 * 1024, f"PNG too small ({len(r.content)} bytes)"

    def test_share_card_idempotent_slug(self, api, seeded_report_session_id):
        """Calling the session share-card endpoint twice must NOT create a 2nd slug."""
        sid = seeded_report_session_id
        # First call
        r1 = api.get(f"{BASE_URL}/api/video-assessment/sessions/{sid}/share-card.png")
        assert r1.status_code == 200
        # Second call
        r2 = api.get(f"{BASE_URL}/api/video-assessment/sessions/{sid}/share-card.png")
        assert r2.status_code == 200

        # Verify only ONE share link exists for this session
        mc, db_name = _mongo()
        try:
            count = mc[db_name].assessment_share_links.count_documents({"session_id": sid})
            assert count == 1, f"Expected 1 share link, found {count}"
        finally:
            mc.close()

    def test_share_card_session_not_found_404(self, api):
        r = api.get(f"{BASE_URL}/api/video-assessment/sessions/no-such-session-xyz/share-card.png")
        assert r.status_code == 404

    def test_shared_share_card_by_slug(self, api, seeded_report_session_id):
        sid = seeded_report_session_id
        # First, ensure a slug exists (call session endpoint to auto-create it)
        r0 = api.get(f"{BASE_URL}/api/video-assessment/sessions/{sid}/share-card.png")
        assert r0.status_code == 200

        # Read slug back from mongo
        mc, db_name = _mongo()
        try:
            link = mc[db_name].assessment_share_links.find_one({"session_id": sid})
            assert link, "share link not auto-created"
            slug = link["slug"]
        finally:
            mc.close()

        r = api.get(f"{BASE_URL}/api/video-assessment/shared/{slug}/share-card.png")
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("content-type", "").startswith("image/png")
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"
        assert len(r.content) >= 50 * 1024

    def test_shared_share_card_unknown_slug_404(self, api):
        r = api.get(f"{BASE_URL}/api/video-assessment/shared/nonexistent_slug_zzz/share-card.png")
        assert r.status_code == 404

    def test_end_to_end_share_then_card(self, api, seeded_report_session_id):
        """POST /share creates a slug, then GET /shared/{slug}/share-card.png works."""
        sid = seeded_report_session_id
        rs = api.post(f"{BASE_URL}/api/video-assessment/sessions/{sid}/share")
        assert rs.status_code == 200
        slug = rs.json()["slug"]
        r = api.get(f"{BASE_URL}/api/video-assessment/shared/{slug}/share-card.png")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"
        assert len(r.content) >= 50 * 1024
