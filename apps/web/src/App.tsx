import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom"; // ✅ Added useLocation
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Play, Upload, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Components
import Navbar from "./components/Navbar";
import { AxiosInterceptor } from "./components/AxiosInterceptor";
import { Footer } from "./components/Footer";
import ResumeUpload from "./components/ResumeUpload";
import { Toaster } from "@/components/ui/sonner";

// Pages
import SignInPage from "./pages/SignInPage";
import DashboardPage from "./pages/DashboardPage";
import InterviewPage from "./pages/InterviewPage";
import FeedbackPage from "./pages/FeedbackPage";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminPage from "./pages/AdminPage";
import CandidatePortal from "./pages/CandidatePortal";
import SchedulingPage from "./pages/SchedulingPage";
import QuestionBankPage from "./pages/QuestionBankPage";
import ReportsPage from "./pages/ReportsPage";
import PreparationPage from "./pages/PreparationPage";
import PipelinePage from "./pages/PipelinePage";

// 🏠 Home Component (Smart Resume Handling)
function Home() {
  const navigate = useNavigate();
  const [hasResume, setHasResume] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

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
              <h3 className="text-xl font-semibold text-white">Resume Found</h3>
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
                onClick={() => setShowUpload(true)}
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
          {/* ✅ BACK BUTTON */}
          {hasResume && (
            <Button
              variant="ghost"
              onClick={() => setShowUpload(false)}
              className="self-start text-slate-400 hover:text-white -ml-2 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Saved Resume
            </Button>
          )}

          <ResumeUpload />

          {!hasResume && (
            <div className="mt-6 text-center border border-slate-800 rounded-xl p-5 bg-slate-900/30">
              <p className="text-slate-400 text-sm mb-3">
                Don't have a resume yet?
              </p>
              <a
                href="https://texfolio.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-600/20"
              >
                <FileText className="w-4 h-4" />
                Build One with TexFolio →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 🔒 Reusable Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/sign-in" replace />
      </SignedOut>
    </>
  );
}

// 🌐 Main App Component
function App() {
  const location = useLocation();
  const isFocusMode = location.pathname === "/interview";
  const isPublicPage =
    location.pathname === "/sign-in" || location.pathname === "/sign-up";

  return (
    <div className="relative min-h-screen flex flex-col bg-gray-950 text-white font-sans selection:bg-blue-500/30">
      {/* 🔒 Navbar: Shows automatically when logged in, BUT HIDDEN IN FOCUS MODE */}
      <SignedIn>{!isFocusMode && <Navbar />}</SignedIn>

      {/* Main Content Area */}
      <div
        className={`flex-1 ${isFocusMode || isPublicPage ? "" : "pt-16 sm:pt-20"}`}
      >
        <AxiosInterceptor>
          <Routes>
            {/* 🔓 Public Route: Sign In */}
            <Route path="/sign-in" element={<SignInPage />} />

            {/* 🔒 Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/interview" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
            <Route path="/feedback/:id" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/candidate-portal" element={<ProtectedRoute><CandidatePortal /></ProtectedRoute>} />
            <Route path="/scheduling" element={<ProtectedRoute><SchedulingPage /></ProtectedRoute>} />
            <Route path="/questions" element={<ProtectedRoute><QuestionBankPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/preparation" element={<ProtectedRoute><PreparationPage /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />

            {/* 404 Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AxiosInterceptor>
      </div>

      {/* Footer — Developer attribution (SEO: dofollow portfolio link) */}
      {!isFocusMode && !isPublicPage && <Footer />}

      {/* Global Notifications */}
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}

export default App;
