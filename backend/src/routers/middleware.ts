import { RequestHandler } from "express";
import { storage } from "../storage";
import jwt from "jsonwebtoken";
import { db } from "../db";
// Note: compiled path is dist/backend/src/routers -> dist/shared, so go up 3 levels
import { users } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "photobooks_secret_key_2025";

// JWT аутентификация middleware
export const jwtAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]; // Bearer TOKEN
    } else if (req.cookies?.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication token required" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.userId;

      // Получаем пользователя из базы данных
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        return res.status(401).json({ message: "User not found" });
      }

      // Устанавливаем пользователя в req для совместимости с существующим кодом
      req.user = {
        claims: {
          sub: userId
        },
        isAuthenticated: () => true,
        userData: user[0]
      };

      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ message: "Invalid authentication token" });
    }
  } catch (error) {
    console.error('Error in jwtAuth middleware:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Временная middleware для локальной разработки без аутентификации
export const mockAuth: RequestHandler = async (req: any, res, next) => {
  try {
    // 1) Попытка: JWT из Cookie (реальная аутентификация)
    if (req.cookies?.auth_token) {
      try {
        const decoded = jwt.verify(req.cookies.auth_token, JWT_SECRET) as any;
        const userId = decoded.userId;
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user.length) {
          req.user = {
            claims: { sub: userId },
            isAuthenticated: () => true,
            userData: user[0],
          };
          console.log(`[mockAuth] Using real user from cookie: ${userId}`);
          return next();
        }
      } catch (e) {
        // ignore and fallback
      }
    }

    // 2) Проверяем есть ли реальная сессия/cookie совместимости
    const sessionUserId = req.session?.userId || req.cookies?.userId;
    if (sessionUserId) {
      req.user = {
        claims: { sub: sessionUserId },
        isAuthenticated: () => true,
      };
      console.log(`[mockAuth] Using authenticated user: ${sessionUserId}`);
      return next();
    }
    
    // Если нет сессии - используем admin для неавторизованных запросов
    req.user = {
      claims: {
        sub: 'local-admin'
      },
      isAuthenticated: () => true
    };

  // ВАЖНО: Ищем ТОЛЬКО пользователей с ролью 'admin'
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    
    if (adminUsers.length > 0) {
      // Используем существующего admin-пользователя
      req.user.claims.sub = adminUsers[0].id;
      console.log(`[mockAuth] Using admin user: ${adminUsers[0].id} (${adminUsers[0].firstName})`);
    } else {
      // Если нет admin-пользователей, создаем нового с ролью admin
      const newUser = await storage.upsertUser({
        id: 'local-admin',
        email: 'admin@local.test',
        firstName: 'Админ',
        lastName: 'Локальный',
        profileImageUrl: null,
        role: 'admin'  // Устанавливаем роль admin при создании
      });
      
      req.user.claims.sub = newUser.id;
      console.log('[mockAuth] Created admin user for local development:', newUser);
    }
    
    next();
  } catch (error) {
    console.error('Error in mockAuth middleware:', error);
    next(error);
  }
};

// Middleware для проверки администраторских прав
export const requireAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error in requireAdmin middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware для проверки аутентификации
export const requireAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    console.error("Error in requireAuth middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};