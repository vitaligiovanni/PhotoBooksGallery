"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storage_1 = require("./storage");
const multer_1 = __importDefault(require("multer"));
const constructor_feature_1 = require("./constructor-feature");
const localStorage_1 = require("./localStorage");
const db_1 = require("./db");
const child_process_1 = require("child_process");
// Импорт модульных роутеров
const health_router_1 = require("./routers/health-router");
const file_router_1 = require("./routers/file-router");
const ecommerce_router_1 = require("./routers/ecommerce-router");
const content_router_1 = require("./routers/content-router");
const settings_router_1 = require("./routers/settings-router");
const finance_router_1 = require("./routers/finance-router");
const banner_router_1 = require("./routers/banner-router");
const dashboard_router_1 = require("./routers/dashboard-router");
const site_pages_router_1 = require("./routers/site-pages-router");
const popups_router_1 = require("./routers/popups-router");
const special_offers_router_1 = require("./routers/special-offers-router");
const auth_router_1 = require("./routers/auth-router");
const orders_router_1 = require("./routers/orders-router");
const currency_router_1 = require("./routers/currency-router");
const photo_upload_router_1 = require("./routers/photo-upload-router");
const middleware_1 = require("./routers/middleware");
const dev_router_1 = require("./routers/dev-router");
// AR feature routers (projects + items)
const ar_router_1 = require("./routers/ar-router");
const ar_items_router_1 = require("./routers/ar-items-router");
// Для локальной разработки используем локальное хранилище
const localStorageService = new localStorage_1.LocalStorageService();
// Настройка multer для загрузки файлов
const uploadDir = path_1.default.join(process.cwd(), 'objects/local-upload');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const multerStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({ storage: multerStorage });
async function registerRoutes(app) {
    // Auth middleware (отключено для локальной разработки)
    // await setupAuth(app);
    // Подключаем роутер конструктора страниц
    const constructorRouter = (0, constructor_feature_1.createConstructorRouter)({ dbInstance: db_1.db });
    app.use('/api/constructor', constructorRouter);
    // Подключаем модульные роутеры
    const authRouter = (0, auth_router_1.createAuthRouter)();
    const healthRouter = (0, health_router_1.createHealthRouter)();
    const fileRouter = (0, file_router_1.createFileRouter)();
    const ecommerceRouter = (0, ecommerce_router_1.createEcommerceRouter)();
    const contentRouter = (0, content_router_1.createContentRouter)();
    const settingsRouter = (0, settings_router_1.createSettingsRouter)();
    const financeRouter = (0, finance_router_1.createFinanceRouter)();
    const bannerRouter = (0, banner_router_1.createBannerRouter)();
    const dashboardRouter = (0, dashboard_router_1.createDashboardRouter)();
    const sitePagesRouter = (0, site_pages_router_1.createSitePagesRouter)();
    const popupsRouter = (0, popups_router_1.createPopupsRouter)();
    const specialOffersRouter = (0, special_offers_router_1.createSpecialOffersRouter)();
    // Auth router должен быть подключен БЕЗ middleware, так как он сам обрабатывает аутентификацию
    app.use('/api/auth', authRouter);
    // Применяем auth middleware ко всем остальным API маршрутам (кроме auth и публичных)
    // В production используем JWT auth, в development - mock auth
    const authMiddleware = process.env.NODE_ENV === 'production' ? middleware_1.jwtAuth : middleware_1.mockAuth;
    // Список публичных роутов, которые не требуют авторизации
    const publicRoutes = [
        '/auth',
        '/categories',
        '/products',
        '/catalog', // Path-based catalog endpoint
        '/currencies',
        '/exchange-rates',
        '/reviews',
        '/settings',
        '/banners',
        '/popups',
        '/special-offers',
        '/site-pages',
        '/blog',
        '/health',
        '/debug',
        '/dev', // Development endpoints (host-info и др.)
        '/objects', // Статические файлы
        '/admin', // ВРЕМЕННО для отладки CRM панели
        '/upload/admin', // ВРЕМЕННО для управления загрузками
        '/users', // ВРЕМЕННО для списка пользователей
        '/local-upload', // Загрузка файлов через formidable
        '/ar/create-demo', // AR demo endpoint (публичный для пользователей без регистрации)
        '/ar/status', '/ar/all-public', '/ar/view' // Публичный статус AR проекта для опроса фронтом/скриптами
    ];
    // Публичные endpoints с методами POST/PUT/DELETE (для клиентов без авторизации)
    const publicMethods = [
        { path: '/upload/session', method: 'POST' }, { path: '/ar/', method: 'DELETE' }, // Создание сессии загрузки фото
        { path: '/upload/complete', method: 'POST' }, { path: '/ar/', method: 'DELETE' }, // Завершение загрузки
        { path: '/upload/local/', method: 'PUT' }, // Загрузка файлов на локальный storage (клиенты)
        { path: '/local-upload', method: 'POST' }, { path: '/ar/', method: 'DELETE' }, // Загрузка файлов через formidable (admin)
        { path: '/orders/simple', method: 'POST' }, { path: '/ar/', method: 'DELETE' }, // Создание простого заказа
        { path: '/constructor/pages', method: 'GET' }, // Получение страниц конструктора
    ];
    app.use('/api', (req, res, next) => {
        // Проверяем если путь начинается с одного из публичных роутов (GET запросы)
        const isPublicGet = publicRoutes.some(route => req.path.startsWith(route));
        if (isPublicGet) {
            return next(); // Пропускаем публичные роуты
        }
        // Проверяем публичные методы (POST/PUT/DELETE)
        const isPublicMethod = publicMethods.some(pm => req.path.startsWith(pm.path) && req.method === pm.method);
        if (isPublicMethod) {
            return next(); // Пропускаем публичные методы
        }
        return authMiddleware(req, res, next);
    });
    // Подключаем роутеры с соответствующими префиксами
    // ВАЖНО: orders роутер должен быть ДО ecommerce, так как у них есть конфликтующий роут /orders
    app.use('/api/orders', orders_router_1.ordersRouter);
    app.use('/api/currencies', currency_router_1.currencyRouter);
    app.use('/api', currency_router_1.currencyRouter); // для /api/exchange-rates
    app.use('/api/upload', photo_upload_router_1.photoUploadRouter);
    // Development utilities
    app.use('/api/dev', dev_router_1.devRouter);
    app.use('/api', healthRouter);
    app.use('/api', fileRouter);
    app.use('/api', ecommerceRouter);
    app.use('/api', contentRouter);
    app.use('/api', settingsRouter);
    app.use('/api', financeRouter);
    app.use('/api/banners', bannerRouter);
    app.use('/api', dashboardRouter);
    app.use('/api', sitePagesRouter);
    app.use('/api/popups', popupsRouter);
    app.use('/api/special-offers', specialOffersRouter);
    // AR routers (mounted after auth middleware so they require auth unless in development mockAuth)
    const arRouter = (0, ar_router_1.createARRouter)();
    const arItemsRouter = (0, ar_items_router_1.createARItemsRouter)();
    app.use('/api/ar', arRouter);
    app.use('/api/ar', arItemsRouter);
    // CRITICAL: Duplicate /ar routes WITHOUT /api prefix for QR codes and ngrok direct access
    // QR codes generate URLs like https://.../ar/view/demo-xxx (not /api/ar/view/demo-xxx)
    app.use('/ar', arRouter);
    // Encoding / locale diagnostics
    app.get('/api/debug/encoding', async (_req, res) => {
        try {
            let dbEncoding = null;
            try {
                // Attempt to read server_encoding and database encoding via raw query if pg client available
                // Drizzle with pg: use a raw query through db.$client if exposed; fallback to environment.
                // @ts-ignore
                if (db_1.db?.session?.client) {
                    // @ts-ignore
                    const r = await db_1.db.session.client.query("SHOW SERVER_ENCODING");
                    dbEncoding = r?.rows?.[0] || null;
                }
            }
            catch (e) {
                dbEncoding = { error: 'Could not query server encoding', details: String(e) };
            }
            let localeEnv = {};
            ['LANG', 'LC_ALL', 'LC_CTYPE', 'LC_COLLATE', 'LC_TIME', 'LC_MESSAGES'].forEach(k => localeEnv[k] = process.env[k]);
            let localeCmd = null;
            try {
                localeCmd = (0, child_process_1.execSync)(process.platform === 'win32' ? 'chcp' : 'locale', { encoding: 'utf8' });
            }
            catch {
                localeCmd = null;
            }
            res.json({
                process: {
                    platform: process.platform,
                    nodeVersion: process.version,
                    defaultEncoding: Buffer.isEncoding('utf8') ? 'utf8' : 'unknown'
                },
                dbEncoding,
                envLocale: localeEnv,
                systemLocaleOutput: localeCmd,
                suggestions: [
                    'Убедитесь что база создана с шаблоном UTF8: CREATE DATABASE yourdb WITH ENCODING "UTF8" TEMPLATE template0 LC_COLLATE="C" LC_CTYPE="C";',
                    'В Docker контейнере PostgreSQL убедитесь что переменные LANG/LC_* установлены например en_US.UTF-8 или hy_AM.UTF-8.',
                    'Перед миграцией: pg_dump использовать --encoding=UTF8, при восстановлении убедиться что клиентская кодировка \encoding UTF8.',
                    'Если увидели ????? вместо текста — это значит данные уже испорчены при вставке. Нужно пересоздать/повторно импортировать из корректного источника.'
                ]
            });
        }
        catch (e) {
            res.status(500).json({ error: 'encoding_diagnostic_failed', details: String(e) });
        }
    });
    // Удалено дублирующие роуты - они теперь обрабатываются в /api/auth
    // User management routes (Admin only) - временно отключена аутентификация для локальной разработки
    app.get('/api/users', async (req, res) => {
        try {
            // Временный обход аутентификации - возвращаем всех пользователей
            const users = await storage_1.storage.getUsers();
            res.json(users);
        }
        catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({ message: "Failed to fetch users" });
        }
    });
    app.put('/api/users/:id/role', middleware_1.mockAuth, async (req, res) => {
        try {
            const userId = req.user?.claims?.sub;
            if (!userId) {
                return res.status(401).json({ message: "Authentication required" });
            }
            const user = await storage_1.storage.getUser(userId);
            if (!user || user.role !== 'admin') {
                return res.status(403).json({ message: "Admin access required" });
            }
            const { role } = req.body;
            if (!role || !['user', 'admin'].includes(role)) {
                return res.status(400).json({ message: "Valid role required (user or admin)" });
            }
            const updatedUser = await storage_1.storage.updateUserRole(req.params.id, role);
            res.json(updatedUser);
        }
        catch (error) {
            console.error("Error updating user role:", error);
            res.status(500).json({ message: "Failed to update user role" });
        }
    });
    // Статическое обслуживание файлов из папки objects
    app.use('/objects', express_1.default.static(path_1.default.join(process.cwd(), 'objects')));
    const httpServer = (0, http_1.createServer)(app);
    return httpServer;
}
//# sourceMappingURL=routes.js.map
