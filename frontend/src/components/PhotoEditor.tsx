import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Upload, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { PhotoEditorState, PhotoSpread } from '@/types';

export function PhotoEditor() {
  const { t } = useTranslation();
  const [editorState, setEditorState] = useState<PhotoEditorState>({
    photos: [],
    currentSpread: 0,
    spreads: []
  });

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Auto-generate spreads (10 spreads as per requirements)
    const spreads: PhotoSpread[] = [];
    const photosPerSpread = Math.ceil(files.length / 10);

    for (let i = 0; i < 10; i++) {
      const spreadPhotos = files.slice(i * photosPerSpread, (i + 1) * photosPerSpread);
      spreads.push({
        id: `spread-${i}`,
        photos: spreadPhotos.map((file, index) => ({
          id: `photo-${i}-${index}`,
          file,
          x: (index % 2) * 50,
          y: Math.floor(index / 2) * 40,
          width: 48, // Увеличиваем размер для лучшего заполнения
          height: 35 // Увеличиваем размер для лучшего заполнения
        }))
      });
    }

    setEditorState({
      photos: files,
      currentSpread: 0,
      spreads
    });
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      
      // Simulate file selection
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: { files } });
      handleFileUpload(event as any);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const nextSpread = () => {
    if (editorState.currentSpread < editorState.spreads.length - 1) {
      setEditorState(prev => ({ ...prev, currentSpread: prev.currentSpread + 1 }));
    }
  };

  const prevSpread = () => {
    if (editorState.currentSpread > 0) {
      setEditorState(prev => ({ ...prev, currentSpread: prev.currentSpread - 1 }));
    }
  };

  const currentSpread = editorState.spreads[editorState.currentSpread];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {editorState.photos.length === 0 ? (
        <Card className="border-2 border-dashed border-border">
          <CardContent 
            className="p-8 text-center space-y-6"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Upload className="text-primary text-2xl h-8 w-8" />
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2" data-testid="text-upload-title">
                Перетащите фото сюда
              </h3>
              <p className="text-muted-foreground text-sm">или нажмите для выбора файлов</p>
            </div>
            
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="photo-upload"
              data-testid="input-photo-upload"
            />
            
            <label htmlFor="photo-upload">
              <Button asChild>
                <span data-testid="button-upload-photos">Выбрать фото</span>
              </Button>
            </label>
            
            <div className="text-xs text-muted-foreground">
              Поддерживаются: JPG, PNG, HEIC до 10MB
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Editor Interface */
        <div className="space-y-4">
          {/* Spread Navigation */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Разворот {editorState.currentSpread + 1} из {editorState.spreads.length}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={prevSpread}
                disabled={editorState.currentSpread === 0}
                data-testid="button-prev-spread"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={nextSpread}
                disabled={editorState.currentSpread === editorState.spreads.length - 1}
                data-testid="button-next-spread"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Spread Preview */}
          <Card>
            <CardContent className="p-6">
              <div className="aspect-[2/1] bg-muted rounded-lg relative overflow-hidden" data-testid="spread-preview">
                {currentSpread?.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="absolute border-2 border-primary/50 rounded"
                    style={{
                      left: `${photo.x}%`,
                      top: `${photo.y}%`,
                      width: `${photo.width}%`,
                      height: `${photo.height}%`
                    }}
                    data-testid={`photo-${photo.id}`}
                  >
                    <img
                      src={URL.createObjectURL(photo.file)}
                      alt=""
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                ))}
                
                {!currentSpread?.photos.length && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    Пустой разворот
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline" data-testid="button-add-more-photos">
              <label htmlFor="photo-upload" className="cursor-pointer">
                Добавить фото
              </label>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" data-testid="button-save-project">
                Сохранить проект
              </Button>
              
              <Button data-testid="button-create-photobook">
                <Download className="h-4 w-4 mr-2" />
                Создать фотокнигу
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
