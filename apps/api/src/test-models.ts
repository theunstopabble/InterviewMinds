import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function listModels() {
  console.log("--- Fetching Available Models ---");
  try {
    // Hum direct API call karke list check karenge
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const data = await response.json();

    if (data.models) {
      console.log("✅ Models found on your Key:");
      data.models.forEach((m: any) => {
        console.log(
          `- ${m.name.replace("models/", "")} (Supported: ${m.supportedGenerationMethods})`
        );
      });
    } else {
      console.log("❌ No models returned. Check your API Key.");
      console.log("API Response:", JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.error("❌ Error fetching models:", error.message);
  }
}

listModels();
