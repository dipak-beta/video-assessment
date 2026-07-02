from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import json
import shutil
import asyncio
import secrets
import time
import contextvars
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM key (used as Gemini API key by emergentintegrations)
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Video upload directory
UPLOAD_DIR = Path(os.environ.get('VIDEO_UPLOAD_DIR', '/tmp/kiddoplus_video_uploads'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Video auto-deletion TTL (fallback sweeper, in addition to inline post-analysis delete).
# Any session directory older than this — regardless of pipeline state — will be purged.
VIDEO_TTL_HOURS = int(os.environ.get('VIDEO_TTL_HOURS', '24'))
VIDEO_SWEEP_INTERVAL_MIN = int(os.environ.get('VIDEO_SWEEP_INTERVAL_MIN', '60'))

# Limits
MAX_VIDEO_BYTES = 200 * 1024 * 1024  # 200 MB
MAX_VIDEO_MB = MAX_VIDEO_BYTES // (1024 * 1024)
ALLOWED_MIME = {"video/mp4", "video/quicktime", "video/webm", "video/x-quicktime"}
ALLOWED_EXTS = {".mp4", ".mov", ".webm"}

# Compression settings (H.264, CRF-based — visually lossless target with smaller files)
COMPRESS_CRF = "27"        # 23 (high quality) ↔ 28 (heavy). 27 = heavy w/ retained visual quality
COMPRESS_PRESET = "medium"
COMPRESS_MAX_HEIGHT = 720  # downscale tall videos to 720p, keep aspect
COMPRESS_AUDIO_BITRATE = "96k"

# Domains
DOMAINS = [
    {"key": "attention", "name": "Attention & Self Regulation",
     "observe": "attention span, task completion, frustration tolerance, self regulation"},
    {"key": "emotion", "name": "Emotion & Behaviour",
     "observe": "emotional regulation, behaviour flexibility, reaction to changes, comfort seeking"},
    {"key": "sensory", "name": "Sensory Processing",
     "observe": "sensory seeking, avoidance, tactile/movement/sound/visual response"},
    {"key": "social", "name": "Social & Communication",
     "observe": "eye contact, joint attention, gestures, communication, social interaction"},
    {"key": "gross_motor", "name": "Gross Motor",
     "observe": "balance, coordination, strength, posture, movement quality"},
    {"key": "fine_motor", "name": "Fine Motor",
     "observe": "hand control, grasp, bilateral coordination, finger precision"},
    {"key": "daily_living", "name": "Daily Living Skills",
     "observe": "independence, planning, motor sequencing, self care"},
    {"key": "learning_play", "name": "Learning & Play",
     "observe": "learning ability, play skills, imitation, creativity, problem solving"},
]
DOMAIN_KEYS = {d["key"] for d in DOMAINS}

app = FastAPI(title="Kiddo+ Video Assessment API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# -------------------- Models --------------------

class SessionCreateIn(BaseModel):
    parent_id: Optional[str] = None
    child_name: Optional[str] = None
    child_dob: Optional[str] = None  # ISO date string
    referral_code: Optional[str] = None


class SessionCreateOut(BaseModel):
    session_id: str
    created_at: str
    parent_id: str
    referral_clinic: Optional[str] = None


class UploadOut(BaseModel):
    session_id: str
    domain: str
    filename: str
    size_bytes: int


class DomainObservation(BaseModel):
    domain: str
    name: str
    score: int
    summary: str
    strengths: List[str] = []
    areas_of_support: List[str] = []
    confidence: float = 0.0
    hand_signals: List[str] = []
    action_signals: List[str] = []
    movement_quality: str = ""


class AssessmentReport(BaseModel):
    session_id: str
    created_at: str
    overall_score: int
    overall_summary: str
    strengths: List[str]
    areas_needing_support: List[str]
    risk_indicators: List[str]
    confidence: float
    domains: List[DomainObservation]
    recommended_activities: List[Dict[str, str]]
    home_program: List[str]
    professional_recommendations: List[str]
    disclaimer: str


class StatusOut(BaseModel):
    session_id: str
    state: str  # pending | analyzing | complete | error
    progress: int
    step: str
    uploaded_domains: List[str]
    error: Optional[str] = None
    # Progressive results — populated as each video's analysis completes so
    # the UI can render domain scores incrementally during analysis.
    partial_observations: Optional[List[dict]] = None


# -------------------- Helpers --------------------

def _session_dir(session_id: str) -> Path:
    d = UPLOAD_DIR / session_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def _domain_info(key: str) -> Optional[dict]:
    for d in DOMAINS:
        if d["key"] == key:
            return d
    return None


async def _set_status(session_id: str, **fields):
    fields["session_id"] = session_id
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.assessment_status.update_one(
        {"session_id": session_id},
        {"$set": fields},
        upsert=True,
    )


async def _get_status(session_id: str) -> Optional[dict]:
    return await db.assessment_status.find_one({"session_id": session_id}, {"_id": 0})


def _safe_delete_session_dir(session_id: str):
    try:
        d = UPLOAD_DIR / session_id
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)
    except Exception as e:
        logger.warning(f"Failed to delete session dir {session_id}: {e}")


# -------------------- LLM cost telemetry --------------------
# Per-session token/cost accumulator. LiteLLM invokes _cost_tracking_callback
# after every completion; we correlate the call to the active session via a
# contextvar set right before each Gemini call.

# Gemini 2.5 pricing per 1M tokens (USD). Kept local so cost stays accurate
# even when the Universal Key proxy strips the model name from LiteLLM's
# internal pricing table. Updated Jan 2026.
_GEMINI_PRICING_PER_MTOKEN = {
    "gemini-2.5-flash":      {"in": 0.30, "out": 2.50},
    "gemini-2.5-flash-lite": {"in": 0.10, "out": 0.40},
    "gemini-2.5-pro":        {"in": 1.25, "out": 10.00},
    "gemini-2.5-pro-large":  {"in": 2.50, "out": 15.00},  # >200K context
    "gemini-1.5-flash":      {"in": 0.075, "out": 0.30},
    "gemini-1.5-pro":        {"in": 1.25, "out": 5.00},
}


def _price_completion(model: str, in_tokens: int, out_tokens: int) -> float:
    """Return USD cost given a model string and token counts using the local
    pricing table. Strips 'gemini/' prefix and any suffix if present."""
    if not model:
        return 0.0
    key = model.replace("gemini/", "").strip().lower()
    row = _GEMINI_PRICING_PER_MTOKEN.get(key)
    if not row:
        # Best-effort partial match (e.g. 'gemini-2.5-flash-001' -> 'gemini-2.5-flash')
        for k, v in _GEMINI_PRICING_PER_MTOKEN.items():
            if key.startswith(k):
                row = v
                break
    if not row:
        return 0.0
    return round(
        (in_tokens / 1_000_000.0) * row["in"] + (out_tokens / 1_000_000.0) * row["out"],
        6,
    )


_current_cost_session: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "current_cost_session", default=None
)
_current_cost_stage: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "current_cost_stage", default=None
)
# In-memory buffer: session_id -> {"calls": [...], "total_cost_usd": float, ...}
_session_usage: Dict[str, Dict[str, Any]] = {}
_session_usage_lock = asyncio.Lock()


def _cost_tracking_callback(kwargs, completion_response, start_time, end_time):
    """LiteLLM success_callback hook. Records tokens & cost for the active session.

    We correlate the call to a session by reading `litellm_params.metadata` set
    on the LlmChat via `.with_params(metadata={"session_id": ..., "stage": ...})`.
    Falls back to contextvars if metadata is missing (best-effort).
    """
    try:
        # LiteLLM stashes user-supplied metadata under multiple keys depending on
        # version — probe all of them.
        meta = {}
        for k in ("metadata", "litellm_metadata"):
            v = kwargs.get(k)
            if isinstance(v, dict):
                meta.update(v)
        lp = kwargs.get("litellm_params") or {}
        if isinstance(lp, dict):
            m2 = lp.get("metadata")
            if isinstance(m2, dict):
                meta.update(m2)

        session_id = meta.get("session_id") or _current_cost_session.get()
        if not session_id:
            return
        stage = meta.get("stage") or _current_cost_stage.get() or "unknown"

        model = kwargs.get("model", "unknown")
        usage = getattr(completion_response, "usage", None)
        pt = int(getattr(usage, "prompt_tokens", 0) or 0) if usage else 0
        ct = int(getattr(usage, "completion_tokens", 0) or 0) if usage else 0
        try:
            import litellm as _litellm
            cost = float(_litellm.completion_cost(completion_response=completion_response) or 0.0)
        except Exception:
            cost = 0.0
        # Fall back to local Gemini pricing when LiteLLM has no pricing for the
        # model (common when the Universal Key proxy strips model identity).
        if cost <= 0.0:
            cost = _price_completion(model, pt, ct)

        rec = _session_usage.setdefault(session_id, {
            "calls": [],
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_cost_usd": 0.0,
        })
        rec["calls"].append({
            "stage": stage,
            "model": model,
            "input_tokens": pt,
            "output_tokens": ct,
            "cost_usd": round(cost, 6),
            "at": datetime.now(timezone.utc).isoformat(),
        })
        rec["total_input_tokens"] += pt
        rec["total_output_tokens"] += ct
        rec["total_cost_usd"] = round(rec["total_cost_usd"] + cost, 6)
    except Exception as e:
        try:
            logger.warning(f"Cost tracking callback failed: {e}")
        except Exception:
            pass


try:
    import litellm as _litellm_mod
    from litellm.integrations.custom_logger import CustomLogger as _LiteLLMCustomLogger

    class _KiddoCostLogger(_LiteLLMCustomLogger):
        """LiteLLM CustomLogger that captures per-completion token usage & cost
        and attributes it to a Kiddo+ session via `metadata`."""

        def _record(self, kwargs, response_obj):
            try:
                _cost_tracking_callback(kwargs, response_obj, None, None)
            except Exception:
                pass

        def log_success_event(self, kwargs, response_obj, start_time, end_time):
            self._record(kwargs, response_obj)

        async def async_log_success_event(self, kwargs, response_obj, start_time, end_time):
            self._record(kwargs, response_obj)

    _kiddo_cost_logger = _KiddoCostLogger()
    if not any(isinstance(cb, _KiddoCostLogger) for cb in (_litellm_mod.callbacks or [])):
        _litellm_mod.callbacks = list(_litellm_mod.callbacks or []) + [_kiddo_cost_logger]
    if _cost_tracking_callback not in (_litellm_mod.success_callback or []):
        _litellm_mod.success_callback = list(_litellm_mod.success_callback or []) + [_cost_tracking_callback]
except Exception as _cb_err:
    try:
        logger.warning(f"LiteLLM cost callback registration failed: {_cb_err}")
    except Exception:
        pass


class _cost_scope:
    """Context manager to tag all Gemini calls made inside it with a
    session_id + stage label for cost attribution."""

    def __init__(self, session_id: str, stage: str):
        self.session_id = session_id
        self.stage = stage
        self._tok_s = None
        self._tok_g = None

    def __enter__(self):
        self._tok_s = _current_cost_session.set(self.session_id)
        self._tok_g = _current_cost_stage.set(self.stage)
        return self

    def __exit__(self, exc_type, exc, tb):
        _current_cost_session.reset(self._tok_s)
        _current_cost_stage.reset(self._tok_g)


async def _persist_session_usage(session_id: str):
    """Flush the in-memory usage buffer for `session_id` into Mongo."""
    rec = _session_usage.get(session_id)
    if not rec:
        return
    async with _session_usage_lock:
        payload = {
            "session_id": session_id,
            "calls": rec.get("calls", []),
            "total_input_tokens": rec.get("total_input_tokens", 0),
            "total_output_tokens": rec.get("total_output_tokens", 0),
            "total_cost_usd": round(rec.get("total_cost_usd", 0.0), 6),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    await db.assessment_usage.update_one(
        {"session_id": session_id},
        {"$set": payload},
        upsert=True,
    )


# -------------------- Video TTL sweeper --------------------

async def _video_ttl_sweeper():
    """Background task: every VIDEO_SWEEP_INTERVAL_MIN minutes, hard-delete any
    session directory whose mtime is older than VIDEO_TTL_HOURS. Covers orphaned
    uploads (analysis errored, user abandoned, container crash, etc.) that the
    inline post-analysis delete didn't catch.
    """
    interval_sec = max(60, VIDEO_SWEEP_INTERVAL_MIN * 60)
    ttl_sec = max(3600, VIDEO_TTL_HOURS * 3600)
    logger_name = "video_ttl_sweeper"
    while True:
        try:
            now = time.time()
            deleted = 0
            if UPLOAD_DIR.exists():
                for entry in UPLOAD_DIR.iterdir():
                    if not entry.is_dir():
                        continue
                    try:
                        # Use the newest mtime among the directory + its files
                        mtimes = [entry.stat().st_mtime]
                        for child in entry.iterdir():
                            try:
                                mtimes.append(child.stat().st_mtime)
                            except OSError:
                                continue
                        newest = max(mtimes) if mtimes else 0
                        if now - newest > ttl_sec:
                            shutil.rmtree(entry, ignore_errors=True)
                            deleted += 1
                            # Record deletion in the session doc so the trust-stats
                            # aggregation stays accurate.
                            try:
                                await db.assessment_sessions.update_one(
                                    {"session_id": entry.name},
                                    {"$set": {
                                        "videos_deleted_at": datetime.now(timezone.utc).isoformat(),
                                        "uploaded": {},
                                        "videos_deleted_by": "ttl_sweeper",
                                    }},
                                )
                            except Exception:
                                pass
                    except Exception as inner:
                        logger.warning(f"[{logger_name}] failed on {entry}: {inner}")
            if deleted:
                logger.info(f"[{logger_name}] purged {deleted} expired session dirs")
        except Exception as e:
            logger.warning(f"[{logger_name}] cycle failed: {e}")
        await asyncio.sleep(interval_sec)


# -------------------- AI Analysis --------------------

DOMAIN_PROMPT = (
    "You are a paediatric occupational therapist analysing a short home video of a child as part of an AI-assisted "
    "developmental SCREENING. This is NOT a clinical diagnosis. Focus on observable developmental patterns ONLY.\n\n"
    "CRITICAL — SUBJECT SELECTION (read first):\n"
    "• The video MAY contain other people (parents, caregivers, therapists, siblings, strangers in the background).\n"
    "• You MUST analyse ONLY THE CHILD. Identify the child as the youngest individual in frame — typically the person "
    "with toddler/preschool body proportions (larger head-to-body ratio, shorter stature, smaller hands, juvenile face).\n"
    "• If two or more children appear, lock on to the ONE child the camera focuses on the longest, OR the youngest. "
    "Once you've chosen that child, TRACK THAT SAME CHILD throughout the video — re-identify them after occlusions, "
    "when they leave/re-enter frame, or when adults briefly stand in front of them.\n"
    "• EXPLICITLY IGNORE any movement, posture, gesture, hand action, or behaviour performed by adults or older "
    "siblings. They are context only.\n\n"
    "This video was uploaded by a parent who labelled it for the domain: \"{source_domain_name}\".\n"
    "However, natural home clips usually show signals across MULTIPLE developmental domains. Carefully observe the "
    "child across ALL EIGHT developmental domains below — not just the labelled one — and only score a domain if the "
    "clip contains genuine, observable evidence for it.\n\n"
    "THE EIGHT DOMAINS:\n"
    "1. attention — Attention & Self Regulation (attention span, task completion, frustration tolerance, self regulation)\n"
    "2. emotion — Emotion & Behaviour (emotional regulation, behaviour flexibility, reaction to changes, comfort seeking)\n"
    "3. sensory — Sensory Processing (seeking/avoidance, tactile/movement/sound/visual responses)\n"
    "4. social — Social & Communication (eye contact, joint attention, gestures, communication, social interaction)\n"
    "5. gross_motor — Gross Motor (balance, coordination, strength, posture, movement quality)\n"
    "6. fine_motor — Fine Motor (hand control, grasp, bilateral coordination, finger precision)\n"
    "7. daily_living — Daily Living Skills (independence, planning, motor sequencing, self care)\n"
    "8. learning_play — Learning & Play (learning ability, play skills, imitation, creativity, problem solving)\n\n"
    "Return STRICT JSON (no markdown) with this exact shape:\n"
    "{{\n"
    '  "domain_observations": [\n'
    '    {{\n'
    '      "domain": "attention",  // one of the 8 keys above, in the same order\n'
    '      "evidence_present": true|false,  // did this clip show observable behaviour for this domain?\n'
    '      "score": int 0-100,  // only meaningful when evidence_present=true; use 0 otherwise\n'
    '      "summary": "short paragraph; if evidence_present=false write \\"No observable evidence in this clip\\"",\n'
    '      "strengths": [string,...],  // 0-5 items\n'
    '      "areas_of_support": [string,...],  // 0-5 items\n'
    '      "hand_signals": [string,...],  // 0-5 items\n'
    '      "action_signals": [string,...],  // 0-5 items\n'
    '      "movement_quality": "short phrase",\n'
    '      "confidence": float 0-1\n'
    '    }},\n'
    '    ... // exactly one entry per domain, all 8 in the order listed above\n'
    '  ],\n'
    '  "challenging_behaviours_observed": [string,...]  // 0-4 short labels e.g. "meltdown when frustrated"\n'
    "}}\n\n"
    "Be honest: most home clips show clear evidence for 2-4 domains and minimal evidence for the others. "
    "Do NOT fabricate observations. Every observation MUST be about the child only."
)


CHALLENGING_BEHAVIOUR_PROMPT = (
    "You are a paediatric occupational therapist reviewing a short home video that the parent has flagged as showing "
    "a CHALLENGING BEHAVIOUR (e.g. tantrum, meltdown, aggression, self-injury, withdrawal, sensory overload). Your "
    "job is to describe what is observable, gently and non-judgementally.\n\n"
    "Focus ONLY on the child (the youngest individual in frame). Adults in the clip are context only.\n\n"
    "Return STRICT JSON (no markdown) with this exact shape:\n"
    "{{\n"
    '  "behaviour_type": "short label e.g. \\"meltdown\\", \\"sensory overload\\", \\"refusal\\", \\"aggression\\", \\"withdrawal\\"",\n'
    '  "trigger": "short phrase describing what appears to trigger it",\n'
    '  "duration_estimate_sec": int,\n'
    '  "intensity": "mild|moderate|severe",\n'
    '  "self_regulation_attempts": [string,...],  // any coping strategies the child uses\n'
    '  "caregiver_response": "short description of how the adult responds",\n'
    '  "summary": "calm, evidence-only paragraph",\n'
    '  "confidence": float 0-1\n'
    "}}\n\n"
    "Be specific, gentle, and never diagnose. If the video does not actually show a challenging behaviour, set "
    "confidence below 0.3 and explain why in the summary."
)

FINAL_PROMPT = (
    "You are a paediatric occupational therapist generating a final AI-assisted developmental screening "
    "report. Below are domain-level observations extracted from short home videos of a child. Each "
    "observation includes pose-based, hand-tracking, and action-recognition signals. Some domains may "
    "be marked INSUFFICIENT EVIDENCE — for those, do NOT fabricate scores or strengths; instead, in the "
    "per-domain narrative, briefly say what the parent could film next to give us evidence.\n\n"
    "{domain_blob}\n\n"
    "Write a warm, parent-friendly but clinically grounded report. Be specific (quote movements / play "
    "behaviours you saw), gentle, and never diagnose. Always include an AI-assisted screening caveat in "
    "tone.\n\n"
    "Produce STRICT JSON (no markdown fences) with EXACTLY these keys:\n"
    "{{\n"
    '  "overall_score": int 0-100,\n'
    '  "overall_summary": "3-4 sentence paragraph describing the child\'s overall developmental picture",\n'
    '  "age_context": "1-2 sentence paragraph placing observations against typical age expectations (mention that age framing is approximate without a precise DOB)",\n'
    '  "strengths": [string, ...]  // 4-6 concrete strengths, each one observation-anchored,\n'
    '  "areas_needing_support": [string, ...]  // 4-6 concrete areas, framed positively,\n'
    '  "risk_indicators": [string, ...]  // 0-3 calm, non-alarming notes only if real signals,\n'
    '  "confidence": float 0-1,\n'
    '  "motor_summary": "paragraph combining gross + fine motor + hand-tracking signals",\n'
    '  "behaviour_summary": "paragraph combining attention + emotion + action signals",\n'
    '  "communication_summary": "paragraph combining social + learning + interaction signals",\n'
    '  "sensory_summary": "paragraph on sensory seeking / avoiding / regulation patterns",\n'
    '  "per_domain_narratives": [\n'
    '    // EXACTLY one entry for EACH of these 8 domain keys: attention, emotion, sensory, social,\n'
    "    // gross_motor, fine_motor, daily_living, learning_play. Even if INSUFFICIENT EVIDENCE,\n"
    "    // still include the entry with insufficient_evidence:true and a helpful 'filming_tip'.\n"
    '    {{\n'
    '      "domain": "<domain_key>",\n'
    '      "narrative": "3-5 sentence paragraph describing what was observed, what it suggests about development, and how it compares to typical age-range expectations",\n'
    '      "key_observations": [string, ...],  // 3-5 specific behaviours observed (or \"insufficient evidence\" item if no clip),\n'
    '      "next_steps": [string, ...],  // 2-4 concrete, do-this-week parent suggestions for this domain,\n'
    '      "insufficient_evidence": bool,\n'
    '      "filming_tip": "If insufficient_evidence is true, 1 sentence describing the kind of clip the parent should record next. Otherwise empty string."\n'
    '    }}\n'
    "  ],\n"
    '  "behaviour_section": {{\n'
    '    "summary": "calm 3-4 sentence paragraph on the child\'s behaviour & self-regulation pattern overall",\n'
    '    "regulation_strengths": [string, ...],  // 2-4 strengths,\n'
    '    "regulation_challenges": [string, ...],  // 2-4 challenges,\n'
    '    "triggers": [string, ...],  // 2-4 likely triggers seen or inferred (or empty if none observed),\n'
    '    "coping_strategies_observed": [string, ...],  // 2-4 strategies the child uses,\n'
    '    "caregiver_response": "1-2 sentences describing the adult/caregiver response pattern from the clips, neutral and supportive",\n'
    '    "parent_suggestions": [string, ...]  // 3-5 concrete what-to-try-at-home tips\n'
    "  }},\n"
    '  "developmental_milestones": {{\n'
    '    "achieved": [string, ...],  // 3-6 milestones clearly demonstrated in clips,\n'
    '    "emerging": [string, ...],  // 3-5 milestones that are showing up but inconsistently,\n'
    '    "next_to_watch_for": [string, ...]  // 3-5 milestones the parent can watch for next\n'
    "  }},\n"
    '  "recommended_activities": [\n'
    '    {{"title": string, "domain": "<one of the 8 domain keys>", "duration": "e.g. 5 min", "description": "1-2 sentences with concrete play instructions", "why_it_helps": "1 sentence explaining the developmental benefit"}}\n'
    "  ],  // AT LEAST 8 activities — at least one per domain when evidence allows,\n"
    '  "home_program": [string, ...],  // 6-8 daily habits / micro-routines parents can adopt this week,\n'
    '  "parent_tips": [string, ...],  // 4-6 short, kind, evidence-based tips (different from home_program — more philosophical / reassuring),\n'
    '  "professional_recommendations": [string, ...]  // 3-5 specific next steps with a paediatric specialist (OT, SLP, paediatrician, etc.) — calm, optional, never diagnostic\n'
    "}}\n\n"
    "Rules:\n"
    "- per_domain_narratives MUST contain EXACTLY 8 entries, one per domain key listed above, in that order.\n"
    "- recommended_activities MUST contain AT LEAST 8 items.\n"
    "- Never invent observations for INSUFFICIENT EVIDENCE domains.\n"
    "- Keep language warm, specific, and free of diagnostic labels."
)


async def _compress_video(src: Path) -> tuple[Path, int]:
    """Heavily compress a video using ffmpeg (H.264 CRF) while preserving
    perceived visual quality. Returns the (possibly re-encoded) output Path and
    its size in bytes.

    Strategy:
      • Re-encode video with libx264, CRF 27, preset medium → strong size
        reduction, visually close to source for screening purposes.
      • Cap height at 720p (keep aspect, even width) — Gemini analysis does not
        need higher resolution and this shrinks files significantly.
      • Re-encode audio to AAC 96k.
      • Use +faststart so the file plays back / streams quickly.
      • If ffmpeg is missing or fails, keep the original file (don't break upload).
      • If the re-encoded file is larger than the source (rare for already-tiny
        clips), keep the source.
    """
    original_size = src.stat().st_size
    out_path = src.with_name(src.stem + "__compressed.mp4")
    final_path = src.with_suffix(".mp4")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        logger.warning("ffmpeg not available — skipping compression for %s", src.name)
        return src, original_size

    # scale='min(iw,iw*MAX/ih)':'min(ih,MAX)' style — keep aspect, only downscale
    vf = (
        f"scale='if(gt(ih,{COMPRESS_MAX_HEIGHT}),trunc(iw*{COMPRESS_MAX_HEIGHT}/ih/2)*2,iw)':"
        f"'if(gt(ih,{COMPRESS_MAX_HEIGHT}),{COMPRESS_MAX_HEIGHT},ih)'"
    )
    cmd = [
        ffmpeg, "-y", "-i", str(src),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", COMPRESS_PRESET,
        "-crf", COMPRESS_CRF,
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", COMPRESS_AUDIO_BITRATE,
        "-movflags", "+faststart",
        str(out_path),
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.warning(
                "ffmpeg compression failed for %s: %s", src.name,
                (stderr or b"").decode(errors="ignore")[-500:],
            )
            out_path.unlink(missing_ok=True)
            return src, original_size
    except Exception as e:
        logger.warning("ffmpeg compression exception for %s: %s", src.name, e)
        out_path.unlink(missing_ok=True)
        return src, original_size

    new_size = out_path.stat().st_size if out_path.exists() else 0
    if new_size <= 0 or new_size >= original_size:
        # Compression didn't help — keep original
        logger.info(
            "Compression skipped for %s (orig=%dB, new=%dB)",
            src.name, original_size, new_size,
        )
        out_path.unlink(missing_ok=True)
        return src, original_size

    # Replace source with compressed mp4. If source was a different extension,
    # remove the original (we only keep one canonical file per slot).
    if src != final_path:
        src.unlink(missing_ok=True)
    out_path.replace(final_path)
    logger.info(
        "Compressed %s: %.1fMB → %.1fMB (-%.0f%%)",
        final_path.name,
        original_size / (1024 * 1024),
        new_size / (1024 * 1024),
        (1 - new_size / original_size) * 100,
    )
    return final_path, new_size



async def _qc_video(session_id: str, domain_key: str, video_path: Path) -> dict:
    """
    Fast pre-analysis pass with Gemini Flash. Returns a quality assessment for the clip
    BEFORE we burn tokens on the heavy Gemini Pro analysis.

    Returns: {
        "quality_ok": bool,
        "child_visible": bool,
        "estimated_age_months": int | None,
        "issues": [string,...],   # reshoot guidance to surface to the parent
        "confidence": float,
    }
    """
    info = _domain_info(domain_key) or {"name": domain_key}
    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}-{domain_key}-qc",
            system_message=(
                "You are a paediatric video screening assistant. Your job is a quick quality-control gate before the "
                "main developmental analysis runs. Be strict but fair."
            ),
        )
        .with_model("gemini", "gemini-2.5-flash")
        .with_params(
            media_resolution="MEDIA_RESOLUTION_LOW",
            max_tokens=400,
            metadata={"session_id": session_id, "stage": f"qc:{domain_key}"},
        )
    )

    mime = "video/mp4"
    if video_path.suffix.lower() == ".webm":
        mime = "video/webm"
    elif video_path.suffix.lower() == ".mov":
        mime = "video/quicktime"
    video_file = FileContentWithMimeType(file_path=str(video_path), mime_type=mime)

    qc_prompt = (
        f"Review this short home video uploaded for the developmental domain: {info['name']}.\n"
        "Identify the CHILD as the youngest person in frame (toddler/preschool body proportions). "
        "Other adults or older siblings may be present — they are context only.\n\n"
        "Decide if the clip is good enough for AI developmental analysis. Return STRICT JSON only "
        "(no markdown) with these EXACT keys:\n"
        "{\n"
        '  "quality_ok": boolean,\n'
        '  "child_visible": boolean,\n'
        '  "estimated_age_months": integer 0-120 or null,\n'
        '  "issues": [short reshoot tips, e.g. "child off-frame in last 5s", "camera too close, full body not visible", "very low light"],\n'
        '  "confidence": float 0-1\n'
        "}\n\n"
        "Mark quality_ok=false if: the child is not visible for the majority of the clip, the clip is under 10 seconds, "
        "the framing is too tight to see body movements, lighting is severely poor, or the clip primarily shows adults. "
        "Otherwise quality_ok=true. Keep 'issues' to 1–3 short actionable tips."
    )

    try:
        msg = UserMessage(text=qc_prompt, file_contents=[video_file])
        _tok = _current_cost_stage.set(f"qc:{domain_key}")
        try:
            parsed, _raw, _q = await _send_and_parse_json(
                chat, msg,
                required_keys=["quality_ok", "child_visible", "confidence"],
                retry_hint=(
                    'Schema: {"quality_ok": bool, "child_visible": bool, '
                    '"estimated_age_months": int|null, "issues": [string], '
                    '"confidence": float 0-1}'
                ),
            )
        finally:
            _current_cost_stage.reset(_tok)
    except Exception as e:
        logger.warning(f"QC pass failed for {domain_key}: {e}")
        parsed = None

    if not parsed or not isinstance(parsed, dict):
        # Fail-open: assume the clip is OK so we don't penalise users on QC infra issues.
        return {
            "quality_ok": True,
            "child_visible": True,
            "estimated_age_months": None,
            "issues": [],
            "confidence": 0.4,
        }
    return {
        "quality_ok": bool(parsed.get("quality_ok", True)),
        "child_visible": bool(parsed.get("child_visible", True)),
        "estimated_age_months": parsed.get("estimated_age_months"),
        "issues": list(parsed.get("issues", []) or [])[:3],
        "confidence": float(parsed.get("confidence", 0.5) or 0.5),
    }


def _video_mime(video_path: Path) -> str:
    s = video_path.suffix.lower()
    if s == ".webm":
        return "video/webm"
    if s == ".mov":
        return "video/quicktime"
    return "video/mp4"


async def _analyze_video_cross_domain(
    session_id: str, source_domain_key: str, video_path: Path
) -> dict:
    """Analyse ONE video for ALL 8 domains in a single Gemini Flash call.

    Cost-optimised (Option A): uses gemini-2.5-flash with low-resolution video
    tokens and a capped output budget. The final synthesis pass still uses
    gemini-2.5-pro for higher-quality reasoning.

    Returns {"domain_observations": [...8 entries...], "challenging_behaviours_observed": [...]}
    where each observation has evidence_present, score, confidence, summary, etc.
    """
    src_info = _domain_info(source_domain_key) or {"name": source_domain_key}

    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}-{source_domain_key}-cross",
            system_message=(
                "You are a paediatric occupational therapist conducting AI-assisted developmental screening from short "
                "home videos. The video may contain adults (parents, caregivers, therapists) and other children — you "
                "MUST identify the youngest/primary CHILD as the subject and analyse ONLY that child. Track the same "
                "child across the whole clip and ignore the movements/gestures of every adult or older sibling."
            ),
        )
        .with_model("gemini", "gemini-2.5-flash")
        .with_params(
            media_resolution="MEDIA_RESOLUTION_LOW",
            max_tokens=2500,
            metadata={"session_id": session_id, "stage": f"analyze:{source_domain_key}"},
        )
    )

    video_file = FileContentWithMimeType(
        file_path=str(video_path), mime_type=_video_mime(video_path)
    )
    prompt = DOMAIN_PROMPT.format(source_domain_name=src_info["name"])

    msg = UserMessage(text=prompt, file_contents=[video_file])
    _tok = _current_cost_stage.set(f"analyze:{source_domain_key}")
    try:
        parsed, _raw, quality_flag = await _send_and_parse_json(
            chat, msg,
            required_keys=["domain_observations"],
            retry_hint=(
                'Schema: {"domain_observations": [ {"domain": <one of the 8 keys>, '
                '"evidence_present": bool, "score": int 0-100, "summary": string, '
                '"strengths": [string], "areas_of_support": [string], '
                '"hand_signals": [string], "action_signals": [string], '
                '"movement_quality": string, "confidence": float 0-1} ], '
                '"challenging_behaviours_observed": [string]}'
            ),
        )
    finally:
        _current_cost_stage.reset(_tok)
    parsed = parsed or {}

    raw_obs = parsed.get("domain_observations") or []
    by_key = {}
    for o in raw_obs:
        if isinstance(o, dict) and o.get("domain") in DOMAIN_KEYS:
            by_key[o["domain"]] = o

    # Ensure we always emit exactly 8 entries in canonical order
    normalised = []
    for d in DOMAINS:
        o = by_key.get(d["key"], {})
        normalised.append({
            "domain": d["key"],
            "name": d["name"],
            "evidence_present": bool(o.get("evidence_present", False)),
            "score": int(o.get("score") or 0),
            "summary": o.get("summary") or "No observable evidence in this clip",
            "strengths": list(o.get("strengths") or [])[:6],
            "areas_of_support": list(o.get("areas_of_support") or [])[:6],
            "hand_signals": list(o.get("hand_signals") or [])[:6],
            "action_signals": list(o.get("action_signals") or [])[:6],
            "movement_quality": o.get("movement_quality") or "",
            "confidence": float(o.get("confidence") or 0.0),
        })

    cb_signals = list(parsed.get("challenging_behaviours_observed") or [])[:6]
    return {
        "source_domain": source_domain_key,
        "source_domain_name": src_info["name"],
        "domain_observations": normalised,
        "challenging_behaviours_observed": cb_signals,
        "schema_flag": quality_flag,  # "ok" | "retry_ok" | "schema_failed"
    }


async def _analyze_challenging_behaviour_video(
    session_id: str, slot_key: str, video_path: Path
) -> dict:
    """Lightweight Gemini Flash pass for a flagged challenging-behaviour clip.

    Cost-optimised (Option A): uses gemini-2.5-flash with low-resolution video
    tokens and a capped output budget.
    """
    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}-{slot_key}-cb",
            system_message=(
                "You are a paediatric occupational therapist gently describing a flagged challenging-behaviour clip. "
                "Focus only on the child, never diagnose."
            ),
        )
        .with_model("gemini", "gemini-2.5-flash")
        .with_params(
            media_resolution="MEDIA_RESOLUTION_LOW",
            max_tokens=1200,
            metadata={"session_id": session_id, "stage": f"cb:{slot_key}"},
        )
    )

    video_file = FileContentWithMimeType(
        file_path=str(video_path), mime_type=_video_mime(video_path)
    )
    msg = UserMessage(text=CHALLENGING_BEHAVIOUR_PROMPT, file_contents=[video_file])
    _tok = _current_cost_stage.set(f"cb:{slot_key}")
    try:
        parsed, _raw, _q = await _send_and_parse_json(
            chat, msg,
            required_keys=["behaviour_type", "summary"],
            retry_hint=(
                'Schema: {"behaviour_type": string, "trigger": string, '
                '"duration_estimate_sec": int, "intensity": "mild|moderate|severe", '
                '"self_regulation_attempts": [string], "caregiver_response": string, '
                '"summary": string, "confidence": float 0-1}'
            ),
        )
    finally:
        _current_cost_stage.reset(_tok)
    parsed = parsed or {}
    return {
        "slot": slot_key,
        "behaviour_type": parsed.get("behaviour_type") or "unspecified",
        "trigger": parsed.get("trigger") or "",
        "duration_estimate_sec": int(parsed.get("duration_estimate_sec") or 0),
        "intensity": parsed.get("intensity") or "mild",
        "self_regulation_attempts": list(parsed.get("self_regulation_attempts") or [])[:5],
        "caregiver_response": parsed.get("caregiver_response") or "",
        "summary": parsed.get("summary") or "",
        "confidence": float(parsed.get("confidence") or 0.0),
    }


def _aggregate_per_domain(per_video_results: List[dict]) -> List[dict]:
    """Combine all per-video, cross-domain observations into one observation per domain.

    Each domain entry carries `source_videos: [{video_for, video_for_name, confidence}, ...]`
    so the report UI can show which uploaded video(s) contributed to that domain's score.

    If NO video had `evidence_present=true` for a domain, the entry is marked
    `insufficient_evidence: true` and the score is set to None.
    """
    final = []
    for d in DOMAINS:
        key = d["key"]
        contribs = []
        for pv in per_video_results:
            for o in pv.get("domain_observations", []):
                if o.get("domain") != key or not o.get("evidence_present"):
                    continue
                contribs.append({
                    "obs": o,
                    "source_domain": pv.get("source_domain"),
                    "source_domain_name": pv.get("source_domain_name"),
                })

        source_videos = [
            {
                "video_for": c["source_domain"],
                "video_for_name": c["source_domain_name"],
                "confidence": c["obs"].get("confidence", 0.0),
            }
            for c in contribs
        ]

        if not contribs:
            final.append({
                "domain": key,
                "name": d["name"],
                "insufficient_evidence": True,
                "score": None,
                "summary": "No video uploaded covered this domain clearly.",
                "strengths": [],
                "areas_of_support": [],
                "hand_signals": [],
                "action_signals": [],
                "movement_quality": "",
                "confidence": 0.0,
                "source_videos": [],
                "reshoot_needed": False,
            })
            continue

        # Weighted aggregate
        total_w = sum(max(c["obs"].get("confidence", 0.0), 0.05) for c in contribs)
        weighted_score = sum(
            (c["obs"].get("score") or 0) * max(c["obs"].get("confidence", 0.0), 0.05)
            for c in contribs
        ) / total_w
        # Pick the highest-confidence obs as the primary summary
        primary = max(contribs, key=lambda c: c["obs"].get("confidence", 0.0))["obs"]

        def merged(field):
            seen = []
            out = []
            for c in contribs:
                for v in (c["obs"].get(field) or []):
                    k = (v or "").strip().lower()
                    if k and k not in seen:
                        seen.append(k)
                        out.append(v)
            return out[:6]

        final.append({
            "domain": key,
            "name": d["name"],
            "insufficient_evidence": False,
            "score": int(round(weighted_score)),
            "summary": primary.get("summary", ""),
            "strengths": merged("strengths"),
            "areas_of_support": merged("areas_of_support"),
            "hand_signals": merged("hand_signals"),
            "action_signals": merged("action_signals"),
            "movement_quality": primary.get("movement_quality", ""),
            "confidence": round(
                sum(c["obs"].get("confidence", 0.0) for c in contribs) / len(contribs), 2
            ),
            "source_videos": source_videos,
            "reshoot_needed": False,
        })
    return final


def _safe_parse_json(text: str) -> Optional[dict]:
    if not text:
        return None
    t = text.strip()
    # strip fenced code blocks
    if t.startswith("```"):
        t = t.strip("`")
        # remove possible 'json' prefix
        if t.lower().startswith("json"):
            t = t[4:]
    # Try to find first '{' and last '}'
    try:
        start = t.find("{")
        end = t.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(t[start:end + 1])
    except Exception as e:
        logger.warning(f"JSON parse failed: {e}")
    try:
        return json.loads(t)
    except Exception:
        return None


async def _send_and_parse_json(
    chat: "LlmChat",
    msg: "UserMessage",
    *,
    required_keys: Optional[List[str]] = None,
    retry_hint: str = "",
) -> tuple[Optional[dict], str, str]:
    """Send `msg` to `chat`, parse JSON from the response. If parsing fails OR
    any `required_keys` are missing, send a follow-up correction prompt asking
    Gemini to return strict JSON matching the schema hint, and try once more.

    Returns ``(parsed_or_None, raw_response, quality_flag)`` where quality_flag
    is one of ``"ok"``, ``"retry_ok"``, or ``"schema_failed"``.
    """
    quality = "ok"
    try:
        response = await chat.send_message(msg)
    except Exception as e:  # noqa: BLE001
        logger.warning("LLM call failed: %s", e)
        return None, "", "schema_failed"

    text = response if isinstance(response, str) else str(response)
    parsed = _safe_parse_json(text)
    if _has_required(parsed, required_keys):
        return parsed, text, quality

    logger.info("LLM returned invalid/incomplete JSON — retrying with schema hint")
    quality = "retry_ok"
    correction = UserMessage(text=(
        "Your previous reply could not be parsed as strict JSON with the "
        "expected fields. Reply again with STRICT JSON only (no prose, no "
        "markdown, no code fences). "
        + (f"Ensure the response includes these top-level keys: {', '.join(required_keys)}. " if required_keys else "")
        + (retry_hint or "")
    ))
    try:
        response2 = await chat.send_message(correction)
    except Exception as e:  # noqa: BLE001
        logger.warning("LLM retry failed: %s", e)
        return None, text, "schema_failed"

    text2 = response2 if isinstance(response2, str) else str(response2)
    parsed2 = _safe_parse_json(text2)
    if _has_required(parsed2, required_keys):
        return parsed2, text2, quality
    return None, text2, "schema_failed"


def _has_required(parsed: Optional[dict], required_keys: Optional[List[str]]) -> bool:
    if not isinstance(parsed, dict):
        return False
    if not required_keys:
        return True
    return all(k in parsed for k in required_keys)


async def _generate_final_report(
    session_id: str,
    observations: List[dict],
    challenging_observations: Optional[List[dict]] = None,
    challenging_signals: Optional[List[str]] = None,
) -> dict:
    challenging_observations = challenging_observations or []
    challenging_signals = challenging_signals or []

    def _fmt_one(o: dict) -> str:
        if o.get("insufficient_evidence"):
            return (
                f"- Domain: {o['name']} (key: {o['domain']})\n"
                f"  INSUFFICIENT EVIDENCE — no uploaded video covered this domain clearly.\n"
            )
        src = ", ".join(
            f"{sv.get('video_for_name', sv.get('video_for'))} clip (conf {sv.get('confidence', 0):.2f})"
            for sv in (o.get("source_videos") or [])
        ) or "primary uploaded clip"
        return (
            f"- Domain: {o['name']} (key: {o['domain']})\n"
            f"  Observed in: {src}\n"
            f"  Score: {o.get('score', 0)}\n"
            f"  Summary: {o.get('summary','')}\n"
            f"  Strengths: {o.get('strengths', [])}\n"
            f"  Areas: {o.get('areas_of_support', [])}\n"
            f"  Movement quality: {o.get('movement_quality','')}\n"
            f"  Hand signals: {o.get('hand_signals', [])}\n"
            f"  Action signals: {o.get('action_signals', [])}\n"
            f"  Confidence: {o.get('confidence', 0)}"
        )

    domain_blob = "\n\n".join(_fmt_one(o) for o in observations)

    cb_blob = ""
    if challenging_observations:
        cb_blob = "\n\nCHALLENGING-BEHAVIOUR CLIPS (parent-flagged):\n" + "\n".join(
            f"- {c.get('behaviour_type', 'unspecified')} · intensity {c.get('intensity','')}"
            f" · trigger: {c.get('trigger','')}"
            f"\n  Summary: {c.get('summary','')}"
            f"\n  Self-regulation attempts: {c.get('self_regulation_attempts', [])}"
            for c in challenging_observations
        )
    if challenging_signals:
        cb_blob += (
            "\n\nINCIDENTAL CHALLENGING-BEHAVIOUR SIGNALS noticed during developmental analysis: "
            + ", ".join(challenging_signals)
        )
    if cb_blob:
        cb_blob += (
            "\n\nWhen writing the report, weave these challenging-behaviour observations into the "
            "'behaviour_summary', 'professional_recommendations' and 'home_program' where relevant, "
            "and add 'challenging_behaviours' as a short, calm, evidence-only paragraph if present."
        )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"{session_id}-final",
        system_message=(
            "You are a paediatric occupational therapist writing AI-assisted developmental screening reports. "
            "Every observation below is about a single child (adults in the source videos were excluded). Stay "
            "focused on that child throughout the report and never attribute observations to anyone else. "
            "Some domains may be marked 'INSUFFICIENT EVIDENCE' — for those, do NOT invent a score; instead, "
            "acknowledge briefly that we couldn't observe that domain in the uploaded clips and suggest a clip the "
            "parent could capture to fill the gap."
        )
    ).with_model("gemini", "gemini-2.5-pro").with_params(
        max_tokens=4000,
        metadata={"session_id": session_id, "stage": "synthesis"},
    )

    msg = UserMessage(text=FINAL_PROMPT.format(domain_blob=domain_blob) + cb_blob)
    _tok = _current_cost_stage.set("synthesis")
    try:
        response = await chat.send_message(msg)
    finally:
        _current_cost_stage.reset(_tok)
    text = response if isinstance(response, str) else str(response)

    parsed = _safe_parse_json(text)
    if not parsed:
        parsed = _fallback_report(observations)
    parsed = _ensure_full_report_shape(parsed, observations)
    return parsed


# ---- Defensive normalisation for LLM output ----

def _ensure_full_report_shape(report: dict, observations: List[dict]) -> dict:
    """Make sure the report always contains all 8 per-domain narratives + the
    new sections (behaviour_section, developmental_milestones, etc.) so the UI
    can render reliably even when the LLM omits a field."""
    report = dict(report or {})

    obs_by_key = {o.get("domain"): o for o in (observations or [])}

    # per_domain_narratives — must have exactly 8 entries
    provided = {n.get("domain"): n for n in (report.get("per_domain_narratives") or []) if isinstance(n, dict)}
    normalised = []
    for d in DOMAINS:
        key = d["key"]
        entry = provided.get(key) or {}
        obs = obs_by_key.get(key) or {}
        insufficient = bool(entry.get("insufficient_evidence")) or bool(obs.get("insufficient_evidence"))
        narrative = entry.get("narrative") or (
            f"No clear evidence for {d['name']} was visible in the uploaded clips. "
            "A short focused clip would let us screen this domain properly."
            if insufficient else
            (obs.get("summary") or "")
        )
        normalised.append({
            "domain": key,
            "name": d["name"],
            "narrative": narrative,
            "key_observations": list(entry.get("key_observations") or obs.get("strengths") or [])[:6],
            "next_steps": list(entry.get("next_steps") or [])[:5],
            "insufficient_evidence": insufficient,
            "filming_tip": entry.get("filming_tip") or (
                f"Record a 30-60s clip showing {d['observe']}." if insufficient else ""
            ),
            "score": None if insufficient else obs.get("score"),
        })
    report["per_domain_narratives"] = normalised

    # behaviour_section — guarantee shape
    bs = report.get("behaviour_section") or {}
    if not isinstance(bs, dict):
        bs = {}
    report["behaviour_section"] = {
        "summary": bs.get("summary") or report.get("behaviour_summary") or "",
        "regulation_strengths": list(bs.get("regulation_strengths") or [])[:6],
        "regulation_challenges": list(bs.get("regulation_challenges") or [])[:6],
        "triggers": list(bs.get("triggers") or [])[:6],
        "coping_strategies_observed": list(bs.get("coping_strategies_observed") or [])[:6],
        "caregiver_response": bs.get("caregiver_response") or "",
        "parent_suggestions": list(bs.get("parent_suggestions") or [])[:6],
    }

    # developmental_milestones
    dm = report.get("developmental_milestones") or {}
    if not isinstance(dm, dict):
        dm = {}
    report["developmental_milestones"] = {
        "achieved": list(dm.get("achieved") or [])[:8],
        "emerging": list(dm.get("emerging") or [])[:8],
        "next_to_watch_for": list(dm.get("next_to_watch_for") or [])[:8],
    }

    # Misc safety
    report.setdefault("age_context", "")
    report.setdefault("parent_tips", [])
    report["parent_tips"] = list(report.get("parent_tips") or [])[:8]

    # recommended_activities — make sure each has the new why_it_helps key
    acts = []
    for a in (report.get("recommended_activities") or []):
        if not isinstance(a, dict):
            continue
        acts.append({
            "title": a.get("title", ""),
            "domain": a.get("domain", ""),
            "duration": a.get("duration", ""),
            "description": a.get("description", ""),
            "why_it_helps": a.get("why_it_helps", ""),
        })
    report["recommended_activities"] = acts

    return report


def _fallback_report(observations: List[dict]) -> dict:
    """Used if AI fails to return valid JSON."""
    scored = [o.get("score") for o in observations if o.get("score") is not None]
    overall = int(sum(scored) / len(scored)) if scored else 60
    return {
        "overall_score": overall,
        "overall_summary": "Your child shows a balanced developmental profile with areas of strength and growth.",
        "age_context": "Observations are framed against typical age-range expectations; precise comparison requires date of birth.",
        "strengths": ["Engages naturally with everyday play", "Responds to familiar routines"],
        "areas_needing_support": ["Sustained attention during structured tasks", "Emotional regulation transitions"],
        "risk_indicators": [],
        "confidence": 0.55,
        "motor_summary": "Overall motor patterns are emerging with balanced posture and developing fine-motor precision.",
        "behaviour_summary": "Attention and emotional flexibility appear age-appropriate with room to grow.",
        "communication_summary": "Engages socially with familiar adults and uses gestures alongside words.",
        "sensory_summary": "Sensory responses appear typical across tactile, movement and auditory channels.",
        "behaviour_section": {
            "summary": "Behaviour and self-regulation appear age-appropriate in the clips provided. Your child engages with activities and adults around them in a typical way.",
            "regulation_strengths": ["Stays engaged with chosen activities", "Responds to familiar caregiver voice"],
            "regulation_challenges": ["Transitions between activities", "Frustration tolerance during harder tasks"],
            "triggers": ["Unexpected change of activity", "Tasks that demand new motor planning"],
            "coping_strategies_observed": ["Seeks adult proximity", "Pauses to refocus"],
            "caregiver_response": "Caregivers respond with warm prompts and offer gentle scaffolding.",
            "parent_suggestions": [
                "Give a 1-minute warning before transitions",
                "Pair instructions with a visual or gesture",
                "Celebrate small efforts out loud",
            ],
        },
        "developmental_milestones": {
            "achieved": ["Walks confidently on level ground", "Uses simple gestures to communicate", "Engages in short pretend play"],
            "emerging": ["Sharing & turn-taking with peers", "Following 2-step instructions"],
            "next_to_watch_for": ["Drawing simple shapes", "Naming most familiar objects"],
        },
        "parent_tips": [
            "Narrate everyday actions to expand vocabulary",
            "Play floor-time at the child's own pace for 10 minutes daily",
            "Repeat favourite stories — repetition builds memory & language",
        ],
        "recommended_activities": [
            {"title": "Belly breathing game", "domain": "emotion", "duration": "3 min",
             "description": "Practice slow belly breathing using a soft toy on the tummy.",
             "why_it_helps": "Builds early self-regulation."},
            {"title": "Animal action cards", "domain": "gross_motor", "duration": "5 min",
             "description": "Imitate animal movements to build coordination and play.",
             "why_it_helps": "Improves gross-motor planning and imitation."},
            {"title": "Bead threading", "domain": "fine_motor", "duration": "6 min",
             "description": "Thread large beads to build precision and bilateral coordination.",
             "why_it_helps": "Strengthens pincer grasp and visual-motor coordination."},
            {"title": "Simon Says", "domain": "attention", "duration": "5 min",
             "description": "Builds listening and self regulation through fun instructions.",
             "why_it_helps": "Strengthens auditory attention and inhibition."},
            {"title": "Texture box", "domain": "sensory", "duration": "5 min",
             "description": "Explore varied textures gently to support sensory processing.",
             "why_it_helps": "Supports tactile discrimination."},
            {"title": "Story time turns", "domain": "social", "duration": "7 min",
             "description": "Take turns telling parts of a story to build communication.",
             "why_it_helps": "Builds joint attention and turn-taking."},
            {"title": "Self-dressing relay", "domain": "daily_living", "duration": "5 min",
             "description": "Time short self-dressing tasks playfully.",
             "why_it_helps": "Builds independence in daily routines."},
            {"title": "Sorting buckets", "domain": "learning_play", "duration": "6 min",
             "description": "Sort toys by colour, shape or size into buckets.",
             "why_it_helps": "Develops categorisation & problem solving."},
        ],
        "home_program": [
            "Use a visual schedule for daily transitions",
            "Pair instructions with gentle gestures",
            "Allow extra response time during conversations",
            "Build small routines around fine motor play",
            "Celebrate effort, not just outcomes",
            "Read together for 10 minutes a day",
        ],
        "professional_recommendations": [
            "Consider a paediatric occupational therapy consult for personalised goals.",
            "Share this AI screening with your child's healthcare team.",
            "Repeat the screening every 30 days to track patterns over time.",
        ],
    }


async def _run_analysis(session_id: str):
    """Background task: analyze uploaded videos, persist report, delete files.

    New cross-domain pipeline:
      - For each uploaded developmental-domain video, run a single Gemini Pro call that
        scores ALL 8 domains, then aggregate observations across videos. A clip uploaded
        for "attention" can therefore also score gross_motor, social, etc. if the child
        clearly demonstrates those signals on the same clip.
      - Domains with NO supporting evidence from any uploaded video are returned with
        insufficient_evidence=true so the report can render "xyz for --- section".
      - Optional 1-2 challenging-behaviour videos are summarised separately and folded
        into the overall report.
    """
    sess = await db.assessment_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not sess:
        await _set_status(session_id, state="error", progress=0, step="missing session", error="Session not found")
        return

    uploaded = sess.get("uploaded", {})  # {domain: filename}
    if not uploaded:
        await _set_status(session_id, state="error", progress=0, step="no videos", error="No videos uploaded")
        return

    # Split developmental-domain uploads from challenging-behaviour uploads
    dev_uploads = {k: v for k, v in uploaded.items() if k in DOMAIN_KEYS}
    cb_uploads = {k: v for k, v in uploaded.items() if k.startswith("challenging_")}

    # Filter out entries whose file is no longer on disk (e.g. /tmp was cleared
    # between upload and analyse). Report them as reshoot prompts so the UI can
    # ask for a re-upload, and drop them from the DB so this session doesn't
    # loop on the same ghost forever.
    missing_files: List[str] = []
    for _dict in (dev_uploads, cb_uploads):
        for k in list(_dict.keys()):
            fp = _session_dir(session_id) / _dict[k]
            if not fp.exists():
                missing_files.append(k)
                _dict.pop(k, None)
    if missing_files:
        logger.warning(
            "Analysis: %d uploaded slot(s) had missing files on disk: %s",
            len(missing_files), missing_files,
        )
        await db.assessment_sessions.update_one(
            {"session_id": session_id},
            {"$unset": {f"uploaded.{k}": "" for k in missing_files}},
        )
    if not dev_uploads and not cb_uploads:
        await _set_status(
            session_id, state="error", progress=0, step="no videos",
            error=(
                "The uploaded videos are no longer available on the server "
                "(this can happen after a long delay between upload and analyse). "
                "Please upload them again."
            ),
        )
        return

    # Attribute all downstream Gemini calls to this session for cost telemetry.
    _tok_s = _current_cost_session.set(session_id)
    _tok_g = _current_cost_stage.set("pipeline")
    try:
        per_video_results: List[dict] = []
        reshoot_prompts: List[dict] = []
        challenging_observations: List[dict] = []
        total_steps = max(len(dev_uploads) + len(cb_uploads), 1)

        # Cap concurrent Gemini calls — keeps latency low while respecting rate limits.
        gem_sem = asyncio.Semaphore(3)
        completed = 0
        completed_lock = asyncio.Lock()
        # Running list of per-video results for progressive reveal in the UI.
        live_results: List[dict] = []
        live_lock = asyncio.Lock()

        async def _report_progress(step_desc: str, new_result: Optional[dict] = None) -> None:
            nonlocal completed
            async with completed_lock:
                completed += 1
                pct = int(10 + (completed / total_steps) * 70)
            partial_obs = None
            if new_result is not None:
                async with live_lock:
                    live_results.append(new_result)
                    # Re-aggregate against everything completed so far.
                    partial_obs = _aggregate_per_domain(list(live_results))
            await _set_status(
                session_id, state="analyzing",
                progress=pct, step=step_desc,
                uploaded_domains=list(uploaded.keys()),
                partial_observations=partial_obs,
            )

        # --- Developmental-domain videos (parallel cross-domain analysis) ---
        async def _process_dev(domain_key: str, filename: str) -> dict:
            try:
                async with gem_sem:
                    video_path = _session_dir(session_id) / filename
                    if not video_path.exists():
                        raise FileNotFoundError(str(video_path))
                    qc = await _qc_video(session_id, domain_key, video_path)
                    out = {"qc": qc, "domain_key": domain_key}
                    if qc.get("issues"):
                        out["reshoot"] = {"domain": domain_key, **qc}
                    if not qc.get("quality_ok"):
                        out["result"] = {
                            "source_domain": domain_key,
                            "source_domain_name": (_domain_info(domain_key) or {}).get("name", domain_key),
                            "domain_observations": [],
                            "challenging_behaviours_observed": [],
                            "qc_failed": True,
                            "qc_reason": (qc.get("issues") or ["Video not suitable for AI screening."])[0],
                        }
                    else:
                        r = await _analyze_video_cross_domain(session_id, domain_key, video_path)
                        if qc.get("estimated_age_months") is not None:
                            r["estimated_age_months"] = qc["estimated_age_months"]
                        out["result"] = r
            except FileNotFoundError as e:
                logger.warning(
                    "Analysis: file missing for %s (%s) — skipping.", domain_key, e,
                )
                out = {
                    "domain_key": domain_key,
                    "reshoot": {
                        "domain": domain_key,
                        "issues": [
                            "Video file went missing before analysis. Please upload it again."
                        ],
                        "quality_ok": False,
                        "confidence": 0.0,
                    },
                    "result": {
                        "source_domain": domain_key,
                        "source_domain_name": (_domain_info(domain_key) or {}).get("name", domain_key),
                        "domain_observations": [],
                        "challenging_behaviours_observed": [],
                        "qc_failed": True,
                        "qc_reason": "Video file went missing before analysis. Please upload it again.",
                    },
                }
            except Exception as e:
                logger.exception("Cross-domain analysis failed for %s: %s", domain_key, e)
                out = {
                    "domain_key": domain_key,
                    "result": {
                        "source_domain": domain_key,
                        "source_domain_name": (_domain_info(domain_key) or {}).get("name", domain_key),
                        "domain_observations": [],
                        "challenging_behaviours_observed": [],
                        "schema_flag": "schema_failed",
                    },
                }
            await _report_progress(
                f"Analysed {(_domain_info(domain_key) or {}).get('name', domain_key)}",
                new_result=out["result"],
            )
            return out

        async def _process_cb(slot_key: str, filename: str) -> Optional[dict]:
            try:
                async with gem_sem:
                    video_path = _session_dir(session_id) / filename
                    if not video_path.exists():
                        raise FileNotFoundError(str(video_path))
                    cb = await _analyze_challenging_behaviour_video(session_id, slot_key, video_path)
                    await _report_progress("Reviewed challenging-behaviour clip")
                    return cb
            except FileNotFoundError as e:
                logger.warning("Analysis: CB file missing for %s (%s) — skipping.", slot_key, e)
                await _report_progress("Skipped a missing CB clip")
                return None
            except Exception as e:
                logger.exception("Challenging-behaviour analysis failed for %s: %s", slot_key, e)
                await _report_progress("Skipped one CB clip")
                return None

        dev_tasks = [_process_dev(k, v) for k, v in dev_uploads.items()]
        cb_tasks = [_process_cb(k, v) for k, v in cb_uploads.items()]

        # Kick off everything — each task handles its own exceptions so a single
        # bad clip cannot abort the whole batch.
        dev_outputs = await asyncio.gather(*dev_tasks) if dev_tasks else []
        cb_outputs = await asyncio.gather(*cb_tasks) if cb_tasks else []

        # Fold results back into the sequential-style lists the aggregator expects
        for o in dev_outputs:
            if o.get("reshoot"):
                reshoot_prompts.append(o["reshoot"])
            per_video_results.append(o["result"])
        challenging_observations = [c for c in cb_outputs if c]

        # --- Aggregate per-domain observations across all uploaded videos ---
        observations = _aggregate_per_domain(per_video_results)

        # Persist the per-video observations so we can merge in a re-upload
        # from the report page ("reanalyze-domain") without losing history.
        await db.assessment_per_video.update_one(
            {"session_id": session_id},
            {"$set": {
                "session_id": session_id,
                "per_video_results": per_video_results,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

        # Collect cross-domain CB signals mentioned during the developmental analysis
        cb_signals_from_dev = []
        for pv in per_video_results:
            cb_signals_from_dev.extend(pv.get("challenging_behaviours_observed", []))
        # dedupe (case-insensitive)
        seen = set()
        cb_signals_dedup = []
        for s in cb_signals_from_dev:
            k = (s or "").strip().lower()
            if k and k not in seen:
                seen.add(k)
                cb_signals_dedup.append(s)

        await _set_status(session_id, state="analyzing", progress=90, step="Generating parent-friendly detailed report",
                          uploaded_domains=list(uploaded.keys()))

        # Any per-video analysis that fell through both parse + retry counts as
        # "low_confidence" so the UI can surface a soft warning next to scores.
        schema_failed_videos = [
            (pv.get("source_domain") or "?")
            for pv in per_video_results
            if pv.get("schema_flag") == "schema_failed"
        ]
        low_confidence = bool(schema_failed_videos)

        report_payload = await _generate_final_report(
            session_id, observations,
            challenging_observations=challenging_observations,
            challenging_signals=cb_signals_dedup,
        )
        report = {
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "domains": observations,
            "reshoot_prompts": reshoot_prompts,
            "uploaded_domains": list(dev_uploads.keys()),
            "low_confidence": low_confidence,
            "low_confidence_videos": schema_failed_videos,
            "challenging_behaviours": {
                "videos_uploaded": len(cb_uploads),
                "observations": challenging_observations,
                "incidental_signals": cb_signals_dedup,
            },
            **report_payload,
            "disclaimer": (
                "This AI-assisted developmental screening is for educational and screening purposes only. "
                "It is not a clinical diagnosis and does not replace evaluation by a qualified paediatric "
                "healthcare professional."
            ),
        }

        # Give any in-flight LiteLLM async callbacks (final synthesis in
        # particular) a chance to flush into _session_usage before we snapshot.
        await asyncio.sleep(0.5)

        # ---- Embed cost telemetry into the report ----
        usage_snapshot = _session_usage.get(session_id) or {}
        report["usage"] = {
            "total_input_tokens": usage_snapshot.get("total_input_tokens", 0),
            "total_output_tokens": usage_snapshot.get("total_output_tokens", 0),
            "total_cost_usd": round(usage_snapshot.get("total_cost_usd", 0.0), 4),
            "calls": len(usage_snapshot.get("calls", [])),
        }

        await db.assessment_reports.update_one(
            {"session_id": session_id},
            {"$set": report},
            upsert=True,
        )

        await _persist_session_usage(session_id)

        await _set_status(session_id, state="complete", progress=100, step="Report ready",
                          uploaded_domains=list(uploaded.keys()))

        # Auto-delete videos
        _safe_delete_session_dir(session_id)
        await db.assessment_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"videos_deleted_at": datetime.now(timezone.utc).isoformat(), "uploaded": {}}},
        )

    except Exception as e:
        logger.exception(f"Analysis pipeline failed: {e}")
        await _set_status(session_id, state="error", progress=0, step="error", error=str(e))
        # Persist whatever partial usage we recorded, then purge the videos —
        # a failed session must not leak PII beyond the TTL sweeper's window.
        try:
            await _persist_session_usage(session_id)
        except Exception:
            pass
        try:
            _safe_delete_session_dir(session_id)
            await db.assessment_sessions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "videos_deleted_at": datetime.now(timezone.utc).isoformat(),
                    "videos_deleted_by": "analysis_error",
                    "uploaded": {},
                }},
            )
        except Exception:
            pass
    finally:
        try:
            _current_cost_session.reset(_tok_s)
            _current_cost_stage.reset(_tok_g)
        except Exception:
            pass
        # Free the in-memory buffer after persistence
        _session_usage.pop(session_id, None)


# -------------------- Routes --------------------

@api_router.get("/")
async def root():
    return {"message": "Kiddo+ Video Assessment API"}


@api_router.get("/video-assessment/domains")
async def list_domains():
    return {"domains": DOMAINS}


@api_router.post("/video-assessment/sessions", response_model=SessionCreateOut)
async def create_session(body: Optional[SessionCreateIn] = None):
    body = body or SessionCreateIn()
    session_id = str(uuid.uuid4())
    parent_id = body.parent_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Validate referral code if provided (non-fatal — we still create the session)
    referral_clinic = None
    if body.referral_code:
        ref = await db.referral_codes.find_one({"code": body.referral_code.upper()}, {"_id": 0})
        if ref:
            referral_clinic = ref.get("clinic_name")

    doc = {
        "session_id": session_id,
        "parent_id": parent_id,
        "created_at": now,
        "uploaded": {},
        "uploaded_at": None,
    }
    if body.child_name:
        doc["child_name"] = body.child_name
    if body.child_dob:
        doc["child_dob"] = body.child_dob
    if body.referral_code:
        doc["referral_code"] = body.referral_code.upper()
        doc["referral_clinic"] = referral_clinic

    await db.assessment_sessions.insert_one(doc)
    await _set_status(session_id, state="pending", progress=0, step="Awaiting uploads", uploaded_domains=[])
    return SessionCreateOut(
        session_id=session_id,
        created_at=now,
        parent_id=parent_id,
        referral_clinic=referral_clinic,
    )


CHALLENGING_KEYS = {"challenging_1", "challenging_2"}
ALLOWED_UPLOAD_KEYS = DOMAIN_KEYS | CHALLENGING_KEYS


@api_router.post("/video-assessment/sessions/{session_id}/upload", response_model=UploadOut)
async def upload_video(session_id: str, domain: str = Form(...), file: UploadFile = File(...)):
    sess = await db.assessment_sessions.find_one({"session_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    if domain not in ALLOWED_UPLOAD_KEYS:
        raise HTTPException(status_code=400, detail=f"Unknown domain: {domain}")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported format. Allowed: {', '.join(ALLOWED_EXTS)}")

    # Stream to disk while enforcing size limit
    dest = _session_dir(session_id) / f"{domain}{ext}"
    size = 0
    with open(dest, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_VIDEO_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"Video exceeds {MAX_VIDEO_MB} MB limit",
                )
            out.write(chunk)

    # Heavy compression (H.264 CRF) before downstream processing — preserves
    # perceived visual quality while shrinking file size significantly.
    final_path, final_size = await _compress_video(dest)

    update_fields = {f"uploaded.{domain}": final_path.name}
    if not sess.get("uploaded_at"):
        update_fields["uploaded_at"] = datetime.now(timezone.utc).isoformat()
    await db.assessment_sessions.update_one(
        {"session_id": session_id},
        {"$set": update_fields}
    )

    sess2 = await db.assessment_sessions.find_one({"session_id": session_id})
    await _set_status(
        session_id, state="pending", progress=5, step="Videos uploaded",
        uploaded_domains=list((sess2.get("uploaded") or {}).keys()),
    )

    return UploadOut(
        session_id=session_id,
        domain=domain,
        filename=final_path.name,
        size_bytes=final_size,
    )


@api_router.delete("/video-assessment/sessions/{session_id}/upload/{domain}")
async def delete_upload(session_id: str, domain: str):
    sess = await db.assessment_sessions.find_one({"session_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    uploaded = sess.get("uploaded", {}) or {}
    fname = uploaded.get(domain)
    if fname:
        p = _session_dir(session_id) / fname
        p.unlink(missing_ok=True)
    await db.assessment_sessions.update_one(
        {"session_id": session_id},
        {"$unset": {f"uploaded.{domain}": ""}}
    )
    sess2 = await db.assessment_sessions.find_one({"session_id": session_id})
    await _set_status(
        session_id, state="pending", progress=0, step="Awaiting uploads",
        uploaded_domains=list((sess2.get("uploaded") or {}).keys()),
    )
    return {"ok": True}


@api_router.post("/video-assessment/sessions/{session_id}/analyze")
async def start_analysis(session_id: str, background_tasks: BackgroundTasks):
    sess = await db.assessment_sessions.find_one({"session_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    uploaded = sess.get("uploaded", {}) or {}
    if not uploaded:
        raise HTTPException(status_code=400, detail="Please upload at least one video before analysing")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    await _set_status(session_id, state="analyzing", progress=5, step="Starting pipeline",
                      uploaded_domains=list(uploaded.keys()))
    background_tasks.add_task(_run_analysis, session_id)
    return {"session_id": session_id, "state": "analyzing"}


@api_router.get("/video-assessment/sessions/{session_id}/status", response_model=StatusOut)
async def get_status(session_id: str):
    s = await _get_status(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return StatusOut(
        session_id=session_id,
        state=s.get("state", "pending"),
        progress=int(s.get("progress", 0)),
        step=s.get("step", ""),
        uploaded_domains=s.get("uploaded_domains", []) or [],
        error=s.get("error"),
        partial_observations=s.get("partial_observations"),
    )


def _status_signature(s: Optional[dict]) -> tuple:
    """Compact fingerprint of a status doc used to detect changes for the
    WebSocket streamer. `partial_observations` is fingerprinted by the
    number of domains where `evidence_present=True` so we push a new event
    every time a new domain result arrives during progressive analysis."""
    if not s:
        return ("none",)
    partial = s.get("partial_observations") or []
    evidence_count = 0
    for o in partial:
        if isinstance(o, dict) and o.get("evidence_present"):
            evidence_count += 1
    return (
        s.get("state") or "",
        int(s.get("progress") or 0),
        s.get("step") or "",
        tuple(sorted(s.get("uploaded_domains") or [])),
        evidence_count,
    )


def _status_event(session_id: str, s: dict) -> dict:
    """Shape the status payload for a WS 'status' event — mirrors StatusOut."""
    return {
        "type": "status",
        "session_id": session_id,
        "state": s.get("state", "pending"),
        "progress": int(s.get("progress", 0)),
        "step": s.get("step", ""),
        "uploaded_domains": s.get("uploaded_domains", []) or [],
        "error": s.get("error"),
        "partial_observations": s.get("partial_observations"),
    }


@api_router.websocket("/video-assessment/sessions/{session_id}/stream")
async def stream_analysis(websocket: WebSocket, session_id: str):
    """Progressive analysis stream over WebSocket.

    Emits:
      - {type:"status", ...}          on every state / progress / partial-obs change
      - {type:"complete", report:...} once the report is written (channel closes after)
      - {type:"error", error:"..."}   if the pipeline fails

    Reads from `assessment_status` in Mongo (polled every ~300ms). This is
    intentionally simple — no change streams / no in-process pub-sub — so it
    survives backend hot-reload cleanly and works with the async worker model.
    """
    await websocket.accept()
    poll_interval_sec = 0.3
    # Hard cap so a stuck / crashed pipeline doesn't hold the socket forever.
    max_lifetime_sec = 15 * 60
    started = time.time()
    last_sig: Optional[tuple] = None
    try:
        while True:
            if time.time() - started > max_lifetime_sec:
                await websocket.send_json({
                    "type": "error",
                    "error": "Stream timed out after 15 minutes",
                })
                break

            s = await _get_status(session_id)
            if not s:
                # Session doesn't exist yet — wait briefly and check again;
                # this handles the client connecting the moment /analyze fires.
                await asyncio.sleep(poll_interval_sec)
                continue

            sig = _status_signature(s)
            if sig != last_sig:
                await websocket.send_json(_status_event(session_id, s))
                last_sig = sig

            state = s.get("state")
            if state == "complete":
                report = await db.assessment_reports.find_one(
                    {"session_id": session_id}, {"_id": 0}
                )
                await websocket.send_json({
                    "type": "complete",
                    "session_id": session_id,
                    "report": report,
                })
                break
            if state == "error":
                await websocket.send_json({
                    "type": "error",
                    "session_id": session_id,
                    "error": s.get("error") or "Analysis failed",
                })
                break

            await asyncio.sleep(poll_interval_sec)
    except WebSocketDisconnect:
        # Client hung up — nothing to do.
        return
    except Exception as e:
        logger.warning(f"Analysis stream failed for {session_id}: {e}")
        try:
            await websocket.send_json({"type": "error", "error": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@api_router.post("/video-assessment/sessions/{session_id}/reanalyze-domain")
async def reanalyze_domain(
    session_id: str,
    domain: str = Form(...),
    file: UploadFile = File(...),
):
    """Accept a fresh video for a specific domain that was insufficient / qc-failed /
    low-confidence, run the full QC + cross-domain analysis on it, and merge the
    result into the existing report by replacing that domain's prior contribution
    and re-aggregating."""
    if domain not in DOMAIN_KEYS:
        raise HTTPException(status_code=400, detail=f"Unknown domain: {domain}")
    sess = await db.assessment_sessions.find_one({"session_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    existing_report = await db.assessment_reports.find_one({"session_id": session_id}, {"_id": 0})
    if not existing_report:
        raise HTTPException(status_code=404, detail="Report not found — analyze first")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    # Validate + stream upload to disk (same shape as normal upload)
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported format. Allowed: {', '.join(ALLOWED_EXTS)}")
    dest = _session_dir(session_id) / f"reanalyze_{domain}{ext}"
    size = 0
    with open(dest, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_VIDEO_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"Video exceeds {MAX_VIDEO_MB} MB limit")
            out.write(chunk)

    final_path, _sz = await _compress_video(dest)

    # QC + cross-domain analysis on just this clip
    qc = await _qc_video(session_id, domain, final_path)
    if not qc.get("quality_ok"):
        final_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail={
            "message": "This clip still isn't scorable — please try another.",
            "issues": qc.get("issues") or [],
        })

    new_result = await _analyze_video_cross_domain(session_id, domain, final_path)
    if qc.get("estimated_age_months") is not None:
        new_result["estimated_age_months"] = qc["estimated_age_months"]

    # Merge with stored per-video results (replace prior entry for same source_domain)
    pv_doc = await db.assessment_per_video.find_one({"session_id": session_id}, {"_id": 0})
    prior_results = (pv_doc or {}).get("per_video_results", [])
    merged = [r for r in prior_results if r.get("source_domain") != domain]
    merged.append(new_result)

    # Re-aggregate the whole thing so cross-domain signals from the new video
    # also update any other domains this clip happens to demonstrate.
    new_observations = _aggregate_per_domain(merged)

    # Refresh low_confidence flag based on the merged history
    schema_failed_videos = [
        (pv.get("source_domain") or "?")
        for pv in merged
        if pv.get("schema_flag") == "schema_failed"
    ]
    update = {
        "domains": new_observations,
        "low_confidence": bool(schema_failed_videos),
        "low_confidence_videos": schema_failed_videos,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.assessment_reports.update_one({"session_id": session_id}, {"$set": update})
    await db.assessment_per_video.update_one(
        {"session_id": session_id},
        {"$set": {"per_video_results": merged, "updated_at": update["updated_at"]}},
        upsert=True,
    )
    # Video was analysed — delete immediately per privacy policy
    final_path.unlink(missing_ok=True)

    # Re-run the Gemini Pro final synthesis so the narrative sections
    # (overall_summary, strengths, professional_recommendations, home_program,
    # behaviour_summary, challenging_behaviours) stay in sync with the newly
    # merged per-domain scores. If synthesis fails we keep the stale narrative
    # rather than block the numeric update the user already sees.
    cb_after = (
        await db.assessment_reports.find_one({"session_id": session_id}, {"_id": 0})
    ) or {}
    cb_block = cb_after.get("challenging_behaviours") or {}
    challenging_observations = cb_block.get("observations") or []
    challenging_signals = cb_block.get("incidental_signals") or []
    synthesis_stale = False
    try:
        report_payload = await _generate_final_report(
            session_id,
            new_observations,
            challenging_observations=challenging_observations,
            challenging_signals=challenging_signals,
        )
        synth_update = {
            **report_payload,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        # Preserve the freshly aggregated domain scores + low-confidence flags
        # that we just wrote; _generate_final_report doesn't touch these fields
        # but be defensive in case its schema evolves.
        synth_update.pop("domains", None)
        synth_update.pop("low_confidence", None)
        synth_update.pop("low_confidence_videos", None)
        await db.assessment_reports.update_one(
            {"session_id": session_id}, {"$set": synth_update}
        )
    except Exception as e:
        synthesis_stale = True
        logger.warning(
            "Re-synthesis after reanalyze-domain failed for session %s: %s",
            session_id, e,
        )

    refreshed = await db.assessment_reports.find_one({"session_id": session_id}, {"_id": 0})
    return {
        "ok": True,
        "domain": domain,
        "report": refreshed,
        "synthesis_stale": synthesis_stale,
    }


@api_router.post("/video-assessment/sessions/{session_id}/retry-analysis")
async def retry_analysis(session_id: str):
    """Re-run the final report combiner using the aggregated observations
    already stored in the database. Useful when the previous run ended with
    a zero score because the final LLM call produced invalid JSON — the
    per-video observations are still valid and don't require re-uploads."""
    existing_report = await db.assessment_reports.find_one({"session_id": session_id}, {"_id": 0})
    if not existing_report:
        raise HTTPException(status_code=404, detail="Report not found — analyze first")
    observations = existing_report.get("domains") or []
    if not observations:
        raise HTTPException(status_code=400, detail="No observations to retry against — please upload clips first")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    cb = existing_report.get("challenging_behaviours") or {}
    challenging_observations = cb.get("observations") or []
    challenging_signals = cb.get("incidental_signals") or []

    try:
        report_payload = await _generate_final_report(
            session_id, observations,
            challenging_observations=challenging_observations,
            challenging_signals=challenging_signals,
        )
    except Exception as e:
        logger.exception("Retry final-report generation failed: %s", e)
        raise HTTPException(status_code=502, detail="Retry failed — the AI is unavailable, please try again in a moment")

    # Merge the fresh combiner output back into the report; keep domains,
    # reshoot prompts, and low-confidence flags unchanged.
    update = {
        **report_payload,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.assessment_reports.update_one({"session_id": session_id}, {"$set": update})
    refreshed = await db.assessment_reports.find_one({"session_id": session_id}, {"_id": 0})
    return {"ok": True, "report": refreshed}


@api_router.get("/video-assessment/sessions/{session_id}/report")
async def get_report(session_id: str):
    r = await db.assessment_reports.find_one({"session_id": session_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return r


@api_router.get("/video-assessment/sessions/{session_id}/usage")
async def get_session_usage(session_id: str):
    """Return LLM token usage & USD cost for a session (both persisted record
    and in-memory buffer if the pipeline is still running)."""
    doc = await db.assessment_usage.find_one({"session_id": session_id}, {"_id": 0})
    if doc:
        return doc
    live = _session_usage.get(session_id)
    if live:
        return {
            "session_id": session_id,
            "in_progress": True,
            "calls": live.get("calls", []),
            "total_input_tokens": live.get("total_input_tokens", 0),
            "total_output_tokens": live.get("total_output_tokens", 0),
            "total_cost_usd": round(live.get("total_cost_usd", 0.0), 6),
        }
    raise HTTPException(status_code=404, detail="No usage record for this session")


@api_router.get("/video-assessment/demo-report")
async def demo_report():
    """A sample report used to power the report preview UI without uploading anything."""
    return {
        "session_id": "demo",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "overall_score": 82,
        "overall_summary": (
            "Pista shows strong fine-motor coordination and warm social engagement. Attention to structured "
            "tasks and emotional transitions are emerging areas of growth."
        ),
        "strengths": [
            "Warm eye contact during interaction",
            "Confident gross motor coordination",
            "Strong bilateral hand use during play",
        ],
        "areas_needing_support": [
            "Sustaining attention for 5+ minutes",
            "Smooth transitions between activities",
            "Self regulation during frustration",
        ],
        "risk_indicators": [],
        "confidence": 0.86,
        "motor_summary": "Gross and fine motor patterns are coordinated for age. Hand-tracking shows a developing pincer grasp with strong bilateral coordination during stacking and drawing.",
        "behaviour_summary": "Attention sustains for short structured tasks. Transitions between activities remain an area of growth.",
        "communication_summary": "Joint attention, gestures and shared turn-taking are emerging consistently across play.",
        "sensory_summary": "Sensory responses are within typical range with mild tactile seeking during play.",
        "domains": [
            {
                "domain": d["key"], "name": d["name"], "score": s,
                "summary": "", "strengths": [], "areas_of_support": [],
                "confidence": 0.8,
                "hand_signals": h, "action_signals": a, "movement_quality": mq,
            }
            for d, s, h, a, mq in zip(
                DOMAINS,
                [64, 58, 71, 78, 86, 82, 74, 80],
                [["pincer grasp", "bilateral use"], ["calm hands"], ["tactile seeking"], ["pointing gestures"],
                 ["balanced gait"], ["pincer grasp", "in-hand manipulation"], ["spoon grasp"], ["pretend play hands"]],
                [["sitting", "puzzle"], ["transition", "comfort seeking"], ["barefoot walk", "texture play"],
                 ["pointing", "joint attention"], ["running", "jumping"], ["stacking", "drawing"],
                 ["self-feeding"], ["sorting", "imitation"]],
                ["calm focused posture", "expressive transitions", "exploratory movement", "engaged interaction",
                 "coordinated whole-body movement", "precise hand control", "independent self-care sequencing",
                 "creative problem solving"]
            )
        ],
        "recommended_activities": [
            {"title": "Belly breathing buddy", "domain": "emotion", "duration": "3 min",
             "description": "A calming game with a plush toy on the belly to feel slow breaths.",
             "why_it_helps": "Builds early self-regulation and body awareness."},
            {"title": "Animal yoga flow", "domain": "gross_motor", "duration": "6 min",
             "description": "Imitate animal poses to build balance and coordination.",
             "why_it_helps": "Improves gross-motor planning and core strength."},
            {"title": "Bead rainbow", "domain": "fine_motor", "duration": "7 min",
             "description": "Thread coloured beads to support pincer grasp and sequencing.",
             "why_it_helps": "Strengthens pincer grasp and bilateral coordination."},
            {"title": "Story turn taking", "domain": "social", "duration": "8 min",
             "description": "Take turns telling parts of a story to build communication.",
             "why_it_helps": "Develops joint attention and conversational turn-taking."},
            {"title": "Sensory texture box", "domain": "sensory", "duration": "5 min",
             "description": "Gentle exploration of textures to support sensory processing.",
             "why_it_helps": "Supports tactile discrimination and tolerance."},
            {"title": "Simon Says", "domain": "attention", "duration": "5 min",
             "description": "Listening and self regulation through playful instructions.",
             "why_it_helps": "Builds auditory attention and impulse control."},
            {"title": "Help me cook", "domain": "daily_living", "duration": "10 min",
             "description": "Small kitchen helper tasks like stirring and pouring.",
             "why_it_helps": "Builds daily-living independence and motor planning."},
            {"title": "Shape sorter race", "domain": "learning_play", "duration": "6 min",
             "description": "Sort shapes against a soft timer.",
             "why_it_helps": "Develops categorisation and problem solving."},
        ],
        "home_program": [
            "Use a visual schedule for transitions",
            "Pair instructions with gentle gestures",
            "Give extra response time during conversations",
            "Build short fine-motor routines around play",
            "Celebrate effort, not only outcome",
            "Read aloud together every day",
        ],
        "professional_recommendations": [
            "Consider a paediatric occupational therapy consult",
            "Share this report with your child's care team",
            "Repeat screening every 30 days to track patterns",
        ],
        "age_context": (
            "Observations are interpreted against typical 2-4 year old play. Without an exact date of birth, "
            "the age framing here is an approximate window."
        ),
        "parent_tips": [
            "Narrate what your child is doing in short, calm phrases.",
            "Repeat favourite songs and stories — repetition builds memory.",
            "Offer two choices instead of open-ended questions.",
            "Pause for 5 seconds after asking — give your child time to respond.",
        ],
        "behaviour_section": {
            "summary": (
                "Behaviour patterns appear age-typical with warm engagement during play. Self-regulation is "
                "emerging — your child copes well with familiar activities and uses adult proximity to settle "
                "during harder moments."
            ),
            "regulation_strengths": [
                "Stays engaged during preferred play",
                "Seeks adult comfort during transitions",
                "Uses bilateral hands to self-soothe (e.g. clasping)",
            ],
            "regulation_challenges": [
                "Sustaining attention beyond 5 minutes",
                "Transitioning between activities",
                "Frustration tolerance during harder fine-motor tasks",
            ],
            "triggers": [
                "Unexpected change in activity",
                "Tasks demanding new motor planning",
            ],
            "coping_strategies_observed": [
                "Pauses and re-focuses",
                "Looks to caregiver for cues",
            ],
            "caregiver_response": (
                "Caregiver responds with warm prompts, offers gentle scaffolding and celebrates small wins."
            ),
            "parent_suggestions": [
                "Give a 1-minute warning before transitions",
                "Pair new instructions with a visual or gesture",
                "Use a calm-down corner with sensory toys",
                "Celebrate effort out loud, especially on harder tasks",
            ],
        },
        "developmental_milestones": {
            "achieved": [
                "Walks confidently on level ground",
                "Stacks 4-6 blocks",
                "Uses 2-3 word phrases",
                "Engages in short pretend play",
            ],
            "emerging": [
                "Sharing & turn-taking with peers",
                "Following 2-step instructions",
                "Drawing simple shapes",
            ],
            "next_to_watch_for": [
                "Naming most familiar objects",
                "Jumping with both feet together",
                "Independent dressing of simple items",
            ],
        },
        "per_domain_narratives": [
            {
                "domain": "attention",
                "name": "Attention & Self Regulation",
                "narrative": (
                    "Your child sustains focus during preferred tasks for short periods and shifts between "
                    "activities with adult support. Frustration is managed by seeking proximity to the caregiver."
                ),
                "key_observations": [
                    "Engages in 3-5 minute puzzle play",
                    "Looks to adult after a tricky step",
                    "Returns to task after brief pause",
                ],
                "next_steps": [
                    "Use 5-minute timers for sit-down activities",
                    "Praise effort during transitions",
                ],
                "insufficient_evidence": False,
                "filming_tip": "",
                "score": 64,
            },
            {
                "domain": "emotion",
                "name": "Emotion & Behaviour",
                "narrative": (
                    "Emotional expression is warm and varied. Transitions occasionally bring brief frustration; "
                    "your child uses adult connection to recover."
                ),
                "key_observations": ["Smiles at caregiver", "Brief frustration on harder tasks"],
                "next_steps": ["Name emotions aloud as they happen", "Use a feelings chart at home"],
                "insufficient_evidence": False, "filming_tip": "", "score": 58,
            },
            {
                "domain": "sensory",
                "name": "Sensory Processing",
                "narrative": (
                    "Sensory responses appear typical with mild tactile seeking during play. Movement and "
                    "auditory responses are well-modulated."
                ),
                "key_observations": ["Comfortable with multiple textures", "Mild seeking of deep pressure"],
                "next_steps": ["Offer texture play 2x per week", "Add proprioceptive games like push-pull"],
                "insufficient_evidence": False, "filming_tip": "", "score": 71,
            },
            {
                "domain": "social",
                "name": "Social & Communication",
                "narrative": (
                    "Joint attention, gestures and shared turn-taking are emerging consistently. Your child "
                    "uses eye contact during favourite play with adults."
                ),
                "key_observations": ["Points to share interest", "Initiates back-and-forth turns"],
                "next_steps": ["Expand utterances by adding one new word", "Play simple turn games daily"],
                "insufficient_evidence": False, "filming_tip": "", "score": 78,
            },
            {
                "domain": "gross_motor",
                "name": "Gross Motor",
                "narrative": (
                    "Gross-motor coordination is a clear strength — balanced gait, stable posture and "
                    "confident running with smooth weight shifts."
                ),
                "key_observations": ["Confident running", "Stable single-leg balance briefly"],
                "next_steps": ["Add obstacle courses", "Practice jumping over a soft line"],
                "insufficient_evidence": False, "filming_tip": "", "score": 86,
            },
            {
                "domain": "fine_motor",
                "name": "Fine Motor",
                "narrative": (
                    "Pincer grasp and bilateral hand use are strong. Your child stacks and manipulates small "
                    "objects with growing precision."
                ),
                "key_observations": ["Builds 4-6 block towers", "Uses both hands cooperatively"],
                "next_steps": ["Thread larger beads", "Try simple scissor snips on paper"],
                "insufficient_evidence": False, "filming_tip": "", "score": 82,
            },
            {
                "domain": "daily_living",
                "name": "Daily Living Skills",
                "narrative": (
                    "Self-care sequencing is emerging — your child participates in dressing and feeding "
                    "routines with adult cues."
                ),
                "key_observations": ["Holds spoon independently", "Attempts to pull on simple clothing"],
                "next_steps": ["Let your child place shoes by the door", "Practice hand-washing with a song"],
                "insufficient_evidence": False, "filming_tip": "", "score": 74,
            },
            {
                "domain": "learning_play",
                "name": "Learning & Play",
                "narrative": (
                    "Creative problem solving and imitation are blooming. Your child explores cause-and-effect "
                    "in pretend play and follows familiar routines."
                ),
                "key_observations": ["Pretends with dolls / cars", "Sorts by colour with prompts"],
                "next_steps": ["Add simple matching games", "Read interactive flap books"],
                "insufficient_evidence": False, "filming_tip": "", "score": 80,
            },
        ],
        "disclaimer": (
            "This AI-assisted developmental screening is for educational and screening purposes only. "
            "It is not a clinical diagnosis and does not replace evaluation by a qualified paediatric "
            "healthcare professional."
        ),
    }


# -------------------- PDF Export --------------------

def _build_report_pdf(report: dict) -> bytes:
    """Render an assessment report into a calm, branded PDF using reportlab."""
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
        KeepTogether,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.6 * inch, rightMargin=0.6 * inch,
        topMargin=0.7 * inch, bottomMargin=0.6 * inch,
        title="Kiddo+ Developmental Screening Report",
    )

    styles = getSampleStyleSheet()
    coral = colors.HexColor("#FF7043")
    ink = colors.HexColor("#1E293B")
    softInk = colors.HexColor("#475569")

    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontName="Helvetica-Bold",
                        fontSize=22, leading=26, textColor=ink, spaceAfter=4)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Helvetica-Bold",
                        fontSize=13, leading=16, textColor=coral, spaceBefore=10, spaceAfter=4)
    p = ParagraphStyle("p", parent=styles["BodyText"], fontName="Helvetica",
                       fontSize=10, leading=14, textColor=ink)
    small = ParagraphStyle("small", parent=p, fontSize=8.5, leading=11, textColor=softInk)
    bullet = ParagraphStyle("b", parent=p, leftIndent=12, bulletIndent=2, spaceAfter=2)

    story = []

    # Header
    header = Table(
        [[
            Paragraph("<b><font color='#FF7043'>Kiddo+</font></b>", h1),
            Paragraph(
                f"<font color='#475569'>AI Developmental Screening<br/>"
                f"{datetime.fromisoformat(report['created_at'].replace('Z','+00:00')).strftime('%d %b %Y')}</font>",
                small,
            ),
        ]],
        colWidths=[3.5 * inch, 3.5 * inch],
    )
    header.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(header)
    story.append(Spacer(1, 6))

    # Overall summary card
    overall = report.get("overall_score", 0)
    story.append(Paragraph(f"Overall developmental snapshot · <b>{overall}/100</b>", h2))
    story.append(Paragraph(report.get("overall_summary", ""), p))

    # Strengths / areas
    def _bullets(title, items, color="#1E293B"):
        if not items:
            return
        story.append(Paragraph(f"<font color='{color}'><b>{title}</b></font>", h2))
        for it in items[:10]:
            story.append(Paragraph(f"• {it}", bullet))

    _bullets("Strengths", report.get("strengths", []), "#0F766E")
    _bullets("Areas to support", report.get("areas_needing_support", []), "#9A3412")

    # Domain table
    domains = report.get("domains", []) or []
    if domains:
        story.append(Paragraph("Domain scores", h2))
        rows = [["Domain", "Score", "Observed in / Notes"]]
        for d in domains:
            if d.get("insufficient_evidence"):
                score = "xyz"
                src = d.get("source_videos") or []
                if src:
                    notes = "Indirect signals only · " + d.get("summary", "")[:100]
                else:
                    notes = "No video uploaded for this domain — upload a short clip to score."
            else:
                score = "—" if d.get("reshoot_needed") else str(d.get("score", 0))
                if d.get("reshoot_needed"):
                    notes = "Reshoot suggested · " + "; ".join(d.get("reshoot_issues", [])[:2])
                else:
                    src = d.get("source_videos") or []
                    src_names = ", ".join(
                        s.get("video_for_name") or s.get("video_for", "")
                        for s in src
                    )[:80]
                    head = f"Observed in: {src_names}. " if src_names else ""
                    notes = head + (d.get("movement_quality") or d.get("summary", ""))[:120]
            rows.append([d.get("name", d.get("domain")), score, notes])
        table = Table(rows, colWidths=[2.0 * inch, 0.7 * inch, 4.3 * inch])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FFF3E0")),
            ("TEXTCOLOR", (0, 0), (-1, 0), coral),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAF9")]),
            ("TEXTCOLOR", (0, 1), (-1, -1), ink),
            ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(table)

    # Per-domain narratives (full detail for each of 8 domains)
    pdn = report.get("per_domain_narratives") or []
    if pdn:
        story.append(PageBreak())
        story.append(Paragraph("Domain-by-domain insights", h2))
        for n in pdn:
            block = []
            title = f"<b><font color='#1E293B'>{n.get('name','')}</font></b>"
            if n.get('score') is not None:
                title += f" · <font color='#FF7043'><b>{n.get('score')}/100</b></font>"
            if n.get('insufficient_evidence'):
                title += " · <font color='#92400E'>Insufficient evidence</font>"
            block.append(Paragraph(title, p))
            block.append(Spacer(1, 2))
            block.append(Paragraph(n.get('narrative', ''), p))
            ko = n.get('key_observations') or []
            if ko:
                block.append(Paragraph("<b>Observed:</b>", small))
                for o in ko[:6]:
                    block.append(Paragraph(f"• {o}", bullet))
            ns = n.get('next_steps') or []
            if ns:
                block.append(Paragraph("<b>Try this week:</b>", small))
                for o in ns[:5]:
                    block.append(Paragraph(f"• {o}", bullet))
            if n.get('insufficient_evidence') and n.get('filming_tip'):
                block.append(Paragraph(f"<i>Filming tip: {n.get('filming_tip')}</i>", small))
            block.append(Spacer(1, 8))
            story.append(KeepTogether(block))

    # Dedicated Behaviour section
    bs = report.get("behaviour_section") or {}
    if bs.get("summary") or bs.get("regulation_strengths") or bs.get("regulation_challenges"):
        story.append(PageBreak())
        story.append(Paragraph("Behaviour & self-regulation", h2))
        if bs.get("summary"):
            story.append(Paragraph(bs.get("summary", ""), p))
            story.append(Spacer(1, 6))
        _bullets("Regulation strengths", bs.get("regulation_strengths", []), "#0F766E")
        _bullets("Regulation challenges", bs.get("regulation_challenges", []), "#9A3412")
        _bullets("Likely triggers", bs.get("triggers", []), "#9A3412")
        _bullets("Coping strategies observed", bs.get("coping_strategies_observed", []), "#0F766E")
        if bs.get("caregiver_response"):
            story.append(Paragraph(f"<b>Caregiver response:</b> {bs.get('caregiver_response','')}", p))
            story.append(Spacer(1, 4))
        _bullets("What to try at home", bs.get("parent_suggestions", []), "#1E293B")

    # Developmental milestones
    dm = report.get("developmental_milestones") or {}
    if any(dm.get(k) for k in ("achieved", "emerging", "next_to_watch_for")):
        story.append(Paragraph("Developmental milestones", h2))
        _bullets("Achieved", dm.get("achieved", []), "#0F766E")
        _bullets("Emerging", dm.get("emerging", []), "#0369A1")
        _bullets("Next to watch for", dm.get("next_to_watch_for", []), "#9A3412")

    # Age context
    if report.get("age_context"):
        story.append(Paragraph("<b>Age context</b>", p))
        story.append(Paragraph(report.get("age_context", ""), small))
        story.append(Spacer(1, 6))

    # Recommended activities
    acts = report.get("recommended_activities", []) or []
    if acts:
        story.append(PageBreak())
        story.append(Paragraph("What to do this week", h2))
        for a in acts[:10]:
            block = (
                f"<b>{a.get('title','')}</b> · <font color='#475569'>{a.get('duration','')} · "
                f"{a.get('domain','').replace('_',' ').title()}</font><br/>"
                f"{a.get('description','')}"
            )
            if a.get('why_it_helps'):
                block += f"<br/><i><font color='#475569'>Why it helps: {a.get('why_it_helps','')}</font></i>"
            story.append(KeepTogether([Paragraph(block, p), Spacer(1, 6)]))

    # Home program + Parent tips + Professional recs
    _bullets("Home program", report.get("home_program", []), "#1E293B")
    _bullets("Parent tips", report.get("parent_tips", []), "#7C3AED")
    _bullets("Professional next steps", report.get("professional_recommendations", []), "#0369A1")

    # Footer disclaimer
    story.append(Spacer(1, 16))
    story.append(Paragraph(
        f"<i>{report.get('disclaimer','')}</i>", small
    ))
    story.append(Paragraph(
        "<font color='#9CA3AF'>Generated by Kiddo+ · Powered by Google Gemini · "
        "Videos were processed and permanently deleted after analysis.</font>", small
    ))

    doc.build(story)
    return buf.getvalue()


@api_router.get("/video-assessment/sessions/{session_id}/report.pdf")
async def get_report_pdf(session_id: str):
    r = await db.assessment_reports.find_one({"session_id": session_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    pdf_bytes = _build_report_pdf(r)
    fname = f"kiddoplus-report-{session_id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# -------------------- Share Links --------------------

def _generate_share_slug() -> str:
    # 9-char url-safe slug, ~52 bits — fine for share links
    return secrets.token_urlsafe(7)[:9]


@api_router.post("/video-assessment/sessions/{session_id}/share")
async def create_share_link(session_id: str):
    r = await db.assessment_reports.find_one({"session_id": session_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    existing = await db.assessment_share_links.find_one({"session_id": session_id}, {"_id": 0})
    if existing:
        return {"slug": existing["slug"], "session_id": session_id}

    slug = _generate_share_slug()
    # extremely unlikely collision, but loop once just in case
    for _ in range(3):
        if not await db.assessment_share_links.find_one({"slug": slug}, {"_id": 0}):
            break
        slug = _generate_share_slug()

    await db.assessment_share_links.insert_one({
        "slug": slug,
        "session_id": session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"slug": slug, "session_id": session_id}


@api_router.get("/video-assessment/shared/{slug}")
async def get_shared_report(slug: str):
    link = await db.assessment_share_links.find_one({"slug": slug}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Shared report not found")
    r = await db.assessment_reports.find_one({"session_id": link["session_id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    # Strip any internal-only fields just in case
    r.pop("parent_id", None)
    return {"report": r, "shared_at": link.get("created_at")}


# -------------------- Longitudinal Progress --------------------

@api_router.get("/video-assessment/parents/{parent_id}/history")
async def parent_history(parent_id: str):
    sessions_cursor = db.assessment_sessions.find(
        {"parent_id": parent_id},
        {"_id": 0, "session_id": 1, "created_at": 1, "child_name": 1, "child_dob": 1},
    ).sort("created_at", -1).limit(100)
    sessions = [s async for s in sessions_cursor]
    sids = [s["session_id"] for s in sessions]
    reports_cursor = db.assessment_reports.find(
        {"session_id": {"$in": sids}},
        {"_id": 0, "session_id": 1, "overall_score": 1, "created_at": 1,
         "domains.domain": 1, "domains.name": 1, "domains.score": 1},
    )
    reports_by_sid = {r["session_id"]: r async for r in reports_cursor}

    history = []
    for s in sessions:
        r = reports_by_sid.get(s["session_id"])
        history.append({
            "session_id": s["session_id"],
            "created_at": s["created_at"],
            "child_name": s.get("child_name"),
            "child_dob": s.get("child_dob"),
            "overall_score": r.get("overall_score") if r else None,
            "domains": (
                [{"domain": d.get("domain"), "name": d.get("name"), "score": d.get("score")}
                 for d in (r.get("domains") or [])]
                if r else []
            ),
            "report_ready": r is not None,
        })
    return {"parent_id": parent_id, "history": history}


# -------------------- Referral Codes --------------------

REFERRAL_SEEDS = [
    {"code": "KIDDOCLINIC", "clinic_name": "Kiddo+ Demo Clinic", "discount_pct": 10},
    {"code": "PAEDOT2026", "clinic_name": "PaedOT Network", "discount_pct": 15},
    {"code": "EARLYSTART", "clinic_name": "Early Start Therapy", "discount_pct": 10},
]


async def _seed_referral_codes():
    for r in REFERRAL_SEEDS:
        await db.referral_codes.update_one(
            {"code": r["code"]}, {"$setOnInsert": r}, upsert=True,
        )


@api_router.get("/video-assessment/referral/{code}")
async def lookup_referral(code: str):
    r = await db.referral_codes.find_one({"code": code.upper()}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Unknown referral code")
    return r


# -------------------- Trust Center --------------------

@api_router.get("/video-assessment/trust-stats")
async def trust_stats():
    """Aggregated, anonymised stats for the public Trust Center."""
    pipeline = [
        {"$match": {"uploaded_at": {"$exists": True}, "videos_deleted_at": {"$exists": True}}},
        {"$project": {
            "lifetime": {
                "$dateDiff": {
                    "startDate": {"$dateFromString": {"dateString": "$uploaded_at"}},
                    "endDate": {"$dateFromString": {"dateString": "$videos_deleted_at"}},
                    "unit": "second",
                }
            }
        }},
        {"$group": {
            "_id": None,
            "avg_lifetime": {"$avg": "$lifetime"},
            "max_lifetime": {"$max": "$lifetime"},
            "min_lifetime": {"$min": "$lifetime"},
            "count": {"$sum": 1},
        }},
    ]
    agg = await db.assessment_sessions.aggregate(pipeline).to_list(length=1)
    total_assessments = await db.assessment_reports.count_documents({})
    if agg:
        row = agg[0]
        avg_sec = float(row.get("avg_lifetime") or 0)
        max_sec = float(row.get("max_lifetime") or 0)
        min_sec = float(row.get("min_lifetime") or 0)
        count = int(row.get("count") or 0)
    else:
        avg_sec = max_sec = min_sec = 0.0
        count = 0
    return {
        "avg_video_lifetime_sec": round(avg_sec, 1),
        "max_video_lifetime_sec": round(max_sec, 1),
        "min_video_lifetime_sec": round(min_sec, 1),
        "videos_processed_and_deleted": count,
        "total_assessments_generated": total_assessments,
    }


# -------------------- Share Card (PNG for WhatsApp / Insta / referral) --------------------

# Domain key -> short pill label + accent color (matches the dashboard palette)
_DOMAIN_PILLS = {
    "attention":    ("Attention", "#F59E6E"),
    "emotion":      ("Emotion",   "#FF8A65"),
    "sensory":      ("Sensory",   "#F472B6"),
    "social":       ("Social",    "#60A5FA"),
    "gross_motor":  ("Gross",     "#34D399"),
    "fine_motor":   ("Fine",      "#A78BFA"),
    "daily_living": ("Daily",     "#FBBF24"),
    "learning_play":("Learning",  "#22D3EE"),
}

_FONT_REGULAR = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
_FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def _font(size: int, bold: bool = False):
    from PIL import ImageFont
    try:
        return ImageFont.truetype(_FONT_BOLD if bold else _FONT_REGULAR, size)
    except Exception:
        return ImageFont.load_default()


def _draw_google_g(draw, cx: int, cy: int, r: int) -> None:
    """Draw a clean, recognisable Google 'G' logo centered at (cx, cy).

    Reference Google G logo (PIL angles: 0deg = 3 o'clock, increasing clockwise):
      • Red    — top quadrant
      • Blue   — upper right + the horizontal bar
      • Green  — bottom (resumes after a clear gap below the bar)
      • Yellow — left side
    The opening on the right is intentionally wider than the bar itself so the
    "mouth" of the G is visible, matching the real Google logo.
    """
    box = (cx - r, cy - r, cx + r, cy + r)
    stroke = max(4, int(r * 0.34))

    # Bar geometry
    bar_h = stroke
    bar_top = cy - bar_h // 2
    bar_bot = cy + bar_h // 2

    # Open mouth: the ring is broken from ~-2 deg (just above bar top) all the
    # way down to ~32 deg (visibly below the bar) — that's the Google "mouth".
    GREEN_START = 32

    # Ring quadrants
    draw.arc(box, start=210, end=330, fill=(234, 67, 53), width=stroke)        # Red — top
    draw.arc(box, start=330, end=358, fill=(66, 133, 244), width=stroke)       # Blue — upper right
    draw.arc(box, start=GREEN_START, end=150, fill=(52, 168, 83), width=stroke) # Green — lower right + bottom
    draw.arc(box, start=150, end=210, fill=(251, 188, 5), width=stroke)        # Yellow — left

    # Blue cross-bar — extends from the inside of the ring out to the outer edge.
    inner_r = r - stroke
    bar_x_start = cx + max(2, int(inner_r * 0.15))
    bar_x_end = cx + r
    draw.rectangle(
        (bar_x_start, bar_top, bar_x_end, bar_bot),
        fill=(66, 133, 244),
    )


def _draw_gemini_sparkle(draw, cx: int, cy: int, r: int) -> None:
    """Draw a single Gemini-style 4-pointed sparkle centered at (cx, cy)."""
    pts = [
        (cx, cy - r),
        (cx + r * 0.28, cy - r * 0.28),
        (cx + r, cy),
        (cx + r * 0.28, cy + r * 0.28),
        (cx, cy + r),
        (cx - r * 0.28, cy + r * 0.28),
        (cx - r, cy),
        (cx - r * 0.28, cy - r * 0.28),
    ]
    draw.polygon(pts, fill=(72, 116, 230))  # Gemini blue


def _draw_text_colored_google(draw, x: int, y: int, font) -> int:
    """Draw the word 'Google' with the official per-letter brand colors.
    Returns the x advance after the word."""
    letters = [
        ("G", (66, 133, 244)),
        ("o", (234, 67, 53)),
        ("o", (251, 188, 5)),
        ("g", (66, 133, 244)),
        ("l", (52, 168, 83)),
        ("e", (234, 67, 53)),
    ]
    cx = x
    for ch, color in letters:
        draw.text((cx, y), ch, font=font, fill=color)
        cx += int(draw.textlength(ch, font=font))
    return cx


def _wrap_text(draw, text: str, font, max_width: int) -> List[str]:
    if not text:
        return []
    words = text.split()
    lines, cur = [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        bbox = draw.textbbox((0, 0), cand, font=font)
        if bbox[2] - bbox[0] <= max_width:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _build_share_card_png(report: dict, public_url: Optional[str] = None,
                          referral_code: Optional[str] = None) -> bytes:
    """Render a 1080x1080 share card PNG summarising the screening report."""
    from PIL import Image, ImageDraw

    W, H = 1080, 1080
    # Warm cream background, mirrors dashboard aesthetic
    img = Image.new("RGB", (W, H), (255, 247, 237))
    draw = ImageDraw.Draw(img)

    # Top peach band
    draw.rectangle([(0, 0), (W, 140)], fill=(255, 228, 209))

    # Brand mark (top-left)
    brand_dot_r = 22
    draw.ellipse(
        [(56, 56 - brand_dot_r), (56 + brand_dot_r * 2, 56 + brand_dot_r)],
        fill=(255, 138, 101),
    )
    draw.text((110, 38), "Kiddo+", font=_font(38, bold=True), fill=(30, 41, 59))
    draw.text((110, 80), "AI Developmental Screening", font=_font(20), fill=(100, 116, 139))

    # Top-right trust pill — Gemini sparkle + "Backed by Google"
    pill_h = 72
    pill_pad = 22
    icon_gap = 16  # gap between Gemini sparkle and the text
    pf = _font(24, bold=True)
    static_text = "Backed by "
    google_word = "Google"
    static_w = int(draw.textlength(static_text, font=pf))
    google_w = int(draw.textlength(google_word, font=pf))

    gemini_r = 18

    content_w = (gemini_r * 2) + icon_gap + static_w + google_w
    pill_w = content_w + pill_pad * 2
    pill_x1 = W - 56
    pill_x0 = pill_x1 - pill_w
    pill_y0 = 36
    pill_y1 = pill_y0 + pill_h

    # Pill background
    draw.rounded_rectangle(
        (pill_x0, pill_y0, pill_x1, pill_y1), radius=pill_h // 2,
        fill=(255, 255, 255), outline=(255, 138, 101), width=2,
    )

    pill_mid_y = pill_y0 + pill_h // 2

    # Gemini sparkle (left)
    gem_cx = pill_x0 + pill_pad + gemini_r
    _draw_gemini_sparkle(draw, gem_cx, pill_mid_y, gemini_r)

    # Text "Backed by Google" — right of Gemini sparkle
    text_x = gem_cx + gemini_r + icon_gap
    try:
        ascent, descent = pf.getmetrics()
        text_y = pill_y0 + (pill_h - (ascent + descent)) // 2
    except Exception:
        text_y = pill_y0 + 22
    draw.text((text_x, text_y), static_text, font=pf, fill=(30, 41, 59))
    _draw_text_colored_google(draw, text_x + static_w, text_y, pf)

    # ---- Score ring (left) ----
    cx, cy, R = 230, 350, 130
    score = int(report.get("overall_score") or 0)
    conf = float(report.get("confidence") or 0)

    # Ring background
    draw.ellipse([(cx - R, cy - R), (cx + R, cy + R)], outline=(254, 215, 170), width=22)
    # Arc proportional to score
    try:
        end_angle = -90 + (360 * max(0, min(100, score)) / 100)
        draw.arc(
            [(cx - R, cy - R), (cx + R, cy + R)],
            start=-90, end=end_angle, fill=(255, 138, 101), width=22,
        )
    except Exception:
        pass
    # Score number
    sf = _font(96, bold=True)
    s_text = str(score)
    sw = draw.textlength(s_text, font=sf)
    draw.text((cx - sw / 2, cy - 70), s_text, font=sf, fill=(30, 41, 59))
    sub = _font(20, bold=True)
    sub_text = "OUT OF 100"
    sxw = draw.textlength(sub_text, font=sub)
    draw.text((cx - sxw / 2, cy + 30), sub_text, font=sub, fill=(100, 116, 139))

    # ---- Headline (right of ring) ----
    title_x = 410
    child_name = (report.get("child_name") or "").strip()
    headline = f"{child_name}'s screening" if child_name else "Your child's screening"
    draw.text((title_x, 230), headline, font=_font(46, bold=True), fill=(30, 41, 59))
    draw.text(
        (title_x, 290),
        f"Confidence {int(round(conf * 100))}% · {len(report.get('domains', []) or [])} domains",
        font=_font(24), fill=(100, 116, 139),
    )

    # 8 domain pills row under the headline
    pill_x = title_x
    pill_y = 350
    pf2 = _font(18, bold=True)
    for d in (report.get("domains") or [])[:8]:
        key = d.get("domain") or d.get("key") or ""
        label, color = _DOMAIN_PILLS.get(key, (key.title(), "#94A3B8"))
        tw = draw.textlength(label, font=pf2) + 28
        if pill_x + tw > W - 56:
            pill_x = title_x
            pill_y += 50
        draw.rounded_rectangle(
            [(pill_x, pill_y), (pill_x + tw, pill_y + 38)],
            radius=19, fill=color,
        )
        draw.text((pill_x + 14, pill_y + 8), label, font=pf2, fill=(255, 255, 255))
        pill_x += tw + 10

    # ---- Strengths block ----
    sec_y = 540
    draw.text((56, sec_y), "STRENGTHS", font=_font(20, bold=True), fill=(16, 185, 129))
    sec_y += 32
    bf = _font(22)  # body font — smaller so longer items fit on one or two lines
    line_h = 28
    strengths = (report.get("strengths") or [])[:3]
    for s in strengths:
        # Bullet dot
        draw.ellipse([(64, sec_y + 10), (76, sec_y + 22)], fill=(16, 185, 129))
        lines = _wrap_text(draw, s, bf, W - 110 - 56)
        shown = lines[:2]
        for li, line in enumerate(shown):
            draw.text((90, sec_y + li * line_h), line, font=bf, fill=(30, 41, 59))
        sec_y += max(line_h + 6, len(shown) * line_h + 6)
    if not strengths:
        draw.text((90, sec_y), "Warm, engaged interaction observed.", font=bf, fill=(30, 41, 59))
        sec_y += line_h + 6

    # ---- Areas of support block ----
    sec_y += 10
    draw.text((56, sec_y), "AREAS TO SUPPORT", font=_font(20, bold=True), fill=(234, 88, 12))
    sec_y += 32
    areas = (report.get("areas_needing_support") or [])[:2]
    for a in areas:
        draw.ellipse([(64, sec_y + 10), (76, sec_y + 22)], fill=(234, 88, 12))
        lines = _wrap_text(draw, a, bf, W - 110 - 56)
        shown = lines[:2]
        for li, line in enumerate(shown):
            draw.text((90, sec_y + li * line_h), line, font=bf, fill=(30, 41, 59))
        sec_y += max(line_h + 6, len(shown) * line_h + 6)
    if not areas:
        draw.text((90, sec_y), "No notable concerns flagged.", font=bf, fill=(30, 41, 59))

    # ---- Footer CTA band ----
    fb_top = H - 200
    draw.rectangle([(0, fb_top), (W, H)], fill=(30, 41, 59))

    draw.text(
        (56, fb_top + 30),
        "Get your child's free AI screening",
        font=_font(34, bold=True), fill=(255, 255, 255),
    )
    sub_line = "Private · Auto-deleted videos · Parent-friendly detailed report"
    draw.text((56, fb_top + 78), sub_line, font=_font(22), fill=(203, 213, 225))

    if public_url:
        url_display = public_url.replace("https://", "").replace("http://", "")
        if referral_code:
            url_display = f"{url_display}  ·  use code {referral_code}"
        draw.text(
            (56, fb_top + 132),
            url_display,
            font=_font(22, bold=True), fill=(255, 184, 138),
        )

        # ---- QR code overlay (bottom-right of footer) ----
        try:
            import qrcode
            qr = qrcode.QRCode(
                version=None, box_size=6, border=2,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
            )
            qr.add_data(public_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="#1E293B", back_color="white").convert("RGB")
            qr_size = 156
            qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)

            # Tile: white rounded square that holds the QR + caption
            tile_pad = 14
            tile_caption = 28
            tile_w = qr_size + tile_pad * 2
            tile_h = qr_size + tile_pad * 2 + tile_caption
            tile_x = W - 56 - tile_w
            tile_y = fb_top + (200 - tile_h) // 2
            draw.rounded_rectangle(
                (tile_x, tile_y, tile_x + tile_w, tile_y + tile_h),
                radius=18, fill=(255, 255, 255),
            )
            img.paste(qr_img, (tile_x + tile_pad, tile_y + tile_pad))
            cap_font = _font(14, bold=True)
            cap = "SCAN TO VIEW"
            cw = draw.textlength(cap, font=cap_font)
            draw.text(
                (tile_x + (tile_w - cw) // 2, tile_y + tile_pad + qr_size + 6),
                cap, font=cap_font, fill=(100, 116, 139),
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("QR overlay failed: %s", e)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _public_share_url(slug: str, request: Optional["Request"] = None) -> str:
    """Build the canonical public URL for a shared report.

    Resolution order:
      1. ``PUBLIC_BASE_URL`` env var (explicit override — wins if set)
      2. ``X-Forwarded-Proto`` + ``X-Forwarded-Host`` headers from the request
         (Kubernetes ingress / nginx proxies set these — what the browser sees)
      3. ``request.base_url`` (the URL FastAPI sees, may be internal)
      4. ``REACT_APP_BACKEND_URL`` env var
      5. Last-resort: relative path ``/r/{slug}``
    """
    explicit = os.environ.get("PUBLIC_BASE_URL")
    if explicit:
        return f"{explicit.rstrip('/')}/r/{slug}"

    if request is not None:
        proto = (
            request.headers.get("x-forwarded-proto")
            or request.url.scheme
            or "https"
        )
        host = (
            request.headers.get("x-forwarded-host")
            or request.headers.get("host")
            or (request.url.hostname or "")
        )
        if host:
            return f"{proto}://{host}/r/{slug}"

    fallback = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
    if fallback:
        return f"{fallback}/r/{slug}"
    return f"/r/{slug}"


async def _ensure_share_slug(session_id: str) -> str:
    existing = await db.assessment_share_links.find_one({"session_id": session_id}, {"_id": 0})
    if existing:
        return existing["slug"]
    slug = _generate_share_slug()
    for _ in range(3):
        if not await db.assessment_share_links.find_one({"slug": slug}, {"_id": 0}):
            break
        slug = _generate_share_slug()
    await db.assessment_share_links.insert_one({
        "slug": slug,
        "session_id": session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return slug


@api_router.get("/video-assessment/sessions/{session_id}/share-card.png")
async def get_share_card(session_id: str, request: Request):
    r = await db.assessment_reports.find_one({"session_id": session_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    # Auto-create the share slug so the card can carry a real public URL
    slug = await _ensure_share_slug(session_id)

    # Pick up referral code from the originating session, if any
    sess = await db.assessment_sessions.find_one({"session_id": session_id}, {"_id": 0})
    referral_code = (sess or {}).get("referral_code")

    png = _build_share_card_png(
        r,
        public_url=_public_share_url(slug, request),
        referral_code=referral_code,
    )
    return StreamingResponse(
        io.BytesIO(png),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=60"},
    )


@api_router.get("/video-assessment/shared/{slug}/share-card.png")
async def get_shared_share_card(slug: str, request: Request):
    link = await db.assessment_share_links.find_one({"slug": slug}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Shared report not found")
    r = await db.assessment_reports.find_one({"session_id": link["session_id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    sess = await db.assessment_sessions.find_one({"session_id": link["session_id"]}, {"_id": 0})
    referral_code = (sess or {}).get("referral_code")
    png = _build_share_card_png(
        r,
        public_url=_public_share_url(slug, request),
        referral_code=referral_code,
    )
    return StreamingResponse(
        io.BytesIO(png),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=300"},
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await _seed_referral_codes()
    except Exception as e:
        logger.warning(f"Referral seed failed: {e}")
    # Kick off the video TTL sweeper (fire-and-forget)
    try:
        app.state._video_sweeper_task = asyncio.create_task(_video_ttl_sweeper())
        logger.info(
            f"Video TTL sweeper started (ttl={VIDEO_TTL_HOURS}h, interval={VIDEO_SWEEP_INTERVAL_MIN}min)"
        )
    except Exception as e:
        logger.warning(f"Failed to start video TTL sweeper: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    # Cancel the sweeper if it's running
    task = getattr(app.state, "_video_sweeper_task", None)
    if task is not None:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass
    client.close()
