import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  Download,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function Navbar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- 📱 PWA INSTALL LOGIC START ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // 2. Listen for "Ready to Install" event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // Stop default browser prompt
      setDeferredPrompt(e); // Save event
    };

    // 3. Listen for success
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
        handleBeforeInstallPrompt
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
  // --- 📱 PWA INSTALL LOGIC END ---

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* ================= LEFT: LOGO ================= */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600/20 p-2 rounded-lg group-hover:bg-blue-600/30 transition-colors">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            InterviewMinds
          </span>
        </Link>

        {/* ================= CENTER: DESKTOP MENU ================= */}
        <div className="hidden md:flex items-center gap-4">
          {/* 👇 Desktop Install Button */}
          {!isInstalled && deferredPrompt && (
            <Button
              onClick={handleInstallClick}
              variant="outline"
              size="sm"
              className="gap-2 border-green-500/30 text-green-400 hover:text-green-300 hover:bg-green-500/10 animate-pulse"
            >
              <Download className="w-4 h-4" />
              Install App
            </Button>
          )}

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

          <Link to="/">
            <Button
              className={`gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0 ${
                isActive("/")
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
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>

        {/* ================= RIGHT: MOBILE ACTIONS ================= */}
        <div className="flex items-center gap-3 md:hidden">
          {/* 👇 Mobile Install Icon (Icon Only to save space) */}
          {!isInstalled && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="p-2 rounded-full bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all border border-green-500/30 animate-pulse"
              title="Install App"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          {/* User Profile (Smaller) */}
          <div className="scale-90">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>

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
        <div className="md:hidden bg-slate-950 border-b border-white/10 p-4 space-y-3 animate-in slide-in-from-top-2">
          <Link to="/dashboard">
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

          <Link to="/">
            <Button className="w-full justify-start gap-2 bg-gradient-to-r from-blue-600 to-purple-600">
              <PlusCircle className="w-4 h-4" />
              New Interview
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
