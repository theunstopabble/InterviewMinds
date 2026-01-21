import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Upload,
} from "lucide-react";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // 1. Mobile Validation Fix
      if (
        selectedFile.type !== "application/pdf" &&
        !selectedFile.name.endsWith(".pdf")
      ) {
        toast.error("Invalid File", {
          description: "Please upload a valid PDF.",
        });
        return;
      }

      // 2. Size Limit Check (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File too large", { description: "Max size is 5MB." });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      // 3. Upload Request with Timeout
      const res = await api.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000, // 60 Seconds timeout for mobile
      });

      // ✅ FIX STARTS HERE: Handle both 'id' and '_id'
      const resumeId = res.data.id || res.data._id;

      if (!resumeId) {
        throw new Error("Server did not return a valid Resume ID");
      }

      // ✅ Store safely in LocalStorage
      localStorage.setItem("resumeId", resumeId);
      console.log("✅ Resume ID Saved:", resumeId);

      toast.success("Resume Analyzed!", {
        description: "Redirecting to interview setup...",
      });

      // Thoda delay taaki toast dikhe
      setTimeout(() => navigate("/interview"), 1000);
    } catch (error: any) {
      console.error("Upload failed", error);

      const errorMessage =
        error.response?.data?.error || "Connection Timeout or Server Error";

      toast.error("Upload Failed", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full bg-slate-900/50 border-slate-800 backdrop-blur-xl text-white shadow-2xl">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-2 animate-bounce-slow">
          <UploadCloud className="w-8 h-8 text-blue-500" />
        </div>
        <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          Upload Your Resume
        </CardTitle>
        <CardDescription className="text-slate-400 text-lg">
          PDF format only (Max 5MB). AI will analyze your profile.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-4">
            <Label
              htmlFor="resume"
              className="text-slate-300 font-medium text-md"
            >
              Select Resume
            </Label>
            <div className="relative group cursor-pointer">
              {/* 4. Accept 'application/pdf' explicitly */}
              <Input
                id="resume"
                type="file"
                accept="application/pdf, .pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="resume"
                className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                  file
                    ? "border-green-500/50 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                    : "border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-blue-500/50 hover:shadow-lg"
                }`}
              >
                {file ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-green-500 mb-3 animate-in zoom-in" />
                    <p className="text-lg text-green-400 font-semibold">
                      {file.name}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Ready to upload
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="w-10 h-10 text-slate-500 mb-3 group-hover:text-blue-400 transition-colors" />
                    <p className="text-lg text-slate-300 font-medium group-hover:text-white">
                      Click to browse
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      PDF Files Only
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || loading}
          className={`w-full h-14 text-xl font-bold rounded-xl transition-all duration-300 ${
            loading
              ? "bg-slate-800 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.02]"
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" /> Analyzing...
            </span>
          ) : (
            "Start AI Interview"
          )}
        </Button>

        {/* Security Note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <AlertCircle className="w-3 h-3" />
          <span>
            Your data is secure and used only for interview simulation.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
