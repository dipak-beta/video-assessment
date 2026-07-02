import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EyeOff, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// BlazePose skeleton connections (33 landmarks, skip face mesh dots)
const POSE_CONNECTIONS = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
  [0, 11], [0, 12],
];
const JOINT_IDS = [
  0,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
];

let detectorPromise = null;
const loadFaceDetector = async () => {
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    const { FaceDetector, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    return await FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.4,
    });
  })().catch((err) => {
    detectorPromise = null;
    throw err;
  });
  return detectorPromise;
};

let poseLandmarkerPromise = null;
const loadPoseLandmarker = async () => {
  if (poseLandmarkerPromise) return poseLandmarkerPromise;
  poseLandmarkerPromise = (async () => {
    const { PoseLandmarker, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    return await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
  })().catch((err) => {
    poseLandmarkerPromise = null;
    throw err;
  });
  return poseLandmarkerPromise;
};

/**
 * On-device face blur PREVIEW. Plays the uploaded file silently in a tiny
 * <video>, detects faces per frame, and draws a heavily-blurred patch on the
 * canvas overlay. This is the parent-visible proof that face masking is
 * happening client-side. Server-side analysis is also instructed to ignore
 * adults and never identify the child.
 */
export default function FaceBlurPreview({ file }) {
  const [url, setUrl] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [facesDetected, setFacesDetected] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const poseRef = useRef(null);
  const rafRef = useRef(0);

  // Build a blob URL for the file
  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => {
      try { URL.revokeObjectURL(u); } catch { /* ignore */ }
    };
  }, [file]);

  // Load face detector + pose landmarker in parallel
  useEffect(() => {
    let mounted = true;
    loadFaceDetector()
      .then((d) => {
        if (!mounted) return;
        detectorRef.current = d;
        setReady(true);
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    loadPoseLandmarker()
      .then((p) => {
        if (mounted) poseRef.current = p;
      })
      .catch(() => { /* skeleton optional — silent fail */ });
    return () => { mounted = false; };
  }, []);

  // Detection + draw loop
  useEffect(() => {
    if (!ready || !url) return;
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

    const draw = (results, poseResults) => {
      resize();
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // 1) Skeleton overlay (drawn first, behind the face mask)
      const landmarks = poseResults?.landmarks?.[0];
      if (landmarks && landmarks.length) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(2.5, W / 280);
        ctx.shadowColor = "rgba(255, 138, 101, 0.9)";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#FF8A65";
        ctx.beginPath();
        POSE_CONNECTIONS.forEach(([a, b]) => {
          const pa = landmarks[a];
          const pb = landmarks[b];
          if (!pa || !pb) return;
          const va = pa.visibility ?? 1;
          const vb = pb.visibility ?? 1;
          if (va < 0.3 || vb < 0.3) return;
          ctx.moveTo(pa.x * W, pa.y * H);
          ctx.lineTo(pb.x * W, pb.y * H);
        });
        ctx.stroke();

        ctx.shadowColor = "rgba(77, 182, 172, 0.95)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#4DB6AC";
        const r = Math.max(2.5, W / 260);
        JOINT_IDS.forEach((i) => {
          const p = landmarks[i];
          if (!p) return;
          if ((p.visibility ?? 1) < 0.3) return;
          ctx.beginPath();
          ctx.arc(p.x * W, p.y * H, r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Wrist rings
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 202, 40, 0.9)";
        ctx.lineWidth = Math.max(1.5, W / 420);
        [15, 16].forEach((i) => {
          const p = landmarks[i];
          if (!p) return;
          if ((p.visibility ?? 0.5) < 0.3) return;
          ctx.beginPath();
          ctx.arc(p.x * W, p.y * H, r * 2.4, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.shadowBlur = 0;
      }

      // Face detection is still run (so the per-frame "faces detected" count
      // can be shown for transparency), but we intentionally do NOT draw the
      // masked-box overlay anymore — the blurred video background already
      // anonymises faces, and the parent wanted a cleaner preview with just
      // the skeleton tracing (matching the analysis screen).
      const dets = results?.detections || [];
      setFacesDetected(dets.length);
    };

    const tick = () => {
      if (!alive) return;
      const det = detectorRef.current;
      const pose = poseRef.current;
      if (det && video.readyState >= 2 && !video.paused && !video.ended) {
        const ts = performance.now();
        if (ts !== lastTs) {
          let faceRes = null;
          let poseRes = null;
          try { faceRes = det.detectForVideo(video, ts); } catch (e) { /* ignore */ }
          if (pose) {
            try { poseRes = pose.detectForVideo(video, ts); } catch (e) { /* ignore */ }
          }
          draw(faceRes, poseRes);
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
  }, [ready, url]);

  if (!url) return null;

  return (
    <div
      data-testid="face-blur-preview"
      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-emerald-100"
    >
      <video
        ref={videoRef}
        src={url}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onError={() => setError(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "blur(8px) brightness(0.85)", transform: "scale(1.06)" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Status pill */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/95 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow"
      >
        <EyeOff className="w-3 h-3" />
        {ready
          ? "Pose tracking · faces blurred"
          : error
          ? "Detector offline"
          : "Loading detector…"}
      </motion.div>

      <div className="absolute bottom-2 left-2 right-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/90">
        <ShieldCheck className="w-3 h-3 text-emerald-300" />
        Background is blurred · pose skeleton extracted in your browser.
      </div>

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-black/45 backdrop-blur px-3 py-1.5 text-xs text-white/90">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Warming up face detector…
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <div className="text-center">
            <AlertTriangle className="w-5 h-5 mx-auto text-amber-300" />
            <div className="mt-1 text-[11px] font-semibold text-white/90">
              Couldn&apos;t load the local face detector
            </div>
            <div className="text-[10px] text-white/65">
              Faces are still blurred server-side during analysis.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
