import {
  Sparkles,
  StopCircle,
  Loader2,
  User,
  Zap,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InterviewHeaderProps {
  isSaving: boolean;
  onEndInterview: () => void;
  showSetup: boolean;
  personaName: string;
  difficulty: string;
  languageMode: string;
}

export function InterviewHeader({
  isSaving,
  onEndInterview,
  showSetup,
  personaName,
  difficulty,
  languageMode,
}: InterviewHeaderProps) {
  return (
    <div className="p-3 border-b border-white/10 flex flex-col gap-3 bg-slate-900/50 shrink-0">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-200">AI Interviewer</span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={onEndInterview}
          disabled={isSaving || showSetup}
          className="h-7 gap-2 text-xs"
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <StopCircle className="w-3 h-3" />
          )}
          End
        </Button>
      </div>

      {/* Static Info Badge */}
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/50 p-2 rounded-md border border-white/5">
        <User className="w-3 h-3" />
        <span className="font-medium text-slate-200">{personaName}</span>
        <span className="text-slate-600">|</span>
        <Zap className="w-3 h-3" />
        <span className="capitalize">{difficulty}</span>
        <span className="text-slate-600">|</span>
        <Languages className="w-3 h-3" />
        <span className="capitalize">{languageMode}</span>
      </div>
    </div>
  );
}
