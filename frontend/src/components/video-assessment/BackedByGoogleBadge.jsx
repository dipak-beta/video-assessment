import { motion } from "framer-motion";

// Google "G" multicolor logo
export const GoogleG = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.1A6.99 6.99 0 0 1 5.47 12c0-.73.13-1.43.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      fill="#EA4335"
    />
  </svg>
);

/**
 * Animated "Backed by Google" pill.
 * Reused in the top nav and the Welcome popup.
 *
 * Props:
 *  - size: "sm" (default) — matches the nav badge
 *          "md" — slightly larger, used inside the popup card
 *  - className: extra classes for the outer wrapper
 *  - dataTestId: optional data-testid override
 */
export default function BackedByGoogleBadge({
  size = "sm",
  className = "",
  dataTestId = "backed-by-google",
}) {
  const isLg = size === "lg";
  const isMd = size === "md";
  let outerCls;
  let gCircleCls;
  let gIconCls;
  if (isLg) {
    outerCls =
      "h-11 sm:h-12 pl-2 pr-4 sm:pr-5 text-sm sm:text-base gap-1.5 sm:gap-2.5";
    gCircleCls = "w-8 h-8 sm:w-9 sm:h-9";
    gIconCls = "w-5 h-5 sm:w-6 sm:h-6";
  } else if (isMd) {
    outerCls = "h-9 sm:h-10 pl-1.5 pr-3 sm:pr-4 text-xs sm:text-sm";
    gCircleCls = "w-6 h-6 sm:w-7 sm:h-7";
    gIconCls = "w-4 h-4 sm:w-[18px] sm:h-[18px]";
  } else {
    outerCls =
      "h-8 sm:h-9 pl-1 pr-2 sm:pl-1.5 sm:pr-3 text-[10px] sm:text-xs";
    gCircleCls = "w-5 h-5 sm:w-6 sm:h-6";
    gIconCls = "w-3.5 h-3.5 sm:w-4 sm:h-4";
  }

  return (
    <motion.span
      data-testid={dataTestId}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className={`inline-flex relative items-center gap-1 sm:gap-2 rounded-full bg-white font-semibold text-kiddo-ink border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden whitespace-nowrap ${outerCls} ${className}`}
    >
      {/* Soft sweeping shimmer (Google colors) */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -inset-x-4"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(66,133,244,0.10) 25%, rgba(234,67,53,0.10) 45%, rgba(251,188,5,0.12) 60%, rgba(52,168,83,0.12) 75%, transparent 100%)",
          filter: "blur(6px)",
        }}
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 0.6,
        }}
      />

      {/* Spinning Google G */}
      <motion.span
        aria-hidden="true"
        className={`relative flex items-center justify-center rounded-full bg-white ${gCircleCls}`}
        animate={{ rotate: [0, 0, 360, 360] }}
        transition={{
          duration: 6,
          times: [0, 0.55, 0.9, 1],
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 1.4,
        }}
      >
        <GoogleG className={gIconCls} />
      </motion.span>

      <span className="relative leading-none">
        Backed by{" "}
        <span className="font-heading font-black tracking-tight">
          <span style={{ color: "#4285F4" }}>G</span>
          <span style={{ color: "#EA4335" }}>o</span>
          <span style={{ color: "#FBBC05" }}>o</span>
          <span style={{ color: "#4285F4" }}>g</span>
          <span style={{ color: "#34A853" }}>l</span>
          <span style={{ color: "#EA4335" }}>e</span>
        </span>
      </span>

      {/* Tiny pulsing dot */}
      <motion.span
        aria-hidden="true"
        className="relative w-1.5 h-1.5 rounded-full bg-emerald-400 -ml-0.5"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.15, 0.9] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.span>
  );
}
