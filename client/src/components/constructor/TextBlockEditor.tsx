import React from "react";
import { BlockType } from "./ConstructorApp";

interface TextBlockEditorProps {
  block: BlockType;
  onChange: (block: BlockType) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface TextContentRu {
  title?: string;
  text?: string;
  align?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

interface TextContent {
  ru?: TextContentRu;
  en?: any;
  hy?: any;
  settings?: any;
}

export function TextBlockEditor({ block, onChange, onSave, onCancel, isSaving }: TextBlockEditorProps) {
  const content = (block.content as TextContent) || { ru: {} };

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
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Текстовый блок
        </h3>
        <p className="text-sm text-blue-700 mt-1">Настройте содержание и оформление текста</p>
      </div>

      {/* Основное содержимое */}
      <div className="space-y-4">
        {/* Заголовок и текст */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Основное содержимое
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Заголовок</label>
              <input
                type="text"
                value={content.ru?.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите заголовок текста"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Текст</label>
              <textarea
                rows={6}
                value={content.ru?.text || ''}
                onChange={(e) => handleInputChange('text', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                placeholder="Введите ваш текст здесь..."
              />
            </div>
          </div>
        </div>

        {/* Настройки оформления */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
            Оформление текста
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Выравнивание текста</label>
              <select
                value={content.ru?.align || 'left'}
                onChange={(e) => handleInputChange('align', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="left">↖ Слева</option>
                <option value="center">↕ По центру</option>
                <option value="right">↗ Справа</option>
                <option value="justify">↔ По ширине</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Цвет текста</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={content.ru?.color || '#000000'}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-600">Выберите цвет</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Стиль текста</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={content.ru?.bold || false}
                  onChange={(e) => handleInputChange('bold', e.target.checked.toString())}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="font-semibold text-sm">Жирный</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={content.ru?.italic || false}
                  onChange={(e) => handleInputChange('italic', e.target.checked.toString())}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="italic text-sm">Курсив</span>
              </label>
            </div>
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
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Сохранение...
            </span>
          ) : (
            'Сохранить изменения'
          )}
        </button>
      </div>
    </div>
  );
}
