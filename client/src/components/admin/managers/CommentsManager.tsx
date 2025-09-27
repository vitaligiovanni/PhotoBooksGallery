import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MessageSquare, CheckCircle, XCircle, Trash2, Eye, User, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export function CommentsManager() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: comments = [] } = useQuery<any[]>({ 
    queryKey: ["/api/comments"] 
  });

  const approveCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PUT", `/api/admin/comments/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
      toast({
        title: "Успех",
        description: "Комментарий одобрен",
      });
    }
  });

  const rejectCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PUT", `/api/admin/comments/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
      toast({
        title: "Успех",
        description: "Комментарий отклонен",
      });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
      toast({
        title: "Успех",
        description: "Комментарий удален",
      });
    }
  });

  const replyForm = useForm({
    resolver: zodResolver(z.object({
      reply: z.string().min(1, "Ответ не может быть пустым"),
    })),
    defaultValues: {
      reply: "",
    }
  });

  const replyToCommentMutation = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      return await apiRequest("POST", `/api/admin/comments/${id}/reply`, { reply });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
      setIsDetailsOpen(false);
      replyForm.reset();
      toast({
        title: "Успех",
        description: "Ответ отправлен",
      });
    }
  });

  const handleReplySubmit = async (data: any) => {
    if (selectedComment) {
      replyToCommentMutation.mutate({ id: selectedComment.id, reply: data.reply });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (isApproved: boolean | null) => {
    if (isApproved === true) {
      return <Badge className="bg-green-100 text-green-800">approved</Badge>;
    } else if (isApproved === false) {
      return <Badge className="bg-red-100 text-red-800">rejected</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">pending</Badge>;
    }
  };

  const getParentType = (comment: any) => {
    if (comment.blogPostId) return 'Блог';
    if (comment.productId) return 'Товар';
    return 'Неизвестно';
  };

  const getParentTitle = (comment: any) => {
    if (comment.blogPost) return comment.blogPost.title;
    if (comment.product) return comment.product.name;
    return 'Неизвестно';
  };

  // Calculate counts for each status based on isApproved field
  const statusCounts = {
    all: comments.length,
    pending: comments.filter((c: any) => c.isApproved === null || c.isApproved === undefined).length,
    approved: comments.filter((c: any) => c.isApproved === true).length,
    rejected: comments.filter((c: any) => c.isApproved === false).length,
  };

  // Filter comments based on status filter
  const filteredComments = statusFilter === 'all' 
    ? comments 
    : statusFilter === 'pending' 
      ? comments.filter((comment: any) => comment.isApproved === null || comment.isApproved === undefined)
      : statusFilter === 'approved' 
        ? comments.filter((comment: any) => comment.isApproved === true)
        : comments.filter((comment: any) => comment.isApproved === false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Комментарии</h1>
        <p className="text-muted-foreground mt-2">Модерация комментариев пользователей</p>
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
            <MessageSquare className="h-5 w-5" />
            Комментарии ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredComments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Комментарии не найдены</p>
              <p className="text-sm">
                {statusFilter !== 'all' 
                  ? `Нет комментариев со статусом "${statusFilter}"` 
                  : 'Пока нет комментариев для модерации'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center">
                          {comment.user?.profileImageUrl ? (
                            <img
                              src={comment.user.profileImageUrl}
                              alt={comment.user.name}
                              className="w-8 h-8 rounded-full object-cover mr-2"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm font-medium mr-2">
                              {comment.user?.name?.[0] || 'U'}
                            </div>
                          )}
                          <span className="font-semibold">
                            {comment.user?.name || 'Анонимный пользователь'}
                          </span>
                        </div>
                        {getStatusBadge(comment.isApproved)}
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground mb-1">
                          К {getParentType(comment)}: {getParentTitle(comment)}
                        </p>
                        <p className="text-sm">{comment.content}</p>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(comment.createdAt)}
                        </div>
                        {comment.email && (
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {comment.email}
                          </div>
                        )}
                      </div>

                      {comment.reply && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center mb-1">
                            <span className="text-sm font-semibold text-blue-800">Ответ администратора:</span>
                          </div>
                          <p className="text-sm text-blue-700">{comment.reply}</p>
                          {comment.repliedAt && (
                            <div className="text-xs text-blue-600 mt-1">
                              {formatDate(comment.repliedAt)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      {(comment.isApproved === null || comment.isApproved === undefined) && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveCommentMutation.mutate(comment.id)}
                            disabled={approveCommentMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                            Одобрить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectCommentMutation.mutate(comment.id)}
                            disabled={rejectCommentMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1 text-red-600" />
                            Отклонить
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedComment(comment);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                        disabled={deleteCommentMutation.isPending}
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

      {/* Comment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали комментария</DialogTitle>
            <DialogDescription>
              Просмотр и ответ на комментарий
            </DialogDescription>
          </DialogHeader>
          
          {selectedComment && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="flex items-center">
                    {selectedComment.user?.profileImageUrl ? (
                      <img
                        src={selectedComment.user.profileImageUrl}
                        alt={selectedComment.user.name}
                        className="w-10 h-10 rounded-full object-cover mr-2"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white text-lg font-medium mr-2">
                        {selectedComment.user?.name?.[0] || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">
                        {selectedComment.user?.name || 'Анонимный пользователь'}
                      </p>
                      {selectedComment.email && (
                        <p className="text-sm text-muted-foreground">
                          {selectedComment.email}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(selectedComment.isApproved)}
                </div>

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    К {getParentType(selectedComment)}: {getParentTitle(selectedComment)}
                  </p>
                  <p className="text-sm">{selectedComment.content}</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {formatDate(selectedComment.createdAt)}
                </div>

                {selectedComment.reply && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center mb-1">
                      <span className="text-sm font-semibold text-blue-800">Ответ администратора:</span>
                    </div>
                    <p className="text-sm text-blue-700">{selectedComment.reply}</p>
                    {selectedComment.repliedAt && (
                      <div className="text-xs text-blue-600 mt-1">
                        {formatDate(selectedComment.repliedAt)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!selectedComment.reply && (
                <Form {...replyForm}>
                  <form onSubmit={replyForm.handleSubmit(handleReplySubmit)} className="space-y-3">
                    <FormField
                      control={replyForm.control}
                      name="reply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ответить на комментарий</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Введите ваш ответ..."
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDetailsOpen(false)}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="submit"
                        disabled={replyToCommentMutation.isPending}
                      >
                        {replyToCommentMutation.isPending ? 'Отправка...' : 'Отправить ответ'}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
