// Aggressively reset any body / html locks left behind by Radix Dialogs or
// other overlays. Radix can leak `pointer-events:none` on body and
// `aria-hidden` / `data-scroll-locked` on body / html when dialogs close in
// quick succession (a known issue when a Radix dialog closes immediately
// before a non-Radix overlay opens, then both unmount). Without this scrub,
// the report page below the analysis overlay becomes un-clickable.
export const scrubBodyLocks = () => {
  if (typeof document === "undefined") return;
  const b = document.body;
  const h = document.documentElement;
  if (b) {
    b.style.pointerEvents = "";
    b.style.overflow = "";
    b.style.marginRight = "";
    b.style.paddingRight = "";
    b.removeAttribute("aria-hidden");
    b.removeAttribute("data-scroll-locked");
  }
  if (h) {
    h.style.overflow = "";
    h.removeAttribute("data-scroll-locked");
  }
};
