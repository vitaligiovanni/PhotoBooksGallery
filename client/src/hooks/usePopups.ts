import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Popup } from "@shared/schema";

export function usePopups() {
  return useQuery<Popup[]>({
    queryKey: ["/api/popups"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/popups");
      return response.json();
    },
    // Обновляем данные каждые 30 секунд для актуальности
    refetchInterval: 30000,
    // Не показываем ошибки пользователю, так как попапы не критичны
    retry: false,
  });
}