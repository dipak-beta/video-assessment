import { motion } from "framer-motion";

// Animated, graphical page background. Renders fixed behind every other
// element via z-index 0, with the rest of the app sitting on z-10+.
// Uses pointer-events: none so it never intercepts clicks.
//
// Layers (back-to-front):
//   1. Soft conic-gradient base in warm brand tones
//   2. 7 large blurred "orbs" drifting & breathing around the viewport
//   3. Sparse SVG dot pattern for depth & texture
//   4. Subtle vignette + grain at the edges
//
// All animation is GPU-friendly (transform + opacity) so it stays smooth.
// Calm, near-monochrome palette with just a whisper of warm coral / cool teal
// to keep the brand identity without flooding the page with colour.
const ORBS = [
  { color: "#FF8A65", size: 520, x: "-15%", y: "-12%", dx: 60,  dy: 50,  dur: 28, opacity: 0.10 },
  { color: "#4DB6AC", size: 460, x: "78%",  y: "8%",   dx: -70, dy: 60,  dur: 32, opacity: 0.09 },
  { color: "#94A3B8", size: 420, x: "30%",  y: "60%",  dx: 50,  dy: -50, dur: 30, opacity: 0.08 },
  { color: "#CBD5E1", size: 460, x: "65%",  y: "70%",  dx: -60, dy: -40, dur: 34, opacity: 0.10 },
  { color: "#E2E8F0", size: 360, x: "-5%",  y: "78%",  dx: 80,  dy: -60, dur: 30, opacity: 0.18 },
];

export default function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-0 overflow-hidden"
      data-testid="animated-bg"
    >
      {/* Base canvas — calm, near-white with the gentlest warm tint */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(at 20% 10%, #FFFBF7 0%, transparent 60%)," +
            "radial-gradient(at 80% 5%, #F5FAF8 0%, transparent 55%)," +
            "linear-gradient(180deg, #FBFBF9 0%, #FFFFFF 50%, #F8FAFC 100%)",
        }}
      />

      {/* Drifting blurred orbs */}
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 1 }}
          animate={{
            x: [0, o.dx, -o.dx * 0.6, 0],
            y: [0, o.dy, -o.dy * 0.7, 0],
            scale: [1, 1.08, 0.94, 1],
          }}
          transition={{
            duration: o.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.6,
          }}
          style={{
            position: "absolute",
            left: o.x,
            top: o.y,
            width: o.size,
            height: o.size,
            background: o.color,
            opacity: o.opacity,
            borderRadius: "9999px",
            filter: "blur(90px)",
            mixBlendMode: "multiply",
          }}
        />
      ))}

      {/* Subtle SVG dot pattern for texture */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.16]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="kiddo-dot-grid"
            x="0"
            y="0"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="#1E293B" fillOpacity="0.10" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#kiddo-dot-grid)" />
      </svg>

      {/* Slow scanline glow across top — very faint */}
      <motion.div
        initial={{ opacity: 0.25, x: "-30%" }}
        animate={{ opacity: [0.2, 0.4, 0.2], x: ["-30%", "30%", "-30%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 left-0 w-[60%] h-64"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,138,101,0.08) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Soft vignette / inner shadow at the edges to anchor cards */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(15,23,42,0.05) 100%)",
        }}
      />
    </div>
  );
}
