import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Play, Upload, FileText, ArrowLeft } from "lucide-react"; // ✅ Added ArrowLeft
import { Button } from "@/components/ui/button";

// Components
import Navbar from "./components/Navbar";
import { AxiosInterceptor } from "./components/AxiosInterceptor";
import ResumeUpload from "./components/ResumeUpload";
import { Toaster } from "@/components/ui/sonner";

// Pages
import SignInPage from "./pages/SignInPage";
import DashboardPage from "./pages/DashboardPage";
import InterviewPage from "./pages/InterviewPage";
import FeedbackPage from "./pages/FeedbackPage";

// 🏠 Home Component (Smart Resume Handling)
function Home() {
  const navigate = useNavigate();
  const [hasResume, setHasResume] = useState(false);
  const [showUpload, setShowUpload] = useState(false); // ✅ New Toggle State

  // 🕵️‍♂️ Check for existing resume on mount
  useEffect(() => {
    const storedResumeId = localStorage.getItem("resumeId");
    if (storedResumeId) {
      setHasResume(true);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-6 sm:px-6">
      <div className="text-center mb-8 sm:mb-10 space-y-4">
        {/* Responsive Typography */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 drop-shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-1000 leading-tight break-words">
          InterviewMinds
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 px-2">
          Upload your resume and let our AI simulate a real Google-style
          interview.
        </p>
      </div>

      {/* 🧠 SMART LOGIC: Resume Found vs New User */}
      {hasResume && !showUpload ? (
        <div className="w-full max-w-md animate-in zoom-in duration-500">
          <div className="bg-slate-900/50 border border-blue-500/20 p-6 rounded-2xl backdrop-blur-md shadow-2xl relative overflow-hidden group">
            {/* Decoration Gradient */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500"></div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Resume Found</h2>
            </div>

            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              We found a saved resume from your last session. Would you like to
              continue with it or start fresh?
            </p>

            <div className="space-y-3">
              {/* Option 1: Continue */}
              <Button
                onClick={() => navigate("/interview")}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 h-12 text-base font-semibold shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                Continue with Previous Resume
              </Button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink-0 mx-4 text-slate-600 text-xs uppercase tracking-wider font-medium">
                  Or
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {/* Option 2: Upload New (Non-Destructive) */}
              <Button
                variant="outline"
                onClick={() => setShowUpload(true)} // ✅ Only changes view, keeps data
                className="w-full border-slate-700 bg-slate-950/50 hover:bg-slate-900 hover:text-white h-12 text-base transition-all"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New Resume
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* 📤 Default Upload View */
        <div className="w-full max-w-3xl animate-in zoom-in duration-700 delay-300 flex flex-col gap-4">
          {/* ✅ BACK BUTTON: Only shows if user has a saved resume to go back to */}
          {hasResume && (
            <Button
              variant="ghost"
              onClick={() => setShowUpload(false)} // ✅ Go back to "Continue" screen
              className="self-start text-slate-400 hover:text-white -ml-2 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Saved Resume
            </Button>
          )}

          <ResumeUpload />
        </div>
      )}
    </div>
  );
}

// 🌐 Main App Component
function App() {
  return (
    <div className="relative min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500/30">
      {/* 🔒 Navbar: Shows automatically when logged in */}
      <SignedIn>
        <Navbar />
      </SignedIn>

      {/* Main Content Area */}
      <div className="pt-16 sm:pt-20">
        <AxiosInterceptor>
          <Routes>
            {/* 🔓 Public Route: Sign In */}
            <Route path="/sign-in" element={<SignInPage />} />

            {/* 🔒 Protected Route: Home (Resume Upload) */}
            <Route
              path="/"
              element={
                <>
                  <SignedIn>
                    <Home />
                  </SignedIn>
                  <SignedOut>
                    <Navigate to="/sign-in" replace />
                  </SignedOut>
                </>
              }
            />

            {/* 🔒 Protected Route: Dashboard (History & Stats) */}
            <Route
              path="/dashboard"
              element={
                <>
                  <SignedIn>
                    <DashboardPage />
                  </SignedIn>
                  <SignedOut>
                    <Navigate to="/sign-in" replace />
                  </SignedOut>
                </>
              }
            />

            {/* 🔒 Protected Route: Interview Session */}
            <Route
              path="/interview"
              element={
                <>
                  <SignedIn>
                    <InterviewPage />
                  </SignedIn>
                  <SignedOut>
                    <Navigate to="/sign-in" replace />
                  </SignedOut>
                </>
              }
            />

            {/* 🔒 Protected Route: Feedback Report */}
            <Route
              path="/feedback/:id"
              element={
                <>
                  <SignedIn>
                    <FeedbackPage />
                  </SignedIn>
                  <SignedOut>
                    <Navigate to="/sign-in" replace />
                  </SignedOut>
                </>
              }
            />

            {/* 404 Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AxiosInterceptor>
      </div>

      {/* Global Notifications */}
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}

export default App;
