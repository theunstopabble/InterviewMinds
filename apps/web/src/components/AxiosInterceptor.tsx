import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export const AxiosInterceptor = ({ children }: { children: any }) => {
  const { getToken } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Request Interceptor: Request jaane se pehle Token lagao
    const requestInterceptor = api.interceptors.request.use(async (config) => {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response Interceptor: Agar 401 (Unauthorized) aaye to kya karein
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error("Unauthorized! Redirecting to login...");
          // Yahan chaho to login page par redirect kar sakte ho
        }
        return Promise.reject(error);
      }
    );

    setIsReady(true);

    // Cleanup (Jab component hate to interceptor bhi hatao)
    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [getToken]);

  // Jab tak interceptor set na ho, tab tak app ko hold karo (Optional but safer)
  return isReady ? children : null;
};
