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

// 1. Middleware
app.use(cors()); // Allow all origins (Safe for now)
app.use(express.json());

// 2. Health Check (Auth NOT required)
app.get("/ping", (req: Request, res: Response) => {
  res.send("pong");
});

// 3. Root Route (Auth NOT required)
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "InterviewMinds Backend is Running!" });
});

// 4. Protected Routes (Auth REQUIRED)
// Yahan hum requireAuth laga rahe hain, matlab bina login koi API use nahi kar payega
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
// Ye check zaroori hai taaki Vercel aur Local dono jagah code na phate
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// 7. Export App (Vercel Needs This)
export default app;
