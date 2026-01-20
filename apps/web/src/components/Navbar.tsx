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
  // 📱 PWA INSTALL LOGIC (Fixed for Mobile Race Conditions)
  // ===========================================================================
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed (Standalone Mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // 2. ⚡ CHECK GLOBAL VARIABLE (Mobile Fix)
    // Agar React load hone se pehle event fire ho gaya tha (index.html me), to yahan se utha lo.
    if (window.deferredPrompt) {
      console.log("✅ Found global PWA event captured in index.html");
      setDeferredPrompt(window.deferredPrompt);
      window.deferredPrompt = null; // Clear global to avoid duplicates
    }

    // 3. Listen for "beforeinstallprompt" event (Future events)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // Prevent default mini-infobar
      console.log("📢 PWA Event Fired inside React!");
      setDeferredPrompt(e); // Save event for later
    };

    // 4. Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log("App Installed Successfully");
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
    deferredPrompt.prompt(); // Show install prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };
  // ===========================================================================
  // 📱 PWA INSTALL LOGIC (End)
  // ===========================================================================

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* ================= LEFT: LOGO ================= */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <img
            src="/pwa-192x192.png"
            alt="InterviewMinds Logo"
            className="w-8 h-8 rounded-lg shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300"
          />
          <span className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            InterviewMinds
          </span>
        </Link>

        {/* ================= CENTER: DESKTOP MENU ================= */}
        <div className="hidden md:flex items-center gap-4">
          {/* 1. Install App Button (Only if installable) */}
          {!isInstalled && deferredPrompt && (
            <Button
              onClick={handleInstallClick}
              variant="outline"
              size="sm"
              className="gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 animate-pulse"
            >
              <Download className="w-4 h-4" />
              Install App
            </Button>
          )}

          {/* 2. Navigation Links (Only if Signed In) */}
          {isSignedIn ? (
            <>
              <Link to="/dashboard">
                <Button
                  variant="ghost"
                  className={`gap-2 text-slate-300 hover:text-white hover:bg-white/5 ${
                    isActive("/dashboard") ? "bg-white/10 text-white" : ""
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>

              <Link to="/interview">
                <Button
                  className={`gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0 ${
                    isActive("/interview")
                      ? "opacity-100 shadow-lg shadow-blue-500/20"
                      : "opacity-90"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  New Interview
                </Button>
              </Link>

              {/* User Profile */}
              <div className="ml-2">
                <UserButton
                  afterSignOutUrl="/sign-in"
                  appearance={{
                    elements: {
                      avatarBox:
                        "w-9 h-9 border-2 border-slate-700 hover:border-blue-500 transition-all",
                    },
                  }}
                />
              </div>
            </>
          ) : (
            /* 3. Sign In Button (If logged out) */
            <Link to="/sign-in">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* ================= RIGHT: MOBILE ACTIONS ================= */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile Install Icon */}
          {!isInstalled && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 animate-pulse active:scale-95 transition-all"
              title="Install App"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          {/* Mobile User Profile */}
          {isSignedIn ? (
            <div className="flex items-center justify-center">
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{ elements: { avatarBox: "w-8 h-8" } }}
              />
            </div>
          ) : null}

          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-300 hover:text-white p-1 ml-1"
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
        <div className="md:hidden bg-slate-950 border-b border-white/10 p-4 space-y-3 animate-in slide-in-from-top-2 shadow-2xl">
          {isSignedIn ? (
            <>
              {/* Fallback Install Button inside Menu */}
              {!isInstalled && deferredPrompt && (
                <Button
                  onClick={handleInstallClick}
                  variant="outline"
                  className="w-full justify-start gap-2 border-green-500/30 text-green-400 mb-2"
                >
                  <Download className="w-4 h-4" /> Install App
                </Button>
              )}

              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-2 ${
                    isActive("/dashboard")
                      ? "bg-white/10 text-white"
                      : "text-slate-300"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>

              <Link to="/interview" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full justify-start gap-2 bg-gradient-to-r from-blue-600 to-purple-600">
                  <PlusCircle className="w-4 h-4" />
                  New Interview
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="w-full bg-blue-600 hover:bg-blue-500">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
