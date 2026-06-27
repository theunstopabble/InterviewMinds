import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

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
  } catch (error: unknown) {
    logger.error("Execution Failed:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw (error as any).response?.data?.error || "Failed to run code";
  }
};
