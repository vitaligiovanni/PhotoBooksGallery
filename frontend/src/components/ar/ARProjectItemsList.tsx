import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, Video as VideoIcon, Save } from 'lucide-react';
import CalibrationSandbox from '@/components/ar/CalibrationSandbox';

interface ARProjectItem {
  id: string;
  projectId: string;
  targetIndex: number;
  name: string;
  photoUrl: string;
  videoUrl: string;
  maskUrl?: string | null;
  config?: {
    videoPosition?: { x: number; y: number; z: number };
    videoRotation?: { x: number; y: number; z: number };
    videoScale?: { width: number; height: number };
    fitMode?: 'contain'|'cover'|'stretch';
    autoPlay?: boolean;
    loop?: boolean;
  } | null;
  photoWidth?: number | null;
  photoHeight?: number | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  createdAt: string;
}

interface ARProjectItemsListProps {
  projectId: string;
}

export default function ARProjectItemsList({ projectId }: ARProjectItemsListProps) {
  const queryClient = useQueryClient();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newVideo, setNewVideo] = useState<File | null>(null);
  
  // Local editing state for currently expanded item
  const [editingConfig, setEditingConfig] = useState<{
    itemId: string;
    pos: { x: number; y: number; z: number };
    rot: { x: number; y: number; z: number };
    scale: { width: number; height: number } | null;
    targetIndex: number;
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery<ARProjectItem[]>({
    queryKey: ['/api/ar', projectId, 'items'],
    queryFn: async () => {
      const res = await fetch(`/api/ar/${projectId}/items`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return json.data;
    },
  });
  // Normalize to array to avoid runtime errors like "items.map is not a function"
  const items: ARProjectItem[] = Array.isArray(data) ? data : [];

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newPhoto || !newVideo) throw new Error('Photo and video required');
      const fd = new FormData();
      fd.append('photo', newPhoto);
      fd.append('video', newVideo);
      fd.append('name', newItemName || `Живое фото ${items.length + 1}`);
      const res = await fetch(`/api/ar/${projectId}/items`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar', projectId, 'items'] });
      setNewItemName('');
      setNewPhoto(null);
      setNewVideo(null);
      setUploadingNew(false);
      try {
        const newId = result?.data?.id;
        const targetIndex = result?.data?.targetIndex ?? 0;
        if (newId) {
          setExpandedItem(newId);
          // Initialize editing state for the newly added item (defaults)
          setEditingConfig({
            itemId: newId,
            pos: { x: 0, y: 0, z: 0 },
            rot: { x: 0, y: 0, z: 0 },
            scale: null,
            targetIndex,
          });
        }
      } catch {}
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/ar/${projectId}/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar', projectId, 'items'] });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ itemId, config }: { itemId: string; config: any }) => {
      const res = await fetch(`/api/ar/${projectId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar', projectId, 'items'] });
    },
  });

  if (isLoading) {
    return <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Загрузка...</div>;
  }

  if (error) {
    return <Alert variant="destructive"><AlertDescription>{(error as any).message}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Живые фото ({items.length}/100)</h3>
        <Button size="sm" onClick={() => setUploadingNew(!uploadingNew)}>
          <Plus className="h-4 w-4 mr-1" /> Добавить фото
        </Button>
      </div>

      {/* Add new item form */}
      {uploadingNew && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Новое живое фото</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Название (например: Фотография)"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Фото-маркер</label>
                <input type="file" accept="image/*" onChange={e => setNewPhoto(e.target.files?.[0] || null)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Видео</label>
                <input type="file" accept="video/*" onChange={e => setNewVideo(e.target.files?.[0] || null)} className="text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button disabled={!newPhoto || !newVideo || addMutation.isPending} onClick={() => addMutation.mutate()} size="sm">
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Добавить'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setUploadingNew(false)}>Отменить</Button>
            </div>
            {addMutation.isError && <Alert variant="destructive"><AlertDescription>{(addMutation.error as any).message}</AlertDescription></Alert>}
          </CardContent>
        </Card>
      )}

      {/* Items list */}
      {items.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8 border rounded">
          Нет живых фото. Добавьте первое фото кнопкой выше.
        </div>
      )}

      {items.map((item) => {
        const expanded = expandedItem === item.id;
        const serverPos = item.config?.videoPosition || { x: 0, y: 0, z: 0 };
        const serverRot = item.config?.videoRotation || { x: 0, y: 0, z: 0 };
        const serverScale = item.config?.videoScale || null;
        const aspectRatio = (item.photoWidth && item.photoHeight) ? (item.photoHeight / item.photoWidth) : 0.75;

        // Use editing state if this item is being edited, otherwise use server values
        const isEditing = editingConfig?.itemId === item.id;
        const currentPos = isEditing ? editingConfig.pos : serverPos;
        const currentRot = isEditing ? editingConfig.rot : serverRot;
        const currentScale = isEditing ? editingConfig.scale : serverScale;

        const hasChanges = isEditing && (
          JSON.stringify(editingConfig.pos) !== JSON.stringify(serverPos) ||
          JSON.stringify(editingConfig.rot) !== JSON.stringify(serverRot) ||
          JSON.stringify(editingConfig.scale) !== JSON.stringify(serverScale)
        );

        const handleToggleExpand = () => {
          if (expanded) {
            // Collapse: clear editing state
            setExpandedItem(null);
            setEditingConfig(null);
          } else {
            // Expand: initialize editing state from server values
            setExpandedItem(item.id);
            setEditingConfig({
              itemId: item.id,
              pos: serverPos,
              rot: serverRot,
              scale: serverScale,
              targetIndex: item.targetIndex,
            });
          }
        };

        const handleSave = () => {
          if (!editingConfig) return;
          updateConfigMutation.mutate({
            itemId: item.id,
            config: {
              videoPosition: editingConfig.pos,
              videoRotation: editingConfig.rot,
              videoScale: editingConfig.scale || undefined,
            }
          });
        };

        return (
          <Card key={item.id} className={expanded ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-6 w-6" 
                    onClick={handleToggleExpand}
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <CardTitle className="text-sm">{item.name}</CardTitle>
                  <span className="text-xs text-muted-foreground">targetIndex: {item.targetIndex}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm(`Удалить "${item.name}"?`)) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            {expanded && (
              <CardContent className="space-y-4">
                {/* Asset preview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded p-2">
                    <div className="text-xs font-medium mb-1 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> Фото-маркер
                    </div>
                    {item.photoUrl && <img src={`/api/${item.photoUrl}`} alt="marker" className="w-full rounded" />}
                  </div>
                  <div className="border rounded p-2">
                    <div className="text-xs font-medium mb-1 flex items-center gap-1">
                      <VideoIcon className="h-3 w-3" /> Видео
                    </div>
                    {item.videoUrl && <video src={`/api/${item.videoUrl}`} controls className="w-full rounded" />}
                  </div>
                </div>

                {/* Calibration sandbox */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Калибровка</h4>
                  <CalibrationSandbox
                    photoAspectRatio={aspectRatio}
                    videoScale={currentScale}
                    position={currentPos}
                    rotation={currentRot}
                    markerImageUrl={item.photoUrl ? `/api/${item.photoUrl}` : undefined}
                    onChange={(u) => {
                      if (!editingConfig) return;
                      
                      // Update local editing state
                      const newConfig = { ...editingConfig };
                      if (u.videoScale) newConfig.scale = u.videoScale;
                      if (u.position) newConfig.pos = u.position;
                      if (typeof u.rotationZ === 'number') {
                        newConfig.rot = { ...newConfig.rot, z: u.rotationZ };
                      }
                      setEditingConfig(newConfig);
                      
                      // Live preview: send postMessage to iframe parent (if embedded in AdminAREdit viewer)
                      try {
                        const msg = {
                          type: 'ar-calibration',
                          payload: {
                            targetIndex: item.targetIndex,
                            position: newConfig.pos,
                            rotation: newConfig.rot,
                            scale: newConfig.scale || { width: 1, height: 0.75 }
                          }
                        };
                        window.postMessage(msg, '*');
                      } catch {}
                    }}
                  />
                </div>

                {/* Save button */}
                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={!hasChanges || updateConfigMutation.isPending}
                  >
                    {updateConfigMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Сохранить изменения
                  </Button>
                  {hasChanges && (
                    <span className="text-xs text-muted-foreground">Есть несохранённые изменения</span>
                  )}
                  {updateConfigMutation.isSuccess && !hasChanges && (
                    <span className="text-xs text-green-600">✓ Сохранено</span>
                  )}
                </div>
                
                {updateConfigMutation.isError && (
                  <Alert variant="destructive" className="text-sm">
                    <AlertDescription>{(updateConfigMutation.error as any).message}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
