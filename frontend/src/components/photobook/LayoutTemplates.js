import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActionArea,
    IconButton,
    Tooltip,
    Skeleton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Switch,
    FormControlLabel,
    Snackbar,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    MoreVert as MoreIcon,
    Share as ShareIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ContentCopy as DuplicateIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const templatesApi = {
    getTemplates: async () => {
        // Implement API call to get templates
    },
    createTemplate: async (template) => {
        // Implement API call to create template
    },
    updateTemplate: async (templateId, template) => {
        // Implement API call to update template
    },
    deleteTemplate: async (templateId) => {
        // Implement API call to delete template
    },
    shareTemplate: async (templateId, userId) => {
        // Implement API call to share template
    },
    removeShare: async (templateId, userId) => {
        // Implement API call to remove share
    }
};

const userApi = {
    findByEmail: async (email) => {
        // Implement API call to find user by email
    }
};

const templates = [
    {
        id: 'single',
        name: 'Одно фото',
        layout: [{ x: 0, y: 0, width: 1, height: 1 }],
        preview: '/templates/single.png'
    },
    {
        id: 'double-horizontal',
        name: 'Два фото горизонтально',
        layout: [
            { x: 0, y: 0, width: 0.5, height: 1 },
            { x: 0.5, y: 0, width: 0.5, height: 1 }
        ],
        preview: '/templates/double-h.png'
    },
    {
        id: 'double-vertical',
        name: 'Два фото вертикально',
        layout: [
            { x: 0, y: 0, width: 1, height: 0.5 },
            { x: 0, y: 0.5, width: 1, height: 0.5 }
        ],
        preview: '/templates/double-v.png'
    },
    {
        id: 'triple',
        name: 'Три фото',
        layout: [
            { x: 0, y: 0, width: 0.6, height: 1 },
            { x: 0.6, y: 0, width: 0.4, height: 0.5 },
            { x: 0.6, y: 0.5, width: 0.4, height: 0.5 }
        ],
        preview: '/templates/triple.png'
    },
    {
        id: 'quad',
        name: 'Четыре фото',
        layout: [
            { x: 0, y: 0, width: 0.5, height: 0.5 },
            { x: 0.5, y: 0, width: 0.5, height: 0.5 },
            { x: 0, y: 0.5, width: 0.5, height: 0.5 },
            { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }
        ],
        preview: '/templates/quad.png'
    },
    // Новые шаблоны
    {
        id: 'triple-vertical',
        name: 'Три фото вертикально',
        layout: [
            { x: 0, y: 0, width: 1, height: 0.33 },
            { x: 0, y: 0.33, width: 1, height: 0.33 },
            { x: 0, y: 0.66, width: 1, height: 0.34 }
        ],
        preview: '/templates/triple-v.png'
    },
    {
        id: 'triple-horizontal',
        name: 'Три фото горизонтально',
        layout: [
            { x: 0, y: 0, width: 0.33, height: 1 },
            { x: 0.33, y: 0, width: 0.33, height: 1 },
            { x: 0.66, y: 0, width: 0.34, height: 1 }
        ],
        preview: '/templates/triple-h.png'
    },
    {
        id: 'five-grid',
        name: 'Пять фото',
        layout: [
            { x: 0, y: 0, width: 0.5, height: 0.5 },
            { x: 0.5, y: 0, width: 0.5, height: 0.5 },
            { x: 0, y: 0.5, width: 0.33, height: 0.5 },
            { x: 0.33, y: 0.5, width: 0.33, height: 0.5 },
            { x: 0.66, y: 0.5, width: 0.34, height: 0.5 }
        ],
        preview: '/templates/five.png'
    },
    {
        id: 'six-grid',
        name: 'Шесть фото',
        layout: [
            { x: 0, y: 0, width: 0.33, height: 0.5 },
            { x: 0.33, y: 0, width: 0.33, height: 0.5 },
            { x: 0.66, y: 0, width: 0.34, height: 0.5 },
            { x: 0, y: 0.5, width: 0.33, height: 0.5 },
            { x: 0.33, y: 0.5, width: 0.33, height: 0.5 },
            { x: 0.66, y: 0.5, width: 0.34, height: 0.5 }
        ],
        preview: '/templates/six.png'
    },
    {
        id: 'collage',
        name: 'Коллаж',
        layout: [
            { x: 0, y: 0, width: 0.7, height: 0.7 },
            { x: 0.7, y: 0, width: 0.3, height: 0.3 },
            { x: 0.7, y: 0.3, width: 0.3, height: 0.4 },
            { x: 0, y: 0.7, width: 0.4, height: 0.3 },
            { x: 0.4, y: 0.7, width: 0.6, height: 0.3 }
        ],
        preview: '/templates/collage.png'
    }
];

const LayoutTemplates = ({ selectedTemplate, onTemplateSelect }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedTemplateMenu, setSelectedTemplateMenu] = useState(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editedTemplate, setEditedTemplate] = useState(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await templatesApi.getTemplates();
            setTemplates(data);
        } catch (err) {
            setError('Ошибка при загрузке шаблонов');
            console.error('Error loading templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMenuOpen = (event, template) => {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
        setSelectedTemplateMenu(template);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setSelectedTemplateMenu(null);
    };

    const handleShareClick = () => {
        setShareDialogOpen(true);
        handleMenuClose();
    };

    const handleEditClick = () => {
        setEditedTemplate({ ...selectedTemplateMenu });
        setEditDialogOpen(true);
        handleMenuClose();
    };

    const handleDuplicateClick = async () => {
        try {
            const response = await templatesApi.createTemplate({ ...selectedTemplateMenu });
            if (!response.ok) {
                throw new Error('Failed to duplicate template');
            }
            await loadTemplates();
        } catch (err) {
            setError('Ошибка при дублировании шаблона');
            console.error('Error duplicating template:', err);
        }
        handleMenuClose();
    };

    const handleDeleteClick = async () => {
        try {
            await templatesApi.deleteTemplate(selectedTemplateMenu.id);
            await loadTemplates();
        } catch (err) {
            setError('Ошибка при удалении шаблона');
            console.error('Error deleting template:', err);
        }
        handleMenuClose();
    };

    const handleSaveTemplate = async () => {
        try {
            if (editedTemplate.id) {
                await templatesApi.updateTemplate(editedTemplate.id, editedTemplate);
            } else {
                await templatesApi.createTemplate(editedTemplate);
            }
            await loadTemplates();
            setEditDialogOpen(false);
        } catch (err) {
            setError('Ошибка при сохранении шаблона');
            console.error('Error saving template:', err);
        }
    };

    const handleShareTemplate = async (emails) => {
        try {
            const user = await userApi.findByEmail(emails);
            if (user) {
                await templatesApi.shareTemplate(selectedTemplateMenu.id, user.id);
                setShareDialogOpen(false);
            }
        } catch (err) {
            setError('Ошибка при отправке приглашений');
            console.error('Error sharing template:', err);
        }
    };

    const renderTemplateCard = (template) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                sx={{
                    position: 'relative',
                    height: '100%',
                    bgcolor: selectedTemplate?.id === template.id ? 'action.selected' : 'background.paper'
                }}
            >
                <CardActionArea
                    onClick={() => onTemplateSelect(template)}
                    sx={{ height: '100%' }}
                >
                    <CardContent>
                        <Box
                            sx={{
                                aspectRatio: '4/3',
                                bgcolor: 'action.hover',
                                mb: 1,
                                borderRadius: 1,
                                overflow: 'hidden'
                            }}
                        >
                            {template.preview ? (
                                <img
                                    src={template.preview}
                                    alt={template.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Typography variant="body2" color="textSecondary">
                                        Нет предпросмотра
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        <Typography variant="subtitle1" noWrap>
                            {template.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" noWrap>
                            {template.layout.length} фото
                        </Typography>
                    </CardContent>
                </CardActionArea>
                <IconButton
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={(e) => handleMenuOpen(e, template)}
                >
                    <MoreIcon />
                </IconButton>
            </Card>
        </motion.div>
    );

    return (
        <Box>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Шаблоны
                </Typography>
                <Tooltip title="Создать новый шаблон">
                    <IconButton
                        onClick={() => {
                            setEditedTemplate({
                                name: '',
                                description: '',
                                isPublic: false,
                                layout: []
                            });
                            setEditDialogOpen(true);
                        }}
                    >
                        <AddIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Grid container spacing={2}>
                <AnimatePresence>
                    {loading ? (
                        Array.from({ length: 4 }).map((_, index) => (
                            <Grid item xs={6} key={index}>
                                <Skeleton
                                    variant="rectangular"
                                    sx={{ paddingTop: '75%', borderRadius: 1 }}
                                />
                                <Skeleton width="60%" sx={{ mt: 1 }} />
                                <Skeleton width="40%" />
                            </Grid>
                        ))
                    ) : (
                        templates.map((template) => (
                            <Grid item xs={6} key={template.id}>
                                {renderTemplateCard(template)}
                            </Grid>
                        ))
                    )}
                </AnimatePresence>
            </Grid>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleEditClick}>
                    <EditIcon sx={{ mr: 1 }} /> Редактировать
                </MenuItem>
                <MenuItem onClick={handleShareClick}>
                    <ShareIcon sx={{ mr: 1 }} /> Поделиться
                </MenuItem>
                <MenuItem onClick={handleDuplicateClick}>
                    <DuplicateIcon sx={{ mr: 1 }} /> Дублировать
                </MenuItem>
                <MenuItem onClick={handleDeleteClick}>
                    <DeleteIcon sx={{ mr: 1 }} /> Удалить
                </MenuItem>
            </Menu>

            <Dialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {editedTemplate?.id ? 'Редактировать шаблон' : 'Создать шаблон'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Название"
                            fullWidth
                            value={editedTemplate?.name || ''}
                            onChange={(e) =>
                                setEditedTemplate(prev => ({ ...prev, name: e.target.value }))
                            }
                        />
                        <TextField
                            label="Описание"
                            fullWidth
                            multiline
                            rows={3}
                            value={editedTemplate?.description || ''}
                            onChange={(e) =>
                                setEditedTemplate(prev => ({ ...prev, description: e.target.value }))
                            }
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={editedTemplate?.isPublic || false}
                                    onChange={(e) =>
                                        setEditedTemplate(prev => ({
                                            ...prev,
                                            isPublic: e.target.checked
                                        }))
                                    }
                                />
                            }
                            label="Публичный шаблон"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
                    <Button
                        onClick={handleSaveTemplate}
                        variant="contained"
                        disabled={!editedTemplate?.name}
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Поделиться шаблоном</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Email адрес"
                        fullWidth
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShareDialogOpen(false)}>Отмена</Button>
                    <Button
                        onClick={() => {
                            const emailField = document.querySelector('input');
                            const email = emailField.value.trim();
                            handleShareTemplate(email);
                        }}
                        variant="contained"
                    >
                        Отправить
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default LayoutTemplates;
