import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  getStatus,
  getReport,
  openAnalysisStream,
} from "@/lib/api";

// WebSocket-first progressive analysis subscription. Falls back to HTTP
// polling (every 3s) if the WebSocket cannot be opened or closes before the
// pipeline reaches a terminal state. Contract with callers is unchanged
// from the previous `useAnalysisPolling` hook — same callbacks, same
// side-effects, same localStorage persistence.
export default function useAnalysisPolling({
  sessionId,
  analyzing,
  analysisMinimised,
  analysisStartedAtRef,
  onStatus,
  onReport,
  onError,
  onComplete,
}) {
  // Refs so the effect never re-runs when parents pass fresh closures.
  const cbRef = useRef({ onStatus, onReport, onError, onComplete });
  cbRef.current = { onStatus, onReport, onError, onComplete };
  const minimisedRef = useRef(analysisMinimised);
  minimisedRef.current = analysisMinimised;

  useEffect(() => {
    if (!sessionId || !analyzing) return undefined;

    let stopped = false;
    let ws = null;
    let pollTimer = null;

    const persistElapsed = () => {
      try {
        localStorage.setItem("va_latest_session_id", sessionId);
        if (analysisStartedAtRef.current) {
          const elapsedSec = Math.max(
            1,
            Math.floor((Date.now() - analysisStartedAtRef.current) / 1000)
          );
          localStorage.setItem(
            `va_elapsed_sec:${sessionId}`,
            String(elapsedSec)
          );
        }
      } catch (e) {
        console.debug("Could not persist analysis elapsed time:", e);
      }
    };

    const finishComplete = (report) => {
      if (stopped) return;
      stopped = true;
      cbRef.current.onReport(report);
      if (minimisedRef.current) {
        toast.success("Report ready — tap 'View analysis progress' to open it.");
      }
      persistElapsed();
      cbRef.current.onComplete();
      cleanup();
    };

    const cleanup = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (ws) {
        try {
          ws.close();
        } catch (e) {
          console.debug("WS cleanup close failed:", e);
        }
        ws = null;
      }
    };

    const startPolling = () => {
      if (stopped || pollTimer) return;
      const tick = async () => {
        if (stopped) return;
        try {
          const s = await getStatus(sessionId);
          if (stopped) return;
          cbRef.current.onStatus(s);
          if (s.state === "complete") {
            const r = await getReport(sessionId);
            if (stopped) return;
            finishComplete(r);
          } else if (s.state === "error") {
            cbRef.current.onError(s.error || "Analysis failed");
          }
        } catch (e) {
          console.debug("Analysis status poll failed:", e);
        }
      };
      tick();
      pollTimer = setInterval(tick, 3000);
    };

    // Try WebSocket first
    ws = openAnalysisStream(sessionId, {
      onStatus: (msg) => {
        if (stopped) return;
        cbRef.current.onStatus(msg);
      },
      onComplete: (msg) => {
        if (stopped) return;
        // The server sends the final report inline; if it's missing for some
        // reason, re-fetch via HTTP as a safety net.
        if (msg && msg.report) {
          finishComplete(msg.report);
        } else {
          getReport(sessionId)
            .then((r) => finishComplete(r))
            .catch((e) => {
              console.debug("Fallback getReport failed:", e);
              cbRef.current.onError("Report ready but couldn't be fetched");
            });
        }
      },
      onError: (msg) => {
        if (stopped) return;
        cbRef.current.onError(msg?.error || "Analysis failed");
      },
      onClose: () => {
        // If the socket closes before we're done (network drop, backend
        // restart), silently fall back to polling.
        if (stopped) return;
        ws = null;
        startPolling();
      },
    });

    // If WS couldn't even be constructed, go straight to polling.
    if (!ws) {
      startPolling();
    }

    return () => {
      stopped = true;
      cleanup();
    };
  }, [sessionId, analyzing, analysisStartedAtRef]);
}
