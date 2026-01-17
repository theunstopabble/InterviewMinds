import { Loader2, Terminal, AlertCircle } from "lucide-react";

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
    <div className="flex flex-col h-full bg-slate-950 border-t border-slate-800">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-medium">Console</span>
        </div>

        {/* RUN BUTTON */}
        <button
          onClick={onRun}
          disabled={isLoading}
          className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2
            ${
              isLoading
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
            }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Running...
            </>
          ) : (
            "▶ Run Code"
          )}
        </button>
      </div>

      {/* Output Area */}
      <div className="flex-1 p-4 font-mono text-sm overflow-auto max-h-[200px] bg-slate-950">
        {isLoading ? (
          <div className="text-slate-500 italic">
            Compiling and executing...
          </div>
        ) : error ? (
          <div className="text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <pre className="whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        ) : output ? (
          <pre className="text-green-400 whitespace-pre-wrap font-mono">
            {output}
          </pre>
        ) : (
          <div className="text-slate-600">
            Click "Run Code" to see the output here...
          </div>
        )}
      </div>
    </div>
  );
}
