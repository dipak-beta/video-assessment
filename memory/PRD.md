# Kiddo+ Video Assessment — PRD

## Problem Statement
Copy the full app from GitHub (https://github.com/dipak-beta/video-assessment, branch `main`) and replace the LLM key with the current account's Emergent Universal Key. Then iterate on cost, privacy, and telemetry improvements.

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), Python 3.11, MongoDB via motor/pymongo, `emergentintegrations` (litellm under the hood) for LLM calls.
- Frontend: React (CRA + Craco) at `/app/frontend`, TailwindCSS, served on port 3000.
- LLM: Google Gemini via `emergentintegrations` using `EMERGENT_LLM_KEY`.
- Storage: MongoDB (local) — `MONGO_URL`, `DB_NAME` from env.
- Video uploads: `/tmp/kiddoplus_video_uploads/<session_id>/`, auto-purged.

## What's Implemented (2026-01)

### Session 1 — Repo clone + universal key
- Full source repo copied from GitHub into `/app`, protected env vars preserved.
- `EMERGENT_LLM_KEY` added to `backend/.env`.
- Dependencies installed; backend `/api/` responds `Kiddo+ Video Assessment API`.
- E2E test: session → upload → analyze → PDF (verified valid `%PDF-1.4`).

### Session 2 — Option A cost optimisation
- 8-domain analysis + challenging-behaviour call: `gemini-2.5-pro` → `gemini-2.5-flash`.
- `media_resolution="MEDIA_RESOLUTION_LOW"` on all three video-attached calls.
- Output caps: 400 tok (QC) / 2500 (analysis) / 1200 (CB) / 4000 (synthesis).
- Only final synthesis retains `gemini-2.5-pro`.
- Measured cost drop: from ~$0.75-0.90 / 10-clip session projected → ~$0.14 / 10-clip session.

### Session 3 — Privacy + cost telemetry
- **Video auto-deletion** hardened:
  - Inline delete after successful analysis (existed).
  - **NEW**: inline delete on pipeline error too (previously leaked).
  - **NEW**: background TTL sweeper task (`_video_ttl_sweeper`) runs every 60 min; purges any session dir older than `VIDEO_TTL_HOURS` (default 24h). Covers abandoned uploads and crashes.
  - Env-configurable via `VIDEO_TTL_HOURS` and `VIDEO_SWEEP_INTERVAL_MIN`.
  - Every deletion is stamped on the session doc (`videos_deleted_at`, `videos_deleted_by`).
- **LLM cost telemetry**:
  - Custom `litellm.callbacks` logger records tokens per completion.
  - `metadata={"session_id","stage"}` passed via `.with_params()` on every Gemini call for attribution.
  - Local Gemini pricing table (`_GEMINI_PRICING_PER_MTOKEN`) computes USD when the Universal-Key proxy strips model identity from litellm's built-in pricing.
  - Per-session usage persisted to Mongo collection `assessment_usage`.
  - `report.usage` field (`total_input_tokens`, `total_output_tokens`, `total_cost_usd`, `calls`) surfaced in every report.
  - New endpoint: `GET /api/video-assessment/sessions/{session_id}/usage`.
- Verified E2E: single 8-sec clip → 3 Gemini calls captured (2 Flash QC, 1 Pro synthesis) → **$0.044 total** logged.
- Verified TTL sweeper: 48h-old dir purged and Mongo doc stamped.

### Session 4 — Progressive streaming report reveal (WebSocket)
- **New WS endpoint** `WS /api/video-assessment/sessions/{session_id}/stream` streams:
  - `{type:"status", state, progress, step, uploaded_domains, partial_observations}` on every state/progress/partial-obs change (polls Mongo status doc every ~300ms internally).
  - `{type:"complete", report}` when the report is written (channel closes after).
  - `{type:"error", error}` if the pipeline fails.
  - 15-min lifetime cap so a stuck pipeline never holds the socket open.
- **Frontend**: `openAnalysisStream()` in `api.js` derives the `wss://` URL from `REACT_APP_BACKEND_URL`; `useAnalysisPolling` hook now WS-first with automatic HTTP-polling fallback on WS failure or premature close.
- Callback contract with parent components unchanged — zero UI code touched.
- Verified E2E via `websockets` python client: 3 status events + 1 complete event delivered in real time; final `usage` block ($0.044) present on the complete event.

### Session 5 — Report-page reupload UX + analysis step-1 bar fix
- **Report page → domain reupload now opens the full DomainDetailDialog.** `DomainReuploadButton` was a plain file-picker; it now renders the exact same popup used on the main assessment page (instructions, examples, dos & don'ts, animated dropzone, 3-step processing animation). Uploads still route through the dedicated `reanalyzeDomain()` endpoint so only the affected domain is re-analysed and the refreshed report is bubbled up via `onReportUpdated`.
- **`UploadProcessingSteps` step 1 progress bar fix.** The wrapping `AnimatePresence initial={false}` was swallowing the very first bar's entrance animation, so step 1 rendered a "fixed" bar while steps 2–3 animated correctly. All three steps now use the same indeterminate shuttle bar (consistent motion across the trio + honest UX because the durations are cosmetic, not tied to real work).

### Session 6 — Partial-analyse confirmation prompt
- New `PartialAnalyzeConfirmDialog` intercepts every path to `handleAnalyze` when the parent has uploaded fewer than all 8 developmental-domain videos.
- Copy: "N more domains and you'll get the full picture" + rationale + a green "For best results" callout listing the three concrete benefits of a complete set.
- **Primary CTA**: dynamically labelled with the next empty domain (e.g. "Upload Emotion & Behaviour") — scrolls to the domain stepper and opens that domain's popup.
- **Secondary CTA**: "Continue anyway" — proceeds directly with `runAnalyze()` on the partial set.
- `handleAnalyze` was split so `PostUploadDialog`, `AssessmentHero`, `StickyProgressBar`, and the mobile CTA all inherit the gate for free.

## Next Actions / Backlog
- P1 — Progressive report reveal via WebSocket instead of `/status` polling.
- P1 — Freemium payment gating (Stripe + Razorpay).
- P2 — Frame-collage hybrid pipeline (Option C) for further cost savings.
- P2 — Per-user rate limit + monthly cost cap.
- P2 — Longitudinal tracking (same child, multiple sessions, delta chart).

## Environment
- `EMERGENT_LLM_KEY` — Universal LLM key.
- `MONGO_URL`, `DB_NAME` — MongoDB connection (protected).
- `REACT_APP_BACKEND_URL` — public backend URL (protected).
- `VIDEO_UPLOAD_DIR` — default `/tmp/kiddoplus_video_uploads`.
- `VIDEO_TTL_HOURS` — default 24.
- `VIDEO_SWEEP_INTERVAL_MIN` — default 60.
