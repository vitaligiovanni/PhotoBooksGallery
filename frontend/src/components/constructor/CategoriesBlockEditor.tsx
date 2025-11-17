import React from "react";
import { BlockType } from "./ConstructorApp";
import { Upload, ExternalLink, Plus, Trash2, GripVertical } from "lucide-react";

interface Category {
  id: string;
  name: { ru: string; en: string; hy: string };
  imageUrl?: string;
  link: string;
  description?: { ru: string; en: string; hy: string };
}

interface CategoriesBlockEditorProps {
  block: BlockType;
  onChange: (block: BlockType) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function CategoriesBlockEditor({ block, onChange, onSave, onCancel, isSaving }: CategoriesBlockEditorProps) {
  const content = block.content as {
    title?: { ru: string; en: string; hy: string };
    categories?: Category[];
    columns?: number;
    showDescription?: boolean;
    ru?: any;
    en?: any;
    hy?: any;
    settings?: any;
  } || {
    title: { ru: "Категории товаров", en: "Product Categories", hy: "Ապրանքների կատեգորիաներ" },
    categories: [
      {
        id: "1",
        name: { ru: "Фотокниги", en: "Photobooks", hy: "Ֆոտոգրքեր" },
        imageUrl: undefined,
        link: "/category/photobooks",
        description: { ru: "Создайте уникальную фотокнигу", en: "Create unique photobook", hy: "Ստեղծեք եզակի ֆոտոգիրք" }
      }
    ],
    columns: 3,
    showDescription: true,
    ru: {},
    en: {},
    hy: {},
    settings: {}
  };

  const handleTitleChange = (lang: string, value: string) => {
    onChange({
      ...block,
      content: {
        ...content,
        title: {
          ...content.title,
          [lang]: value
        }
      }
    });
  };

  const handleSimpleChange = (field: string, value: any) => {
    onChange({
      ...block,
      content: {
        ...content,
        [field]: value
      }
    });
  };

  const handleCategoryChange = (categoryId: string, field: string, value: any) => {
    const updatedCategories = (content.categories || []).map((cat: Category) =>
      cat.id === categoryId ? { ...cat, [field]: value } : cat
    );

    onChange({
      ...block,
      content: {
        ...content,
        categories: updatedCategories
      }
    });
  };

  const handleCategoryTextChange = (categoryId: string, field: string, lang: string, value: string) => {
    const updatedCategories = (content.categories || []).map((cat: Category) =>
      cat.id === categoryId
        ? {
            ...cat,
            [field]: {
              ...(cat[field as keyof Category] as any),
              [lang]: value
            }
          }
        : cat
    );

    onChange({
      ...block,
      content: {
        ...content,
        categories: updatedCategories
      }
    });
  };

  const addCategory = () => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name: { ru: "Новая категория", en: "New Category", hy: "Նոր կատեգորիա" },
      imageUrl: undefined,
      link: "/category/new",
      description: { ru: "Описание категории", en: "Category description", hy: "Կատեգորիայի նկարագրություն" }
    };

    onChange({
      ...block,
      content: {
        ...content,
        categories: [...(content.categories || []), newCategory]
      }
    });
  };

  const removeCategory = (categoryId: string) => {
    const updatedCategories = (content.categories || []).filter((cat: Category) => cat.id !== categoryId);

    onChange({
      ...block,
      content: {
        ...content,
        categories: updatedCategories
      }
    });
  };

  const handleImageUpload = async (categoryId: string, event: React.ChangeEvent<HTMLInputElement>) => {
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
      handleCategoryChange(categoryId, "imageUrl", result.url);
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      alert('Не удалось загрузить изображение');
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* Заголовок секции */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-r">
        <h3 className="font-semibold text-green-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Блок категорий товаров
        </h3>
        <p className="text-sm text-green-700 mt-1">Создайте навигационный блок с категориями товаров</p>
      </div>

      {/* Предпросмотр блока категорий */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
          Предпросмотр блока категорий
        </h4>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center">{content.title?.ru || "Категории товаров"}</h3>

          <div className={`grid gap-4 ${content.columns === 2 ? 'grid-cols-2' : content.columns === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {content.categories?.slice(0, 6).map((category: Category) => (
              <div key={category.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                {category.imageUrl && (
                  <img
                    src={category.imageUrl}
                    alt={category.name?.ru}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                )}
                <h4 className="font-semibold mb-2">{category.name?.ru || "Категория"}</h4>
                {content.showDescription && category.description?.ru && (
                  <p className="text-sm text-gray-600 mb-2">{category.description.ru}</p>
                )}
                <div className="text-xs text-blue-600">{category.link}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Основные настройки */}
      <div className="space-y-4">
        {/* Заголовок блока */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
            Заголовок блока
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Заголовок (русский)</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Категории товаров"
                value={content.title?.ru || ""}
                onChange={(e) => handleTitleChange("ru", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Заголовок (английский)</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Product Categories"
                value={content.title?.en || ""}
                onChange={(e) => handleTitleChange("en", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Заголовок (армянский)</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ապրանքների կատեգորիաներ"
                value={content.title?.hy || ""}
                onChange={(e) => handleTitleChange("hy", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Настройки отображения */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
            Настройки отображения
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Количество колонок</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={content.columns || 3}
                onChange={(e) => handleSimpleChange("columns", parseInt(e.target.value))}
              >
                <option value={2}>2 колонки</option>
                <option value={3}>3 колонки</option>
                <option value={4}>4 колонки</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showDescription"
                checked={content.showDescription || false}
                onChange={(e) => handleSimpleChange("showDescription", e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="showDescription" className="text-sm font-medium text-gray-700">
                Показывать описания категорий
              </label>
            </div>
          </div>
        </div>

        {/* Управление категориями */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
              Категории ({content.categories?.length || 0})
            </h4>
            <button
              onClick={addCategory}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Добавить категорию
            </button>
          </div>

          <div className="space-y-3">
            {content.categories?.map((category: Category, index: number) => (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Категория {index + 1}</span>
                  </div>
                  <button
                    onClick={() => removeCategory(category.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Удалить категорию"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Название категории */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Название (русский)</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      value={category.name?.ru || ""}
                      onChange={(e) => handleCategoryTextChange(category.id, "name", "ru", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Название (английский)</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      value={category.name?.en || ""}
                      onChange={(e) => handleCategoryTextChange(category.id, "name", "en", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Название (армянский)</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      value={category.name?.hy || ""}
                      onChange={(e) => handleCategoryTextChange(category.id, "name", "hy", e.target.value)}
                    />
                  </div>

                  {/* Ссылка */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Ссылка</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="/category/example"
                      value={category.link || ""}
                      onChange={(e) => handleCategoryChange(category.id, "link", e.target.value)}
                    />
                  </div>

                  {/* Изображение */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Изображение категории</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="URL изображения"
                        value={category.imageUrl || ""}
                        onChange={(e) => handleCategoryChange(category.id, "imageUrl", e.target.value)}
                      />
                      <label className="px-3 py-2 border border-gray-300 rounded flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                        <Upload className="w-4 h-4" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(category.id, e)}
                        />
                      </label>
                    </div>

                    {category.imageUrl && (
                      <div className="flex items-center gap-2 text-green-700 text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Изображение загружено</span>
                        <ExternalLink className="w-3 h-3" />
                        <a
                          href={category.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline"
                        >
                          Посмотреть
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Описание */}
                  {content.showDescription && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Описание (русский)</label>
                        <textarea
                          rows={2}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                          value={category.description?.ru || ""}
                          onChange={(e) => handleCategoryTextChange(category.id, "description", "ru", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Описание (английский)</label>
                        <textarea
                          rows={2}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                          value={category.description?.en || ""}
                          onChange={(e) => handleCategoryTextChange(category.id, "description", "en", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Описание (армянский)</label>
                        <textarea
                          rows={2}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                          value={category.description?.hy || ""}
                          onChange={(e) => handleCategoryTextChange(category.id, "description", "hy", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {(!content.categories || content.categories.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <p>Нет категорий. Добавьте первую категорию.</p>
              </div>
            )}
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
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          disabled={isSaving}
        >
          {isSaving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}