import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import resumeRoutes from "./routes/resume";
import chatRoutes from "./routes/chat";
import interviewRoutes from "./routes/interview";
import { requireAuth } from "./middleware/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || "";

// 👇 CORS FIX: Mobile ke liye Specific Permission
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Local Vite
      "http://localhost:5174", // Local Vite (Alternative)
      "https://interview-minds.vercel.app", // Aapka Live Vercel Domain
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // ⚠️ Ye sabse zaroori hai Mobile Auth ke liye
  })
);

app.use(express.json());

// 2. Ping Route (CORS ke baad, Auth se pehle)
app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

// 3. Root Route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "InterviewMinds Backend is Running!" });
});

// 4. Protected Routes
app.use("/api/resume", requireAuth, resumeRoutes);
app.use("/api/chat", requireAuth, chatRoutes);
app.use("/api/interview", requireAuth, interviewRoutes);

// 5. Database Connection
if (!MONGO_URI) {
  console.error("❌ Error: MONGO_URI is missing in .env file");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));
}

// 6. Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// 7. Export App
export default app;
