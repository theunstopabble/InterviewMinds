import axios from "axios";

// Ek centralized API instance banaya
export const api = axios.create({
  baseURL: "http://localhost:8000/api", // Ab sirf "/chat" likhna padega
});
