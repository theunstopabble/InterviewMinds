import { Link, useLocation } from "react-router-dom";
import { UserButton, useAuth } from "@clerk/clerk-react";
import { LayoutDashboard, PlusCircle, Download, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

// ✅ TypeScript definition for Global Window Variable
declare global {
  interface Window {
    deferredPrompt: any;
  }
}

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ===========================================================================
  // 📱 PWA INSTALL LOGIC (Robust & Mobile Friendly)
  // ===========================================================================
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check Standalone Mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // 2. Check Global Variable (Mobile Fix)
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      window.deferredPrompt = null;
    }

    // 3. Listen for Events
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* ================= LEFT: LOGO (Image restored) ================= */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <img
            src="/pwa-192x192.png"
            alt="InterviewMinds Logo"
            className="w-8 h-8 rounded-lg shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-blue-100 to-purple-200 bg-clip-text text-transparent tracking-tight">
            InterviewMinds
          </span>
        </Link>

        {/* ================= CENTER/RIGHT: DESKTOP MENU ================= */}
        <div className="hidden md:flex items-center gap-4">
          {/* 1. Install App Button (Purple Glassy Theme) */}
          {!isInstalled && deferredPrompt && (
            <Button
              onClick={handleInstallClick}
              variant="outline"
              size="sm"
              className="gap-2 border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 hover:border-purple-500/60 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide">
                Install App
              </span>
            </Button>
          )}

          {/* 2. Navigation Links */}
          {isSignedIn ? (
            <>
              <Link to="/dashboard">
                <Button
                  variant="ghost"
                  className={`gap-2 hover:bg-white/5 transition-colors ${
                    isActive("/dashboard")
                      ? "text-white bg-white/10"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden lg:inline">Dashboard</span>
                </Button>
              </Link>

              {/* 🚀 New Interview (Links to Home for Resume Check) */}
              <Link to="/">
                <Button
                  className={`gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-blue-500/20 transition-all duration-300 ${
                    isActive("/") ? "ring-2 ring-purple-500/50" : ""
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="font-semibold">New Interview</span>
                </Button>
              </Link>

              {/* User Profile (Gradient Ring) */}
              <div className="ml-2 w-9 h-9 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 p-[1px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                  <UserButton
                    afterSignOutUrl="/sign-in"
                    appearance={{
                      elements: {
                        avatarBox: "w-full h-full",
                      },
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <Link to="/sign-in">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all">
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* ================= RIGHT: MOBILE ACTIONS ================= */}
        <div className="flex items-center gap-3 md:hidden">
          {/* Mobile Install Icon (Purple Theme) */}
          {!isInstalled && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 active:scale-95 transition-all"
              title="Install App"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          {/* Mobile User Profile */}
          {isSignedIn && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                <UserButton
                  afterSignOutUrl="/sign-in"
                  appearance={{ elements: { avatarBox: "w-full h-full" } }}
                />
              </div>
            </div>
          )}

          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-300 hover:text-white p-1"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* ================= MOBILE MENU DROPDOWN ================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 p-4 space-y-3 animate-in slide-in-from-top-2 absolute w-full left-0 shadow-2xl">
          {isSignedIn ? (
            <>
              {/* Fallback Install Button inside Menu (Purple Theme) */}
              {!isInstalled && deferredPrompt && (
                <Button
                  onClick={handleInstallClick}
                  variant="outline"
                  className="w-full justify-start gap-2 border-purple-500/30 text-purple-300 bg-purple-500/5 mb-2 hover:bg-purple-500/10"
                >
                  <Download className="w-4 h-4" /> Install App
                </Button>
              )}

              <Link to="/dashboard">
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-2 ${
                    isActive("/dashboard")
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>

              {/* 🚀 Mobile Link to Home */}
              <Link to="/">
                <Button className="w-full justify-start gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
                  <PlusCircle className="w-4 h-4" />
                  New Interview
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/sign-in">
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
