import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

// 33-landmark BlazePose connections (skip the face mesh dots for a cleaner look).
const POSE_CONNECTIONS = [
  // torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
  // nose -> shoulders
  [0, 11], [0, 12],
];

const JOINT_IDS = [
  0,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
];

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

// Cache PoseLandmarker for the page
let landmarkerPromise = null;
const loadLandmarker = async () => {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const { PoseLandmarker, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    return await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
  })().catch((err) => {
    landmarkerPromise = null;
    throw err;
  });
  return landmarkerPromise;
};

export default function LivePoseTracker({ videoFiles }) {
  const fileEntries = useMemo(() => {
    if (!videoFiles) return [];
    return Object.entries(videoFiles).filter(([, f]) => !!f);
  }, [videoFiles]);

  // Build blob URLs once per file list. We intentionally do NOT revoke them
  // here — React 18/19 StrictMode dev double-invokes effects which races with
  // <video> loading, causing MEDIA_ERR_SRC_NOT_SUPPORTED. Browsers reclaim
  // blob memory when the page is gone, so leaving them alive is safe.
  const sources = useMemo(() => {
    return fileEntries.map(([domain, file]) => ({
      domain,
      file,
      url: URL.createObjectURL(file),
    }));
  }, [fileEntries]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [poseReady, setPoseReady] = useState(false);
  const [poseError, setPoseError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);

  // Reset per-clip state when active source changes
  useEffect(() => {
    setVideoError(false);
    setVideoPlaying(false);
  }, [activeIdx, sources.length]);

  // Cycle through clips every ~7s
  useEffect(() => {
    if (sources.length <= 1) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % sources.length);
    }, 7000);
    return () => clearInterval(id);
  }, [sources.length]);

  // Load PoseLandmarker (optional — skeleton overlay only if it loads)
  useEffect(() => {
    let mounted = true;
    if (sources.length === 0) return;
    loadLandmarker()
      .then((lm) => {
        if (!mounted) return;
        landmarkerRef.current = lm;
        setPoseReady(true);
      })
      .catch(() => {
        if (mounted) setPoseError(true);
      });
    return () => { mounted = false; };
  }, [sources.length]);

  // Force-play the video whenever a new source mounts
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => { /* autoplay blocked: muted videos should be fine, ignore */ });
      }
    };
    tryPlay();
  }, [activeIdx, sources.length]);

  // Detection + draw loop
  useEffect(() => {
    if (!poseReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    let lastTs = -1;
    let alive = true;

    const resize = () => {
      const w = video.videoWidth || video.clientWidth || 640;
      const h = video.videoHeight || video.clientHeight || 360;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    };

    const draw = (results) => {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const landmarks = results?.landmarks?.[0];
      if (!landmarks || landmarks.length === 0) return;
      const w = canvas.width;
      const h = canvas.height;

      // Bones
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(3, w / 240);
      ctx.shadowColor = "rgba(255, 138, 101, 0.9)";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#FF8A65";
      ctx.beginPath();
      POSE_CONNECTIONS.forEach(([a, b]) => {
        const pa = landmarks[a];
        const pb = landmarks[b];
        if (!pa || !pb) return;
        const va = pa.visibility ?? 1;
        const vb = pb.visibility ?? 1;
        if (va < 0.3 || vb < 0.3) return;
        ctx.moveTo(pa.x * w, pa.y * h);
        ctx.lineTo(pb.x * w, pb.y * h);
      });
      ctx.stroke();

      // Joints
      ctx.shadowColor = "rgba(77, 182, 172, 0.95)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#4DB6AC";
      const r = Math.max(3.5, w / 220);
      JOINT_IDS.forEach((i) => {
        const p = landmarks[i];
        if (!p) return;
        if ((p.visibility ?? 1) < 0.3) return;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Wrist highlight rings
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 202, 40, 0.95)";
      ctx.lineWidth = Math.max(2, w / 380);
      [15, 16].forEach((i) => {
        const p = landmarks[i];
        if (!p) return;
        if ((p.visibility ?? 0.5) < 0.3) return;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, r * 2.6, 0, Math.PI * 2);
        ctx.stroke();
      });
    };

    const tick = () => {
      if (!alive) return;
      const lm = landmarkerRef.current;
      if (lm && video.readyState >= 2 && !video.paused && !video.ended) {
        const ts = performance.now();
        if (ts !== lastTs) {
          try {
            const res = lm.detectForVideo(video, ts);
            draw(res);
          } catch (e) {
            /* ignore single-frame errors */
          }
          lastTs = ts;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [poseReady, activeIdx, sources.length]);

  if (sources.length === 0) return null;
  const current = sources[activeIdx % sources.length];

  return (
    <div
      data-testid="live-pose-tracker"
      className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 bg-slate-900"
    >
      {/* Blurred backdrop video — single <video> reused across sources */}
      <video
        ref={videoRef}
        key={current.url}
        src={current.url}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={() => setVideoPlaying(true)}
        onError={() => setVideoError(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: "blur(18px) brightness(0.85) saturate(1.15)",
          transform: "scale(1.12)",
          transformOrigin: "center",
        }}
      />

      {/* Subtle gradient for skeleton readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/15 via-transparent to-slate-900/35" />

      {/* Skeleton canvas overlay */}
      <canvas
        ref={canvasRef}
        data-testid="pose-skeleton-canvas"
        className="absolute inset-0 w-full h-full"
      />

      {/* Top labels */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
          Face masked
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/85 border border-white/15">
          Tracking · {current.domain.replace(/_/g, " ")}
        </span>
      </div>

      {/* Bottom status row */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/85">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {poseReady
            ? "Live skeleton"
            : poseError
            ? "Skeleton offline · video preview"
            : "Loading model"}
        </div>
        {sources.length > 1 && (
          <div className="flex items-center gap-1">
            {sources.map((s, i) => (
              <span
                key={s.url}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === activeIdx ? "w-5 bg-white" : "w-2 bg-white/35"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading state — only show before video starts */}
      {!videoPlaying && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 rounded-full bg-black/55 backdrop-blur px-3 py-1.5 text-xs text-white/90">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Warming up tracker…
          </div>
        </div>
      )}

      {/* Video decode error fallback */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-10 bg-slate-900/70">
          <div className="text-center max-w-[80%]">
            <AlertTriangle className="w-5 h-5 mx-auto text-amber-300" />
            <div className="mt-1 text-[11px] font-semibold text-white/90">
              Browser can&apos;t preview this clip
            </div>
            <div className="text-[10px] text-white/60">
              (codec not supported here — AI analysis still continues)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
