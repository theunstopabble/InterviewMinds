import { Editor } from "@monaco-editor/react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";

interface CodeEditorProps {
  code: string;
  setCode: (value: string | undefined) => void;
  language: string;
  setLanguage: (value: string) => void;
}

export default function CodeEditor({ code, setCode, language, setLanguage }: CodeEditorProps) {
  
  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-white/10">
      
      {/* --- Toolbar (Top Bar) --- */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-400">Language:</span>
          {/* Language Selector */}
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px] h-8 bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
           {/* Reset Button */}
           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => setCode("// Write your code here...")}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          {/* Run Button (Abhi functionality baad mein denge) */}
          <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white gap-2 h-8">
            <Play className="w-3 h-3" />
            Run Code
          </Button>
        </div>
      </div>

      {/* --- The Monaco Editor --- */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onChange={(value) => setCode(value)}
          options={{
            minimap: { enabled: false }, // Chota map hataya clean look ke liye
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16 },
            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
          }}
        />
      </div>
    </div>
  );
}