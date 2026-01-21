import { Editor } from "@monaco-editor/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Code2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeEditorProps {
  code: string;
  setCode: (value: string | undefined) => void;
  language: string;
  setLanguage: (value: string) => void;
}

// 🎨 Supported Languages Configuration
const LANGUAGES = [
  { id: "javascript", name: "JavaScript (Node.js)" },
  { id: "python", name: "Python 3" },
  { id: "java", name: "Java" },
  { id: "cpp", name: "C++" },
];

export default function CodeEditor({
  code,
  setCode,
  language,
  setLanguage,
}: CodeEditorProps) {
  // Reset Code Helper
  const handleReset = () => {
    setCode("// Write your code here...");
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-white/10">
      {/* 🛠️ EDITOR TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/10 shrink-0">
        {/* Left: Title & Language Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Code2 className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider uppercase">
              Editor
            </span>
          </div>

          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-7 w-[160px] bg-[#3c3c3c] border-none text-xs text-white focus:ring-1 focus:ring-blue-500">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className="bg-[#252526] border-slate-700 text-white">
              {LANGUAGES.map((lang) => (
                <SelectItem
                  key={lang.id}
                  value={lang.id}
                  className="text-xs cursor-pointer hover:bg-slate-700 focus:bg-slate-700"
                >
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right: Actions & Status */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-6 w-6 text-slate-500 hover:text-white hover:bg-slate-700"
            title="Reset Code"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>

          <Badge
            variant="outline"
            className="border-green-500/30 text-green-400 text-[10px] px-2 h-5 bg-green-500/10 hidden sm:flex"
          >
            Auto-Save On
          </Badge>
        </div>
      </div>

      {/* 📝 MONACO EDITOR ENGINE */}
      <div className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark" // Professional Dark Theme
          onChange={(value) => setCode(value)}
          options={{
            minimap: { enabled: false }, // Clean look
            fontSize: 14,
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true, // Auto-resize handle karega
            cursorBlinking: "smooth",
            smoothScrolling: true,
            padding: { top: 16 },
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
