// Вставить этот код после router.get('/all', ...) и перед router.post('/:id/mask', ...)

    /**
     * GET /api/ar/all-public
     * Публичный список только DEMO-проектов (без авторизации) для упрощённого управления
     * Возвращает последние 200 демо-проектов
     */
    router.get('/all-public', async (_req, res) => {
        try {
            const projects = await db_1.db
                .select()
                .from(schema_1.arProjects)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.arProjects.createdAt))
                .limit(200);
            // Только демо-проекты
            const demos = projects.filter(p => p.isDemo === true);
            const mapped = demos.map(p => ({
                id: p.id,
                status: p.status,
                viewUrl: p.viewUrl,
                viewerHtmlUrl: p.viewerHtmlUrl || null,
                orderId: p.orderId,
                createdAt: p.createdAt,
                isDemo: true,
                expiresAt: p.expiresAt || null,
                errorMessage: p.errorMessage || null,
            }));
            res.json({
                message: 'Public demo AR projects',
                data: mapped,
                meta: { count: mapped.length }
            });
        }
        catch (error) {
            console.error('[AR Router] all-public error:', error);
            res.status(500).json({ error: 'Failed to get public demo projects', details: error.message });
        }
    });
