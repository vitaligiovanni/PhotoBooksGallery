import React from "react";
import { BlockType } from "./ConstructorApp";
import { ExternalLink } from "lucide-react";

interface ButtonBlockEditorProps {
  block: BlockType;
  onChange: (block: BlockType) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface ButtonContent {
  text?: {
    ru?: string;
    en?: string;
    hy?: string;
  };
  link?: string;
  variant?: string;
  size?: string;
  ru?: any;
  en?: any;
  hy?: any;
  settings?: any;
}

export function ButtonBlockEditor({ block, onChange, onSave, onCancel, isSaving }: ButtonBlockEditorProps) {
  const content = (block.content as ButtonContent) || {
    text: { ru: "Кнопка", en: "Button", hy: "Կոճակ" },
    link: "/",
    variant: "primary",
    size: "medium",
    ru: {},
    en: {},
    hy: {},
    settings: {}
  };

  const handleTextChange = (lang: string, value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        text: {
          ...content.text,
          [lang]: value
        }
      }
    });
  };

  const handleLinkChange = (value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        link: value
      }
    });
  };

  const handleVariantChange = (value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        variant: value
      }
    });
  };

  const handleSizeChange = (value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        size: value
      }
    });
  };

  const getVariantClass = (variant: string) => {
    switch (variant) {
      case "primary":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      case "secondary":
        return "bg-gray-200 hover:bg-gray-300 text-gray-800";
      case "outline":
        return "border border-blue-500 text-blue-500 hover:bg-blue-50";
      case "ghost":
        return "text-gray-600 hover:bg-gray-100";
      default:
        return "bg-blue-500 hover:bg-blue-600 text-white";
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case "small":
        return "px-3 py-1 text-sm";
      case "medium":
        return "px-4 py-2";
      case "large":
        return "px-6 py-3 text-lg";
      default:
        return "px-4 py-2";
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Заголовок секции */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r">
        <h3 className="font-semibold text-orange-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
          Кнопка
        </h3>
        <p className="text-sm text-orange-700 mt-1">Создайте призыв к действию для ваших посетителей</p>
      </div>

      {/* Предпросмотр кнопки */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
          Предпросмотр кнопки
        </h4>
        <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
          <button
            className={`rounded-lg font-medium transition-all ${getVariantClass(content.variant || "primary")} ${getSizeClass(content.size || "medium")} shadow-sm hover:shadow-md`}
            disabled
          >
            {content.text?.ru || "Пример кнопки"}
          </button>
        </div>
      </div>

      {/* Основные настройки */}
      <div className="space-y-4">
        {/* Текст кнопки на трех языках */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            Текст кнопки
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                <span className="inline-flex items-center gap-1">
                  🇷🇺 Русский
                </span>
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Текст кнопки"
                value={content.text?.ru || ""}
                onChange={(e) => handleTextChange("ru", e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                <span className="inline-flex items-center gap-1">
                  🇺🇸 Английский
                </span>
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Button text"
                value={content.text?.en || ""}
                onChange={(e) => handleTextChange("en", e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                <span className="inline-flex items-center gap-1">
                  🇦🇲 Армянский
                </span>
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Կոճակի տեքստ"
                value={content.text?.hy || ""}
                onChange={(e) => handleTextChange("hy", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Настройки кнопки */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
            Настройки кнопки
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Ссылка</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="/page или https://example.com"
                  value={content.link || ""}
                  onChange={(e) => handleLinkChange(e.target.value)}
                />
                <button
                  type="button"
                  className="px-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    if (content.link) {
                      window.open(content.link, '_blank');
                    }
                  }}
                  disabled={!content.link}
                  title="Открыть ссылку"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Куда ведет кнопка при клике</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Стиль кнопки</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={content.variant || "primary"}
                onChange={(e) => handleVariantChange(e.target.value)}
              >
                <option value="primary">🎯 Основная</option>
                <option value="secondary">🔘 Вторичная</option>
                <option value="outline">📋 Контурная</option>
                <option value="ghost">👻 Призрачная</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Размер кнопки</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={content.size || "medium"}
                onChange={(e) => handleSizeChange(e.target.value)}
              >
                <option value="small">🔹 Маленькая</option>
                <option value="medium">🔸 Средняя</option>
                <option value="large">🔷 Большая</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Демонстрация стилей */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
          Доступные стили кнопок
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["primary", "secondary", "outline", "ghost"].map((variant) => (
            <div key={variant} className="text-center">
              <button
                className={`w-full px-3 py-2 rounded-lg font-medium ${getVariantClass(variant)} ${getSizeClass("medium")} mb-2`}
                disabled
              >
                {variant === "primary" && "Основная"}
                {variant === "secondary" && "Вторичная"}
                {variant === "outline" && "Контурная"}
                {variant === "ghost" && "Призрачная"}
              </button>
              <p className="text-xs text-gray-600 capitalize">
                {variant === "primary" && "Яркая и заметная"}
                {variant === "secondary" && "Дополнительная"}
                {variant === "outline" && "С контуром"}
                {variant === "ghost" && "Минималистичная"}
              </p>
            </div>
          ))}
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
          className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Сохранение...
            </span>
          ) : (
            'Сохранить кнопку'
          )}
        </button>
      </div>
    </div>
  );
}
