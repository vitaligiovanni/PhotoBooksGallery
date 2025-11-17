import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Page } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit, Eye, RefreshCcw } from "lucide-react";

type PageFormState = {
  title: { ru?: string; en?: string; hy?: string };
  description?: { ru?: string; en?: string; hy?: string } | null;
  slug: string;
  isPublished?: boolean;
  showInHeaderNav?: boolean;
  sortOrder?: number;
};

export function PagesManager() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Page | null>(null);
  const { data: pages = [], isFetching, refetch } = useQuery<Page[]>({
    queryKey: ["/api/constructor/pages"],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p: any) =>
      (p.slug || "").toLowerCase().includes(q) ||
      (p.title?.ru || "").toLowerCase().includes(q) ||
      (p.title?.en || "").toLowerCase().includes(q) ||
      (p.title?.hy || "").toLowerCase().includes(q)
    );
  }, [pages, search]);

  const patchPage = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PageFormState> }) => {
      return await apiRequest("PATCH", `/api/constructor/pages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constructor/pages"] });
      toast({ title: "Сохранено", description: "Страница обновлена" });
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e?.message || "Не удалось обновить страницу", variant: "destructive" });
    }
  });

  const [form, setForm] = useState<PageFormState>({ slug: "", title: { ru: "" }, description: null, isPublished: false, showInHeaderNav: false, sortOrder: 0 });
  useEffect(() => {
    if (editing) {
      setForm({
        slug: editing.slug,
        title: (editing as any).title || { ru: "" },
        description: (editing as any).description || null,
        isPublished: (editing as any).isPublished ?? false,
        showInHeaderNav: (editing as any).showInHeaderNav ?? false,
        sortOrder: (editing as any).sortOrder ?? 0,
      });
    }
  }, [editing]);

  const submit = async () => {
    if (!editing) return;
    const payload: Partial<PageFormState> = {
      title: form.title,
      description: form.description,
      isPublished: !!form.isPublished,
      showInHeaderNav: !!form.showInHeaderNav,
      sortOrder: Number(form.sortOrder || 0),
    };
    await patchPage.mutateAsync({ id: (editing as any).id, data: payload });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Страницы</h1>
          <p className="text-muted-foreground mt-2">Существующие страницы конструктора. Редактируются только мета-поля, контент — в Конструкторе.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Поиск по названию или slug" value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Обновить
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Список страниц ({pages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название (RU)</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Опубликована</TableHead>
                  <TableHead>В шапке</TableHead>
                  <TableHead>Порядок</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered
                  .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium">{p.title?.ru || p.slug}</p>
                          <p className="text-xs text-muted-foreground">EN: {p.title?.en || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell><code className="bg-gray-100 px-2 py-1 rounded text-sm">{p.slug}</code></TableCell>
                      <TableCell>
                        <Switch checked={!!p.isPublished} onCheckedChange={(v) => patchPage.mutate({ id: p.id, data: { isPublished: !!v } })} />
                      </TableCell>
                      <TableCell>
                        <Switch checked={!!p.showInHeaderNav} onCheckedChange={(v) => patchPage.mutate({ id: p.id, data: { showInHeaderNav: !!v } })} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-24"
                          defaultValue={p.sortOrder || 0}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value || "0", 10) || 0;
                            if (val !== (p.sortOrder || 0)) {
                              patchPage.mutate({ id: p.id, data: { sortOrder: val } });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <a href={`/page/${p.slug}`} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" /> Смотреть
                            </Button>
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать страницу</DialogTitle>
            <DialogDescription>Измените только мета-поля. Контент и блоки остаются без изменений.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название (RU)</label>
                <Input value={form.title?.ru || ""} onChange={(e) => setForm((f) => ({ ...f, title: { ...f.title, ru: e.target.value } }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Название (EN)</label>
                <Input value={form.title?.en || ""} onChange={(e) => setForm((f) => ({ ...f, title: { ...f.title, en: e.target.value } }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Название (HY)</label>
                <Input value={form.title?.hy || ""} onChange={(e) => setForm((f) => ({ ...f, title: { ...f.title, hy: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Описание (RU)</label>
                <Textarea rows={3} value={(form.description as any)?.ru || ""} onChange={(e) => setForm((f) => ({ ...f, description: { ...(f.description || {}), ru: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={!!form.isPublished} onCheckedChange={(v) => setForm((f) => ({ ...f, isPublished: !!v }))} />
                <span className="text-sm">Опубликована</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!form.showInHeaderNav} onCheckedChange={(v) => setForm((f) => ({ ...f, showInHeaderNav: !!v }))} />
                <span className="text-sm">Показывать в шапке</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Порядок</label>
                <Input type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value || "0", 10) || 0 }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
              <Button onClick={submit} disabled={patchPage.isPending}>{patchPage.isPending ? "Сохранение..." : "Сохранить"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
