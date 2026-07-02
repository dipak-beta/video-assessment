import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, Copy, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createShareLink, reportPdfUrl, api } from "@/lib/api";
import WhatsAppShareDialog from "@/components/video-assessment/WhatsAppShareDialog";

// Inline WhatsApp glyph — lucide-react ships MessageCircle but not the official
// WhatsApp logo, and trademarked logos render better as crisp SVG anyway.
function WhatsAppIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 01-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 01-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.046 2.264v.114c-.015.99.472 1.977.962 2.78a16.4 16.4 0 002.51 3.32c.586.585 1.213.929 1.953 1.293.83.4 1.591.62 2.479.62.974 0 1.85-.227 2.665-.81.687-.5 1.117-1.207 1.117-2.073 0-.39-.21-.83-.563-.997-.464-.221-.974-.412-1.483-.642-.158-.072-.314-.143-.473-.215zM16.5 28.85c-.001 0 0 0 0 0a12.252 12.252 0 01-6.235-1.717l-.448-.268-4.643 1.224 1.236-4.55-.292-.464A12.32 12.32 0 014.298 16.4c.003-6.79 5.467-12.318 12.207-12.318a12.115 12.115 0 018.625 3.59 12.34 12.34 0 013.572 8.74C28.7 23.205 23.235 28.85 16.5 28.85zM27.94 5.038a14.426 14.426 0 00-10.343-4.32C9.62.718 3.124 7.236 3.12 15.247a14.74 14.74 0 001.953 7.39L3 30l7.532-1.977a14.405 14.405 0 006.971 1.78h.006c7.977 0 14.473-6.519 14.476-14.53.001-3.882-1.499-7.532-4.045-10.235z" />
    </svg>
  );
}

// Open a URL in a brand-new top-level tab. Returns the window handle (or null
// if popup blocked). We use `noopener` for safety but keep the reference so
// callers can detect when the popup was blocked.
const openInNewTab = (url) => {
  try {
    return window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    return null;
  }
};

// Build a temporary <a download> + click. Returns true if click succeeded.
// NOTE: silently blocked inside many sandboxed iframes — caller should treat
// the success as "best effort".
const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.target = "_self";
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    document.body.removeChild(a);
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }, 2000);
  }
};

const safeCopyToClipboard = async (text) => {
  // 1) Modern API (HTTPS + top frame + permission)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  // 2) execCommand fallback (works inside iframes more often)
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

export default function ReportActions({ sessionId, clipCount, elapsedSec }) {
  const [shareSlug, setShareSlug] = useState(null);
  const [busyShare, setBusyShare] = useState(false);
  const [busyDownload, setBusyDownload] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waOpen, setWaOpen] = useState(false);

  if (!sessionId || sessionId === "demo") return null;

  const shareUrl = shareSlug
    ? `${window.location.origin}/r/${shareSlug}`
    : null;

  // -----------------------------
  // Download PDF
  // -----------------------------
  // Strategy that works both in a plain browser tab AND inside the Emergent
  // preview iframe (which sandboxes <a download>):
  //   1) Try opening the PDF URL in a brand-new top-level tab. The backend
  //      sets Content-Disposition: attachment so the browser will offer the
  //      save dialog directly. This is the most reliable path inside iframes.
  //   2) If the popup is blocked, fall back to the blob+<a download> approach.
  //   3) If even that fails, show the URL so the user can right-click → save.
  const onDownload = async () => {
    if (busyDownload) return;
    setBusyDownload(true);
    const url = reportPdfUrl(sessionId);
    try {
      // Path 1: open in new tab (works inside the Emergent preview iframe)
      const w = openInNewTab(url);
      if (w) {
        toast.success("Report opened in a new tab — your browser will offer to save it");
        return;
      }
      // Path 2: blob download fallback
      const { data } = await api.get(
        `/video-assessment/sessions/${sessionId}/report.pdf`,
        { responseType: "blob" }
      );
      const blob = new Blob([data], { type: "application/pdf" });
      triggerBlobDownload(blob, `kiddoplus-report-${sessionId.slice(0, 8)}.pdf`);
      toast.success("Report PDF downloaded");
    } catch (e) {
      // Path 3: surface the direct URL so the user can use it manually
      toast.error(
        <span>
          Couldn&apos;t auto-download.{" "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold"
          >
            Open PDF
          </a>
        </span>
      );
    } finally {
      setBusyDownload(false);
    }
  };

  // -----------------------------
  // Share with paediatrician
  // -----------------------------
  // Always create the shareable link first, render it inline, then *attempt*
  // native share / clipboard as a convenience. Even if those fail (common in
  // sandboxed iframes), the user can copy/click the inline link.
  const onShare = async () => {
    if (busyShare) return;
    setBusyShare(true);
    setCopied(false);
    try {
      const { slug } = await createShareLink(sessionId);
      setShareSlug(slug);
      const url = `${window.location.origin}/r/${slug}`;

      // Try native share first (mobile / Web Share API)
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Kiddo+ developmental screening report",
            text: "Here is my child's Kiddo+ AI screening report.",
            url,
          });
          toast.success("Share dialog opened");
          return;
        } catch { /* user dismissed — fall through to clipboard */ }
      }

      const ok = await safeCopyToClipboard(url);
      if (ok) {
        setCopied(true);
        toast.success("Share link copied to clipboard");
      } else {
        toast.message("Share link ready — copy it from below");
      }
    } catch (e) {
      toast.error("Could not create share link");
    } finally {
      setBusyShare(false);
    }
  };

  const onCopy = async () => {
    if (!shareUrl) return;
    const ok = await safeCopyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.message("Select the link and copy manually");
    }
  };

  return (
    <motion.div
      data-testid="report-actions"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2 w-full sm:w-auto"
    >
      <button
        type="button"
        onClick={onDownload}
        disabled={busyDownload}
        data-testid="report-download-pdf"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-kiddo-coral text-white text-sm font-bold hover:bg-kiddo-coralDeep transition-colors shadow-[0_10px_30px_-12px_rgba(255,138,101,0.7)] disabled:opacity-60"
        title="Download report PDF"
        aria-label="Download report PDF"
      >
        {busyDownload ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {busyDownload ? "Preparing…" : "Download"}
      </button>
      <button
        type="button"
        onClick={onShare}
        disabled={busyShare}
        data-testid="report-share"
        className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-200 text-kiddo-ink hover:border-kiddo-coral hover:text-kiddo-coralDeep transition-colors disabled:opacity-60"
        title={shareSlug ? "Share link ready" : "Share with paediatrician"}
        aria-label={shareSlug ? "Share link ready" : "Share with paediatrician"}
      >
        {busyShare ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
      </button>
      <button
        type="button"
        onClick={() => setWaOpen(true)}
        data-testid="report-share-whatsapp"
        className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-[0_10px_30px_-12px_rgba(16,185,129,0.7)]"
        title="Share on WhatsApp"
        aria-label="Share on WhatsApp"
      >
        <WhatsAppIcon className="w-5 h-5" />
      </button>
      <WhatsAppShareDialog
        open={waOpen}
        onClose={() => setWaOpen(false)}
        sessionId={sessionId}
        clipCount={clipCount}
        elapsedSec={elapsedSec}
      />
      {shareUrl && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 h-10 max-w-full rounded-full bg-emerald-50 border border-emerald-200 text-xs"
          data-testid="report-share-link"
        >
          {copied ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          )}
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono truncate text-emerald-900 hover:underline max-w-[16rem]"
            data-testid="report-share-link-url"
          >
            {shareUrl}
          </a>
          <button
            type="button"
            onClick={onCopy}
            className="text-emerald-700 hover:text-emerald-900 shrink-0"
            aria-label="Copy link"
            data-testid="report-share-link-copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
