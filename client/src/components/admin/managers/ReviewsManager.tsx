import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Star, Plus, CheckCircle, XCircle, Trash2, Edit } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export function ReviewsManager() {
  const { toast } = useToast();
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);

  const { data: reviews = [] } = useQuery<any[]>({ 
    queryKey: ["/api/admin/reviews", statusFilter === 'all' ? undefined : statusFilter] 
  });

  const reviewForm = useForm({
    resolver: zodResolver(z.object({
      authorName: z.string().min(1, "Имя автора обязательно"),
      authorEmail: z.string().email("Некорректный email").optional().or(z.literal("")),
      rating: z.number().min(1).max(5),
      comment: z.string().min(10, "Комментарий должен содержать минимум 10 символов"),
      gender: z.string().min(1, "Пол обязательно указать"),
      profilePhoto: z.string().optional(),
      sortOrder: z.number().default(0)
    })),
    defaultValues: {
      authorName: "",
      authorEmail: "",
      rating: 5,
      comment: "",
      gender: "male",
      profilePhoto: "",
      sortOrder: 0
    }
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PUT", `/api/admin/reviews/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({
        title: "Успех",
        description: "Отзыв одобрен",
      });
    }
  });

  const rejectReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PUT", `/api/admin/reviews/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({
        title: "Успех",
        description: "Отзыв отклонен",
      });
    }
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({
        title: "Успех",
        description: "Отзыв удален",
      });
    }
  });

  const createPromoReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      setIsPromoDialogOpen(false);
      reviewForm.reset();
      setProfilePreview(null);
      toast({
        title: "Успех",
        description: "Промо-отзыв создан",
      });
    }
  });

  const handlePromoSubmit = async (data: any) => {
    createPromoReviewMutation.mutate(data);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResult = await fetch('/api/local-upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadResult.ok) {
        const uploadResponse = await uploadResult.json();
        reviewForm.setValue('profilePhoto', uploadResponse.url);
        setProfilePreview(URL.createObjectURL(file));
        toast({
          title: "Фото загружено!",
          description: "Фотография успешно загружена.",
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить фотографию",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoUpload(file);
      }
    };
    input.click();
  };

  const getDefaultAvatar = (gender: string, name: string) => {
    const initial = name?.charAt(0)?.toUpperCase() || '?';
    const bgColor = gender === 'female' ? 'bg-pink-100' : gender === 'male' ? 'bg-blue-100' : 'bg-gray-100';
    const textColor = gender === 'female' ? 'text-pink-600' : gender === 'male' ? 'text-blue-600' : 'text-gray-600';
    
    return (
      <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center ${textColor} font-semibold text-lg`}>
        {initial}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Calculate counts for each status
  const statusCounts = {
    all: reviews.length,
    pending: reviews.filter((r: any) => r.status === 'pending').length,
    approved: reviews.filter((r: any) => r.status === 'approved').length,
    rejected: reviews.filter((r: any) => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Отзывы</h1>
          <p className="text-muted-foreground mt-2">Управление отзывами и модерация</p>
        </div>
        <Button onClick={() => setIsPromoDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать промо-отзыв
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex space-x-1 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className="relative"
        >
          Все
          {statusCounts.all > 0 && (
            <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {statusCounts.all}
            </span>
          )}
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setStatusFilter('pending')}
          className="relative"
        >
          На модерации
          {statusCounts.pending > 0 && (
            <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
              {statusCounts.pending}
            </span>
          )}
        </Button>
        <Button
          variant={statusFilter === 'approved' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setStatusFilter('approved')}
          className="relative"
        >
          Одобренные
          {statusCounts.approved > 0 && (
            <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
              {statusCounts.approved}
            </span>
          )}
        </Button>
        <Button
          variant={statusFilter === 'rejected' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setStatusFilter('rejected')}
          className="relative"
        >
          Отклоненные
          {statusCounts.rejected > 0 && (
            <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
              {statusCounts.rejected}
            </span>
          )}
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Управление отзывами
            {statusFilter !== 'all' && (
              <span className="text-sm text-muted-foreground font-normal">
                ({statusCounts[statusFilter as keyof typeof statusCounts]})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">Отзывы не найдены</p>
                <p className="text-sm">
                  {statusFilter !== 'all' 
                    ? `Нет отзывов со статусом "${statusFilter}"` 
                    : 'Пока нет отзывов для модерации'
                  }
                </p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {review.profilePhoto ? (
                        <img
                          src={review.profilePhoto}
                          alt={review.authorName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        getDefaultAvatar(review.gender, review.authorName)
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">{review.authorName}</h4>
                          {review.authorEmail && (
                            <span className="text-sm text-muted-foreground">
                              {review.authorEmail}
                            </span>
                          )}
                          {getStatusBadge(review.status)}
                        </div>
                        <div className="mb-2">
                          {renderStars(review.rating)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {review.comment}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {review.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveReviewMutation.mutate(review.id)}
                            disabled={approveReviewMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                            Одобрить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectReviewMutation.mutate(review.id)}
                            disabled={rejectReviewMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1 text-red-600" />
                            Отклонить
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReviewMutation.mutate(review.id)}
                        disabled={deleteReviewMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Promo Review Dialog */}
      <Dialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создание промо-отзыва</DialogTitle>
            <DialogDescription>
              Создайте отзыв, который будет отображаться на сайте
            </DialogDescription>
          </DialogHeader>
          <Form {...reviewForm}>
            <form onSubmit={reviewForm.handleSubmit(handlePromoSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={reviewForm.control}
                  name="authorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя автора *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Введите имя" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={reviewForm.control}
                  name="authorEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email автора</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="email@example.com" type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={reviewForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пол *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите пол" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Мужской</SelectItem>
                        <SelectItem value="female">Женский</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={reviewForm.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Рейтинг *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите рейтинг" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <SelectItem key={rating} value={rating.toString()}>
                            <div className="flex items-center">
                              {renderStars(rating)}
                              <span className="ml-2">({rating})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={reviewForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Комментарий *</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Введите текст отзыва (минимум 10 символов)" 
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={reviewForm.control}
                name="profilePhoto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Фотография профиля</FormLabel>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4">
                        {profilePreview ? (
                          <img
                            src={profilePreview}
                            alt="Preview"
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          getDefaultAvatar(reviewForm.watch('gender'), reviewForm.watch('authorName'))
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePhotoSelect}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? 'Загрузка...' : 'Выбрать фото'}
                        </Button>
                      </div>
                      {field.value && (
                        <p className="text-sm text-muted-foreground">
                          Фото загружено
                        </p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={reviewForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Порядок сортировки</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPromoDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createPromoReviewMutation.isPending}
                >
                  {createPromoReviewMutation.isPending ? 'Создание...' : 'Создать отзыв'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
