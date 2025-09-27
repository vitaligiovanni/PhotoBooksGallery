import React from "react";
import { BlockType } from "./ConstructorApp";

interface ImageBlockEditorProps {
  block: BlockType;
  onChange: (block: BlockType) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function ImageBlockEditor({ block, onChange, onSave, onCancel, isSaving }: ImageBlockEditorProps) {
  const content = block.content || { ru: {} };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Starting image upload for image block, file:', file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/local-upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful, result:', result);
        
        const imageUrl = result.url || result.path;
        console.log('Setting imageUrl to:', imageUrl);

        const updatedBlock = {
          ...block,
          content: {
            ...content,
            ru: {
              ...content.ru,
              imageUrl: imageUrl,
              alt: file.name
            }
          }
        };

        console.log('Updated image block:', JSON.stringify(updatedBlock, null, 2));
        
        onChange(updatedBlock);
      } else {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        alert('Ошибка загрузки изображения: ' + response.status);
      }
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      alert('Ошибка загрузки изображения: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        ru: {
          ...content.ru,
          [field]: value
        }
      }
    });
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Заголовок секции */}
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r">
        <h3 className="font-semibold text-green-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Блок изображения
        </h3>
        <p className="text-sm text-green-700 mt-1">Добавьте и настройте изображение для вашей страницы</p>
      </div>

      {/* Основное содержимое */}
      <div className="space-y-4">
        {/* Загрузка изображения */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            Загрузка изображения
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Выберите изображение</label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 transition-colors">
                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span className="text-sm text-gray-600 text-center">
                  Нажмите для выбора файла<br />
                  или перетащите изображение сюда
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {content.ru?.imageUrl && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Предпросмотр</label>
                <div className="relative group">
                  <img
                    src={content.ru.imageUrl}
                    alt={content.ru.alt || 'Изображение'}
                    className="w-full h-48 object-contain rounded-lg border-2 border-green-200 shadow-sm"
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
        </div>

        {/* Настройки изображения */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
            Настройки изображения
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Alt текст</label>
              <input
                type="text"
                value={content.ru?.alt || ''}
                onChange={(e) => handleInputChange('alt', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Описание изображения для SEO"
              />
              <p className="text-xs text-gray-500 mt-1">Важно для доступности и поисковых систем</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Выравнивание</label>
              <select
                value={content.ru?.align || 'center'}
                onChange={(e) => handleInputChange('align', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="left">⬅ Слева</option>
                <option value="center">◎ По центру</option>
                <option value="right">➡ Справа</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">Ссылка (опционально)</label>
            <input
              type="url"
              value={content.ru?.link || ''}
              onChange={(e) => handleInputChange('link', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
            />
            <p className="text-xs text-gray-500 mt-1">Изображение станет кликабельной ссылкой</p>
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
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Сохранение...
            </span>
          ) : (
            'Сохранить изображение'
          )}
        </button>
      </div>
    </div>
  );
}
