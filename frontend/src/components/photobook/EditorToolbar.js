import React from 'react';
import { 
    AppBar, 
    Toolbar, 
    IconButton, 
    Tooltip, 
    Typography,
    Box,
    Button,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Undo as UndoIcon,
    Redo as RedoIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    TextFields as TextIcon,
    Download as DownloadIcon
} from '@mui/icons-material';

const EditorToolbar = ({ 
    onAddPage,
    onDeletePage,
    onSave,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onAddText,
    onDownload,
    canUndo = false,
    canRedo = false,
    canDelete = false,
    isSaving = false,
    isDownloading = false,
    autoSaveStatus
}) => {
    return (
        <AppBar position="static" color="default" elevation={1}>
            <Toolbar variant="dense">
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Добавить страницу">
                            <IconButton onClick={onAddPage} size="small">
                                <AddIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Удалить страницу">
                            <span>
                                <IconButton 
                                    onClick={onDeletePage}
                                    disabled={!canDelete}
                                    size="small"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Box sx={{ borderLeft: 1, borderColor: 'divider', mx: 1 }} />

                        {onUndo && (
                            <Tooltip title="Отменить">
                                <span>
                                    <IconButton 
                                        onClick={onUndo}
                                        disabled={!canUndo}
                                        size="small"
                                    >
                                        <UndoIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}

                        {onRedo && (
                            <Tooltip title="Повторить">
                                <span>
                                    <IconButton 
                                        onClick={onRedo}
                                        disabled={!canRedo}
                                        size="small"
                                    >
                                        <RedoIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}

                        {(onZoomIn || onZoomOut) && (
                            <>
                                <Box sx={{ borderLeft: 1, borderColor: 'divider', mx: 1 }} />
                                
                                {onZoomIn && (
                                    <Tooltip title="Увеличить">
                                        <IconButton onClick={onZoomIn} size="small">
                                            <ZoomInIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                {onZoomOut && (
                                    <Tooltip title="Уменьшить">
                                        <IconButton onClick={onZoomOut} size="small">
                                            <ZoomOutIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </>
                        )}

                        {onAddText && (
                            <>
                                <Box sx={{ borderLeft: 1, borderColor: 'divider', mx: 1 }} />
                                
                                <Tooltip title="Добавить текст">
                                    <IconButton onClick={onAddText} size="small">
                                        <TextIcon />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Box>

                    <Box sx={{ 
                        ml: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}>
                        {isSaving && <CircularProgress size={20} />}
                        <Typography
                            variant="caption"
                            color={autoSaveStatus.includes('Ошибка') ? 'error' : 'textSecondary'}
                        >
                            {autoSaveStatus}
                        </Typography>

                        {onDownload && (
                            <Tooltip title="Скачать фотокнигу">
                                <span>
                                    <IconButton 
                                        onClick={onDownload}
                                        disabled={isDownloading}
                                        size="small"
                                    >
                                        {isDownloading ? (
                                            <CircularProgress size={20} />
                                        ) : (
                                            <DownloadIcon />
                                        )}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}

                        {onSave && (
                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                onClick={onSave}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Сохранение...' : 'Сохранить'}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default EditorToolbar;
