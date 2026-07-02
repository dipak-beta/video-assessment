import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getReport } from "@/lib/api";
import { scrubBodyLocks } from "@/utils/scrubBodyLocks";

// Module-level (per-page-load) guard so the restore-report-after-refresh
// effect runs exactly once even under React.StrictMode dev double-invoke.
let __restoreReportConsumed = false;

// Restore-report-after-refresh + Welcome-popup gating.
//
// Behaviour:
// - On mount, look at sessionStorage("va_show_report") and
//   localStorage("va_latest_session_id"). If either points to a valid
//   session, re-fetch the report and (when triggered by an explicit "View
//   Report" click) navigate to /report.
// - Also fires a 3s Welcome popup ONLY when there's nothing to restore.
// - `onRestore(sessionId, report)` is invoked once, when a report is
//   successfully re-fetched, so the caller can set its state.
export default function useReportRestore({ report, onRestore }) {
  const navigate = useNavigate();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const welcomeDismissedRef = useRef(false);

  // Restore effect
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (__restoreReportConsumed) return;
    __restoreReportConsumed = true;

    const shouldShow = sessionStorage.getItem("va_show_report") === "1";
    const sessionStorageSid = sessionStorage.getItem("va_session_id");
    const localStorageSid = (() => {
      try {
        return localStorage.getItem("va_latest_session_id");
      } catch (e) {
        return null;
      }
    })();
    const savedSid = sessionStorageSid || localStorageSid;
    if (!savedSid) return;

    sessionStorage.removeItem("va_show_report");
    sessionStorage.removeItem("va_session_id");

    (async () => {
      try {
        const r = await getReport(savedSid);
        onRestore(savedSid, r);
        scrubBodyLocks();
        if (shouldShow) {
          setTimeout(() => {
            navigate("/report");
          }, 50);
        }
      } catch (e) {
        try {
          localStorage.removeItem("va_latest_session_id");
        } catch (er) {
          console.debug("Could not clear va_latest_session_id:", er);
        }
        if (shouldShow) {
          toast.error("Could not load your report. Please try again.");
        }
      }
    })();
  }, [navigate, onRestore]);

  // Auto-close welcome popup as soon as a report becomes available.
  useEffect(() => {
    if (report) {
      welcomeDismissedRef.current = true;
      setWelcomeOpen(false);
    }
  }, [report]);

  // 3s delayed welcome popup — but only if there's nothing to restore.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let hasSaved = false;
    try {
      hasSaved =
        !!localStorage.getItem("va_latest_session_id") ||
        sessionStorage.getItem("va_show_report") === "1";
    } catch (e) {
      hasSaved = false;
    }
    if (hasSaved) return undefined;

    const timer = setTimeout(() => {
      if (welcomeDismissedRef.current) return;
      setWelcomeOpen(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismissWelcome = () => {
    welcomeDismissedRef.current = true;
    setWelcomeOpen(false);
  };

  return { welcomeOpen, dismissWelcome };
}
