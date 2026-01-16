import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { LayoutDashboard, PlusCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo Area */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600/20 p-2 rounded-lg group-hover:bg-blue-600/30 transition-colors">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            InterviewMinds
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          {/* Dashboard Link */}
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

          {/* New Interview Link */}
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

          {/* User Profile (Clerk) */}
          <div className="h-8 w-8 ml-2 border border-slate-700 rounded-full flex items-center justify-center">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </div>
    </nav>
  );
}
