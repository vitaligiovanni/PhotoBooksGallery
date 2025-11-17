import React from "react";
import { BlockType } from "./ConstructorApp";
import { Upload, ExternalLink } from "lucide-react";

interface HeroBlockEditorProps {
  block: BlockType;
  onChange: (block: BlockType) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface HeroText {
  ru?: string;
  en?: string;
  hy?: string;
}

interface HeroContent {
  title?: HeroText;
  subtitle?: HeroText;
  backgroundImage?: string;
  buttonText?: HeroText;
  buttonLink?: string;
  overlayOpacity?: number;
  textColor?: string;
  alignment?: string;
  buttonVariant?: string;
  buttonSize?: string;
  buttonColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  ru?: any;
  en?: any;
  hy?: any;
  settings?: any;
}

export function HeroBlockEditor({ block, onChange, onSave, onCancel, isSaving }: HeroBlockEditorProps) {
  const content = (block.content as HeroContent) || {
    title: { ru: "Заголовок", en: "Title", hy: "Վերնագիր" },
    subtitle: { ru: "Подзаголовок", en: "Subtitle", hy: "Ենթավերնագիր" },
    backgroundImage: "",
    buttonText: { ru: "Кнопка", en: "Button", hy: "Կոճակ" },
    buttonLink: "/",
    overlayOpacity: 0.5,
    textColor: "#ffffff",
    alignment: "center",
    ru: {},
    en: {},
    hy: {},
    settings: {}
  };

  const handleTextChange = (field: string, lang: string, value: string) => {
    const currentField = (content as any)[field] || {};
    onChange({
      ...block,
      content: {
        ...content,
        [field]: {
          ...currentField,
          [lang]: value
        }
      }
    });
  };

  const handleSimpleChange = (field: string, value: string | number) => {
    onChange({
      ...block,
      content: {
        ...content,
        [field]: value
      }
    });
  };

  const handleButtonVariantChange = (value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        buttonVariant: value
      }
    });
  };

  const handleButtonSizeChange = (value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        buttonSize: value
      }
    });
  };

  const handleButtonColorChange = (value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        buttonColor: value
      }
    });
  };

  const handleTitleColorChange = (value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        titleColor: value
      }
    });
  };

  const handleSubtitleColorChange = (value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        subtitleColor: value
      }
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/local-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки изображения');
      }

      const result = await response.json();
      handleSimpleChange("backgroundImage", result.url);
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      alert('Не удалось загрузить изображение');
    }
  };

  const getAlignmentClass = (alignment: string) => {
    switch (alignment) {
      case "left":
        return "text-left";
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-center";
    }
  };

  const getButtonVariantClass = (variant: string) => {
    switch (variant) {
      case "primary":
        return "hover:brightness-110 text-white";
      case "secondary":
        return "bg-gray-200 hover:bg-gray-300 text-gray-800";
      case "outline":
        return "border hover:bg-opacity-10";
      case "ghost":
        return "text-gray-600 hover:bg-gray-100";
      case "rounded":
        return "hover:brightness-110 text-white rounded-full";
      default:
        return "hover:brightness-110 text-white";
    }
  };

  const getButtonStyle = (variant: string) => {
    const buttonColor = content.buttonColor || "#3b82f6";
    
    switch (variant) {
      case "primary":
        return { backgroundColor: buttonColor };
      case "outline":
        return { 
          borderColor: buttonColor,
          color: buttonColor,
          backgroundColor: 'transparent'
        };
      case "rounded":
        return { backgroundColor: buttonColor };
      default:
        return {};
    }
  };

  const getButtonSizeClass = (size: string) => {
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Hero-блок
        </h3>
        <p className="text-sm text-blue-700 mt-1">Создайте привлекательный заглавный блок для вашей страницы</p>
      </div>

      {/* Предпросмотр hero-блока */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
          Предпросмотр hero-блока
        </h4>
        
        <div 
          className="relative p-8 rounded-lg min-h-[250px] flex items-center justify-center bg-cover bg-center shadow-inner"
          style={{
            backgroundImage: content.backgroundImage ? `url(${content.backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: content.textColor || '#ffffff'
          }}
        >
          <div 
            className="absolute inset-0 rounded-lg"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${content.overlayOpacity || 0.5})`
            }}
          />
          <div className={`relative z-10 ${getAlignmentClass(content.alignment || "center")} max-w-2xl`}>
            <h2 
              className="text-3xl font-bold mb-3"
              style={{ color: content.titleColor || content.textColor || '#ffffff' }}
            >
              {content.title?.ru || "Заголовок героя"}
            </h2>
            <p 
              className="text-xl mb-6 opacity-90 leading-relaxed"
              style={{ color: content.subtitleColor || content.textColor || '#ffffff' }}
            >
              {content.subtitle?.ru || "Вдохновляющий подзаголовок для вашего hero-блока"}
            </p>
            {content.buttonText?.ru && (
              <button 
                className={`font-medium transition-all ${getButtonVariantClass(content.buttonVariant || "primary")} ${getButtonSizeClass(content.buttonSize || "medium")} rounded-lg shadow-lg hover:shadow-xl`}
                style={getButtonStyle(content.buttonVariant || "primary")}
                disabled
              >
                {content.buttonText.ru}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Основные настройки */}
      <div className="space-y-4">
        {/* Фоновое изображение */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            Фоновое изображение
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">URL фонового изображения</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="https://example.com/hero-image.jpg"
                  value={content.backgroundImage || ""}
                  onChange={(e) => handleSimpleChange("backgroundImage", e.target.value)}
                />
                <label className="px-4 py-3 border border-gray-300 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Загрузить</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>

            {content.backgroundImage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm">Изображение загружено успешно</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ExternalLink className="w-3 h-3" />
                  <a 
                    href={content.backgroundImage} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline"
                  >
                    Посмотреть изображение
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Настройки текста */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
            Настройки текста
          </h4>
          
          <div className="space-y-4">
            {/* Заголовок */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Заголовок (русский)</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Введите заголовок"
                value={content.title?.ru || ""}
                onChange={(e) => handleTextChange("title", "ru", e.target.value)}
              />
            </div>

            {/* Подзаголовок */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Подзаголовок (русский)</label>
              <textarea
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Введите подзаголовок"
                value={content.subtitle?.ru || ""}
                onChange={(e) => handleTextChange("subtitle", "ru", e.target.value)}
              />
            </div>

            {/* Цвет текста */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Цвет текста</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 p-1 border border-gray-300 rounded-lg cursor-pointer"
                  value={content.textColor || "#ffffff"}
                  onChange={(e) => handleSimpleChange("textColor", e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="#ffffff"
                  value={content.textColor || "#ffffff"}
                  onChange={(e) => handleSimpleChange("textColor", e.target.value)}
                />
              </div>
            </div>

            {/* Выравнивание */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Выравнивание текста</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={content.alignment || "center"}
                onChange={(e) => handleSimpleChange("alignment", e.target.value)}
              >
                <option value="left">По левому краю</option>
                <option value="center">По центру</option>
                <option value="right">По правому краю</option>
              </select>
            </div>
          </div>
        </div>

        {/* Настройки кнопки */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
            Настройки кнопки
          </h4>
          
          <div className="space-y-4">
            {/* Текст кнопки */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Текст кнопки (русский)</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Текст кнопки"
                value={content.buttonText?.ru || ""}
                onChange={(e) => handleTextChange("buttonText", "ru", e.target.value)}
              />
            </div>

            {/* Ссылка кнопки */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Ссылка кнопки</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="/page"
                value={content.buttonLink || "/"}
                onChange={(e) => handleSimpleChange("buttonLink", e.target.value)}
              />
            </div>

            {/* Стиль кнопки */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Стиль кнопки</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={content.buttonVariant || "primary"}
                  onChange={(e) => handleButtonVariantChange(e.target.value)}
                >
                  <option value="primary">Основная</option>
                  <option value="secondary">Вторичная</option>
                  <option value="outline">Контурная</option>
                  <option value="ghost">Призрачная</option>
                  <option value="rounded">Закругленная</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Размер кнопки</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={content.buttonSize || "medium"}
                  onChange={(e) => handleButtonSizeChange(e.target.value)}
                >
                  <option value="small">Маленькая</option>
                  <option value="medium">Средняя</option>
                  <option value="large">Большая</option>
                </select>
              </div>
            </div>

            {/* Цвет кнопки */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Цвет кнопки</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 p-1 border border-gray-300 rounded-lg cursor-pointer"
                  value={content.buttonColor || "#3b82f6"}
                  onChange={(e) => handleButtonColorChange(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="#3b82f6"
                  value={content.buttonColor || "#3b82f6"}
                  onChange={(e) => handleButtonColorChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Дополнительные настройки */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Дополнительные настройки
          </h4>
          
          <div className="space-y-4">
            {/* Прозрачность оверлея */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Прозрачность оверлея: {Math.round((content.overlayOpacity || 0.5) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                className="w-full"
                value={content.overlayOpacity || 0.5}
                onChange={(e) => handleSimpleChange("overlayOpacity", parseFloat(e.target.value))}
              />
            </div>

            {/* Цвет заголовка */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Цвет заголовка</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 p-1 border border-gray-300 rounded-lg cursor-pointer"
                  value={content.titleColor || content.textColor || "#ffffff"}
                  onChange={(e) => handleTitleColorChange(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="#ffffff"
                  value={content.titleColor || content.textColor || "#ffffff"}
                  onChange={(e) => handleTitleColorChange(e.target.value)}
                />
              </div>
            </div>

            {/* Цвет подзаголовка */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Цвет подзаголовка</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 p-1 border border-gray-300 rounded-lg cursor-pointer"
                  value={content.subtitleColor || content.textColor || "#ffffff"}
                  onChange={(e) => handleSubtitleColorChange(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="#ffffff"
                  value={content.subtitleColor || content.textColor || "#ffffff"}
                  onChange={(e) => handleSubtitleColorChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isSaving}
        >
          Отмена
        </button>
        <button
          onClick={onSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={isSaving}
        >
          {isSaving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
