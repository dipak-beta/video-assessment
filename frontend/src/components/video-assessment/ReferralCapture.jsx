import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { setStoredReferral, lookupReferral } from "@/lib/api";
import { toast } from "sonner";

/**
 * Captures ?ref=CODE from any URL, validates it, persists it to localStorage,
 * and shows a friendly toast. Renders nothing.
 */
export default function ReferralCapture() {
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("ref");
    if (!code) return;
    (async () => {
      try {
        const data = await lookupReferral(code);
        setStoredReferral(code);
        toast.success(
          `Welcome from ${data.clinic_name}${
            data.discount_pct ? ` · ${data.discount_pct}% off` : ""
          }`
        );
      } catch (e) {
        // Don't bother the user if it's invalid
      }
    })();
  }, [location.search]);
  return null;
}
