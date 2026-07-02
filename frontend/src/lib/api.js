import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// ---- Pseudonymous parent identity (stored in localStorage) ----
const PARENT_KEY = "kiddoplus_parent_id";
export const getParentId = () => {
  try {
    return localStorage.getItem(PARENT_KEY) || null;
  } catch (e) {
    console.warn("localStorage unavailable (getParentId):", e);
    return null;
  }
};
export const setParentId = (pid) => {
  try {
    localStorage.setItem(PARENT_KEY, pid);
  } catch (e) {
    console.warn("localStorage unavailable (setParentId):", e);
  }
};

// Persist a referral code dropped in via ?ref=...
const REFERRAL_KEY = "kiddoplus_referral_code";
export const getStoredReferral = () => {
  try {
    return localStorage.getItem(REFERRAL_KEY) || null;
  } catch (e) {
    console.warn("localStorage unavailable (getStoredReferral):", e);
    return null;
  }
};
export const setStoredReferral = (code) => {
  try {
    if (code) localStorage.setItem(REFERRAL_KEY, code.toUpperCase());
  } catch (e) {
    console.warn("localStorage unavailable (setStoredReferral):", e);
  }
};

// ---- Endpoints ----
export const createSession = async ({ childName, childDob } = {}) => {
  const body = {
    parent_id: getParentId() || undefined,
    child_name: childName || undefined,
    child_dob: childDob || undefined,
    referral_code: getStoredReferral() || undefined,
  };
  const { data } = await api.post("/video-assessment/sessions", body);
  if (data?.parent_id) setParentId(data.parent_id);
  return data;
};

export const uploadVideo = async (sessionId, domainKey, file, onProgress) => {
  const form = new FormData();
  form.append("domain", domainKey);
  form.append("file", file);
  const { data } = await api.post(
    `/video-assessment/sessions/${sessionId}/upload`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }
  );
  return data;
};

export const deleteUpload = async (sessionId, domainKey) => {
  const { data } = await api.delete(
    `/video-assessment/sessions/${sessionId}/upload/${domainKey}`
  );
  return data;
};

export const startAnalysis = async (sessionId) => {
  const { data } = await api.post(
    `/video-assessment/sessions/${sessionId}/analyze`
  );
  return data;
};

export const getStatus = async (sessionId) => {
  const { data } = await api.get(
    `/video-assessment/sessions/${sessionId}/status`
  );
  return data;
};

export const getReport = async (sessionId) => {
  const { data } = await api.get(
    `/video-assessment/sessions/${sessionId}/report`
  );
  return data;
};

// Progressive analysis stream via WebSocket. Emits events for
// { type: "status" | "complete" | "error" }. Returns an object with a
// `close()` method the caller invokes on unmount. Falls back to `null` if
// WebSocket cannot be constructed (caller should then use HTTP polling).
export const openAnalysisStream = (sessionId, { onStatus, onComplete, onError, onClose } = {}) => {
  try {
    const wsBase = API.replace(/^http/i, "ws");
    const url = `${wsBase}/video-assessment/sessions/${sessionId}/stream`;
    const ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "status" && onStatus) onStatus(msg);
        else if (msg.type === "complete" && onComplete) onComplete(msg);
        else if (msg.type === "error" && onError) onError(msg);
      } catch (e) {
        console.debug("Analysis WS parse failed:", e);
      }
    };
    ws.onerror = (ev) => {
      console.debug("Analysis WS error:", ev);
    };
    ws.onclose = () => {
      if (onClose) onClose();
    };
    return {
      close: () => {
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        } catch (e) {
          console.debug("Analysis WS close failed:", e);
        }
      },
      socket: ws,
    };
  } catch (e) {
    console.debug("Failed to open analysis WS:", e);
    return null;
  }
};

export const getDemoReport = async () => {
  const { data } = await api.get(`/video-assessment/demo-report`);
  return data;
};

export const listDomains = async () => {
  const { data } = await api.get(`/video-assessment/domains`);
  return data.domains;
};

export const reportPdfUrl = (sessionId) =>
  `${API}/video-assessment/sessions/${sessionId}/report.pdf`;

export const shareCardUrl = (sessionId) =>
  `${API}/video-assessment/sessions/${sessionId}/share-card.png`;

export const sharedShareCardUrl = (slug) =>
  `${API}/video-assessment/shared/${slug}/share-card.png`;

export const createShareLink = async (sessionId) => {
  const { data } = await api.post(
    `/video-assessment/sessions/${sessionId}/share`
  );
  return data;
};

export const getSharedReport = async (slug) => {
  const { data } = await api.get(`/video-assessment/shared/${slug}`);
  return data;
};

export const getParentHistory = async (parentId) => {
  const { data } = await api.get(`/video-assessment/parents/${parentId}/history`);
  return data;
};

export const getTrustStats = async () => {
  const { data } = await api.get(`/video-assessment/trust-stats`);
  return data;
};

export const lookupReferral = async (code) => {
  const { data } = await api.get(
    `/video-assessment/referral/${encodeURIComponent(code)}`
  );
  return data;
};

// Re-analyse a single domain by uploading a fresh clip. Backend runs QC +
// cross-domain analysis on the new video and merges it into the existing
// report. Returns the refreshed report on success.
export const reanalyzeDomain = async (sessionId, domainKey, file, onProgress) => {
  const form = new FormData();
  form.append("domain", domainKey);
  form.append("file", file);
  const { data } = await api.post(
    `/video-assessment/sessions/${sessionId}/reanalyze-domain`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }
  );
  return data;
};

// Re-run the final report combiner (no re-upload needed). Used when the last
// analysis produced a 0 overall score because the final LLM call returned
// invalid JSON — observations are still on file.
export const retryReportAnalysis = async (sessionId) => {
  const { data } = await api.post(
    `/video-assessment/sessions/${sessionId}/retry-analysis`,
    {}
  );
  return data;
};
