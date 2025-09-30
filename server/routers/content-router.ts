import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertBlogCategorySchema, insertBlogPostSchema, insertCommentSchema } from "../../shared/schema.js";
import { ObjectStorageService } from "../objectStorage";
import { mockAuth, requireAdmin } from "./middleware";

export function createContentRouter() {
  const router = Router();

  // Blog category routes
  router.get('/blog-categories', async (req, res) => {
    try {
      const categories = await storage.getBlogCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ message: "Failed to fetch blog categories" });
    }
  });

  router.post('/blog-categories', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const categoryData = insertBlogCategorySchema.parse(req.body);
      const category = await storage.createBlogCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating blog category:", error);
      res.status(500).json({ message: "Failed to create blog category" });
    }
  });

  // Blog post routes
  router.get('/blog-posts', async (req, res) => {
    try {
      const { category, status } = req.query;
      const posts = await storage.getBlogPosts(
        category as string, 
        status as string
      );
      res.json(posts);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  router.get('/blog-posts/:id', async (req, res) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  router.post('/blog-posts', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      console.log('[blog-posts][create] raw body keys:', Object.keys(req.body || {}));
      let postData = {
        ...req.body,
        authorId: 'local-admin' // For local development
      };

      // Нормализуем URL изображения если необходимо
      if (postData.featuredImage && postData.featuredImage.startsWith('https://storage.googleapis.com/')) {
        const objectStorageService = new ObjectStorageService();
        postData.featuredImage = objectStorageService.normalizeObjectEntityPath(postData.featuredImage);
      }

      // Если categoryId равен "none", устанавливаем null
      if (postData.categoryId === "none") {
        postData.categoryId = null;
      }

      // Генерируем slug из заголовка если он пустой
      if (!postData.slug || postData.slug.trim() === "") {
        const title = postData.title?.ru || postData.title?.en || postData.title?.hy || "untitled";
        postData.slug = title
          .toLowerCase()
          .replace(/[^a-z0-9а-я]/gi, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') + '-' + Date.now();
      }

      try {
        postData = insertBlogPostSchema.parse(postData);
      } catch (e:any) {
        if (e instanceof z.ZodError) {
          console.warn('[blog-posts][create] validation errors:', e.errors);
          return res.status(400).json({ message: 'Validation failed', errors: e.errors });
        }
        console.error('[blog-posts][create] unexpected parse error:', e);
        throw e;
      }

      const post = await storage.createBlogPost(postData);
      res.status(201).json(post);
    } catch (error:any) {
      console.error("Error creating blog post:", error);
      // Always respond JSON
      res.status(500).json({ message: "Failed to create blog post", detail: error?.message || String(error) });
    }
  });

  router.put('/blog-posts/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const postData = insertBlogPostSchema.partial().parse(req.body);
      const post = await storage.updateBlogPost(req.params.id, postData);
      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ message: "Failed to update blog post" });
    }
  });

  router.delete('/blog-posts/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteBlogPost(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  // Public blog API routes (for frontend blog pages)
  router.get('/blog/posts', async (req, res) => {
    try {
      const { category, search } = req.query;
      // Получаем только опубликованные посты для публичной страницы
      const posts = await storage.getBlogPosts(
        category as string, 
        "published" // Только опубликованные посты
      );
      
      // Фильтруем по поиску если указан
      let filteredPosts = posts;
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredPosts = posts.filter(post => 
          (post.title as any)?.ru?.toLowerCase().includes(searchTerm) ||
          (post.title as any)?.hy?.toLowerCase().includes(searchTerm) ||
          (post.title as any)?.en?.toLowerCase().includes(searchTerm) ||
          (post.excerpt as any)?.ru?.toLowerCase().includes(searchTerm) ||
          (post.excerpt as any)?.hy?.toLowerCase().includes(searchTerm) ||
          (post.excerpt as any)?.en?.toLowerCase().includes(searchTerm)
        );
      }

      // Добавляем количество комментариев для каждого поста
      const postsWithCommentCounts = await Promise.all(
        filteredPosts.map(async (post) => {
          const comments = await storage.getComments(post.id);
          const approvedComments = comments.filter(comment => comment.isApproved);
          return {
            ...post,
            commentCount: approvedComments.length
          };
        })
      );
      
      res.json(postsWithCommentCounts);
    } catch (error) {
      console.error("Error fetching public blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  router.get('/blog/posts/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const post = await storage.getBlogPostBySlug(slug);
      
      if (!post || post.status !== 'published') {
        return res.status(404).json({ message: "Blog post not found" });
      }

      // Увеличиваем счетчик просмотров
      await storage.incrementBlogPostViews(post.id);
      
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post by slug:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  router.get('/blog/categories', async (req, res) => {
    try {
      const categories = await storage.getBlogCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching public blog categories:", error);
      res.status(500).json({ message: "Failed to fetch blog categories" });
    }
  });

  // Comments routes
  router.get('/comments', async (req, res) => {
    try {
      const { postId } = req.query;
      const comments = await storage.getComments(postId as string);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  router.post('/comments', async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      // Ensure new comments are created with isApproved: null (pending moderation)
      const comment = await storage.createComment({
        ...commentData,
        isApproved: null
      });
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Admin comment management routes
  router.put('/admin/comments/:id/approve', async (req: any, res) => {
    try {
      const comment = await storage.updateComment(req.params.id, { isApproved: true });
      res.json(comment);
    } catch (error) {
      console.error("Error approving comment:", error);
      res.status(500).json({ message: "Failed to approve comment" });
    }
  });

  router.put('/admin/comments/:id/reject', async (req: any, res) => {
    try {
      const comment = await storage.updateComment(req.params.id, { isApproved: false });
      res.json(comment);
    } catch (error) {
      console.error("Error rejecting comment:", error);
      res.status(500).json({ message: "Failed to reject comment" });
    }
  });

  router.put('/admin/comments/:id', async (req: any, res) => {
    try {
      const commentData = insertCommentSchema.partial().parse(req.body);
      const comment = await storage.updateComment(req.params.id, commentData);
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  router.delete('/admin/comments/:id', async (req: any, res) => {
    try {
      await storage.deleteComment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  router.get('/blog/posts/:id/related', async (req, res) => {
    try {
      const relatedPosts = await storage.getRelatedBlogPosts(req.params.id);
      res.json(relatedPosts);
    } catch (error) {
      console.error("Error fetching related posts:", error);
      res.status(500).json({ message: "Failed to fetch related posts" });
    }
  });

  // Public blog comments API - get approved comments for a post
  router.get('/blog/comments/:postId', async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.postId);
      // Filter only approved comments for public access
      const approvedComments = comments.filter(comment => comment.isApproved);
      res.json(approvedComments);
    } catch (error) {
      console.error("Error fetching blog comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  router.post('/blog/posts/:postId/comments', async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse({
        ...req.body,
        postId: req.params.postId
      });
      // Ensure new comments are created with isApproved: null (pending moderation)
      const comment = await storage.createComment({
        ...commentData,
        isApproved: null
      });
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  return router;
}