import { Terminal, Play, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OutputConsoleProps {
  output: string | null;
  error: string | null;
  isLoading: boolean;
  onRun: () => void;
}

export function OutputConsole({
  output,
  error,
  isLoading,
  onRun,
}: OutputConsoleProps) {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-slate-700">
      {/* 🖥️ HEADER BAR */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-wider uppercase">
            Console
          </span>
        </div>

        {/* RUN BUTTON (Styled like VS Code) */}
        <Button
          size="sm"
          onClick={onRun}
          disabled={isLoading}
          className={`h-7 text-xs font-semibold gap-2 transition-all ${
            isLoading
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]"
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          {isLoading ? "Running..." : "Run Code"}
        </Button>
      </div>

      {/* 📄 OUTPUT DISPLAY AREA */}
      <ScrollArea className="flex-1 p-4 font-mono text-sm">
        {/* 1. Empty State */}
        {!output && !error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2 opacity-50 mt-8">
            <Terminal className="w-10 h-10" />
            <p className="text-xs uppercase tracking-widest">
              Ready to Execute
            </p>
          </div>
        )}

        {/* 2. Loading State */}
        {isLoading && (
          <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Compiling and executing code...</span>
          </div>
        )}

        {/* 3. Error Output */}
        {error && (
          <div className="text-red-400 whitespace-pre-wrap bg-red-950/20 p-3 rounded-md border border-red-500/20">
            <div className="flex items-center gap-2 mb-2 border-b border-red-500/20 pb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="font-bold">Execution Error</span>
            </div>
            {error}
          </div>
        )}

        {/* 4. Success Output */}
        {output && (
          <div className="text-slate-300 whitespace-pre-wrap font-fira leading-relaxed">
            <span className="text-green-500 mr-2 select-none">➜</span>
            {output}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
