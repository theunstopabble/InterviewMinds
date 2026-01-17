import { api } from "@/lib/api";

// Response ka Type Definition (Taaki TypeScript khush rahe)
export interface ExecutionResult {
  run: {
    stdout: string; // Asli output
    stderr: string; // Agar koi error aaya
    output: string; // Combined output
    code: number; // 0 matlab success, 1 matlab error
  };
  language: string;
  version: string;
}

// Backend ko call karne wala function
export const executeCode = async (language: string, code: string) => {
  try {
    const response = await api.post<ExecutionResult>("/compiler/execute", {
      language,
      code,
    });
    return response.data;
  } catch (error: any) {
    console.error("Execution Failed:", error);
    throw error.response?.data?.error || "Failed to run code";
  }
};
