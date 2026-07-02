import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import VideoAssessment from "@/pages/VideoAssessment";
import ReferralCapture from "@/components/video-assessment/ReferralCapture";
import { Toaster } from "sonner";

function App() {
  return (
    <div className="App">
      <Toaster position="top-center" richColors closeButton />
      <BrowserRouter>
        <ReferralCapture />
        {/* Single-page app — every route renders VideoAssessment which decides
            which dialog (if any) to open based on the URL. */}
        <Routes>
          <Route path="*" element={<VideoAssessment />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
