import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, Edit, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

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

  const { data: response, isLoading, error, refetch } = useQuery<ARProjectsResponse>({
    queryKey: ['/api/ar/all'],
    queryFn: async () => {
      const res = await fetch('/api/ar/all', { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    refetchInterval: 7000, // refresh every 7s
  });

  const rawProjects = response?.data || [];
  const projects = rawProjects.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.id.startsWith(search)) return false;
    return true;
  });

  const counts = response?.meta?.statuses || rawProjects.reduce<Record<string, number>>((acc,p)=>{acc[p.status]=(acc[p.status]||0)+1;return acc;},{});

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>AR Проекты (Живые Фото)</CardTitle>
          <CardDescription>Управление AR проектами с автоматической компиляцией</CardDescription>
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
              <Button variant="outline" size="sm" onClick={()=>{setStatusFilter('all'); setSearch('');}}>Сброс</Button>
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
                        {project.orderId && <div>Заказ: {project.orderId}</div>}
                        {project.markerQuality && (
                          <div>Качество маркера: {(parseFloat(project.markerQuality) * 100).toFixed(0)}%</div>
                        )}
                        {project.errorMessage && project.status === 'error' && (
                          <div className="text-red-600">Ошибка: {project.errorMessage.slice(0,120)}{project.errorMessage.length>120?'…':''}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
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
