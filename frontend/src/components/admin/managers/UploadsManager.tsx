import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, RefreshCcw, Trash2, Eye } from "lucide-react";

type UploadStatus = "pending" | "uploaded" | "processing" | "completed" | "deleted" | "scheduled_for_deletion";

type UploadFile = {
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
};

type UploadItem = {
  id: string;
  phone: string;
  format: string;
  size: string;
  pages: number;
  price: string;
  comment?: string | null;
  files?: UploadFile[];
  status: UploadStatus;
  createdAt: string;
  completedAt?: string | null;
  expiresAt: string;
  fileCount?: number | null;
  totalFileSize?: number | null;
  deleteAt?: string | null;
  deletionNotifiedAt?: string | null;
  adminHold?: boolean | null;
  postponedUntil?: string | null;
  deletedAt?: string | null;
};

type ListResponse = {
  uploads: UploadItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

async function fetchUploads({ page, limit, status }: { page: number; limit: number; status?: UploadStatus | "all"; }): Promise<ListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (status && status !== "all") params.set("status", status);
  const res = await fetch(`/api/upload/admin/uploads?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Не удалось загрузить список загрузок");
  return res.json();
}

async function fetchUpload(id: string): Promise<UploadItem> {
  const res = await fetch(`/api/upload/admin/uploads/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Не удалось получить данные загрузки");
  return res.json();
}

export function UploadsManager() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<UploadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<UploadItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-uploads", { page, limit, status }],
    queryFn: () => fetchUploads({ page, limit, status }),
  });

  const items = data?.uploads || [];
  const pagination = data?.pagination;

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allSelectedOnPage = items.length > 0 && items.every(i => selectedIds.has(i.id));
  const toggleSelectAllOnPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        items.forEach(i => next.delete(i.id));
      } else {
        items.forEach(i => next.add(i.id));
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleRefresh = () => {
    refetch();
  };

  const handleView = async (u: UploadItem) => {
    try {
      const details = await fetchUpload(u.id);
      setSelected(details);
      setDetailsOpen(true);
    } catch (e) {
      alert("Ошибка загрузки деталей");
    }
  };

  const handleDownloadZip = async (u: UploadItem) => {
    try {
      const res = await fetch(`/api/upload/admin/uploads/${u.id}/zip`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Не удалось сформировать ZIP");
      const blob = await res.blob();
      let filename = `photos-${u.phone}-${u.id.slice(0, 8)}.zip`;
      const cd = res.headers.get("Content-Disposition");
      if (cd) {
        const match = /filename=\"?([^";]+)\"?/i.exec(cd);
        if (match?.[1]) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Ошибка скачивания ZIP");
    }
  };

  const handleDelete = async (u: UploadItem) => {
    if (!confirm("Удалить загрузку и файлы?")) return;
    try {
      const res = await fetch(`/api/upload/admin/uploads/${u.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Не удалось удалить загрузку");
      await refetch();
    } catch (e) {
      console.error(e);
      alert("Ошибка удаления");
    }
  };

  const handleDeleteNow = async (u: UploadItem) => {
    if (!confirm("Удалить прямо сейчас? Это удалит файлы из хранилища.")) return;
    try {
      const res = await fetch(`/api/upload/admin/uploads/${u.id}/delete-now`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Не удалось удалить сейчас");
      await refetch();
    } catch (e) {
      console.error(e);
      alert("Ошибка удаления сейчас");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Удалить помеченные (${ids.length})? Это удалит файлы из хранилища и пометит записи как deleted.`)) return;
    try {
      const res = await fetch(`/api/upload/admin/uploads/bulk-delete`, {
        method: "POST",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error("Не удалось удалить помеченные");
      clearSelection();
      await refetch();
    } catch (e) {
      console.error(e);
      alert("Ошибка массового удаления");
    }
  };

  const handleBulkDeleteNow = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Удалить СЕЙЧАС помеченные (${ids.length})? Это НЕОБРАТИМО удалит файлы и записи.`)) return;
    try {
      const res = await fetch(`/api/upload/admin/uploads/bulk-delete-now`, {
        method: "POST",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error("Не удалось удалить сейчас помеченные");
      clearSelection();
      await refetch();
    } catch (e) {
      console.error(e);
      alert("Ошибка массового удаления сейчас");
    }
  };

  const handlePostpone = async (u: UploadItem, days = 7) => {
    try {
      const res = await fetch(`/api/upload/admin/uploads/${u.id}/postpone`, { method: "POST", credentials: "include", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days }) });
      if (!res.ok) throw new Error("Не удалось отложить удаление");
      await refetch();
    } catch (e) {
      console.error(e);
      alert("Ошибка откладывания");
    }
  };

  const handleHoldToggle = async (u: UploadItem) => {
    try {
      const res = await fetch(`/api/upload/admin/uploads/${u.id}/hold`, { method: "POST", credentials: "include", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hold: !(u.adminHold ?? false) }) });
      if (!res.ok) throw new Error("Не удалось переключить HOLD");
      await refetch();
    } catch (e) {
      console.error(e);
      alert("Ошибка HOLD");
    }
  };

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Загрузки фотографий</h1>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v as any); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="pending">Ожидает</SelectItem>
              <SelectItem value="uploaded">Загружено</SelectItem>
              <SelectItem value="processing">В обработке</SelectItem>
              <SelectItem value="completed">Завершено</SelectItem>
              <SelectItem value="scheduled_for_deletion">Скоро удаление</SelectItem>
              <SelectItem value="deleted">Удалено</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh}><RefreshCcw className="h-4 w-4 mr-2" />Обновить</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Сессии загрузок</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Загрузка...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-500">Ошибка загрузки списка</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" checked={allSelectedOnPage} onChange={toggleSelectAllOnPage} />
                    </TableHead>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-28">Телефон</TableHead>
                    <TableHead className="w-40">Формат/Размер</TableHead>
                    <TableHead className="w-20">Страниц</TableHead>
                    <TableHead className="w-24">Цена</TableHead>
                    <TableHead className="w-20">Файлов</TableHead>
                    <TableHead className="w-28">Размер</TableHead>
                    <TableHead className="w-40">Статус</TableHead>
                    <TableHead className="w-48">Удаление</TableHead>
                    <TableHead className="w-40">Создано</TableHead>
                    <TableHead className="text-right w-[520px]">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{u.id.slice(0,8)}</TableCell>
                      <TableCell className="truncate max-w-[110px]" title={u.phone}>{u.phone}</TableCell>
                      <TableCell className="truncate max-w-[160px]" title={`${u.format} ${u.size}`}>{u.format} {u.size}</TableCell>
                      <TableCell>{u.pages}</TableCell>
                      <TableCell className="truncate max-w-[100px]" title={`${u.price} ֏`}>{u.price} ֏</TableCell>
                      <TableCell>{u.fileCount ?? (u.files?.length ?? 0)}</TableCell>
                      <TableCell className="truncate max-w-[100px]">{u.totalFileSize ? (u.totalFileSize/1024/1024).toFixed(1) + ' MB' : '-'}</TableCell>
                      <TableCell className="truncate max-w-[160px]" title={u.status + (u.adminHold ? ' (HOLD)' : '')}>{u.status}{u.adminHold ? ' (HOLD)' : ''}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {u.deleteAt && (
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={`Удаление: ${new Date(u.deleteAt).toLocaleString()}`}>Удаление: {new Date(u.deleteAt).toLocaleString()}</span>
                          )}
                          {u.postponedUntil && (
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={`Отложено до: ${new Date(u.postponedUntil).toLocaleString()}`}>Отложено до: {new Date(u.postponedUntil).toLocaleString()}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="truncate max-w-[160px]" title={new Date(u.createdAt).toLocaleString()}>{new Date(u.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap gap-2 justify-end max-w-[520px] ml-auto">
                          <Button variant="secondary" size="sm" onClick={() => handleView(u)}><Eye className="h-4 w-4 mr-1"/>Просмотр</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadZip(u)}><Download className="h-4 w-4 mr-1"/>ZIP</Button>
                          <Button variant={u.adminHold ? "outline" : "default"} size="sm" onClick={() => handleHoldToggle(u)}>{u.adminHold ? 'Снять HOLD' : 'HOLD'}</Button>
                          <Button variant="outline" size="sm" onClick={() => handlePostpone(u, 7)}>+7д</Button>
                          <Button variant="outline" size="sm" onClick={() => handlePostpone(u, 30)}>+30д</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(u)}><Trash2 className="h-4 w-4 mr-1"/>Удалить</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteNow(u)}>Удалить сейчас</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Bulk actions */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-muted-foreground">Выбрано: {selectedIds.size}</div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" disabled={selectedIds.size === 0} onClick={handleBulkDelete}>Удалить помеченные</Button>
                  <Button variant="destructive" size="sm" disabled={selectedIds.size === 0} onClick={handleBulkDeleteNow}>Удалить сейчас (помеченные)</Button>
                </div>
              </div>
            </div>
          )}

          {pagination && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">Всего: {pagination.total} • Страница {pagination.page} из {pagination.pages}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))}>Назад</Button>
                <Button variant="outline" disabled={page >= pagination.pages} onClick={() => setPage(p => Math.min(pagination.pages, p+1))}>Вперед</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали загрузки</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">ID:</span> {selected.id}</div>
                <div><span className="text-muted-foreground">Телефон:</span> {selected.phone}</div>
                <div><span className="text-muted-foreground">Формат/Размер:</span> {selected.format} {selected.size}</div>
                <div><span className="text-muted-foreground">Страниц:</span> {selected.pages}</div>
                <div><span className="text-muted-foreground">Цена:</span> {selected.price} ֏</div>
                <div><span className="text-muted-foreground">Статус:</span> {selected.status}{selected.adminHold ? ' (HOLD)' : ''}</div>
                {selected.deleteAt && <div><span className="text-muted-foreground">Удаление:</span> {new Date(selected.deleteAt).toLocaleString()}</div>}
                {selected.postponedUntil && <div><span className="text-muted-foreground">Отложено до:</span> {new Date(selected.postponedUntil).toLocaleString()}</div>}
                <div><span className="text-muted-foreground">Создано:</span> {new Date(selected.createdAt).toLocaleString()}</div>
                {selected.completedAt && <div><span className="text-muted-foreground">Завершено:</span> {new Date(selected.completedAt).toLocaleString()}</div>}
                <div><span className="text-muted-foreground">Файлов:</span> {selected.fileCount ?? (selected.files?.length ?? 0)}</div>
                <div><span className="text-muted-foreground">Размер:</span> {selected.totalFileSize ? (selected.totalFileSize/1024/1024).toFixed(1) + ' MB' : '-'}</div>
              </div>
              {selected.comment && (
                <div className="text-sm"><span className="text-muted-foreground">Комментарий:</span> {selected.comment}</div>
              )}
              <div>
                <div className="font-medium mb-2">Файлы</div>
                <div className="max-h-64 overflow-auto border rounded-md p-2 text-sm">
                  {selected.files && selected.files.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1">
                      {selected.files.map((f) => (
                        <li key={f.key}>{f.filename} — {(f.size/1024/1024).toFixed(1)} MB</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground">Нет файлов</div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleDownloadZip(selected!)}><Download className="h-4 w-4 mr-2"/>Скачать ZIP</Button>
                <Button variant={selected?.adminHold ? "outline" : "default"} onClick={() => selected && handleHoldToggle(selected)}>{selected?.adminHold ? 'Снять HOLD' : 'HOLD'}</Button>
                <Button variant="outline" onClick={() => selected && handlePostpone(selected, 7)}>+7д</Button>
                <Button variant="outline" onClick={() => selected && handlePostpone(selected, 30)}>+30д</Button>
                <Button variant="destructive" onClick={() => handleDelete(selected!)}><Trash2 className="h-4 w-4 mr-2"/>Удалить</Button>
                <Button variant="destructive" onClick={() => handleDeleteNow(selected!)}>Удалить сейчас</Button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">Загрузка…</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

