import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User, Search, ArrowRight, Eye, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Header } from "@/components/Header";

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
  tags: string[];
  viewCount: number;
  commentCount?: number;
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

type BlogCategory = {
  id: string;
  name: { ru: string; hy: string; en: string };
  slug: string;
  description: { ru: string; hy: string; en: string };
  color: string;
  sortOrder: number;
};

export default function Blog() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as "ru" | "hy" | "en";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: posts, isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts", searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const response = await fetch(`/api/blog/posts?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }
      return response.json();
    },
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<BlogCategory[]>({
    queryKey: ["/api/blog/categories"],
    queryFn: async () => {
      const response = await fetch('/api/blog/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch blog categories');
      }
      return response.json();
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

  if (postsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header />
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              {currentLang === "ru" && "Блог PhotoBooksGallery"}
              {currentLang === "hy" && "PhotoBooksGallery Բլոգ"}
              {currentLang === "en" && "PhotoBooksGallery Blog"}
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 mb-8 leading-relaxed">
              {currentLang === "ru" && "Советы по фотографии, идеи для альбомов и вдохновение для ваших воспоминаний"}
              {currentLang === "hy" && "Լուսանկարչության խորհուրդներ, ալբոմների գաղափարներ և ներշնչանք ձեր հիշողությունների համար"}
              {currentLang === "en" && "Photography tips, album ideas, and inspiration for your memories"}
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-10 relative z-10">
        {/* Search and Filter Section */}
        <Card className="mb-8 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder={
                    currentLang === "ru" ? "Поиск статей..." :
                    currentLang === "hy" ? "Փնտրել հոդվածներ..." :
                    "Search articles..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600"
                  data-testid="input-search-articles"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                  size="sm"
                  data-testid="button-all-categories"
                >
                  {currentLang === "ru" && "Все"}
                  {currentLang === "hy" && "Բոլորը"}
                  {currentLang === "en" && "All"}
                </Button>
                {categories?.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category.id)}
                    size="sm"
                    style={{ 
                      backgroundColor: selectedCategory === category.id ? category.color : 'transparent',
                      borderColor: category.color,
                      color: selectedCategory === category.id ? 'white' : category.color
                    }}
                    data-testid={`button-category-${category.slug}`}
                  >
                    {category.name[currentLang]}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blog Posts Grid */}
        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Card 
                key={post.id} 
                className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white dark:bg-slate-800 overflow-hidden hover:-translate-y-1"
                data-testid={`card-blog-post-${post.slug}`}
              >
                {/* Featured Image */}
                {post.featuredImage && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.featuredImage}
                      alt={post.title[currentLang]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      data-testid={`img-featured-${post.slug}`}
                    />
                  </div>
                )}

                <CardContent className="p-6">
                  {/* Category Badge */}
                  {post.category && (
                    <Badge 
                      className="mb-3 text-white border-0" 
                      style={{ backgroundColor: post.category.color }}
                      data-testid={`badge-category-${post.category.name[currentLang]}`}
                    >
                      {post.category.name[currentLang]}
                    </Badge>
                  )}

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    <Link href={`/blog/${post.slug}`} className="no-underline" data-testid={`link-blog-post-${post.slug}`}>
                      {post.title[currentLang]}
                    </Link>
                  </h3>

                  {/* Excerpt */}
                  {post.excerpt && (
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3" data-testid={`text-excerpt-${post.slug}`}>
                      {post.excerpt[currentLang]}
                    </p>
                  )}

                  {/* Meta Information */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-4">
                      {post.publishedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span data-testid={`text-date-${post.slug}`}>{formatDate(post.publishedAt)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span data-testid={`text-read-time-${post.slug}`}>
                          {getReadTime(post.content[currentLang])} {currentLang === "ru" ? "мин" : currentLang === "hy" ? "րոպե" : "min"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span data-testid={`text-views-${post.slug}`}>{post.viewCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span data-testid={`text-comments-${post.slug}`}>
                          {post.commentCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Author */}
                  {post.author && (
                    <div className="flex items-center gap-3 mb-4">
                      {post.author.profileImageUrl ? (
                        <img
                          src={post.author.profileImageUrl}
                          alt={`${post.author.firstName} ${post.author.lastName}`}
                          className="w-8 h-8 rounded-full object-cover"
                          data-testid={`img-author-${post.slug}`}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                          {post.author.firstName[0]}{post.author.lastName[0]}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300" data-testid={`text-author-${post.slug}`}>
                        {post.author.firstName} {post.author.lastName}
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs" data-testid={`badge-tag-${tag}`}>
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Read More Button */}
                  <Link href={`/blog/${post.slug}`} className="no-underline">
                    <Button variant="ghost" className="w-full group/btn hover:bg-blue-50 dark:hover:bg-blue-900/20" data-testid={`button-read-more-${post.slug}`}>
                      {currentLang === "ru" && "Читать далее"}
                      {currentLang === "hy" && "Կարդալ ավելին"}
                      {currentLang === "en" && "Read More"}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-xl bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Search className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  {currentLang === "ru" && "Статьи не найдены"}
                  {currentLang === "hy" && "Հոդվածներ չեն գտնվել"}
                  {currentLang === "en" && "No articles found"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentLang === "ru" && "Попробуйте изменить поисковый запрос или фильтры"}
                  {currentLang === "hy" && "Փորձեք փոխել որոնման հարցումը կամ ֆիլտրերը"}
                  {currentLang === "en" && "Try changing your search query or filters"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
