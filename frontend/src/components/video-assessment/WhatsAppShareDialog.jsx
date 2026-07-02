import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Loader2,
  Download,
  Copy,
  CheckCircle2,
  MessageCircle,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { createShareLink, shareCardUrl, getStoredReferral } from "@/lib/api";

const formatMinLabel = (min) => {
  if (min == null || min <= 0) return null;
  if (min >= 60) {
    const h = Math.round(min / 60);
    const rem = min % 60;
    return rem ? `~${h} h ${rem} min` : `~${h} h`;
  }
  return `~${min} min`;
};

const buildWhatsAppText = (publicUrl, referralCode, { clipCount, elapsedSec } = {}) => {
  // Time-saved brag line — mirrors the badge on the completion screen. We
  // only include it if we know how many clips were analysed (so we can quote
  // the ~15 min-a-clip clinician benchmark). AI wall-time is optional; if we
  // have it we quote it, otherwise we fall back to "in minutes".
  const MANUAL_PER_CLIP_MIN = 15;
  const manualMin = clipCount ? clipCount * MANUAL_PER_CLIP_MIN : 0;
  const aiMin =
    elapsedSec != null && elapsedSec > 0
      ? Math.max(1, Math.round(elapsedSec / 60))
      : null;
  const manualLabel = formatMinLabel(manualMin);
  const aiLabel = aiMin != null ? `${aiMin} min` : "minutes";
  const bragLine = manualLabel
    ? `Kiddo+ AI screened my child in ${aiLabel} vs the ${manualLabel} a clinician would take. `
    : "";

  const codeLine = referralCode
    ? `\n\nUse code ${referralCode} when you start.`
    : "";
  return (
    `${bragLine}I just got my child a free AI developmental screening on Kiddo+ — parent-friendly detailed report in minutes, videos auto-deleted. ` +
    `Have a look 👇\n\n${publicUrl}` +
    codeLine
  );
};

// Fetch the share-card PNG as a File so we can attach it to navigator.share / downloads.
const fetchCardAsFile = async (url) => {
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error(`card fetch failed: ${res.status}`);
  const blob = await res.blob();
  return new File([blob], "kiddoplus-screening.png", { type: "image/png" });
};

// Trigger a browser save of a Blob/File (best-effort, works in most desktop browsers).
const downloadFile = (file) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name || "kiddoplus-screening.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }, 2000);
};

export default function WhatsAppShareDialog({ open, onClose, sessionId, parentReferralCode, clipCount, elapsedSec }) {
  const [shareSlug, setShareSlug] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralCode = parentReferralCode || getStoredReferral();

  useEffect(() => {
    if (!open || !sessionId || sessionId === "demo") return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { slug } = await createShareLink(sessionId);
        if (!cancelled) setShareSlug(slug);
      } catch {
        if (!cancelled) toast.error("Couldn't create share link");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  const publicUrl = shareSlug
    ? `${window.location.origin}/r/${shareSlug}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""}`
    : null;

  const [sending, setSending] = useState(false);

  const cardUrl = sessionId && sessionId !== "demo" ? shareCardUrl(sessionId) : null;

  const onWhatsApp = async () => {
    if (!publicUrl || sending) return;
    setSending(true);
    const text = buildWhatsAppText(publicUrl, referralCode, { clipCount, elapsedSec });
    try {
      // Path 1 — Web Share API Level 2 (mobile Chrome/Safari, PWAs): can
      // attach the PNG card AND text+link in a single native share sheet
      // that includes WhatsApp.
      let file = null;
      try {
        if (cardUrl) file = await fetchCardAsFile(cardUrl);
      } catch { /* fall through to text-only */ }

      if (
        file &&
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        navigator.share
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "Kiddo+ screening summary",
            text,
          });
          toast.success("Shared!");
          return;
        } catch (e) {
          // User cancelled — silent. Any other error → fall through.
          if (e && e.name === "AbortError") return;
        }
      }

      // Path 2 — Desktop / unsupported: download the PNG so the user can
      // attach it to WhatsApp manually, then open wa.me with text + link
      // pre-filled. We open WA *first* (in the same user gesture) to avoid
      // popup-blockers, then trigger the download.
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      const w = window.open(waUrl, "_blank", "noopener,noreferrer");
      if (file) {
        downloadFile(file);
        toast.success(
          "Card image downloaded — drag it into the WhatsApp chat to attach.",
          { duration: 5000 }
        );
      } else if (!w) {
        toast.error("Couldn't open WhatsApp — please allow popups.");
      } else {
        toast.success("WhatsApp opened with your message + link.");
      }
    } finally {
      setSending(false);
    }
  };

  const onCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(buildWhatsAppText(publicUrl, referralCode, { clipCount, elapsedSec }));
      setCopied(true);
      toast.success("Message + link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.message("Select the text above and copy manually");
    }
  };

  const onDownloadCard = () => {
    if (!cardUrl) return;
    window.open(cardUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="whatsapp-share-dialog"
        className="max-w-3xl w-[calc(100vw-1.5rem)] max-h-[92vh] rounded-3xl border border-slate-100 p-0 overflow-hidden gap-0 bg-white"
      >
        {/* Header — same pattern as ProcessDetailsDialog */}
        <div className="relative px-5 sm:px-8 pt-7 pb-5 bg-gradient-to-br from-emerald-50 via-white to-amber-50">
          <div className="flex items-start gap-3 pr-8">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-soft"
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Share with one tap
              </div>
              <h2 className="mt-0.5 font-heading text-xl sm:text-2xl font-black text-kiddo-ink">
                Share on WhatsApp
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                A one-image summary of your child&apos;s screening — perfect to
                send to family, your paediatrician or your therapist.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="px-4 sm:px-8 py-5 sm:py-7 overflow-y-auto"
          style={{ maxHeight: "calc(92vh - 170px)" }}
        >
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Preview card */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Preview
              </div>
              <div className="relative w-full aspect-square rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
                {cardUrl ? (
                  <img
                    src={cardUrl}
                    alt="Share card preview"
                    className="w-full h-full object-cover"
                    data-testid="whatsapp-share-card-image"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-slate-400">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 bg-white/60 grid place-items-center">
                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Actions + meta */}
            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Send it
              </div>

              <button
                type="button"
                onClick={onWhatsApp}
                disabled={!publicUrl || loading || sending}
                data-testid="whatsapp-share-send"
                className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors disabled:opacity-60 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.7)]"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing image…
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    Send on WhatsApp
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500 -mt-2">
                On mobile, WhatsApp will receive the card image + text + link
                together. On desktop the card downloads so you can attach it
                in the chat.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  disabled={!publicUrl}
                  data-testid="whatsapp-share-copy-text"
                  className="inline-flex items-center justify-center gap-2 h-11 px-3 rounded-full bg-white border border-slate-200 text-sm font-bold text-slate-900 hover:border-emerald-300 hover:text-emerald-700 transition-colors disabled:opacity-60"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? "Copied" : "Copy text"}
                </button>
                <button
                  type="button"
                  onClick={onDownloadCard}
                  disabled={!cardUrl}
                  data-testid="whatsapp-share-download-card"
                  className="inline-flex items-center justify-center gap-2 h-11 px-3 rounded-full bg-white border border-slate-200 text-sm font-bold text-slate-900 hover:border-amber-300 hover:text-amber-700 transition-colors disabled:opacity-60"
                  title="Open card image in a new tab"
                >
                  <Download className="w-4 h-4" /> Image
                </button>
              </div>

              {referralCode && (
                <div
                  data-testid="whatsapp-share-referral-pill"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
                >
                  Referral code included:{" "}
                  <span className="font-mono">{referralCode}</span>
                </div>
              )}

              {publicUrl && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Public link
                  </div>
                  <div
                    className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-700 break-all"
                    data-testid="whatsapp-share-public-url"
                  >
                    {publicUrl}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trust footer — same tone as ProcessDetailsDialog */}
          <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-emerald-900">
              The public link only reveals the summary report — never the
              original videos. Videos were deleted as soon as the report was
              generated.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
