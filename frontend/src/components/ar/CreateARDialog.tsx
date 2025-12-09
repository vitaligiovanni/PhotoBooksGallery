import { useState, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, Image as ImageIcon, Video, X, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateARDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateARDialog({ open, onOpenChange }: CreateARDialogProps) {
  const [projectName, setProjectName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!projectName.trim()) {
        throw new Error('Название проекта обязательно');
      }
      if (!photoFile || !videoFile) {
        throw new Error('Необходимо выбрать фото и видео');
      }

      // Validate expiration date if set
      if (hasExpiration && expirationDate) {
        const expDate = new Date(expirationDate);
        if (expDate <= new Date()) {
          throw new Error('Дата отключения должна быть в будущем');
        }
      }

      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('video', videoFile);
      formData.append('projectName', projectName.trim());
      if (phone.trim()) formData.append('phone', phone.trim());
      if (email.trim()) formData.append('email', email.trim());
      if (notes.trim()) formData.append('notes', notes.trim());
      
      // Add expiration date only if checkbox is checked and date is set
      if (hasExpiration && expirationDate) {
        formData.append('expiresAt', new Date(expirationDate).toISOString());
      }

      const res = await fetch('/api/ar/create-admin', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Ошибка сервера' }));
        throw new Error(errorData.error || 'Ошибка создания проекта');
      }

      return res.json();
    },
    onSuccess: (data) => {
      const compileId = data?.compile?.projectId as string | undefined;
      const localId = data?.arProject?.id as string | undefined;
      const statusId = compileId || localId;
      toast({
        title: 'Проект создан',
        description: compileId
          ? `AR проект создан. Идёт компиляция (ID: ${compileId}).`
          : `AR проект создан и отправлен на обработку.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/all'] });
      // Перейти на страницу статуса, если есть ID
      if (statusId) {
        try {
          window.open(`/admin/ar/${statusId}/edit`, '_blank');
        } catch {}
      }
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
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const resetForm = () => {
    setProjectName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setHasExpiration(false);
    setExpirationDate('');
    setPhotoFile(null);
    setVideoFile(null);
    setPhotoPreview(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать AR проект</DialogTitle>
          <DialogDescription>
            Загрузите фото (маркер) и видео для создания живого фото
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name - REQUIRED */}
          <div className="space-y-2">
            <Label htmlFor="project-name" className="font-medium">
              Название проекта <span className="text-red-500">*</span>
            </Label>
            <Input
              id="project-name"
              type="text"
              placeholder="Например: Живое фото для клиента..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={createMutation.isPending}
              required
              className="w-full"
            />
          </div>

          {/* Phone - Optional */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm text-muted-foreground">
              Телефон (необязательно)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+374 XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={createMutation.isPending}
              className="w-full"
            />
          </div>

          {/* Email - Optional */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              Email (необязательно)
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={createMutation.isPending}
              className="w-full"
            />
          </div>

          {/* Notes - Optional */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm text-muted-foreground">
              Заметки (необязательно)
            </Label>
            <Textarea
              id="notes"
              placeholder="Дополнительная информация о проекте..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={createMutation.isPending}
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Expiration Date - Optional */}
          <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-expiration"
                checked={hasExpiration}
                onCheckedChange={(checked) => {
                  setHasExpiration(checked as boolean);
                  if (!checked) setExpirationDate('');
                }}
                disabled={createMutation.isPending}
              />
              <Label
                htmlFor="has-expiration"
                className="text-sm font-medium cursor-pointer"
              >
                Установить срок отключения проекта
              </Label>
            </div>

            {hasExpiration && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="expiration-date" className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Дата отключения
                </Label>
                <Input
                  id="expiration-date"
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  disabled={createMutation.isPending}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Если не установлен — проект будет работать без ограничения по времени
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-4">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photo-upload" className="flex items-center gap-2 font-medium">
                <ImageIcon className="h-4 w-4" />
                Фото (маркер) <span className="text-red-500">*</span>
              </Label>
              {!photoPreview ? (
                <div className="border-2 border-dashed rounded-lg p-4 hover:border-purple-400 transition-colors">
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    disabled={createMutation.isPending}
                    className="cursor-pointer"
                  />
                </div>
              ) : (
                <div className="relative border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <img 
                      src={photoPreview} 
                      alt="Photo preview" 
                      className="h-24 w-24 object-cover rounded border shadow-sm"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium truncate">{photoFile?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {((photoFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removePhoto}
                      disabled={createMutation.isPending}
                      className="h-8 w-8 text-gray-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Video Upload */}
            <div className="space-y-2">
              <Label htmlFor="video-upload" className="flex items-center gap-2 font-medium">
                <Video className="h-4 w-4" />
                Видео <span className="text-red-500">*</span>
              </Label>
              {!videoPreview ? (
                <div className="border-2 border-dashed rounded-lg p-4 hover:border-purple-400 transition-colors">
                  <Input
                    id="video-upload"
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-m4v"
                    onChange={handleVideoChange}
                    disabled={createMutation.isPending}
                    className="cursor-pointer"
                  />
                </div>
              ) : (
                <div className="relative border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start gap-4">
                    <video 
                      ref={videoRef}
                      src={videoPreview}
                      className="h-24 w-32 object-cover rounded border shadow-sm bg-black"
                      muted
                      playsInline
                      onLoadedData={() => {
                        // Generate thumbnail by playing briefly
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0.5;
                        }
                      }}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium truncate">{videoFile?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {((videoFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeVideo}
                      disabled={createMutation.isPending}
                      className="h-8 w-8 text-gray-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Alert */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-900">
            <p className="font-medium mb-1">✅ Настоящий AR проект</p>
            <p className="text-xs text-green-700">
              Будет создан постоянный проект (не демо). Автоматическая обработка займёт 1-3 минуты.
              {hasExpiration && expirationDate && (
                <span className="block mt-1 font-medium">
                  ⏰ Отключится: {new Date(expirationDate).toLocaleString('ru-RU')}
                </span>
              )}
              {!hasExpiration && (
                <span className="block mt-1 font-medium">
                  ♾️ Срок работы: без ограничений
                </span>
              )}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={createMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!projectName.trim() || !photoFile || !videoFile || createMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
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
