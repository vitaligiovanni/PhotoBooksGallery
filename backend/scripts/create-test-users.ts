#!/usr/bin/env tsx

import { db } from "../src/db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function createTestUsers() {
  console.log("🔄 Создание тестовых пользователей...");

  const testUsers = [
    {
      email: "john@example.com",
      firstName: "Джон",
      lastName: "Смит",
      password: "123456",
      role: "user"
    },
    {
      email: "maria@example.com",
      firstName: "Мария",
      lastName: "Иванова", 
      password: "123456",
      role: "user"
    },
    {
      email: "alex@example.com", 
      firstName: "Александр",
      lastName: "Петров",
      password: "123456",
      role: "user"
    },
    {
      email: "anna@example.com",
      firstName: "Анна", 
      lastName: "Сидорова",
      password: "123456", 
      role: "user"
    }
  ];

  for (const userData of testUsers) {
    try {
      // Проверяем, не существует ли пользователь
      const existing = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      
      if (existing.length > 0) {
        console.log(`✅ Пользователь ${userData.email} уже существует`);
        continue;
      }

      // Хешируем пароль
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Создаем пользователя (id будет сгенерирован автоматически)
      await db.insert(users).values({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        role: userData.role,
        profileImageUrl: null,
      });

      console.log(`✅ Создан пользователь: ${userData.email} (${userData.firstName} ${userData.lastName})`);
    } catch (error) {
      console.error(`❌ Ошибка создания пользователя ${userData.email}:`, error);
    }
  }

  console.log("✅ Создание тестовых пользователей завершено!");
}

// Запуск скрипта
createTestUsers().catch(console.error);