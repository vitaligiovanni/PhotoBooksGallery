import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// API base URL определяется в зависимости от окружения
const getAPIBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    // Убираем trailing /api если он есть, чтобы избежать дублирования
    const baseUrl = import.meta.env.VITE_API_URL;
    return baseUrl.replace(/\/api\/?$/, '');
  }
  
  // Всегда используем пустую строку для относительных URL
  // Vite proxy автоматически проксирует /api/* к backend
  return '';
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Добавляем базовый URL если URL относительный
  const urlStr = String(url);
  const fullURL = urlStr.startsWith('http') ? urlStr : `${getAPIBaseURL()}${urlStr}`;
  
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Добавляем токен авторизации если есть
  const token = localStorage.getItem("auth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(fullURL, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    // Добавляем базовый URL если URL относительный
    const fullURL = url.startsWith('http') ? url : `${getAPIBaseURL()}${url}`;
    
    const res = await fetch(fullURL, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
