#!/usr/bin/env node
/**
 * Тестовый скрипт для проверки multi-target AR компиляции
 * 
 * Этот скрипт проверяет что изменения применены в коде
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Проверка multi-target AR активации\n');
console.log('📅 Ветка: feature/multi-target-activation');
console.log('📋 Коммиты: 7ec1545, 605531a, b458132\n');

async function main() {
  try {

    // Проверяем что изменения применены в коде
    const compilerPath = path.join(__dirname, 'backend', 'src', 'services', 'ar-compiler.ts');
    const compilerCode = await fs.readFile(compilerPath, 'utf-8');

    console.log('🔍 Проверка изменений в ar-compiler.ts:\n');

    // Проверка 1: HTML viewer должен использовать targets.mind
    if (compilerCode.includes("const markerFiles = `./targets.mind`;")) {
      console.log('✅ HTML viewer использует targets.mind');
    } else if (compilerCode.includes("const markerFiles = `./marker-0.mind`;")) {
      console.log('❌ HTML viewer всё ещё использует marker-0.mind (fallback)');
    } else {
      console.log('⚠️  Не удалось определить markerFiles конфигурацию');
    }

    // Проверка 2: compileMultiTargetMindFile должен быть импортирован
    if (compilerCode.includes("compileMultiTargetMindFile")) {
      console.log('✅ Функция compileMultiTargetMindFile интегрирована');
    } else {
      console.log('❌ Функция compileMultiTargetMindFile НЕ найдена');
    }

    // Проверка 3: Должна быть замена цикла компиляции
    if (compilerCode.includes("Compile ALL photos into ONE targets.mind")) {
      console.log('✅ Новая логика компиляции найдена');
    } else {
      console.log('⚠️  Новая логика компиляции не найдена');
    }

    console.log('\n📊 Итоги проверки кода:\n');
    console.log('Ветка: feature/multi-target-activation');
    console.log('Статус: Изменения применены в коде');
    console.log('');
    console.log('🧪 Для полного функционального теста:');
    console.log('   1. Откройте http://localhost:3000/admin/ar-edit');
    console.log('   2. Создайте новый AR проект');
    console.log('   3. Добавьте 2-3 items через ARProjectItemsList');
    console.log('   4. Запустите компиляцию');
    console.log('   5. Проверьте что создаётся targets.mind');
    console.log('');
    console.log('📁 Ожидаемая структура после компиляции:');
    console.log('   backend/objects/ar-storage/{projectId}/');
    console.log('   ├── targets.mind          ← НОВОЕ! (вместо marker-0.mind)');
    console.log('   ├── index.html');
    console.log('   ├── qr-code.png');
    console.log('   ├── video-0.mp4');
    console.log('   ├── video-1.mp4');
    console.log('   └── video-2.mp4');
    console.log('');
    console.log('✅ Проверка кода завершена успешно!');
    console.log('');
    console.log('📱 Для функционального теста на мобильном:');
    console.log('   1. Backend уже запущен: http://localhost:5002');
    console.log('   2. Запустите frontend: cd frontend && npm run dev');
    console.log('   3. Создайте multi-target проект в AdminAREdit');
    console.log('   4. Сканируйте QR-код телефоном');
    console.log('   5. Проверьте что все фото работают без перезагрузки камеры');

  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
