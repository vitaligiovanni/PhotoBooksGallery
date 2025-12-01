
    /**
     * DELETE /api/ar/:id/delete-demo
     * Публичное удаление DEMO-проекта без авторизации (только demo)
     */
    router.delete('/:id/delete-demo', async (req, res) => {
        try {
            const { id } = req.params;
            const [arProject] = await db_1.db.select().from(schema_1.arProjects).where((0, drizzle_orm_1.eq)(schema_1.arProjects.id, id)).limit(1);
            if (!arProject) return res.status(404).json({ error: 'AR project not found' });
            if (!arProject.isDemo) return res.status(403).json({ error: 'Only demo projects can be deleted publicly' });
            // Delete files
            try {
                const storageDir = path_1.default.join(process.cwd(), 'objects', 'ar-storage', id);
                await promises_1.default.rm(storageDir, { recursive: true, force: true });
            }
            catch { }
            // Delete from database
            await db_1.db.delete(schema_1.arProjects).where((0, drizzle_orm_1.eq)(schema_1.arProjects.id, id));
            res.json({ message: 'Demo AR project deleted', data: { id } });
        }
        catch (error) {
            console.error('[AR Router] Public delete demo error:', error);
            res.status(500).json({ error: 'Failed to delete demo project', details: error.message });
        }
    });
