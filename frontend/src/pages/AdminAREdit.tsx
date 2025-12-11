/**
 * AdminAREdit - AR Editor Page
 * Photoshop-style fullscreen layout for AR content editing
 */

import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import AREditorDesktop from '@/components/ar/AREditorDesktop';
import { Loader2 } from 'lucide-react';

interface ARProject {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'error' | 'archived';
  photoUrl?: string;
  videoUrl?: string;
  maskUrl?: string | null;
  viewerHtmlUrl?: string;
  viewUrl?: string;
  qrCodeUrl?: string;
  progress?: number;
  errorMessage?: string;
}

interface StatusResponse {
  message: string;
  data: ARProject;
}

export default function AdminAREdit() {
  const [, params] = useRoute('/admin/ar/:id/edit');
  const [, navigate] = useLocation();
  const projectId = params?.id;

  // Fetch AR project status
  const { data: projectData, isLoading, error } = useQuery<StatusResponse>({
    queryKey: ['ar-project', projectId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ar/status/${projectId}`);
      return response.json();
    },
    enabled: !!projectId,
  });

  const project = projectData?.data;

  // Save handler
  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ['ar-project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['/api/ar'] });
  };

  // Recompile handler
  const handleRecompile = () => {
    queryClient.invalidateQueries({ queryKey: ['ar-project', projectId] });
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Проект не найден</h1>
          <button
            onClick={() => navigate('/admin/ar')}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        <span>Загрузка проекта...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-500">Ошибка загрузки</h1>
          <p className="mb-4 text-gray-400">
            {error instanceof Error ? error.message : 'Не удалось загрузить проект'}
          </p>
          <button
            onClick={() => navigate('/admin/ar')}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <AREditorDesktop
      project={project}
      onSave={handleSave}
      onRecompile={handleRecompile}
    />
  );
}
