import { useEffect, useState } from "react";

// Observes `targetRef` and returns `visible=true` when it has scrolled OFF
// the viewport (accounting for a top offset for the fixed header). Used to
// drive the StickyProgressBar reveal.
export default function useStickyOnScroll(targetRef, topOffsetPx = 80) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: `-${topOffsetPx}px 0px 0px 0px` }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [targetRef, topOffsetPx]);
  return visible;
}
