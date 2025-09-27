import { RequestHandler } from "express";
import { storage } from "../storage";

// Временная middleware для локальной разработки без аутентификации
export const mockAuth: RequestHandler = async (req: any, res, next) => {
  try {
    // Создаем mock пользователя-администратора для локальной разработки
    req.user = {
      claims: {
        sub: 'local-admin'
      },
      // Добавляем проверку isAuthenticated для совместимости
      isAuthenticated: () => true
    };

    // Проверяем, существует ли пользователь в базе данных
    const userId = req.user.claims.sub;
    let user = await storage.getUser(userId);
    
    // Если пользователя нет, создаем его
    if (!user) {
      user = await storage.upsertUser({
        id: 'local-admin',
        email: 'admin@local.test',
        firstName: 'Админ',
        lastName: 'Локальный',
        profileImageUrl: null
      });
      
      // После создания пользователя обновляем его роль на admin
      user = await storage.updateUserRole('local-admin', 'admin');
      console.log('Created admin user for local development:', user);
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