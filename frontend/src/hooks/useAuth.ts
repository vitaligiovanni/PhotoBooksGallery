import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
}

export function useAuth() {
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const queryClient = useQueryClient();

  // Проверяем localStorage при загрузке
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setLocalUser(user);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
      }
    }
    setIsLocalLoading(false);
  }, []);

  // Проверяем токен через API при необходимости
  const { data: apiUser, isLoading: isApiLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("No token");
      
      const response = await fetch("/api/auth/me", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error("Token invalid");
      }
      
      const data = await response.json();
      return data.user;
    },
    retry: false,
    enabled: !localUser && !!localStorage.getItem("auth_token"),
    staleTime: 5 * 60 * 1000, // 5 минут
  });

  const user = localUser || apiUser;
  const isLoading = isLocalLoading || (isApiLoading && !localUser);
  const isAuthenticated = !!user;

  const login = (userData: User, token: string) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user_data", JSON.stringify(userData));
    setLocalUser(userData);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    setLocalUser(null);
    queryClient.clear();
    window.location.href = "/";
  };

  const isAdmin = user?.role === 'admin';

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  };
}
