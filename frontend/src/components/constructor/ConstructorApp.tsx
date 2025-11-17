import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageBlockEditor } from "./ImageBlockEditor";
import { TextBlockEditor } from "./TextBlockEditor";
import { GalleryBlockEditor } from "./GalleryBlockEditor";
import { ButtonBlockEditor } from "./ButtonBlockEditor";
import { HeroBlockEditor } from "./HeroBlockEditor";
import { CategoriesBlockEditor } from "./CategoriesBlockEditor";
import { Page, Block } from "@shared/schema";

/**
 * ConstructorApp — основной компонент редактора страниц
 * - Список страниц
 * - Создание страницы
 * - Редактор блоков (открытие модалки, создание блока)
 *
 * Удобно: этот компонент можно подключить в вашей админке как отдельный route /constructor
 */

export type BlockType = Block;

interface PageTitle {
  ru?: string;
  en?: string;
  hy?: string;
}

interface PageDescription {
  ru?: string;
  en?: string;
  hy?: string;
}

interface ExtendedPage extends Omit<Page, 'title' | 'description'> {
  title?: PageTitle;
  description?: PageDescription;
}

export function ConstructorApp() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // fetch pages
  const { data: pages = [], isLoading: pagesLoading } = useQuery<Page[]>({
    queryKey: ["/api/constructor/pages"],
    queryFn: async () => {
      const r = await fetch("/api/constructor/pages");
      if (!r.ok) throw new Error("Failed to load pages");
      return r.json();
    },
  });

  // local
  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"pages" | "blocks">("pages");

  // fetch blocks for page
  const { data: blocks = [], isLoading: blocksLoading, refetch: refetchBlocks } = useQuery<BlockType[]>({
    queryKey: ["/api/constructor/pages", selectedPageId, "blocks"],
    enabled: !!selectedPageId,
    queryFn: async () => {
      const r = await fetch(`/api/constructor/pages/${selectedPageId}/blocks`);
      if (!r.ok) throw new Error("Failed to load blocks");
      return r.json();
    },
  });

  // create page mutation
  const createPageMut = useMutation({
    mutationFn: async (payload: Partial<Page>) => {
      console.log("[constructor] Creating page:", payload);
      const r = await fetch("/api/constructor/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      if (!r.ok) {
        console.error("[constructor] Create page failed:", r.status, text);
        throw new Error(text || `Create page failed: ${r.status}`);
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("[constructor] Invalid JSON in create page response:", text);
        throw new Error("Invalid JSON response");
      }
    },
    onSuccess: (newPage: Page) => {
      console.log("[constructor] Page created:", newPage);
      qc.invalidateQueries({ queryKey: ["/api/constructor/pages"] });
      setSelectedPageId(newPage.id);
      setActiveTab("blocks");
      toast({ title: "Страница создана", description: `slug: ${newPage.slug}` });
    },
    onError: (err: any) => {
      console.error("[constructor] Create page mutation error:", err);
      toast({ title: "Ошибка", description: `Не удалось создать страницу: ${err?.message || err}`, variant: "destructive" });
    }
  });

  // update page mutation
  const updatePageMut = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Page> & { id: string }) => {
      console.log("PATCH request data:", { id, payload });
      
      // Детальное логирование тела запроса
      const requestBody = JSON.stringify(payload);
      console.log("Request body:", requestBody);
      
      const r = await fetch(`/api/constructor/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
      
      console.log("Response status:", r.status);
      
      if (!r.ok) {
        const errorText = await r.text();
        console.error("PATCH request failed:", r.status, errorText);
        throw new Error(`Update page failed: ${r.status} ${errorText}`);
      }
      
      const responseData = await r.json();
      console.log("Response data:", responseData);
      return responseData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/constructor/pages"] });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
  });

  // delete page mutation
  const deletePageMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/constructor/pages/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Delete page failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/constructor/pages"] });
      setSelectedPageId(null);
    },
  });

  // create block mutation (simple API expects POST /pages/:id/blocks)
  const createBlockMut = useMutation({
    mutationFn: async ({ pageId, type }: { pageId: string; type: string }) => {
      const r = await fetch(`/api/constructor/pages/${pageId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          content: {
            ru: {},
            en: {},
            hy: {},
            settings: {},
          },
          sortOrder: blocks.length,
        }),
      });
      const text = await r.text();
      try {
        const json = JSON.parse(text);
        if (!r.ok) throw new Error(json?.error || JSON.stringify(json));
        return json;
      } catch (e) {
        throw new Error(`Block create failed: ${text}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/constructor/pages", selectedPageId, "blocks"] });
      refetchBlocks();
    },
  });

  // update block mutation
  const updateBlockMut = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<BlockType> & { id: string }) => {
      console.log("PATCH block request:", { id, payload });
      
      const r = await fetch(`/api/constructor/blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      console.log("PATCH block response status:", r.status);
      
      if (!r.ok) {
        const errorText = await r.text();
        console.error("PATCH block request failed:", r.status, errorText);
        throw new Error(`Update block failed: ${r.status} ${errorText}`);
      }
      
      const responseData = await r.json();
      console.log("PATCH block response data:", responseData);
      return responseData;
    },
    onSuccess: () => {
      console.log("Block updated successfully");
      qc.invalidateQueries({ queryKey: ["/api/constructor/pages", selectedPageId, "blocks"] });
      refetchBlocks();
    },
    onError: (error) => {
      console.error("Block update mutation error:", error);
    },
  });

  // delete block mutation
  const deleteBlockMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/constructor/blocks/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Delete block failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/constructor/pages", selectedPageId, "blocks"] });
      refetchBlocks();
    },
  });

  // UX helpers
  const handleCreatePage = async () => {
    console.log("[constructor] Create Page button clicked");
    try {
      await createPageMut.mutateAsync({
        slug: `page-${Date.now()}`,
        title: { ru: "Новая страница", en: "New page", hy: "Նոր էջ" },
        description: { ru: "", en: "", hy: "" },
      });
    } catch (e) {
      // handled in onError, just preventing unhandled rejection
    }
  };

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPage, setEditingPage] = React.useState<ExtendedPage | null>(null);
  const [editingBlock, setEditingBlock] = React.useState<BlockType | null>(null);

  const handleOpenBlocks = (pageId: string) => {
    setSelectedPageId(pageId);
    setActiveTab("blocks");
  };

  const handleEditPage = (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPage(page as ExtendedPage);
  };

  const handleDeletePage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Удалить страницу?")) {
      deletePageMut.mutate(pageId);
    }
  };

  const handleSavePage = () => {
    if (editingPage) {
      const { id, createdAt, updatedAt, ...payload } = editingPage;
      console.log("Saving page with data:", { id, payload });
      
      // Проверяем, что title является объектом, а не строкой
      if (payload.title && typeof payload.title !== 'object') {
        console.error("Title is not an object:", payload.title);
        alert("Ошибка: заголовок должен быть объектом с языковыми ключами");
        return;
      }
      
      updatePageMut.mutate({ id, ...payload });
      setEditingPage(null);
    }
  };

  const handleEditBlock = (block: BlockType) => {
    console.log('Editing block set:', JSON.stringify(block, null, 2));
    setEditingBlock(block);
  };

  const handleSaveBlock = () => {
    if (editingBlock) {
      const { id, createdAt, updatedAt, ...payload } = editingBlock;
      console.log("Saving block payload:", { id, payload });
      
      // Сохраняем все данные блока, включая обновленные изображения
      updateBlockMut.mutate({ 
        id, 
        content: payload.content,
        sortOrder: payload.sortOrder
      });
      setEditingBlock(null);
    }
  };

  const handleAddBlock = async (type: string) => {
    if (!selectedPageId) {
      alert("Выберите страницу и сохраните её перед добавлением блока");
      return;
    }
    setIsModalOpen(false);
    createBlockMut.mutate({ pageId: selectedPageId, type });
  };

  // Обработка клавиш для модальных окон
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC - закрыть любое модальное окно
      if (event.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
          event.preventDefault();
        } else if (editingPage) {
          setEditingPage(null);
          event.preventDefault();
        } else if (editingBlock) {
          setEditingBlock(null);
          event.preventDefault();
        }
      }
      
      // Enter - подтвердить действие в модальных окнах (обычный Enter)
      if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
        // Проверяем, что событие произошло не в текстовом поле или textarea
        const target = event.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        
        if (!isInput) {
          if (editingPage) {
            handleSavePage();
            event.preventDefault();
          } else if (editingBlock) {
            handleSaveBlock();
            event.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, editingPage, editingBlock, handleSavePage, handleSaveBlock]);

  // Small layout
  return (
    <div className="p-6 container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Конструктор страниц</h1>
          <p className="text-sm text-muted-foreground">Лёгкий редактор блоков — минимум настроек, максимум UX</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-primary text-white disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleCreatePage}
            disabled={createPageMut.status === 'pending'}
          >
            <Plus className="w-4 h-4" /> {createPageMut.status === 'pending' ? 'Создание…' : 'Новая страница'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <h3 className="font-semibold mb-2">Страницы</h3>
          <div className="space-y-2">
            {pages.map((p) => (
              <div
                key={p.id}
                className={`p-3 border rounded cursor-pointer ${selectedPageId === p.id ? "bg-primary/10 border-primary" : ""}`}
                onClick={() => handleOpenBlocks(p.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{(p.title as any)?.ru || p.slug}</div>
                    <div className="text-xs text-muted-foreground">{p.slug}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}</div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    className="text-xs text-blue-600 hover:text-blue-800"
                    onClick={(e) => handleEditPage(p, e)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="text-xs text-red-600 hover:text-red-800"
                    onClick={(e) => handleDeletePage(p.id, e)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
            {pages.length === 0 && <div className="text-sm text-muted-foreground">Нет страниц — создайте первую</div>}
          </div>
        </div>

        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Блоки страницы</h3>
            <div>
              <button
                className="px-3 py-2 border rounded"
                disabled={!selectedPageId}
                onClick={() => setIsModalOpen(true)}
              >
                Добавить блок
              </button>
            </div>
          </div>

          {!selectedPageId && <div className="text-sm text-muted-foreground">Выберите страницу слева</div>}

          {selectedPageId && (
            <div>
              {blocksLoading ? (
                <div>Загрузка блоков...</div>
              ) : (
                <div className="space-y-3">
                  {blocks.map((b) => (
                    <div key={b.id} className="p-3 border rounded flex items-center justify-between">
                      <div>
                        <div className="font-medium">{b.type}</div>
                        <div className="text-xs text-muted-foreground">{JSON.stringify(b.content).slice(0, 80)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 border rounded"
                          onClick={() => handleEditBlock(b)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-2 py-1 border rounded text-red-600"
                          onClick={() => {
                            if (confirm("Удалить блок?")) {
                              deleteBlockMut.mutate(b.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {blocks.length === 0 && <div className="text-sm text-muted-foreground">Нет блоков на странице</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* modal for add block */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 overflow-y-auto flex-1">
              <h4 className="font-semibold mb-4">Добавить блок</h4>
              <div className="grid grid-cols-2 gap-3">
                {["hero", "text", "image", "gallery", "categories", "button"].map((t) => (
                  <button
                    key={t}
                    className="p-3 border rounded flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
                    onClick={() => handleAddBlock(t)}
                  >
                    <div className="text-lg font-medium">{t}</div>
                    <div className="text-xs text-muted-foreground">Default</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Фиксированные кнопки действий */}
            <div className="p-4 border-t bg-white rounded-b">
              <div className="flex justify-end">
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsModalOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* modal for edit page */}
      {editingPage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-6 overflow-y-auto flex-1">
              <h4 className="font-semibold mb-4">Редактировать страницу</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Название (русский)</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editingPage.title?.ru || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      title: { ...editingPage.title, ru: e.target.value }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Название (английский)</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editingPage.title?.en || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      title: { ...editingPage.title, en: e.target.value }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Название (армянский)</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editingPage.title?.hy || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      title: { ...editingPage.title, hy: e.target.value }
                    })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editingPage.slug}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      slug: e.target.value
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Описание (русский)</label>
                  <textarea
                    className="w-full p-2 border rounded"
                    rows={2}
                    value={editingPage.description?.ru || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      description: { ...editingPage.description, ru: e.target.value }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Описание (английский)</label>
                  <textarea
                    className="w-full p-2 border rounded"
                    rows={2}
                    value={editingPage.description?.en || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      description: { ...editingPage.description, en: e.target.value }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Meta Title (SEO)</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editingPage.metaTitle || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      metaTitle: e.target.value
                    })}
                    placeholder="Заголовок страницы для поисковиков (50-60 символов)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Meta Description (SEO)</label>
                  <textarea
                    className="w-full p-2 border rounded"
                    rows={2}
                    value={editingPage.metaDescription || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      metaDescription: e.target.value
                    })}
                    placeholder="Описание страницы для поисковиков (150-160 символов)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Keywords (SEO)</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editingPage.keywords || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      keywords: e.target.value
                    })}
                    placeholder="Ключевые слова через запятую"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Canonical URL</label>
                  <input
                    type="url"
                    className="w-full p-2 border rounded"
                    value={editingPage.canonicalUrl || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      canonicalUrl: e.target.value
                    })}
                    placeholder="https://example.com/page"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Open Graph Image URL</label>
                  <input
                    type="url"
                    className="w-full p-2 border rounded"
                    value={editingPage.ogImage || ''}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      ogImage: e.target.value
                    })}
                    placeholder="URL изображения для соцсетей (1200x630px)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Twitter Card Type</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={editingPage.twitterCard || 'summary_large_image'}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      twitterCard: e.target.value
                    })}
                  >
                    <option value="summary">Summary (маленькая карточка)</option>
                    <option value="summary_large_image">Summary Large Image (большая карточка)</option>
                    <option value="app">App (для приложений)</option>
                    <option value="player">Player (для видео)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Язык страницы</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={editingPage.language || 'ru'}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      language: e.target.value
                    })}
                  >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                    <option value="hy">Հայերեն</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="noindex"
                    checked={editingPage.noindex || false}
                    onChange={(e) => setEditingPage({
                      ...editingPage,
                      noindex: e.target.checked
                    })}
                  />
                  <label htmlFor="noindex" className="text-sm font-medium">
                    Запретить индексацию (noindex)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showInHeaderNav"
                    checked={Boolean((editingPage as any).showInHeaderNav)}
                    onChange={(e) => setEditingPage({
                      ...(editingPage as any),
                      showInHeaderNav: e.target.checked
                    } as any)}
                  />
                  <label htmlFor="showInHeaderNav" className="text-sm font-medium">
                    Показать в навигации шапки
                  </label>
                </div>
              </div>
            </div>

            {/* Фиксированные кнопки действий */}
            <div className="p-4 border-t bg-white rounded-b">
              <div className="flex justify-end gap-2">
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setEditingPage(null)}
                >
                  Отмена
                </button>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={handleSavePage}
                  disabled={updatePageMut.status === 'pending'}
                >
                  {updatePageMut.status === 'pending' ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* modal for edit block */}
      {editingBlock && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 overflow-y-auto flex-1">
              <h4 className="font-semibold mb-4">
                Редактировать блок: {editingBlock.type}
              </h4>
              
              {editingBlock.type === 'image' && (
                <ImageBlockEditor
                  block={editingBlock}
                  onChange={setEditingBlock}
                  onSave={handleSaveBlock}
                  onCancel={() => setEditingBlock(null)}
                  isSaving={updateBlockMut.status === 'pending'}
                />
              )}

              {editingBlock.type === 'text' && (
                <TextBlockEditor
                  block={editingBlock}
                  onChange={setEditingBlock}
                  onSave={handleSaveBlock}
                  onCancel={() => setEditingBlock(null)}
                  isSaving={updateBlockMut.status === 'pending'}
                />
              )}

              {editingBlock.type === 'gallery' && (
                <GalleryBlockEditor
                  block={editingBlock}
                  onChange={setEditingBlock}
                  onSave={handleSaveBlock}
                  onCancel={() => setEditingBlock(null)}
                  isSaving={updateBlockMut.status === 'pending'}
                />
              )}

              {editingBlock.type === 'button' && (
                <ButtonBlockEditor
                  block={editingBlock}
                  onChange={setEditingBlock}
                  onSave={handleSaveBlock}
                  onCancel={() => setEditingBlock(null)}
                  isSaving={updateBlockMut.status === 'pending'}
                />
              )}

              {editingBlock.type === 'hero' && (
                <HeroBlockEditor
                  block={editingBlock}
                  onChange={setEditingBlock}
                  onSave={handleSaveBlock}
                  onCancel={() => setEditingBlock(null)}
                  isSaving={updateBlockMut.status === 'pending'}
                />
              )}

              {editingBlock.type === 'categories' && (
                <CategoriesBlockEditor
                  block={editingBlock}
                  onChange={setEditingBlock}
                  onSave={handleSaveBlock}
                  onCancel={() => setEditingBlock(null)}
                  isSaving={updateBlockMut.status === 'pending'}
                />
              )}

              {!['image', 'text', 'gallery', 'button', 'hero', 'categories'].includes(editingBlock.type) && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Тип блока</label>
                    <div className="p-2 border rounded bg-gray-50">{editingBlock.type}</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Контент (JSON)</label>
                    <textarea
                      className="w-full p-2 border rounded font-mono text-sm"
                      rows={6}
                      value={JSON.stringify(editingBlock.content, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEditingBlock({
                            ...editingBlock,
                            content: parsed
                          });
                        } catch (error) {
                          // Оставляем невалидный JSON для редактирования
                          setEditingBlock({
                            ...editingBlock,
                            content: e.target.value
                          });
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Порядок сортировки</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded"
                      value={editingBlock.sortOrder || 0}
                      onChange={(e) => setEditingBlock({
                        ...editingBlock,
                        sortOrder: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Фиксированные кнопки действий */}
            <div className="p-4 border-t bg-white rounded-b">
              <div className="flex justify-end gap-2">
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setEditingBlock(null)}
                >
                  Отмена
                </button>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={handleSaveBlock}
                  disabled={updateBlockMut.status === 'pending'}
                >
                  {updateBlockMut.status === 'pending' ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
