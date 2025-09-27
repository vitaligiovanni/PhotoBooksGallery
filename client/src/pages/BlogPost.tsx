import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar, Clock, User, ArrowLeft, Eye, MessageCircle, Share2, Heart, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type BlogPost = {
  id: string;
  title: { ru: string; hy: string; en: string };
  slug: string;
  excerpt: { ru: string; hy: string; en: string };
  content: { ru: string; hy: string; en: string };
  featuredImage: string | null;
  authorId: string;
  categoryId: string;
  status: "draft" | "published" | "scheduled" | "archived";
  publishedAt: string | null;
  seoTitle: { ru: string; hy: string; en: string };
  seoDescription: { ru: string; hy: string; en: string };
  tags: string[];
  viewCount: number;
  createdAt: string;
  author?: {
    firstName: string;
    lastName: string;
    profileImageUrl: string;
  };
  category?: {
    name: { ru: string; hy: string; en: string };
    color: string;
  };
};

type Comment = {
  id: string;
  postId: string;
  userId: string | null;
  authorName: string;
  authorEmail: string;
  content: string;
  isApproved: boolean;
  createdAt: string;
};

const commentSchema = z.object({
  authorName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  authorEmail: z.string().email("Некорректный email"),
  content: z.string().min(10, "Комментарий должен содержать минимум 10 символов"),
});

type CommentForm = z.infer<typeof commentSchema>;

export default function BlogPost() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as "ru" | "hy" | "en";
  const [, params] = useRoute("/blog/:slug");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(false);

  const form = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      authorName: "",
      authorEmail: "",
      content: "",
    },
  });

  const { data: post, isLoading: postLoading } = useQuery<BlogPost>({
    queryKey: ["/api/blog/posts", params?.slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog/posts/${params?.slug}`);
      if (!response.ok) {
        throw new Error('Failed to fetch blog post');
      }
      return response.json();
    },
    enabled: !!params?.slug,
  });

  const { data: comments } = useQuery<Comment[]>({
    queryKey: ["/api/blog/comments", post?.id],
    queryFn: async () => {
      const response = await fetch(`/api/blog/comments/${post?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json();
    },
    enabled: !!post?.id,
  });

  const { data: relatedPosts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts/related", post?.id],
    queryFn: async () => {
      const response = await fetch(`/api/blog/posts/${post?.id}/related`);
      if (!response.ok) {
        throw new Error('Failed to fetch related posts');
      }
      return response.json();
    },
    enabled: !!post?.id,
  });

  const commentMutation = useMutation({
    mutationFn: async (data: CommentForm) => {
      const response = await fetch(`/api/blog/posts/${post?.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: currentLang === "ru" ? "Комментарий отправлен" :
               currentLang === "hy" ? "Մեկնաբանությունը ուղարկվել է" :
               "Comment submitted",
        description: currentLang === "ru" ? "Ваш комментарий будет опубликован после модерации" :
                     currentLang === "hy" ? "Ձեր մեկնաբանությունը կհրապարակվի մոդերացիայից հետո" :
                     "Your comment will be published after moderation",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/blog/comments", post?.id] });
    },
    onError: (error) => {
      toast({
        title: currentLang === "ru" ? "Ошибка" :
               currentLang === "hy" ? "Սխալ" :
               "Error",
        description: currentLang === "ru" ? "Не удалось отправить комментарий" :
                     currentLang === "hy" ? "Չհաջողվեց ուղարկել մեկնաբանությունը" :
                     "Failed to submit comment",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(currentLang === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(" ").length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title[currentLang],
        text: post?.excerpt?.[currentLang],
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: currentLang === "ru" ? "Ссылка скопирована" :
               currentLang === "hy" ? "Հղումը պատճենվել է" :
               "Link copied",
        description: currentLang === "ru" ? "Ссылка на статью скопирована в буфер обмена" :
                     currentLang === "hy" ? "Հոդվածի հղումը պատճենվել է" :
                     "Article link copied to clipboard",
      });
    }
  };

  const onSubmit = (data: CommentForm) => {
    commentMutation.mutate(data);
  };

  if (postLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto animate-pulse">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {currentLang === "ru" && "Статья не найдена"}
              {currentLang === "hy" && "Հոդվածը չի գտնվել"}
              {currentLang === "en" && "Article not found"}
            </h2>
            <Link href="/blog">
              <Button data-testid="button-back-to-blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {currentLang === "ru" && "К блогу"}
                {currentLang === "hy" && "Բլոգ"}
                {currentLang === "en" && "Back to Blog"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/blog">
            <Button variant="ghost" className="hover:bg-blue-50 dark:hover:bg-blue-900/20" data-testid="button-back-to-blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentLang === "ru" && "К блогу"}
              {currentLang === "hy" && "Բլոգ"}
              {currentLang === "en" && "Back to Blog"}
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Article Header */}
          <Card className="border-0 shadow-xl bg-white dark:bg-slate-800 mb-8 overflow-hidden">
            {post.featuredImage && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={post.featuredImage}
                  alt={post.title[currentLang]}
                  className="w-full h-full object-cover"
                  data-testid="img-featured-article"
                />
              </div>
            )}

            <CardContent className="p-8">
              {/* Category */}
              {post.category && (
                <Badge 
                  className="mb-4 text-white border-0" 
                  style={{ backgroundColor: post.category.color }}
                  data-testid="badge-article-category"
                >
                  {post.category.name[currentLang]}
                </Badge>
              )}

              {/* Title */}
              <h1 className="text-3xl lg:text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100 leading-tight" data-testid="text-article-title">
                {post.title[currentLang]}
              </h1>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-6 text-gray-600 dark:text-gray-400 mb-6">
                {post.publishedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span data-testid="text-article-date">{formatDate(post.publishedAt)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span data-testid="text-article-read-time">
                    {getReadTime(post.content[currentLang])} {currentLang === "ru" ? "мин чтения" : currentLang === "hy" ? "րոպե ընթերցանելիս" : "min read"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <span data-testid="text-article-views">{post.viewCount} {currentLang === "ru" ? "просмотров" : currentLang === "hy" ? "դիտում" : "views"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  <span data-testid="text-article-comments">{comments?.length || 0} {currentLang === "ru" ? "комментариев" : currentLang === "hy" ? "մեկնաբանություն" : "comments"}</span>
                </div>
              </div>

              {/* Author */}
              {post.author && (
                <div className="flex items-center gap-4 mb-6">
                  {post.author.profileImageUrl ? (
                    <img
                      src={post.author.profileImageUrl}
                      alt={`${post.author.firstName} ${post.author.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                      data-testid="img-article-author"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {post.author.firstName[0]}{post.author.lastName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="text-article-author">
                      {post.author.firstName} {post.author.lastName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentLang === "ru" && "Автор"}
                      {currentLang === "hy" && "Հեղինակ"}
                      {currentLang === "en" && "Author"}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="outline"
                  onClick={() => setIsLiked(!isLiked)}
                  className={isLiked ? "text-red-500 border-red-500" : ""}
                  data-testid="button-like-article"
                >
                  <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
                  {currentLang === "ru" && "Нравится"}
                  {currentLang === "hy" && "Դուր է գալիս"}
                  {currentLang === "en" && "Like"}
                </Button>
                <Button variant="outline" onClick={handleShare} data-testid="button-share-article">
                  <Share2 className="h-4 w-4 mr-2" />
                  {currentLang === "ru" && "Поделиться"}
                  {currentLang === "hy" && "Կիսվել"}
                  {currentLang === "en" && "Share"}
                </Button>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" data-testid={`badge-tag-${tag}`}>
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Article Content */}
          <Card className="border-0 shadow-xl bg-white dark:bg-slate-800 mb-8">
            <CardContent className="p-8">
              <div 
                className="prose prose-lg max-w-none dark:prose-invert prose-blue"
                dangerouslySetInnerHTML={{ __html: post.content[currentLang] }}
                data-testid="content-article-body"
              />
            </CardContent>
          </Card>

          {/* Related Posts */}
          {relatedPosts && relatedPosts.length > 0 && (
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-800 mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <BookOpen className="h-6 w-6" />
                  {currentLang === "ru" && "Похожие статьи"}
                  {currentLang === "hy" && "Նման հոդվածներ"}
                  {currentLang === "en" && "Related Articles"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {relatedPosts.slice(0, 4).map((relatedPost) => (
                    <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`} className="no-underline">
                      <Card className="group hover:shadow-lg transition-shadow duration-200" data-testid={`card-related-post-${relatedPost.slug}`}>
                        {relatedPost.featuredImage && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={relatedPost.featuredImage}
                              alt={relatedPost.title[currentLang]}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <h3 className="font-semibold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {relatedPost.title[currentLang]}
                          </h3>
                          {relatedPost.excerpt && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                              {relatedPost.excerpt[currentLang]}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <Card className="border-0 shadow-xl bg-white dark:bg-slate-800">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                {currentLang === "ru" && "Комментарии"}
                {currentLang === "hy" && "Մեկնաբանություններ"}
                {currentLang === "en" && "Comments"}
                <span className="text-lg font-normal text-gray-500">({comments?.length || 0})</span>
              </h2>

              {/* Comment Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-8" data-testid="form-add-comment">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="authorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {currentLang === "ru" && "Имя"}
                            {currentLang === "hy" && "Անուն"}
                            {currentLang === "en" && "Name"}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-comment-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="authorEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-comment-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {currentLang === "ru" && "Комментарий"}
                          {currentLang === "hy" && "Մեկնաբանություն"}
                          {currentLang === "en" && "Comment"}
                        </FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} data-testid="textarea-comment-content" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={commentMutation.isPending} data-testid="button-submit-comment">
                    {commentMutation.isPending 
                      ? (currentLang === "ru" ? "Отправляется..." : currentLang === "hy" ? "Ուղարկվում է..." : "Submitting...")
                      : (currentLang === "ru" ? "Отправить комментарий" : currentLang === "hy" ? "Ուղարկել մեկնաբանությունը" : "Submit Comment")
                    }
                  </Button>
                </form>
              </Form>

              {/* Comments List */}
              <div className="space-y-6">
                {comments?.filter(comment => comment.isApproved).map((comment) => (
                  <div key={comment.id} className="border-l-4 border-blue-500 pl-4 py-4" data-testid={`comment-${comment.id}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {comment.authorName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`text-comment-author-${comment.id}`}>
                          {comment.authorName}
                        </p>
                        <p className="text-sm text-gray-500" data-testid={`text-comment-date-${comment.id}`}>
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid={`text-comment-content-${comment.id}`}>
                      {comment.content}
                    </p>
                  </div>
                )) || (
                  <p className="text-center text-gray-500 py-8">
                    {currentLang === "ru" && "Пока нет комментариев. Будьте первым!"}
                    {currentLang === "hy" && "Դեռ մեկնաբանություններ չկան: Եղեք առաջինը:"}
                    {currentLang === "en" && "No comments yet. Be the first!"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
