import axios from "axios";

// Ek centralized API instance
export const api = axios.create({
  // 👇 FIX: Environment Variable use karo, fallback localhost par rakho
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",

  // 👇 MOBILE FIX: Cookies/Auth ko cross-site bhejne ke liye zaroori hai
  withCredentials: true,
});
