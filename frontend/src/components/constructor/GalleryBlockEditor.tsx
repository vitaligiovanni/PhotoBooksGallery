import React from "react";
import { BlockType } from "./ConstructorApp";
import { Upload, X, Plus } from "lucide-react";

interface GalleryBlockEditorProps {
  block: BlockType;
  onChange: (block: BlockType) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface GalleryImage {
  url?: string;
  alt?: string;
  caption?: string;
}

interface GalleryContent {
  images?: GalleryImage[];
  columns?: number;
  ru?: any;
  en?: any;
  hy?: any;
  settings?: any;
}

export function GalleryBlockEditor({ block, onChange, onSave, onCancel, isSaving }: GalleryBlockEditorProps) {
  const content = (block.content as GalleryContent) || {
    images: [],
    columns: 3,
    ru: {},
    en: {}, 
    hy: {},
    settings: {}
  };

  const handleAddImage = () => {
    const newImages = [...(content.images || []), { url: "", alt: "", caption: "" }];
    onChange({
      ...block,
      content: {
        ...content,
        images: newImages
      }
    });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = (content.images || []).filter((_: any, i: number) => i !== index);
    onChange({
      ...block,
      content: {
        ...content,
        images: newImages
      }
    });
  };

  const handleImageChange = (index: number, field: string, value: string) => {
    console.log('handleImageChange:', { index, field, value });
    
    const newImages = (content.images || []).map((img: any, i: number) =>
      i === index ? { ...img, [field]: value } : img
    );
    
    console.log('New images array:', newImages);
    
    const updatedBlock = {
      ...block,
      content: {
        ...content,
        images: newImages
      }
    };
    
    console.log('Updated block to send:', JSON.stringify(updatedBlock, null, 2));
    
    onChange(updatedBlock);
  };

  const handleColumnsChange = (value: number) => {
    onChange({
      ...block,
      content: {
        ...content,
        columns: value
      }
    });
  };

  const handleImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('Starting image upload for index:', index, 'file:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/local-upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Ошибка загрузки изображения: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload successful, result:', result);
      
      // Обновляем оба поля сразу в одном вызове
      const newImages = (content.images || []).map((img: any, i: number) =>
        i === index ? { ...img, url: result.url, alt: file.name } : img
      );
      
      const updatedBlock = {
        ...block,
        content: {
          ...content,
          images: newImages
        }
      };
      
      console.log('Updated block with both url and alt:', JSON.stringify(updatedBlock, null, 2));
      
      onChange(updatedBlock);
      
      console.log('Image URL updated to:', result.url);
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      alert('Не удалось загрузить изображение: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Заголовок секции */}
      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r">
        <h3 className="font-semibold text-purple-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
          Галерея изображений
        </h3>
        <p className="text-sm text-purple-700 mt-1">Создайте красивую галерею с несколькими изображениями</p>
      </div>

      {/* Основное содержимое */}
      <div className="space-y-4">
        {/* Настройки галереи */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
            Настройки галереи
          </h4>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Количество колонок</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={content.columns || 3}
              onChange={(e) => handleColumnsChange(Number(e.target.value))}
            >
              <option value={2}>2 колонки</option>
              <option value={3}>3 колонки</option>
              <option value={4}>4 колонки</option>
              <option value={5}>5 колонок</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Количество изображений в одном ряду</p>
          </div>
        </div>

        {/* Изображения галереи */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              Изображения галереи
            </h4>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleAddImage}
            >
              <Plus className="w-4 h-4" />
              Добавить изображение
            </button>
          </div>

          <div className="space-y-4">
            {content.images?.map((image: any, index: number) => (
              <div key={index} className="p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Изображение {index + 1}
                  </span>
                  <button
                    type="button"
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    onClick={() => handleRemoveImage(index)}
                    title="Удалить изображение"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Загрузка и предпросмотр */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Загрузка изображения</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://example.com/image.jpg"
                          value={image.url || ""}
                          onChange={(e) => handleImageChange(index, "url", e.target.value)}
                        />
                        <label className="px-4 py-3 border border-gray-300 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Загрузить</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(index, e)}
                          />
                        </label>
                      </div>
                    </div>

                    {image.url && (
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Предпросмотр</label>
                        <div className="relative group">
                          <img
                            src={image.url}
                            alt={image.alt || "Preview"}
                            className="w-full h-32 object-cover rounded-lg border-2 border-green-200 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-3 py-1 rounded">
                              ✓ Загружено
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Метаданные изображения */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Alt текст</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Описание изображения"
                        value={image.alt || ""}
                        onChange={(e) => handleImageChange(index, "alt", e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Для доступности и SEO</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Подпись</label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Подпись под изображением"
                        value={image.caption || ""}
                        onChange={(e) => handleImageChange(index, "caption", e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Отображается под изображением</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!content.images || content.images.length === 0) && (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-300 transition-colors">
                <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Галерея пуста</p>
                <p className="text-sm mb-4">Добавьте изображения, чтобы создать красивую галерею</p>
                <button
                  type="button"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  onClick={handleAddImage}
                >
                  Добавить первое изображение
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          onClick={onCancel}
          disabled={isSaving}
        >
          Отмена
        </button>
        <button
          className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Сохранение...
            </span>
          ) : (
            'Сохранить галерею'
          )}
        </button>
      </div>
    </div>
  );
}
