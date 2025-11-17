import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  onAuthSuccess?: (user: any) => void;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
  redirectTo,
  onAuthSuccess
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Если требуется авторизация и пользователь не авторизован
      if (requireAuth && !isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      // Если требуются права админа и пользователь не админ
      if (requireAdmin && (!isAuthenticated || !isAdmin)) {
        setShowAuthModal(true);
        return;
      }

      // Если все проверки пройдены, скрываем модальное окно
      setShowAuthModal(false);

      // Если есть перенаправление и пользователь авторизован
      if (redirectTo && isAuthenticated) {
        if (redirectTo === '/admin' && isAdmin) {
          window.location.href = '/admin';
        } else if (redirectTo === '/editor' && !isAdmin) {
          window.location.href = '/editor';
        }
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, requireAuth, requireAdmin, redirectTo]);

  const handleAuthSuccess = (userData: any) => {
    setShowAuthModal(false);
    
    // Перенаправляем в зависимости от роли
    if (userData.role === 'admin') {
      window.location.href = '/admin';
    } else {
      // Для обычных пользователей вызываем callback
      if (onAuthSuccess) {
        onAuthSuccess(userData);
      } else {
        // По умолчанию перенаправляем в редактор
        window.location.href = '/editor';
      }
    }
  };

  // Показываем загрузчик во время проверки авторизации
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Проверка авторизации...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Показываем модальное окно авторизации если нужно
  if (showAuthModal) {
    return (
      <>
        {/* Если страница открыта, показываем её в неактивном состоянии */}
        <div className="relative">
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
          
          {/* Модальное окно авторизации */}
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => {
              // Если не требуется авторизация, просто скрываем модальное окно
              if (!requireAuth) {
                setShowAuthModal(false);
              }
              // Иначе пользователь не может закрыть модальное окно без авторизации
            }}
            onSuccess={handleAuthSuccess}
            defaultTab="login"
          />
        </div>
      </>
    );
  }

  // Если пользователь авторизован и все проверки пройдены, показываем контент
  if (requireAuth && !isAuthenticated) {
    return null; // Это не должно произойти, но на всякий случай
  }

  if (requireAdmin && (!isAuthenticated || !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-destructive text-center">
              Доступ запрещен. Требуются права администратора.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}