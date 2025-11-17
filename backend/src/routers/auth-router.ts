import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db";
import { users } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Схемы валидации
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Секретный ключ для JWT (в продакшене должен быть в переменных окружения)
const JWT_SECRET = process.env.JWT_SECRET || "photobooks_secret_key_2025";

// Специальные учетные данные администратора
const ADMIN_CREDENTIALS = {
  email: "admin@photobooks.local",
  password: "PhotoAdmin2025!",
};

// Генерация JWT токена
function generateToken(userId: string, role: string) {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Helper to set auth cookie
function setAuthCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const cookieOptions: any = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd, // secure in prod over HTTPS
    path: '/',
    maxAge,
  };
  // Optional explicit cookie domain support
  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }
  res.cookie('auth_token', token, cookieOptions);
}

// Helper to clear auth cookie
function clearAuthCookie(res: Response) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions: any = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  };
  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }
  res.clearCookie('auth_token', cookieOptions);
}

// Регистрация нового пользователя
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password } = registerSchema.parse(req.body);

    // Проверяем, не существует ли пользователь с таким email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Пользователь с таким email уже существует"
      });
    }

    // Хешируем пароль
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Создаем нового пользователя
    const newUser = await db
      .insert(users)
      .values({
        email,
        firstName,
        lastName,
        passwordHash: hashedPassword,
        role: "user",
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });

    if (!newUser[0]) {
      throw new Error("Failed to create user");
    }

    const user = newUser[0];
    const token = generateToken(user.id, user.role || "user");

    // Set cookie for session-based auth in old frontend
    setAuthCookie(res, token);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || "user",
      },
      token,
    });

  } catch (error: any) {
    console.error("Registration error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Некорректные данные",
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Ошибка регистрации. Попробуйте позже.",
    });
  }
});

// Вход в систему
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Проверяем, не админ ли это
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      // Создаем или обновляем пользователя-администратора
      let adminUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (adminUser.length === 0) {
        // Создаем админа, если не существует
        const hashedPassword = await bcrypt.hash(password, 12);
        const newAdmin = await db
          .insert(users)
          .values({
            email,
            firstName: "Администратор",
            lastName: "PhotoBooks",
            passwordHash: hashedPassword,
            role: "admin",
          })
          .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
            passwordHash: users.passwordHash,
            role: users.role,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          });

        adminUser = newAdmin;
      }

      const admin = adminUser[0];
      const token = generateToken(admin.id, "admin");

      // Set cookie for admin session too
      setAuthCookie(res, token);

      return res.json({
        success: true,
        user: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: "admin",
        },
        token,
        redirect: "/admin", // Специальное перенаправление для админа
      });
    }

    // Обычная аутентификация пользователя
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    const userData = user[0];

    // Проверяем пароль
    if (!userData.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, userData.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Неверный email или пароль",
      });
    }

    const token = generateToken(userData.id, userData.role || "user");

    // Set cookie for session-based auth in old frontend
    setAuthCookie(res, token);

    res.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || "user",
      },
      token,
      redirect: userData.role === "admin" ? "/admin" : "/editor",
    });

  } catch (error: any) {
    console.error("Login error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Некорректные данные",
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Ошибка входа. Попробуйте позже.",
    });
  }
});

// Выход из системы
router.post("/logout", async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({
    success: true,
    message: "Успешный выход из системы",
  });
});

// Проверка токена и получение информации о пользователе
router.get("/me", async (req: Request, res: Response) => {
  try {
    // Allow Authorization header or cookie fallback
    const authHeader = req.headers.authorization;
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if ((req as any).cookies?.auth_token) {
      token = (req as any).cookies.auth_token;
    }
    if (!token) {
      return res.status(401).json({ success: false, message: "Токен не предоставлен" });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
      
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (user.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Пользователь не найден",
        });
      }

      res.json({
        success: true,
        user: user[0],
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Недействительный токен",
      });
    }

  } catch (error: any) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка проверки токена",
    });
  }
});

export function createAuthRouter() {
  return router;
}