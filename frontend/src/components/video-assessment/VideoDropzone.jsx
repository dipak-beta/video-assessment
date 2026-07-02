import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useCallback, useState } from "react";
import { CloudUpload, Trash2, RefreshCw, FileVideo, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import FaceBlurPreview from "./FaceBlurPreview";
import UploadProcessingSteps from "./UploadProcessingSteps";

const ACCEPT = {
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/webm": [".webm"],
};
const MAX = 200 * 1024 * 1024;

export default function VideoDropzone({
  domainKey,
  domainColor,
  onUpload,
  onDelete,
  uploaded,
  uploading,
  progress = 0,
  testIdUpload,
  testIdRemove,
  compact = false,
  uploadComplete = false,
  onProcessingComplete,
}) {
  const [localFile, setLocalFile] = useState(null);
  const [localFileUrl, setLocalFileUrl] = useState(null);

  const onDrop = useCallback(
    (accepted, rejected) => {
      if (rejected?.length) {
        toast.error(rejected[0]?.errors?.[0]?.message || "Invalid file");
        return;
      }
      const file = accepted[0];
      if (!file) return;
      if (file.size > MAX) {
        toast.error("Video exceeds 150 MB limit");
        return;
      }
      setLocalFile(file);
      setLocalFileUrl(URL.createObjectURL(file));
      onUpload(file);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    maxSize: MAX,
  });

  const isDone = !!uploaded && !uploading;
  const accent = domainColor || "#FF8A65";

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!isDone && !uploading && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            {...getRootProps()}
            data-testid={testIdUpload}
            className={`group cursor-pointer rounded-3xl border-2 border-dashed transition-all ${
              compact ? "p-6" : "p-10"
            } ${
              isDragActive
                ? "border-kiddo-coral bg-orange-50/60"
                : "border-slate-200 hover:border-kiddo-coral hover:bg-orange-50/30"
            }`}
            style={isDragActive ? { borderColor: accent } : {}}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: `${accent}1A`, color: accent }}
              >
                <CloudUpload className="w-7 h-7" />
              </div>
              <div className="mt-4 font-heading font-bold text-kiddo-ink text-lg">
                {isDragActive ? "Drop your video here" : "Drag & drop or click to upload"}
              </div>
              {!compact && (
                <div className="mt-1 text-sm text-slate-500">
                  MP4 · MOV · WEBM &nbsp;·&nbsp; up to 200 MB &nbsp;·&nbsp; 30 – 60 sec
                </div>
              )}
              {compact && (
                <div className="mt-1 text-xs text-slate-500">
                  MP4 · MOV · WEBM &nbsp;·&nbsp; up to 200 MB &nbsp;·&nbsp; 30 – 60 sec
                </div>
              )}
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" /> Encrypted & auto-deleted after analysis
              </div>
            </div>
          </motion.div>
        )}

        {uploading && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl p-6 sm:p-8 bg-orange-50/40 border border-orange-100"
          >
            <div className="flex items-center gap-3 text-kiddo-ink font-semibold">
              <CloudUpload className="w-5 h-5 text-kiddo-coral animate-pulse" />
              Uploading…
            </div>
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <div className="mt-2 text-xs text-slate-500">{progress}%</div>
            </div>

            {/* Inline 3-step processing animation — starts once upload
                progress crosses 90 %. Runs alongside the upload until the
                Post-Upload popup opens. */}
            <UploadProcessingSteps
              active={progress >= 90}
              uploadComplete={uploadComplete}
              onComplete={onProcessingComplete}
            />
          </motion.div>
        )}

        {isDone && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-5 bg-white border border-slate-100 shadow-soft flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileVideo className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-kiddo-ink truncate">
                {uploaded.filename || "Video uploaded"}
              </div>
              <div className="text-xs text-slate-500">
                {((uploaded.size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB · Encrypted
              </div>
            </div>
            <button
              type="button"
              {...getRootProps({})}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-kiddo-coralDeep"
            >
              <input {...getInputProps()} />
              <RefreshCw className="w-3.5 h-3.5" />
              Replace
            </button>
            <button
              type="button"
              data-testid={testIdRemove}
              onClick={() => {
                setLocalFile(null);
                setLocalFileUrl(null);
                onDelete();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {localFile && isDone && !compact && (
        <div className="mt-4">
          <FaceBlurPreview file={localFile} />
        </div>
      )}
      {localFileUrl && isDone && !compact && !localFile && (
        <video
          src={localFileUrl}
          controls
          className="mt-4 w-full rounded-2xl border border-slate-100"
        />
      )}
    </div>
  );
}
