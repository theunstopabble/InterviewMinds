import { AlertTriangle, ShieldAlert } from "lucide-react";

interface ProctoringUIProps {
  violationCount: number;
  lastViolation: string;
}

export default function ProctoringUI({
  violationCount,
  lastViolation,
}: ProctoringUIProps) {
  if (violationCount === 0) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-bold shadow-xl border backdrop-blur-md animate-bounce
          ${
            violationCount > 3
              ? "bg-red-600/90 text-white border-red-500"
              : "bg-orange-500/90 text-white border-orange-400"
          }
        `}
      >
        {violationCount > 3 ? (
          <ShieldAlert className="w-5 h-5" />
        ) : (
          <AlertTriangle className="w-5 h-5" />
        )}

        <div className="flex flex-col items-start leading-none gap-1">
          <span className="text-xs uppercase tracking-wider opacity-80">
            Proctoring Alert
          </span>
          <span className="text-sm">
            {violationCount > 3
              ? "Test Flagged 🚩"
              : `Warning ${violationCount}/3`}
          </span>
        </div>
      </div>

      {/* Last Violation Reason (Optional, small text below) */}
      <div className="text-center mt-1">
        <span className="text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full">
          {lastViolation}
        </span>
      </div>
    </div>
  );
}
