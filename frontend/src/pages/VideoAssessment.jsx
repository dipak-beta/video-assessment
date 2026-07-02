import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { Wand2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import DashboardHeader from "@/components/video-assessment/DashboardHeader";
import StickyProgressBar from "@/components/video-assessment/StickyProgressBar";
import AssessmentHero from "@/components/video-assessment/AssessmentHero";
import DomainStepper from "@/components/video-assessment/DomainStepper";
import DomainDetailDialog from "@/components/video-assessment/DomainDetailDialog";
import InfoPanel from "@/components/video-assessment/InfoPanel";
import HowWeProcess from "@/components/video-assessment/HowWeProcess";
import ReportDialog from "@/components/video-assessment/ReportDialog";
import GuidanceAndFAQ from "@/components/video-assessment/GuidanceAndFAQ";
import PostUploadDialog from "@/components/video-assessment/PostUploadDialog";
import PartialAnalyzeConfirmDialog from "@/components/video-assessment/PartialAnalyzeConfirmDialog";
import BehaviouralChallengesDialog from "@/components/video-assessment/BehaviouralChallengesDialog";
import AnalysisOverlay from "@/components/video-assessment/AnalysisOverlay";
import ProgressDialog from "@/components/video-assessment/ProgressDialog";
import TrustCenterDialog from "@/components/video-assessment/TrustCenterDialog";
import SharedReportDialog from "@/components/video-assessment/SharedReportDialog";
import AnimatedBackground from "@/components/video-assessment/AnimatedBackground";
import WelcomePopup from "@/components/video-assessment/WelcomePopup";
import ReuploadDialog from "@/components/video-assessment/ReuploadDialog";

import { DOMAINS } from "@/data/domains";
import {
  createSession,
  uploadVideo,
  deleteUpload,
  startAnalysis,
  getDemoReport,
  reanalyzeDomain,
} from "@/lib/api";
import { VA } from "@/constants/testIds";
import { scrubBodyLocks } from "@/utils/scrubBodyLocks";
import useStickyOnScroll from "@/hooks/useStickyOnScroll";
import useReportRestore from "@/hooks/useReportRestore";
import useAnalysisPolling from "@/hooks/useAnalysisPolling";

export default function VideoAssessment() {
  const [sessionId, setSessionId] = useState(null);
  const [uploads, setUploads] = useState({});
  const [uploadFiles, setUploadFiles] = useState({}); // raw File refs keyed by domain
  const [uploading, setUploading] = useState({});
  const [progress, setProgress] = useState({});
  const [status, setStatus] = useState(null);
  const [report, setReport] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  // When true, the AI analysis overlay is hidden but polling continues in the
  // background. The user can bring it back via the "View analysis progress"
  // button in the Report dialog (or elsewhere).
  const [analysisMinimised, setAnalysisMinimised] = useState(false);

  const [postUpload, setPostUpload] = useState({ open: false, domainKey: null });
  const [partialConfirmOpen, setPartialConfirmOpen] = useState(false);
  // Per-domain "API upload finished" flag. Drives the inline 3-step
  // animation's third step ("Applying face privacy mask") which stays active
  // until this flips to true, then resolves and fires onComplete.
  const [uploadCompleteByDomain, setUploadCompleteByDomain] = useState({});
  const [activeDomain, setActiveDomain] = useState(null); // currently open DomainDetailDialog
  const [challengingOpen, setChallengingOpen] = useState(false);
  const [challengingSkipped, setChallengingSkipped] = useState(false);

  // --- Batch re-upload / re-analyse flow --------------------------------
  // Parents can attach fresh clips for one or more "pending" domains from
  // the Report dialog and re-analyse them together, watching the same
  // AnalysisOverlay used during the initial pipeline.
  const [reuploadOpen, setReuploadOpen] = useState(false);
  const [reuploadFocusDomain, setReuploadFocusDomain] = useState(null);
  // While true, the AnalysisOverlay is being driven by our own batch
  // re-analysis loop (not the server-side pipeline), so we disable the
  // status/report polling by passing sessionId=null into the hook.
  const [reanalyzing, setReanalyzing] = useState(false);

  // --- Single-page dialog routing (Progress / Trust / Shared / Report) ---
  const location = useLocation();
  const navigate = useNavigate();
  const sharedMatch = matchPath("/r/:slug", location.pathname);
  const isProgressOpen = location.pathname === "/progress";
  const isTrustOpen = location.pathname === "/trust";
  const isReportOpen = location.pathname === "/report";
  const isSharedOpen = !!sharedMatch;
  const sharedSlug = sharedMatch?.params?.slug || null;
  const closeOverlayRoute = () => {
    navigate("/video-assessment", { replace: true });
  };
  const handleStartFromProgress = () => {
    setTimeout(() => {
      domainsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const domainsRef = useRef(null);
  const heroRef = useRef(null);

  // Sticky reveal driven by hero visibility
  const stickyVisible = useStickyOnScroll(heroRef, 80);

  // Restore-after-refresh + Welcome-popup gating (custom hook)
  const handleRestore = useCallback((sid, r) => {
    setSessionId(sid);
    setReport(r);
  }, []);
  const { welcomeOpen, dismissWelcome } = useReportRestore({
    report,
    onRestore: handleRestore,
  });

  // Dev/QA preview of the completion screen or in-progress overlay
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "complete") {
      setStatus({ state: "complete", progress: 100, step: "Report ready", uploaded_domains: [] });
      setAnalyzing(true);
    } else if (params.get("preview") === "analyzing") {
      setStatus({ state: "analyzing", progress: 42, step: "Extracting pose signals", uploaded_domains: [] });
      setAnalyzing(true);
    }
  }, []);

  // Whenever the analysis overlay closes, scrub any leaked body locks left by
  // earlier Radix dialogs in the flow. Belt-and-braces: also runs when any
  // tracked dialog flips closed.
  useEffect(() => {
    if (!analyzing) {
      scrubBodyLocks();
      const t1 = setTimeout(scrubBodyLocks, 80);
      const t2 = setTimeout(scrubBodyLocks, 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    return undefined;
  }, [analyzing]);

  useEffect(() => {
    if (!postUpload.open && !activeDomain && !challengingOpen) {
      const t = setTimeout(scrubBodyLocks, 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [postUpload.open, activeDomain, challengingOpen]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    try {
      const s = await createSession();
      setSessionId(s.session_id);
      return s.session_id;
    } catch (e) {
      toast.error("Could not start a session. Please retry.");
      return null;
    }
  };

  const handleUpload = async (domainKey, file) => {
    const sid = await ensureSession();
    if (!sid) return;
    setUploadCompleteByDomain((m) => ({ ...m, [domainKey]: false }));
    setUploading((u) => ({ ...u, [domainKey]: true }));
    setProgress((p) => ({ ...p, [domainKey]: 0 }));
    try {
      const data = await uploadVideo(sid, domainKey, file, (pct) =>
        setProgress((p) => ({ ...p, [domainKey]: pct }))
      );
      setUploads((u) => ({ ...u, [domainKey]: data }));
      setUploadFiles((f) => ({ ...f, [domainKey]: file }));
      if (domainKey.startsWith("challenging_")) {
        toast.success("Challenging-behaviour clip attached");
        setUploading((u) => ({ ...u, [domainKey]: false }));
      } else {
        // API upload done. Tell the inline steps that step 3 ("Applying
        // face privacy mask") can now wrap up. We DELIBERATELY keep
        // `uploading[domainKey]=true` until handleProcessingStepsComplete
        // fires — that way the dropzone keeps showing the progress block
        // instead of flipping to the "done" UI mid-animation.
        setUploadCompleteByDomain((m) => ({ ...m, [domainKey]: true }));
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
      setUploading((u) => ({ ...u, [domainKey]: false }));
    }
  };

  // Fired by the inline UploadProcessingSteps when its 3rd green check has
  // finished. At this point both API upload AND animation are complete — we
  // can release the "uploading" flag, close the DomainDetailDialog and open
  // the PostUploadDialog.
  const handleProcessingStepsComplete = (domainKey) => {
    if (!domainKey || domainKey.startsWith("challenging_")) return;
    setUploading((u) => ({ ...u, [domainKey]: false }));
    setUploadCompleteByDomain((m) => ({ ...m, [domainKey]: false }));
    setActiveDomain(null);
    // 120 ms breath so Radix can fully unmount before the next dialog opens.
    setTimeout(() => {
      setPostUpload({ open: true, domainKey });
    }, 120);
  };

  const handleDelete = async (domainKey) => {
    if (!sessionId) return;
    try {
      await deleteUpload(sessionId, domainKey);
      setUploads((u) => {
        const n = { ...u };
        delete n[domainKey];
        return n;
      });
      setUploadFiles((f) => {
        const n = { ...f };
        delete n[domainKey];
        return n;
      });
      setProgress((p) => ({ ...p, [domainKey]: 0 }));
      toast.message("Video removed");
    } catch (e) {
      toast.error("Could not remove video");
    }
  };

  const handleStartUploading = () => {
    const next = DOMAINS.find((d) => !uploads[d.key]) || DOMAINS[0];
    setActiveDomain(next.key);
  };

  // Wall-clock start of the current analysis run. Persisted to localStorage
  // so we can compute "AI took X min" on the report (and in the WhatsApp
  // share text) even after the hard-refresh that handleViewReport triggers.
  const analysisStartedAtRef = useRef(null);

  const handleAnalyze = useCallback(async () => {
    if (!sessionId || Object.keys(uploads).length === 0) {
      toast.error("Please upload at least one video first.");
      return;
    }
    // Nudge parents who tapped Analyse before completing all 8 developmental
    // domains — a fuller set produces a materially stronger report.
    const devCount = Object.keys(uploads).filter(
      (k) => !k.startsWith("challenging_")
    ).length;
    if (devCount > 0 && devCount < DOMAINS.length) {
      setPartialConfirmOpen(true);
      return;
    }
    await runAnalyze();
  }, [sessionId, uploads]);

  // The actual "kick off analysis" side-effect. Split out from handleAnalyze
  // so the partial-upload confirmation dialog can call it directly on
  // "Continue anyway" without re-running the gating check.
  const runAnalyze = useCallback(async () => {
    if (!sessionId) return;
    try {
      setAnalyzing(true);
      setAnalysisMinimised(false);
      analysisStartedAtRef.current = Date.now();
      setStatus({
        state: "analyzing",
        progress: 3,
        step: "Starting pipeline",
        uploaded_domains: Object.keys(uploads),
      });
      await startAnalysis(sessionId);
    } catch (e) {
      setAnalyzing(false);
      toast.error(e?.response?.data?.detail || "Could not start analysis");
    }
  }, [sessionId, uploads]);

  const handlePartialContinueAnyway = useCallback(() => {
    setPartialConfirmOpen(false);
    // Delay one tick so Radix can close cleanly before the analysis overlay
    // mounts on top.
    setTimeout(() => {
      runAnalyze();
    }, 120);
  }, [runAnalyze]);

  const handlePartialUploadNext = useCallback(() => {
    setPartialConfirmOpen(false);
    const next = DOMAINS.find((d) => !uploads[d.key]);
    if (!next) return;
    setTimeout(() => {
      domainsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setActiveDomain(next.key);
    }, 160);
  }, [uploads]);

  // Post-upload dialog handlers
  const closePostUpload = () => setPostUpload({ open: false, domainKey: null });

  const handleContinueNext = () => {
    const current = postUpload.domainKey;
    closePostUpload();
    const idx = DOMAINS.findIndex((d) => d.key === current);
    const ordered = [
      ...DOMAINS.slice(idx + 1),
      ...DOMAINS.slice(0, idx + 1),
    ];
    const next = ordered.find((d) => !uploads[d.key] && d.key !== current);
    if (next) {
      setTimeout(() => setActiveDomain(next.key), 120);
    } else {
      // All 8 developmental domains are uploaded. Prompt the optional 9th
      // (behavioural challenges) unless the parent has already added one or
      // explicitly skipped it.
      const hasChallengingUpload =
        !!uploads["challenging_1"] || !!uploads["challenging_2"];
      if (!hasChallengingUpload && !challengingSkipped) {
        toast.success("Great — 8 done! One optional step left (9th).");
        setTimeout(() => setChallengingOpen(true), 120);
      } else {
        toast.success("All 9 steps done — ready to analyze!");
        domainsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleAnalyzeFromDialog = () => {
    closePostUpload();
    handleAnalyze();
  };

  // Polling — extracted into a custom hook.
  const handlePollStatus = useCallback((s) => setStatus(s), []);
  const handlePollReport = useCallback((r) => setReport(r), []);
  const handlePollError = useCallback((msg) => {
    setAnalyzing(false);
    toast.error(msg);
  }, []);
  const handlePollComplete = useCallback(() => {
    // Reset minimised so the completion overlay renders if the user
    // opens the overlay again.
    setAnalysisMinimised(false);
    // Wipe uploaded videos from the page (and any cached blob refs).
    // Report is generated server-side; we no longer need local copies.
    setUploads({});
    setUploadFiles({});
    setProgress({});
    // Keep the overlay open showing completion screen; user clicks "View Report".
  }, []);
  useAnalysisPolling({
    sessionId: reanalyzing ? null : sessionId,
    analyzing,
    analysisMinimised,
    analysisStartedAtRef,
    onStatus: handlePollStatus,
    onReport: handlePollReport,
    onError: handlePollError,
    onComplete: handlePollComplete,
  });

  const handleViewReport = () => {
    // Stash the session id + a "show report" flag, then hard-refresh the
    // page. On the next mount, the restore effect will re-fetch the report
    // and open the Report dialog. This gives the user a clean, fully-reset
    // page state before the report is shown (no stale overlays / dialog
    // locks / animation residue).
    try {
      if (sessionId) {
        sessionStorage.setItem("va_session_id", sessionId);
        sessionStorage.setItem("va_show_report", "1");
      }
    } catch (e) {
      console.debug("sessionStorage unavailable during view-report handoff:", e);
    }
    scrubBodyLocks();
    if (typeof window !== "undefined") {
      window.location.reload();
      return;
    }
    // Fallback (SSR / no window): old in-place behaviour.
    setAnalyzing(false);
    setTimeout(scrubBodyLocks, 50);
    setTimeout(scrubBodyLocks, 350);
    setTimeout(() => {
      document
        .getElementById("report")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  };

  const handleCloseOverlay = () => {
    setAnalyzing(false);
    setReanalyzing(false);
    scrubBodyLocks();
    setTimeout(scrubBodyLocks, 50);
    setTimeout(scrubBodyLocks, 350);
  };

  // --- Batch re-upload handlers ------------------------------------------
  // Open the shared ReuploadDialog. `domainKey` (optional) scrolls that
  // row into view + highlights it so per-domain "Upload clip" buttons on
  // the report can deep-link into the same dialog.
  const handleOpenReanalyze = useCallback((domainKey) => {
    setReuploadFocusDomain(domainKey || null);
    // Close the Report dialog if open so the AnalysisOverlay can render
    // cleanly on top once the user submits.
    if (location.pathname === "/report") {
      navigate("/video-assessment", { replace: true });
    }
    // Small delay so ReportDialog's exit animation doesn't collide with
    // ReuploadDialog's enter animation.
    setTimeout(() => setReuploadOpen(true), 140);
  }, [location.pathname, navigate]);

  const handleCloseReanalyze = () => setReuploadOpen(false);

  // Fired by ReuploadDialog with { [domainKey]: File } once the user has
  // attached one or more fresh clips and clicked "Re-analyse". Closes the
  // dialog, opens AnalysisOverlay, runs each /reanalyze-domain call
  // sequentially, then switches the overlay to its completion state.
  const handleBatchReanalyze = useCallback(async (filesByDomain) => {
    const entries = Object.entries(filesByDomain || {});
    if (!sessionId || entries.length === 0) return;

    setReuploadOpen(false);
    // Feed uploadFiles so LivePoseTracker can preview the actual clips
    // inside the overlay's left panel (nice touch — parents see the same
    // video they just attached being "analysed").
    setUploadFiles(filesByDomain);
    setReanalyzing(true);
    setAnalyzing(true);
    setAnalysisMinimised(false);
    analysisStartedAtRef.current = Date.now();
    setStatus({
      state: "analyzing",
      progress: 3,
      step: "Starting re-analysis",
      uploaded_domains: entries.map(([k]) => k),
    });

    let latestReport = report;
    const total = entries.length;

    for (let i = 0; i < entries.length; i += 1) {
      const [domainKey, file] = entries[i];
      const stepStart = Math.round((i / total) * 92) + 3;
      const stepEnd = Math.round(((i + 1) / total) * 92) + 3;
      const domainName =
        DOMAINS.find((d) => d.key === domainKey)?.name || domainKey;

      setStatus((prev) => ({
        ...(prev || {}),
        state: "analyzing",
        progress: stepStart,
        step: `Re-analysing ${domainName} (${i + 1}/${total})`,
      }));

      try {
        // Route file upload progress into the overlay's progress bar so it
        // moves smoothly even for the single-clip case.
        const { report: refreshed } = await reanalyzeDomain(
          sessionId,
          domainKey,
          file,
          (pct) => {
            const blended = stepStart + Math.round((pct / 100) * (stepEnd - stepStart) * 0.9);
            setStatus((prev) => ({
              ...(prev || {}),
              state: "analyzing",
              progress: Math.min(blended, stepEnd),
              step: `Uploading ${domainName} (${i + 1}/${total}) — ${pct}%`,
            }));
          }
        );
        if (refreshed) {
          latestReport = refreshed;
          setReport(refreshed);
        }
        setStatus((prev) => ({
          ...(prev || {}),
          state: "analyzing",
          progress: stepEnd,
          step: `${domainName} re-analysed`,
        }));
      } catch (err) {
        const detail = err?.response?.data?.detail;
        const message =
          (detail && typeof detail === "object" && detail.message) ||
          (typeof detail === "string" && detail) ||
          `Couldn't analyse ${domainName}. Skipping.`;
        toast.error(message);
        // Continue with the remaining clips instead of aborting the whole
        // batch — the parent already invested effort attaching them.
      }
    }

    // Persist elapsed for the header brag line on the (refreshed) report.
    try {
      const elapsedSec = Math.max(
        1,
        Math.floor((Date.now() - (analysisStartedAtRef.current || Date.now())) / 1000)
      );
      localStorage.setItem(`va_elapsed_sec:${sessionId}`, String(elapsedSec));
    } catch (e) {
      console.debug("Could not persist re-analysis elapsed time:", e);
    }

    setStatus((prev) => ({
      ...(prev || {}),
      state: "complete",
      progress: 100,
      step: "Report ready",
    }));
    if (latestReport) setReport(latestReport);
    // Overlay stays open on CompletionView; user clicks "View Report" which
    // hard-refreshes and restores the updated report via useReportRestore.
  }, [sessionId, report]);

  const handleLoadDemo = async () => {
    try {
      const r = await getDemoReport();
      setReport(r);
      toast.success("Sample report loaded");
    } catch (e) {
      toast.error("Could not load sample report");
    }
  };

  const domainUploadedCount = Object.keys(uploads).filter(
    (k) => !k.startsWith("challenging_")
  ).length;
  const hasChallenging =
    !!uploads["challenging_1"] || !!uploads["challenging_2"];
  // 8 developmental domains + 1 optional behavioural step = 9 total
  const uploadedCount = domainUploadedCount + (hasChallenging ? 1 : 0);

  return (
    <div
      data-testid={VA.page}
      className="relative min-h-screen font-body text-kiddo-ink"
    >
      <AnimatedBackground />

      <div className="relative z-10">
        <DashboardHeader
          onHelpClick={() =>
            document
              .getElementById("faq")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />

        <StickyProgressBar
          visible={stickyVisible}
          uploads={uploads}
          uploadedCount={uploadedCount}
          analyzing={analyzing}
          status={status}
          onAnalyze={handleAnalyze}
          onScrollToFirstDomain={handleStartUploading}
        />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32 sm:pb-12">
          <div ref={heroRef}>
            <AssessmentHero
              uploadedCount={uploadedCount}
              analyzing={analyzing}
              status={status}
              onAnalyze={handleAnalyze}
              onScrollToFirstDomain={handleStartUploading}
              analysisMinimised={analysisMinimised}
              onResumeAnalysis={() => setAnalysisMinimised(false)}
            />
          </div>

          <div ref={domainsRef}>
            <DomainStepper
              uploads={uploads}
              uploading={uploading}
              progress={progress}
              onSelectDomain={setActiveDomain}
              onSelectChallenging={() => setChallengingOpen(true)}
              challengingSkipped={challengingSkipped}
            />
          </div>

          <InfoPanel />

          <HowWeProcess />

          <div id="faq">
            <GuidanceAndFAQ />
          </div>

          <div
            data-testid={VA.finalCta}
            className="mt-6 sm:mt-8 text-center px-2"
          >
            <p className="text-xs text-slate-500 max-w-2xl mx-auto">
              Kiddo+ provides AI-assisted developmental screening. It supports,
              but does not replace, evaluation by a qualified paediatric
              healthcare professional.
            </p>
          </div>
        </main>

        {/* Mobile sticky bottom CTA — animated: pulsing coral glow + a
            gently bouncing icon so the parent's next action is always
            visible above the fold on mobile without shouting. */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-100 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-8px_30px_rgb(0,0,0,0.05)]">
          <motion.button
            type="button"
            data-testid="mobile-analyze-cta"
            onClick={uploadedCount === 0 ? handleStartUploading : handleAnalyze}
            disabled={analyzing}
            whileTap={{ scale: 0.97 }}
            animate={
              analyzing
                ? { boxShadow: "0 8px 24px -10px rgba(255,138,101,0.35)" }
                : {
                    boxShadow: [
                      "0 8px 24px -10px rgba(255,138,101,0.55)",
                      "0 16px 34px -8px rgba(255,138,101,0.85)",
                      "0 8px 24px -10px rgba(255,138,101,0.55)",
                    ],
                  }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative overflow-hidden w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-kiddo-coral text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Slow shimmer sweep (paused while analyzing) */}
            {!analyzing && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -inset-x-8"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.30) 45%, rgba(255,255,255,0.42) 55%, transparent 100%)",
                  filter: "blur(4px)",
                }}
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 0.3,
                }}
              />
            )}
            {uploadedCount === 0 ? (
              <>
                <span className="relative">Upload Videos</span>
                <motion.span
                  className="relative flex items-center"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </>
            ) : (
              <>
                <motion.span
                  className="relative flex items-center"
                  animate={{ rotate: [0, -12, 12, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Wand2 className="w-4 h-4" />
                </motion.span>
                <span className="relative">
                  Analyze {uploadedCount} Video{uploadedCount > 1 ? "s" : ""}
                </span>
              </>
            )}
          </motion.button>
        </div>

        {/* Domain detail dialog */}
        <DomainDetailDialog
          open={!!activeDomain}
          domainKey={activeDomain}
          onClose={() => setActiveDomain(null)}
          uploads={uploads}
          uploading={uploading}
          progress={progress}
          uploadCompleteByDomain={uploadCompleteByDomain}
          onUpload={handleUpload}
          onDelete={handleDelete}
          onProcessingComplete={handleProcessingStepsComplete}
        />

        {/* Post-upload dialog */}
        <PostUploadDialog
          open={postUpload.open}
          uploadedDomainKey={postUpload.domainKey}
          uploadedFile={postUpload.domainKey ? uploadFiles[postUpload.domainKey] : null}
          uploadsCount={uploadedCount}
          onClose={closePostUpload}
          onContinue={handleContinueNext}
          onAnalyze={handleAnalyzeFromDialog}
        />

        {/* Confirm-before-analyse when fewer than 8 domain videos uploaded */}
        <PartialAnalyzeConfirmDialog
          open={partialConfirmOpen}
          uploadedCount={domainUploadedCount}
          totalDomains={DOMAINS.length}
          nextDomainName={
            DOMAINS.find((d) => !uploads[d.key])?.name || null
          }
          onUploadNext={handlePartialUploadNext}
          onContinueAnyway={handlePartialContinueAnyway}
          onClose={() => setPartialConfirmOpen(false)}
        />

        {/* Optional 9th step — Behavioural challenges */}
        <BehaviouralChallengesDialog
          open={challengingOpen}
          uploads={uploads}
          uploading={uploading}
          progress={progress}
          onUpload={(slotKey, file) => handleUpload(slotKey, file)}
          onDelete={(slotKey) => handleDelete(slotKey)}
          onSkip={() => {
            setChallengingSkipped(true);
            setChallengingOpen(false);
          }}
          onDone={() => {
            setChallengingSkipped(false);
            setChallengingOpen(false);
            toast.success("Challenging-behaviour clips attached");
          }}
          onClose={() => setChallengingOpen(false)}
        />

        {/* Single-page dialogs replacing the old /progress, /trust, /r/:slug routes */}
        <ProgressDialog
          open={isProgressOpen}
          onClose={closeOverlayRoute}
          onStartScreening={handleStartFromProgress}
        />
        <TrustCenterDialog open={isTrustOpen} onClose={closeOverlayRoute} />
        <SharedReportDialog
          open={isSharedOpen}
          slug={sharedSlug}
          onClose={closeOverlayRoute}
        />
        <ReportDialog
          open={isReportOpen}
          report={report}
          onLoadDemo={handleLoadDemo}
          onReportUpdated={(next) => setReport(next)}
          onOpenReanalyze={handleOpenReanalyze}
          onClose={closeOverlayRoute}
          analysisRunning={analyzing && analysisMinimised}
          onResumeAnalysis={() => {
            closeOverlayRoute();
            setAnalysisMinimised(false);
          }}
        />

        {/* Full-screen analysis overlay */}
        <AnalysisOverlay
          open={analyzing && !analysisMinimised}
          status={status}
          videoFiles={uploadFiles}
          report={report}
          onViewReport={handleViewReport}
          onClose={handleCloseOverlay}
          onMinimise={reanalyzing ? undefined : () => setAnalysisMinimised(true)}
        />

        {/* Batch re-upload dialog — opened from the Report page when one or
            more domains still need a fresh clip. */}
        <ReuploadDialog
          open={reuploadOpen}
          report={report}
          focusDomain={reuploadFocusDomain}
          onClose={handleCloseReanalyze}
          onSubmit={handleBatchReanalyze}
        />

        {/* Welcome / marketing popup — shown 3s after page load only when no report */}
        <WelcomePopup
          open={welcomeOpen && !report}
          onClose={dismissWelcome}
          onCTA={() => {
            dismissWelcome();
            setTimeout(() => {
              domainsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              handleStartUploading();
            }, 200);
          }}
        />
      </div>
    </div>
  );
}
