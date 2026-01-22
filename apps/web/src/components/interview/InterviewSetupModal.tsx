import {
  Settings2,
  Sparkles,
  Languages,
  User,
  Zap,
  ShieldAlert,
  Smile,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface InterviewSetupModalProps {
  open: boolean;
  onStart: () => void;
  onCancel: () => void; // ✅ Added onCancel prop
  languageMode: string;
  setLanguageMode: (val: string) => void;
  persona: string;
  setPersona: (val: string) => void;
  difficulty: string;
  setDifficulty: (val: string) => void;
}

export function InterviewSetupModal({
  open,
  onStart,
  onCancel, // ✅ Destructure onCancel
  languageMode,
  setLanguageMode,
  persona,
  setPersona,
  difficulty,
  setDifficulty,
}: InterviewSetupModalProps) {
  return (
    // ✅ FIX 1: Allow dialog to close via 'X' or outside click
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-2xl shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-blue-500" />
            Interview Setup
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure your interviewer, difficulty, and language.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Language Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Languages className="w-4 h-4 text-blue-400" /> Preferred Language
            </Label>
            <RadioGroup
              value={languageMode}
              onValueChange={setLanguageMode}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="english"
                  id="english"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="english"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-700/80 hover:text-white peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500/10 peer-data-[state=checked]:text-blue-400 cursor-pointer transition-all"
                >
                  <span className="text-2xl mb-2">🇺🇸</span>
                  <span className="font-semibold">English</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="hinglish"
                  id="hinglish"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="hinglish"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-700/80 hover:text-white peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-500/10 peer-data-[state=checked]:text-purple-400 cursor-pointer transition-all"
                >
                  <span className="text-2xl mb-2">🇮🇳</span>
                  <span className="font-semibold">Hinglish</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Persona Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <User className="w-4 h-4 text-green-400" /> Select Interviewer
              </Label>
              <RadioGroup
                value={persona}
                onValueChange={setPersona}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="strict"
                    id="strict"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="strict"
                    className="flex flex-1 items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:text-green-400"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="w-5 h-5 opacity-70" />
                      <div>
                        <div className="font-semibold">Vikram (Strict)</div>
                        <div className="text-xs text-slate-400">
                          Senior Staff Engineer
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="friendly"
                    id="friendly"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="friendly"
                    className="flex flex-1 items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-pink-500 peer-data-[state=checked]:text-pink-400"
                  >
                    <div className="flex items-center gap-3">
                      <Smile className="w-5 h-5 opacity-70" />
                      <div>
                        <div className="font-semibold">Neha (Friendly)</div>
                        <div className="text-xs text-slate-400">
                          Engineering Manager
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="system"
                    id="system"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="system"
                    className="flex flex-1 items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-yellow-500 peer-data-[state=checked]:text-yellow-400"
                  >
                    <div className="flex items-center gap-3">
                      <Brain className="w-5 h-5 opacity-70" />
                      <div>
                        <div className="font-semibold">Sam (System)</div>
                        <div className="text-xs text-slate-400">
                          System Architect
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Difficulty Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> Select Difficulty
              </Label>
              <RadioGroup
                value={difficulty}
                onValueChange={setDifficulty}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="easy"
                    id="easy"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="easy"
                    className="w-full text-center rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-blue-400 peer-data-[state=checked]:text-blue-400 font-medium"
                  >
                    Easy
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="medium"
                    id="medium"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="medium"
                    className="w-full text-center rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-yellow-400 peer-data-[state=checked]:text-yellow-400 font-medium"
                  >
                    Medium
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="hard"
                    id="hard"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="hard"
                    className="w-full text-center rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:bg-slate-700 cursor-pointer peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:text-red-500 font-medium"
                  >
                    Hard
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2 border-t border-white/10 pt-4">
          {/* ✅ FIX 2: Connect Cancel Button to onCancel prop */}
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={onStart}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg w-full sm:w-auto"
          >
            Start Interview <Sparkles className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
