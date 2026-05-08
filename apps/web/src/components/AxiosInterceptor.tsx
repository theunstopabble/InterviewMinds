import { useAuth } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export const AxiosInterceptor = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Request Interceptor: Request jaane se pehle Token lagao
    const requestInterceptor = api.interceptors.request.use(async (config) => {
      const token = await getTokenRef.current();
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
        }
        return Promise.reject(error);
      },
    );

    setIsReady(true);

    // Cleanup: remove interceptors on unmount
    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isReady ? children : null;
};
