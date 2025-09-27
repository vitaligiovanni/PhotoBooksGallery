import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SitePage } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function SitePagesManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useQuery<SitePage[]>({ queryKey: ["/api/site-pages"] });
  const [editing, setEditing] = useState<SitePage | null>(null);
  const form = useForm<any>({ defaultValues: { title: { ru: "" }, description: { ru: "" }, seoTitle: { ru: "" }, seoDescription: { ru: "" }, heroImageUrl: "", isPublished: true, showInHeaderNav: true, sortOrder: 0 } });

  const openEdit = (p: SitePage) => {
    setEditing(p);
    form.reset({
      title: p.title || { ru: "" },
      description: p.description || { ru: "" },
      seoTitle: p.seoTitle || { ru: "" },
      seoDescription: p.seoDescription || { ru: "" },
      heroImageUrl: p.heroImageUrl || "",
      isPublished: p.isPublished,
      showInHeaderNav: p.showInHeaderNav,
      sortOrder: p.sortOrder ?? 0,
    });
  };

  const save = useMutation({
    mutationFn: async (vals: any) => apiRequest("PATCH", `/api/site-pages/${editing!.key}`, vals),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/site-pages"] }); setEditing(null); toast({ title: "Сохранено", description: "Страница обновлена" }); },
    onError: () => toast({ title: "Ошибка", description: "Не удалось сохранить", variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async ({ key, patch }: { key: string; patch: Partial<SitePage> }) => apiRequest("PATCH", `/api/site-pages/${key}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/site-pages"] }),
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Страницы сайта</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? "Загрузка..." : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ключ</TableHead>
                <TableHead>Название (RU)</TableHead>
                <TableHead>В шапке</TableHead>
                <TableHead>Опубликована</TableHead>
                <TableHead>Порядок</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.key}>
                  <TableCell>{p.key}</TableCell>
                  <TableCell>{(p.title as any)?.ru || ""}</TableCell>
                  <TableCell><Switch checked={p.showInHeaderNav} onCheckedChange={(v)=>toggle.mutate({ key: p.key, patch: { showInHeaderNav: v } })} /></TableCell>
                  <TableCell><Switch checked={p.isPublished} onCheckedChange={(v)=>toggle.mutate({ key: p.key, patch: { isPublished: v } })} /></TableCell>
                  <TableCell>{p.sortOrder ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={!!editing && editing.key === p.key} onOpenChange={(o)=>!o && setEditing(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={()=>openEdit(p)}>Редактировать</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Редактировать: {p.key}</DialogTitle></DialogHeader>
                        <Form {...form}>
                          <form className="space-y-4" onSubmit={form.handleSubmit(vals=>save.mutate(vals))}>
                            <div className="grid grid-cols-3 gap-3">
                              <FormField control={form.control} name="title.ru" render={({ field }) => (<FormItem><FormLabel>Название (RU)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="title.en" render={({ field }) => (<FormItem><FormLabel>Title (EN)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={form.control} name="title.hy" render={({ field }) => (<FormItem><FormLabel>Վերնագիր (HY)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="seoTitle.ru" render={({ field }) => (<FormItem><FormLabel>SEO заголовок (RU)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="seoDescription.ru" render={({ field }) => (<FormItem><FormLabel>SEO описание (RU)</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-3 gap-3">
                              <FormField control={form.control} name="isPublished" render={({ field }) => (<FormItem><FormLabel>Опубликована</FormLabel><FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                              <FormField control={form.control} name="showInHeaderNav" render={({ field }) => (<FormItem><FormLabel>В шапке</FormLabel><FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                              <FormField control={form.control} name="sortOrder" render={({ field }) => (<FormItem><FormLabel>Порядок</FormLabel><FormControl><Input type="number" value={field.value ?? 0} onChange={(e)=>field.onChange(parseInt(e.target.value)||0)} /></FormControl></FormItem>)} />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" onClick={()=>setEditing(null)}>Отмена</Button>
                              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Сохранение..." : "Сохранить"}</Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
