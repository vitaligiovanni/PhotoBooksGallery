import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useAuth() {
  const [localUser, setLocalUser] = useState<any>(null);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  // Проверяем localStorage при загрузке
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const userData = localStorage.getItem("admin_user");
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setLocalUser(user);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
      }
    }
    setIsLocalLoading(false);
  }, []);

  // Также проверяем через API (fallback)
  const { data: apiUser, isLoading: isApiLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = localStorage.getItem("admin_token");
      const headers: Record<string, string> = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/auth/user", { headers });
      const data = await response.json();
      return data.user;
    },
    retry: false,
    enabled: !localUser, // Только если нет локальных данных
  });

  const user = localUser || apiUser;
  const isLoading = isLocalLoading || (isApiLoading && !localUser);
  const isAuthenticated = !!user;

  return {
    user,
    isLoading,
    isAuthenticated,
    logout: () => {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      setLocalUser(null);
      window.location.href = "/";
    }
  };
}
