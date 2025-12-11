/**
 * AdminAREdit - Упрощённая страница редактирования AR проекта
 * 
 * Использует новый SimpleAREditor для основного функционала
 * Сохраняет поддержку Multi-target проектов через ARProjectItemsList
 */

import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  RefreshCcw, 
  Trash2, 
  Layers, 
  Settings,
  ArrowLeft,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import SimpleAREditor from '@/components/ar/SimpleAREditor';
import ARProjectItemsList from '@/components/ar/ARProjectItemsList';

interface ARStatusResponse {
  message: string;
  data: ARProject;
}

interface ARProject {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'error' | 'archived';
  photoUrl?: string;
  videoUrl?: string;
  maskUrl?: string | null;
  viewerHtmlUrl?: string;
  viewUrl?: string;
  qrCodeUrl?: string;
  photoWidth?: number | null;
  photoHeight?: number | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  videoDurationMs?: number | null;
  photoAspectRatio?: string | null;
  videoAspectRatio?: string | null;
  maskWidth?: number | null;
  maskHeight?: number | null;
  fitMode?: string;
  scaleWidth?: string | null;
  scaleHeight?: string | null;
  isCalibrated?: boolean;
  markerQuality?: string | null;
  keyPointsCount?: number | null;
  compilationTimeMs?: number | null;
  config?: any;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminAREditPage() {
  const [, params] = useRoute('/admin/ar/:id/edit');
  const arId = (params as any)?.id || null;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Fetch project data
  const { data: project, isLoading, error, refetch } = useQuery<ARProject | null>({
    queryKey: ['/api/ar/status', arId],
    enabled: !!arId,
    queryFn: async () => {
      const res = await fetch(`/api/ar/status/${arId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const json: ARStatusResponse = await res.json();
      return json.data;
    }
  });

  // Fetch items for multi-target check
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ['/api/ar', arId, 'items'],
    enabled: !!arId,
    queryFn: async () => {
      const res = await fetch(`/api/ar/${arId}/items`, { credentials: 'include' });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    }
  });

  const isMultiTarget = items.length > 0;

  // Recompile mutation
  const recompileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ar/${arId}/recompile`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', arId] });
    },
  });

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ar/${arId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      navigate('/admin/ar');
    },
  });

  if (!arId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Нет ID проекта в пути (/admin/ar/:id/edit)</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back navigation */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate('/admin/ar')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Назад к списку
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AR Редактор проекта</CardTitle>
              <CardDescription className="mt-1">
                Настройка наложения видео на фотографию
              </CardDescription>
            </div>
            
            {/* Status badge */}
            {project && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'ready' ? 'bg-green-100 text-green-700' :
                project.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                project.status === 'error' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {project.status === 'ready' && <><CheckCircle2 className="h-4 w-4 inline mr-1" /> Готов</>}
                {project.status === 'processing' && <><Loader2 className="h-4 w-4 inline mr-1 animate-spin" /> Обработка</>}
                {project.status === 'error' && <><AlertCircle className="h-4 w-4 inline mr-1" /> Ошибка</>}
                {project.status === 'pending' && 'Ожидание'}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Загрузка проекта...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{(error as any).message}</AlertDescription>
            </Alert>
          )}

          {/* Project content */}
          {project && (
            <>
              {/* Error message if project failed */}
              {project.status === 'error' && project.errorMessage && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{project.errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Main editor tabs */}
              <Tabs defaultValue={isMultiTarget ? 'multi' : 'single'} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Основные настройки
                  </TabsTrigger>
                  <TabsTrigger value="multi" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Multi-target ({items.length})
                  </TabsTrigger>
                </TabsList>

                {/* Single target / Main settings */}
                <TabsContent value="single">
                  <SimpleAREditor 
                    project={project}
                    onRecompile={() => recompileMutation.mutate()}
                  />
                </TabsContent>

                {/* Multi-target management */}
                <TabsContent value="multi">
                  <div className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        <strong>Multi-target режим:</strong> Добавьте несколько пар фото+видео для создания 
                        альбома с несколькими "живыми" фотографиями.
                      </AlertDescription>
                    </Alert>
                    
                    <ARProjectItemsList projectId={arId} />
                  </div>
                </TabsContent>
              </Tabs>

              <Separator className="my-8" />

              {/* Danger zone */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Опасная зона</h3>
                
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => recompileMutation.mutate()}
                    disabled={recompileMutation.isPending}
                  >
                    {recompileMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Компиляция...</>
                    ) : (
                      <><RefreshCcw className="h-4 w-4 mr-2" /> Перекомпилировать</>
                    )}
                  </Button>
                  
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Удалить проект безвозвратно? Это действие нельзя отменить.')) {
                        deleteMutation.mutate();
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Удаление...</>
                    ) : (
                      <><Trash2 className="h-4 w-4 mr-2" /> Удалить проект</>
                    )}
                  </Button>
                </div>

                {recompileMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>{(recompileMutation.error as any)?.message}</AlertDescription>
                  </Alert>
                )}

                {recompileMutation.isSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-700">
                      ✓ Перекомпиляция запущена. Обновите страницу через несколько секунд.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Project metadata (collapsed) */}
              <details className="mt-8">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  Техническая информация
                </summary>
                <div className="mt-3 p-4 bg-muted/50 rounded-lg text-xs font-mono space-y-1">
                  <div>ID: {project.id}</div>
                  <div>Статус: {project.status}</div>
                  <div>Фото: {project.photoWidth}×{project.photoHeight}px (AR: {project.photoAspectRatio})</div>
                  <div>Видео: {project.videoWidth}×{project.videoHeight}px (AR: {project.videoAspectRatio})</div>
                  {project.maskWidth && <div>Маска: {project.maskWidth}×{project.maskHeight}px</div>}
                  {project.compilationTimeMs && <div>Время компиляции: {project.compilationTimeMs}ms</div>}
                  {project.keyPointsCount && <div>Ключевые точки: {project.keyPointsCount}</div>}
                  <div>Создан: {new Date(project.createdAt).toLocaleString()}</div>
                  {project.updatedAt && <div>Обновлён: {new Date(project.updatedAt).toLocaleString()}</div>}
                </div>
              </details>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
