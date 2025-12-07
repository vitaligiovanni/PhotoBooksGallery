import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Image as ImageIcon, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateARDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateARDialog({ open, onOpenChange }: CreateARDialogProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!photoFile || !videoFile) {
        throw new Error('Необходимо выбрать фото и видео');
      }

      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('video', videoFile);
      formData.append('isDemo', 'true'); // По умолчанию создаём демо-проект

      const res = await fetch('/api/ar/demo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Ошибка создания проекта');
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Проект создан',
        description: `AR проект ${data.arProject.id.slice(0, 8)} создан и отправлен на обработку`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/all'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка создания',
        description: err.message || 'Не удалось создать AR проект',
      });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const resetForm = () => {
    setPhotoFile(null);
    setVideoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Создать AR проект</DialogTitle>
          <DialogDescription>
            Загрузите фото (маркер) и видео для создания живого фото
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="photo-upload" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Фото (маркер) *
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoChange}
                disabled={createMutation.isPending}
                className="flex-1"
              />
              {photoPreview && (
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="h-16 w-16 object-cover rounded border"
                />
              )}
            </div>
            {photoFile && (
              <p className="text-xs text-muted-foreground">
                {photoFile.name} ({(photoFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <Label htmlFor="video-upload" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Видео *
            </Label>
            <Input
              id="video-upload"
              type="file"
              accept="video/mp4,video/quicktime,video/x-m4v"
              onChange={handleVideoChange}
              disabled={createMutation.isPending}
            />
            {videoFile && (
              <p className="text-xs text-muted-foreground">
                {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <p className="font-medium mb-1">ℹ️ Проект будет создан как демо</p>
            <p className="text-xs text-blue-700">
              Срок действия: 24 часа. Автоматическая обработка займёт 1-3 минуты.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!photoFile || !videoFile || createMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Создать проект
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
