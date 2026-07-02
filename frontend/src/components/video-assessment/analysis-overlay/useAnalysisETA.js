import { useEffect, useMemo, useState } from "react";

// Encapsulates the elapsed-timer + baseline-duration + dynamic
// "remaining" label logic used by AnalysisOverlay. Extracted verbatim
// from the original inline effects — behaviour is unchanged.
//
// Returns:
//   startedAt     : ms epoch when analysis first opened (null if closed)
//   nowMs         : ticks every 1s while analysing (drives elapsed clock)
//   remainingInfo : { text, estimating } for the ETA pill
//   elapsedLabel  : "mm:ss" elapsed since the overlay opened
export default function useAnalysisETA({ open, state, progress, videoFiles }) {
  const [startedAt, setStartedAt] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (open && state === "analyzing") {
      if (startedAt == null) setStartedAt(Date.now());
      const id = setInterval(() => setNowMs(Date.now()), 1000);
      return () => clearInterval(id);
    }
    if (!open) setStartedAt(null);
    return undefined;
  }, [open, state, startedAt]);

  // Read each uploaded video's duration (metadata only) so we can build the
  // baseline. Falls back gracefully when the browser can't parse a clip.
  const [baselineSec, setBaselineSec] = useState(null);
  useEffect(() => {
    if (!open) {
      setBaselineSec(null);
      return undefined;
    }
    const files = Object.values(videoFiles || {}).filter(
      (f) => f && typeof f === "object" && f.size > 0
    );
    if (!files.length) {
      setBaselineSec(null);
      return undefined;
    }
    let cancelled = false;
    const readDuration = (file) =>
      new Promise((resolve) => {
        try {
          const url = URL.createObjectURL(file);
          const v = document.createElement("video");
          v.preload = "metadata";
          v.muted = true;
          v.src = url;
          const cleanup = () => {
            try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
          };
          v.onloadedmetadata = () => {
            const d = Number.isFinite(v.duration) ? v.duration : 0;
            cleanup();
            resolve(d);
          };
          v.onerror = () => { cleanup(); resolve(0); };
          setTimeout(() => { cleanup(); resolve(0); }, 4000);
        } catch (e) {
          resolve(0);
        }
      });
    (async () => {
      const durations = await Promise.all(files.map(readDuration));
      if (cancelled) return;
      const total = durations.reduce((a, b) => a + (b || 0), 0);
      const usable = total > 0 ? total : files.length * 30;
      setBaselineSec(Math.max(30, Math.round(usable * 4)));
    })();
    return () => { cancelled = true; };
  }, [open, videoFiles]);

  const fmtRemaining = (sec) => {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  const remainingInfo = useMemo(() => {
    if (state === "complete" || progress >= 100) {
      return { text: "Almost there…", estimating: false };
    }
    const elapsedSinceOpen =
      startedAt != null ? Math.max(0, (nowMs - startedAt) / 1000) : 0;
    if (elapsedSinceOpen < 5 || baselineSec == null) {
      return { text: "Estimating…", estimating: true };
    }
    const remainingByTime = Math.max(0, baselineSec - (elapsedSinceOpen - 5));
    const remainingByProgress =
      progress > 0
        ? Math.max(0, baselineSec * (1 - progress / 100))
        : baselineSec;
    const remaining = Math.min(remainingByTime, remainingByProgress);
    if (remaining <= 3) return { text: "Almost done…", estimating: false };
    return { text: `${fmtRemaining(remaining)} remaining`, estimating: false };
  }, [state, progress, startedAt, nowMs, baselineSec]);

  const elapsedLabel = useMemo(() => {
    if (startedAt == null) return null;
    const sec = Math.floor((nowMs - startedAt) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [startedAt, nowMs]);

  return { startedAt, nowMs, remainingInfo, elapsedLabel };
}
