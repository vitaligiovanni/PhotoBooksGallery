import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, Eye, Calendar, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export function BlogManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery<any[]>({ 
    queryKey: ["/api/blog-posts"] 
  });

  const blogForm = useForm({
    resolver: zodResolver(z.object({
      title: z.string().min(1, "Заголовок обязателен"),
      slug: z.string().min(1, "Slug обязателен"),
      content: z.string().min(10, "Содержание должно содержать минимум 10 символов"),
      excerpt: z.string().optional(),
      featuredImage: z.string().optional(),
      status: z.enum(['draft', 'published']).default('draft'),
      tags: z.string().optional(),
    })),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      featuredImage: "",
      status: "draft",
      tags: "",
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/blog-posts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      setIsCreateDialogOpen(false);
      blogForm.reset();
      setImagePreview(null);
      toast({
        title: "Успех",
        description: "Пост создан",
      });
    }
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/blog-posts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      setIsCreateDialogOpen(false);
      setEditingPost(null);
      blogForm.reset();
      setImagePreview(null);
      toast({
        title: "Успех",
        description: "Пост обновлен",
      });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/blog-posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      toast({
        title: "Успех",
        description: "Пост удален",
      });
    }
  });

  const handleSubmit = async (data: any) => {
    // Преобразуем строки в объекты с переводами для сервера
    const formattedData = {
      ...data,
      title: { ru: data.title, hy: data.title, en: data.title },
      excerpt: data.excerpt ? { ru: data.excerpt, hy: data.excerpt, en: data.excerpt } : null,
      content: { ru: data.content, hy: data.content, en: data.content },
      tags: data.tags ? data.tags.split(',').map((tag: string) => tag.trim()) : []
    };

    if (editingPost) {
      updatePostMutation.mutate({ id: editingPost.id, data: formattedData });
    } else {
      createPostMutation.mutate(formattedData);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResult = await fetch('/api/local-upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadResult.ok) {
        const uploadResponse = await uploadResult.json();
        blogForm.setValue('featuredImage', uploadResponse.url);
        setImagePreview(URL.createObjectURL(file));
        toast({
          title: "Изображение загружено!",
          description: "Изображение успешно загружено.",
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    };
    input.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">published</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Блог</h1>
          <p className="text-muted-foreground mt-2">Управление статьями блога</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новая статья
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Статьи блога ({posts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p>Загрузка статей...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4">
                <Eye className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg mb-2">Статьи не найдены</p>
              <p className="text-sm">Создайте первую статью для блога</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {typeof post.title === 'object' ? post.title.ru || post.title.en || post.title.hy || 'Без названия' : post.title}
                        </h3>
                        {getStatusBadge(post.status)}
                      </div>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {typeof post.excerpt === 'object' ? post.excerpt.ru || post.excerpt.en || post.excerpt.hy || '' : post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {typeof post.author === 'object' ? post.author.ru || post.author.en || post.author.hy || 'Автор' : post.author}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(post.createdAt)}
                        </div>
                        <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                          /{post.slug}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingPost(post);
                          // Преобразуем объекты с переводами обратно в строки для формы
                          blogForm.reset({
                            ...post,
                            title: typeof post.title === 'object' ? post.title.ru || post.title.en || post.title.hy || '' : post.title,
                            excerpt: typeof post.excerpt === 'object' ? post.excerpt.ru || post.excerpt.en || post.excerpt.hy || '' : post.excerpt,
                            content: typeof post.content === 'object' ? post.content.ru || post.content.en || post.content.hy || '' : post.content,
                            tags: post.tags ? post.tags.join(', ') : ''
                          });
                          if (post.featuredImage) {
                            setImagePreview(post.featuredImage);
                          }
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePostMutation.mutate(post.id)}
                        disabled={deletePostMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingPost(null);
          blogForm.reset();
          setImagePreview(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? 'Редактирование статьи' : 'Создание новой статьи'}
            </DialogTitle>
            <DialogDescription>
              {editingPost ? 'Внесите изменения в статью' : 'Заполните информацию о новой статье'}
            </DialogDescription>
          </DialogHeader>
          <Form {...blogForm}>
            <form onSubmit={blogForm.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={blogForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Заголовок *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите заголовок статьи" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={blogForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="example-post" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>


              <FormField
                control={blogForm.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Краткое описание</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Краткое описание статьи (отображается в списке)"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={blogForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Содержание *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Полное содержание статьи..."
                        rows={8}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={blogForm.control}
                name="featuredImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Главное изображение</FormLabel>
                    <div className="space-y-2">
                      {imagePreview && (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleImageSelect}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Загрузка...' : 'Выбрать изображение'}
                      </Button>
                      {field.value && (
                        <p className="text-sm text-muted-foreground">
                          Изображение загружено
                        </p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={blogForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <select
                      {...field}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="draft">Черновик</option>
                      <option value="published">Опубликован</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={blogForm.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Теги (через запятую)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="фотография, альбомы, воспоминания" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingPost(null);
                    blogForm.reset();
                    setImagePreview(null);
                  }}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createPostMutation.isPending || updatePostMutation.isPending}
                >
                  {editingPost 
                    ? (updatePostMutation.isPending ? 'Обновление...' : 'Обновить статью')
                    : (createPostMutation.isPending ? 'Создание...' : 'Создать статью')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
