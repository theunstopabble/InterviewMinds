import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import ResumeUpload from "./components/ResumeUpload";
import InterviewPage from "./pages/InterviewPage";
import FeedbackPage from "./pages/FeedbackPage";
import SignInPage from "./pages/SignInPage";
import DashboardPage from "./pages/DashboardPage";
import Navbar from "./components/Navbar"; // ✅ Updated Navbar import
import { AxiosInterceptor } from "./components/AxiosInterceptor";
import { Toaster } from "@/components/ui/sonner";

// 🏠 Home Component (Resume Upload Screen)
function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-6 sm:px-6">
      <div className="text-center mb-8 sm:mb-10 space-y-4">
        {/* 👇 FIX: Responsive Font Sizes (4xl on mobile, 7xl on desktop) to prevent cutting */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 drop-shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-1000 leading-tight break-words">
          InterviewMinds
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 px-2">
          Upload your resume and let our AI simulate a real Google-style
          interview.
        </p>
      </div>

      <div className="w-full max-w-3xl animate-in zoom-in duration-700 delay-300">
        <ResumeUpload />
      </div>
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

      {/* Main Content Area 
         pt-16 (Mobile) and pt-20 (Desktop) is critical so content isn't hidden behind the Fixed Navbar 
      */}
      <div className="pt-16 sm:pt-20">
        <AxiosInterceptor>
          <Routes>
            {/* 🔓 Public Route */}
            <Route path="/sign-in" element={<SignInPage />} />

            {/* 🔒 Protected Home Route */}
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

            {/* 🔒 Protected Dashboard Route */}
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

            {/* 🔒 Protected Interview Route */}
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

            {/* 🔒 Protected Feedback Route */}
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
          </Routes>
        </AxiosInterceptor>
      </div>

      {/* Global Toaster for Notifications */}
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}

export default App;
