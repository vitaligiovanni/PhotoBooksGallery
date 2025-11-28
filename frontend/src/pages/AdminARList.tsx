import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, Edit, CheckCircle, XCircle, Clock, AlertTriangle, Plus, QrCode, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ARProjectListItem {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'error' | 'archived';
  viewUrl?: string;
  viewerHtmlUrl?: string | null;
  orderId?: string;
  markerQuality?: string | null;
  createdAt: string;
  fitMode?: string;
  errorMessage?: string | null;
  isDemo?: boolean;
  expiresAt?: string;
}

interface ARProjectsResponse {
  message: string;
  data: ARProjectListItem[];
  meta?: {
    count: number;
    statuses: Record<string, number>;
  }
}

const statusConfig = {
  pending: { label: 'Ожидает', icon: Clock, variant: 'secondary' as const, color: 'text-yellow-600' },
  processing: { label: 'Обработка', icon: Loader2, variant: 'default' as const, color: 'text-blue-600' },
  ready: { label: 'Готов', icon: CheckCircle, variant: 'default' as const, color: 'text-green-600' },
  error: { label: 'Ошибка', icon: XCircle, variant: 'destructive' as const, color: 'text-red-600' },
  archived: { label: 'Архив', icon: AlertTriangle, variant: 'secondary' as const, color: 'text-gray-600' },
};

export default function AdminARListPage() {
  // UI Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'real' | 'demo'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: response, isLoading, error, refetch } = useQuery<ARProjectsResponse>({
    queryKey: ['/api/ar/all'],
    queryFn: async () => {
      const res = await fetch('/api/ar/all', { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    refetchInterval: 7000, // refresh every 7s
  });

  // Управление продлением срока: настраиваемые часы (1-24)
  const [extendHoursMap, setExtendHoursMap] = useState<Record<string, number>>({});
  const extendDemoMutation = useMutation({
    mutationFn: async ({ arId, hours }: { arId: string; hours: number }) => {
      const res = await fetch(`/api/ar/${arId}/extend-demo`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Срок продлён',
        description: 'Настройки срока применены',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/all'] });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: err.message || 'Не удалось продлить срок',
      });
    },
  });

  const rawProjects = response?.data || [];
  
  // Split into real and demo
  const realProjects = rawProjects.filter(p => !p.isDemo);
  const demoProjects = rawProjects.filter(p => p.isDemo);
  
  const projects = rawProjects.filter(p => {
    if (viewMode === 'real' && p.isDemo) return false;
    if (viewMode === 'demo' && !p.isDemo) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.id.startsWith(search)) return false;
    return true;
  });

  const counts = response?.meta?.statuses || rawProjects.reduce<Record<string, number>>((acc,p)=>{acc[p.status]=(acc[p.status]||0)+1;return acc;},{});

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AR Проекты (Живые Фото)</CardTitle>
              <CardDescription>Управление AR проектами с автоматической компиляцией</CardDescription>
            </div>
            <Button 
              asChild
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Link href="/admin/ar/create">
                <Plus className="h-4 w-4 mr-2" />
                Создать AR проект
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Загрузка проектов...
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{(error as any).message}</AlertDescription>
            </Alert>
          )}

          {/* Mode Switcher */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
            >
              Все ({rawProjects.length})
            </Button>
            <Button
              variant={viewMode === 'real' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('real')}
            >
              Реальные проекты ({realProjects.length})
            </Button>
            <Button
              variant={viewMode === 'demo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('demo')}
              className="border-orange-300"
            >
              Демо (24ч) ({demoProjects.length})
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium mb-1">Статус</label>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
                <option value="all">Все ({rawProjects.length})</option>
                <option value="pending">Ожидает ({counts['pending']||0})</option>
                <option value="processing">Обработка ({counts['processing']||0})</option>
                <option value="ready">Готов ({counts['ready']||0})</option>
                <option value="error">Ошибка ({counts['error']||0})</option>
                <option value="archived">Архив ({counts['archived']||0})</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Поиск по ID (prefix)</label>
              <input value={search} onChange={e=>setSearch(e.target.value.trim())} placeholder="Начало ID" className="w-full border rounded px-2 py-1 text-sm" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={()=>{setStatusFilter('all'); setSearch(''); setViewMode('all');}}>Сброс</Button>
              <Button variant="outline" size="sm" onClick={()=>refetch()}>Обновить</Button>
            </div>
          </div>

          {!isLoading && !error && rawProjects.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Нет AR проектов. Создайте первый через API или форму загрузки.
            </div>
          )}

          {!isLoading && projects.length > 0 && (
            <div className="space-y-4">
              {projects.map((project) => {
                const statusInfo = statusConfig[project.status];
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                          <StatusIcon className={`h-3 w-3 ${project.status === 'processing' ? 'animate-spin' : ''}`} />
                          {statusInfo.label}
                        </Badge>
                        {project.isDemo && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-300">
                            <Clock className="h-3 w-3 mr-1" /> ДЕМО
                          </Badge>
                        )}
                        <span className="font-mono text-sm text-muted-foreground">
                          {project.id.slice(0, 8)}...
                        </span>
                        {project.fitMode && (
                          <Badge variant="outline" className="text-xs">
                            {project.fitMode}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Создан: {new Date(project.createdAt).toLocaleString('ru-RU')}</div>
                        {project.isDemo && project.expiresAt && (
                          <div className="text-orange-600 font-medium">
                            Истекает: {new Date(project.expiresAt).toLocaleString('ru-RU')}
                          </div>
                        )}
                        {project.orderId && <div>Заказ: {project.orderId}</div>}
                        {project.markerQuality && (
                          <div>Качество маркера: {(parseFloat(project.markerQuality) * 100).toFixed(0)}%</div>
                        )}
                        {(project.viewUrl || project.viewerHtmlUrl) && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                            <ExternalLink className="h-3 w-3 text-blue-600" />
                            <a 
                              href={project.viewUrl || project.viewerHtmlUrl || '#'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline font-mono text-xs break-all"
                            >
                              {project.viewUrl || project.viewerHtmlUrl}
                            </a>
                          </div>
                        )}
                        {project.qrCodeUrl && (
                          <div className="flex items-center gap-2 mt-2">
                            <QrCode className="h-3 w-3 text-green-600" />
                            <a 
                              href={project.qrCodeUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800 underline text-xs"
                            >
                              Скачать QR-код
                            </a>
                          </div>
                        )}
                        {project.errorMessage && project.status === 'error' && (
                          <div className="text-red-600">Ошибка: {project.errorMessage.slice(0,120)}{project.errorMessage.length>120?'…':''}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                          {project.isDemo && (
                            <div className="flex items-center gap-2">
                              <select
                                className="border rounded px-2 py-1 text-sm"
                                value={extendHoursMap[project.id] ?? 24}
                                onChange={(e)=> setExtendHoursMap(prev=>({ ...prev, [project.id]: Number(e.target.value) }))}
                              >
                                {Array.from({length:24}, (_,i)=>i+1).map(h => (
                                  <option key={h} value={h}>{h} ч</option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                onClick={() => extendDemoMutation.mutate({ arId: project.id, hours: extendHoursMap[project.id] ?? 24 })}
                                disabled={extendDemoMutation.isPending}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Продлить
                              </Button>
                            </div>
                          )}
                      
                      {(project.viewerHtmlUrl || project.viewUrl) && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={(project.viewerHtmlUrl || project.viewUrl)!} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-1" /> Просмотр
                          </a>
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="default"
                        asChild
                      >
                        <Link href={`/admin/ar/${project.id}/edit`}>
                          <Edit className="h-4 w-4 mr-1" /> Редактор
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Обновить список
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
