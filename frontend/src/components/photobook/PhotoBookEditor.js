import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Grid, Paper, Snackbar, Alert, CircularProgress } from '@mui/material';
import { DragDropContext } from 'react-beautiful-dnd';
import PhotoBookPreview from './PhotoBookPreview';
import LayoutTemplates from './LayoutTemplates';
import ImageUploader from './ImageUploader';
import EditorToolbar from './EditorToolbar';
import { usePhotoBook } from '../../hooks/usePhotoBook';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';

const AUTOSAVE_DELAY = 2000; // 2 seconds

const PhotoBookEditor = ({ photoBookId }) => {
    const {
        book,
        pages,
        currentPage,
        loading,
        error,
        setCurrentPage,
        updatePage,
        savePage,
        addPage,
        deletePage,
    } = usePhotoBook(photoBookId);

    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState('');
    const lastSavedState = useRef(null);

    // Create a debounced save function
    const debouncedSave = useCallback(
        debounce(async (pageData) => {
            try {
                setIsSaving(true);
                setAutoSaveStatus('Сохранение...');
                await savePage(pageData);
                setAutoSaveStatus('Все изменения сохранены');
                lastSavedState.current = JSON.stringify(pageData);
            } catch (error) {
                setAutoSaveStatus('Ошибка автосохранения');
                setSaveError(error.message);
            } finally {
                setIsSaving(false);
            }
        }, AUTOSAVE_DELAY),
        [savePage]
    );

    // Check for changes and trigger autosave
    useEffect(() => {
        if (!currentPage) return;

        const currentState = JSON.stringify(currentPage);
        if (currentState !== lastSavedState.current) {
            setAutoSaveStatus('Есть несохраненные изменения...');
            debouncedSave(currentPage);
        }
    }, [currentPage, debouncedSave]);

    // Cleanup
    useEffect(() => {
        return () => {
            debouncedSave.cancel();
        };
    }, [debouncedSave]);

    useEffect(() => {
        if (error) {
            setSaveError(error);
        }
    }, [error]);

    const handleDragStart = () => {
        setIsDragging(true);
    };

    const handleDragEnd = useCallback(async (result) => {
        setIsDragging(false);
        if (!result.destination) return;

        const { source, destination } = result;
        try {
            setIsSaving(true);
            await updatePage(currentPage, {
                sourceId: source.droppableId,
                destinationId: destination.droppableId,
                sourceIndex: source.index,
                destinationIndex: destination.index
            });
        } catch (err) {
            setSaveError('Ошибка при перемещении изображения');
            console.error('Error updating page:', err);
        } finally {
            setIsSaving(false);
        }
    }, [currentPage, updatePage]);

    const handleTemplateSelect = useCallback(async (template) => {
        try {
            setIsSaving(true);
            setSelectedTemplate(template);
            await savePage(currentPage, { template });
        } catch (err) {
            setSaveError('Ошибка при применении шаблона');
            console.error('Error applying template:', err);
        } finally {
            setIsSaving(false);
        }
    }, [currentPage, savePage]);

    const handleAddPage = useCallback(async () => {
        try {
            setIsSaving(true);
            const newPageNumber = await addPage();
            setCurrentPage(newPageNumber);
        } catch (err) {
            setSaveError('Ошибка при добавлении страницы');
            console.error('Error adding page:', err);
        } finally {
            setIsSaving(false);
        }
    }, [addPage, setCurrentPage]);

    const handleDeletePage = useCallback(async () => {
        try {
            setIsSaving(true);
            await deletePage(currentPage);
        } catch (err) {
            setSaveError('Ошибка при удалении страницы');
            console.error('Error deleting page:', err);
        } finally {
            setIsSaving(false);
        }
    }, [currentPage, deletePage]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <EditorToolbar
                    onAddPage={handleAddPage}
                    onDeletePage={handleDeletePage}
                    canDelete={pages.length > 1}
                    isSaving={isSaving}
                    autoSaveStatus={autoSaveStatus}
                />
                
                <Grid container spacing={2} sx={{ flex: 1, mt: 1 }}>
                    <Grid item xs={3}>
                        <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                            <LayoutTemplates
                                selectedTemplate={selectedTemplate}
                                onTemplateSelect={handleTemplateSelect}
                            />
                        </Paper>
                    </Grid>

                    <Grid item xs={6}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentPage}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                style={{ height: '100%' }}
                            >
                                <Paper 
                                    sx={{ 
                                        p: 2, 
                                        height: '100%',
                                        opacity: isDragging ? 0.7 : 1,
                                        transition: 'opacity 0.2s'
                                    }}
                                >
                                    <PhotoBookPreview
                                        photoBookId={photoBookId}
                                        currentPage={currentPage}
                                        totalPages={pages.length}
                                        onPageChange={setCurrentPage}
                                    />
                                </Paper>
                            </motion.div>
                        </AnimatePresence>
                    </Grid>

                    <Grid item xs={3}>
                        <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                            <ImageUploader />
                        </Paper>
                    </Grid>
                </Grid>

                <Snackbar
                    open={Boolean(saveError)}
                    autoHideDuration={6000}
                    onClose={() => setSaveError(null)}
                >
                    <Alert severity="error" onClose={() => setSaveError(null)}>
                        {saveError}
                    </Alert>
                </Snackbar>
                <Snackbar
                    open={Boolean(autoSaveStatus)}
                    autoHideDuration={autoSaveStatus === 'Все изменения сохранены' ? 3000 : null}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert 
                        severity={autoSaveStatus.includes('Ошибка') ? 'error' : 'info'}
                        icon={isSaving ? <CircularProgress size={20} /> : undefined}
                    >
                        {autoSaveStatus}
                    </Alert>
                </Snackbar>
            </Box>
        </DragDropContext>
    );
};

export default PhotoBookEditor;
