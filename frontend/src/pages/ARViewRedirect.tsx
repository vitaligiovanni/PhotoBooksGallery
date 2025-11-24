/**
 * AR Viewer Redirect Page
 * Redirects /ar/view/:id → /objects/ar-storage/:id/index.html
 * 
 * This page is accessed when scanning QR code or clicking ngrok link
 */

import { useEffect } from 'react';
import { useRoute } from 'wouter';

export default function ARViewRedirect() {
  const [match, params] = useRoute('/ar/view/:id');
  
  useEffect(() => {
    if (match && params?.id) {
      // Redirect to static HTML viewer
      const viewerUrl = `/objects/ar-storage/${params.id}/index.html`;
      console.log('[AR View] Redirecting to viewer:', viewerUrl);
      window.location.href = viewerUrl;
    }
  }, [match, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
      <div className="text-center space-y-4 p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-lg font-medium text-gray-700">Загрузка AR опыта...</p>
        <p className="text-sm text-gray-500">Перенаправление на просмотр...</p>
      </div>
    </div>
  );
}
