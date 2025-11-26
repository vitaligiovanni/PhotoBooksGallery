/**
 * PWA Utilities - Service Worker registration and management
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Register Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA] New version available! Reload to update.');
          
          // Show update notification to user
          if (confirm('Доступна новая версия! Обновить сейчас?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Service Worker updated, reloading...');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister Service Worker (for debugging)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[PWA] Service Worker unregistered:', success);
      return success;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Service Worker unregister failed:', error);
    return false;
  }
}

/**
 * Setup PWA install prompt
 */
export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    console.log('[PWA] Install prompt ready');
    
    // Dispatch custom event for UI components
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    
    // Track install event (optional analytics)
    try {
      if ('gtag' in window && typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'pwa_install', {
          event_category: 'PWA',
          event_label: 'App Installed',
        });
      }
    } catch (e) {
      // Analytics not available
    }
  });
}

/**
 * Trigger PWA install prompt
 */
export async function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return 'unavailable';
  }

  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    console.log('[PWA] User choice:', choiceResult.outcome);
    deferredPrompt = null;
    
    return choiceResult.outcome;
  } catch (error) {
    console.error('[PWA] Install prompt error:', error);
    return 'unavailable';
  }
}

/**
 * Check if app is installed
 */
export function isAppInstalled(): boolean {
  // Check display mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check iOS standalone
  if ((navigator as any).standalone === true) {
    return true;
  }

  return false;
}

/**
 * Check if install prompt is available
 */
export function isInstallPromptAvailable(): boolean {
  return deferredPrompt !== null;
}

/**
 * Preload AR resources (for faster AR experience)
 */
export async function preloadARResources(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const urlsToCache = [
    'https://aframe.io/releases/1.4.2/aframe.min.js',
    'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js',
    'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js',
  ];

  const registration = await navigator.serviceWorker.ready;
  if (registration.active) {
    registration.active.postMessage({
      type: 'CACHE_URLS',
      urls: urlsToCache,
    });
    console.log('[PWA] Preloading AR resources...');
  }
}

/**
 * Check if device supports AR (camera + WebGL)
 */
export async function checkARSupport(): Promise<{
  supported: boolean;
  camera: boolean;
  webgl: boolean;
  https: boolean;
}> {
  const result = {
    supported: false,
    camera: false,
    webgl: false,
    https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
  };

  // Check WebGL
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    result.webgl = !!gl;
  } catch (e) {
    result.webgl = false;
  }

  // Check camera access
  try {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      result.camera = true;
    }
  } catch (e) {
    result.camera = false;
  }

  result.supported = result.camera && result.webgl && result.https;
  return result;
}

/**
 * Request camera permission with user-friendly UI
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, // Prefer back camera
    });
    
    // Stop stream immediately (we just needed permission)
    stream.getTracks().forEach((track) => track.stop());
    
    console.log('[PWA] Camera permission granted');
    return true;
  } catch (error: any) {
    console.error('[PWA] Camera permission denied:', error);
    
    if (error.name === 'NotAllowedError') {
      alert(
        'Для использования AR необходим доступ к камере.\n\n' +
        'Пожалуйста, разрешите доступ в настройках браузера.'
      );
    } else if (error.name === 'NotFoundError') {
      alert('Камера не найдена на вашем устройстве.');
    } else {
      alert('Ошибка доступа к камере: ' + error.message);
    }
    
    return false;
  }
}

/**
 * Initialize PWA features
 */
export async function initPWA(): Promise<void> {
  console.log('[PWA] Initializing...');
  
  // Register service worker
  await registerServiceWorker();
  
  // Setup install prompt
  setupInstallPrompt();
  
  // Check if installed
  if (isAppInstalled()) {
    console.log('[PWA] App is installed (standalone mode)');
  }
  
  // Log AR support
  const arSupport = await checkARSupport();
  console.log('[PWA] AR Support:', arSupport);
  
  console.log('[PWA] Initialization complete');
}
