/**
 * PWA Install Button Component
 * Shows prompt to install app on home screen
 */

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { showInstallPrompt, isInstallPromptAvailable, isAppInstalled } from '@/utils/pwa';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (isAppInstalled()) {
      return;
    }

    // Listen for install availability
    const handleInstallAvailable = () => {
      setCanInstall(true);
      
      // Show prompt after 10 seconds (don't be annoying)
      setTimeout(() => {
        setShowPrompt(true);
      }, 10000);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);

    // Check if prompt already available
    if (isInstallPromptAvailable()) {
      handleInstallAvailable();
    }

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
    };
  }, []);

  const handleInstall = async () => {
    const result = await showInstallPrompt();
    
    if (result === 'accepted') {
      console.log('User accepted installation');
      setShowPrompt(false);
    } else if (result === 'dismissed') {
      console.log('User dismissed installation');
      setShowPrompt(false);
      
      // Don't show again for 7 days
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if dismissed recently (7 days)
  const dismissedAt = localStorage.getItem('pwa-install-dismissed');
  if (dismissedAt) {
    const daysSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismiss < 7) {
      return null;
    }
  }

  if (!canInstall || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-4 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
        </div>

        {/* Content */}
        <div className="relative">
          <button
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg mb-1">
                Установите приложение
              </h3>
              <p className="text-white/90 text-sm mb-3">
                Добавьте на главный экран для быстрого доступа и офлайн работы
              </p>
              
              <button
                onClick={handleInstall}
                className="w-full bg-white text-purple-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Установить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Install Button (for header/menu)
 */
export function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (isAppInstalled()) {
      return;
    }

    const handleInstallAvailable = () => {
      setCanInstall(true);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);

    if (isInstallPromptAvailable()) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
    };
  }, []);

  if (!canInstall) {
    return null;
  }

  const handleInstall = async () => {
    await showInstallPrompt();
  };

  return (
    <button
      onClick={handleInstall}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Установить приложение</span>
      <span className="sm:hidden">Установить</span>
    </button>
  );
}
