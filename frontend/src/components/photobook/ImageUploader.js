import React, { useState, useCallback } from 'react';
import { 
    Box, 
    Typography, 
    IconButton, 
    LinearProgress,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    Tooltip,
    Snackbar,
    Alert,
    Menu,
    MenuItem
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    MoreVert as MoreIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import ImageEditor from './ImageEditor';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ImageUploader = ({ onImageSelect }) => {
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [error, setError] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        const invalidFiles = acceptedFiles.filter(
            file => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
        );

        if (invalidFiles.length > 0) {
            setError('Некоторые файлы не были загружены: неверный формат или размер больше 10MB');
            return;
        }

        setUploading(true);
        const newImages = [];

        for (const file of acceptedFiles) {
            try {
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
                
                // Создаем уникальный ID для файла
                const imageId = Date.now() + Math.random().toString(36).substr(2, 9);
                const imageFile = Object.assign(file, {
                    id: imageId,
                    preview: URL.createObjectURL(file)
                });

                newImages.push(imageFile);
                setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

                if (onImageSelect) {
                    onImageSelect(imageFile);
                }
            } catch (error) {
                console.error('Ошибка при загрузке файла:', error);
                setError(`Ошибка при загрузке файла ${file.name}`);
            }
        }

        setImages(prev => [...prev, ...newImages]);
        setUploading(false);
    }, [onImageSelect]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ALLOWED_TYPES
        },
        maxSize: MAX_FILE_SIZE
    });

    const handleMenuOpen = (event, image) => {
        setSelectedImage(image);
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setSelectedImage(null);
    };

    const handleDeleteImage = (image) => {
        if (image.preview) {
            URL.revokeObjectURL(image.preview);
        }
        setImages(prev => prev.filter(img => img.id !== image.id));
        handleMenuClose();
    };

    const handleEditClick = (image) => {
        setImageToEdit(image);
        setEditorOpen(true);
        setMenuAnchor(null);
    };

    const handleEditSave = async (editedImageBlob) => {
        try {
            const editedImageFile = new File([editedImageBlob], imageToEdit.name, {
                type: 'image/jpeg'
            });

            // Создаем новый preview URL для отредактированного изображения
            const previewUrl = URL.createObjectURL(editedImageBlob);
            
            // Обновляем изображение в списке
            setImages(prevImages => 
                prevImages.map(img => 
                    img.id === imageToEdit.id
                        ? { ...editedImageFile, id: img.id, preview: previewUrl }
                        : img
                )
            );

            // Очищаем старый preview URL
            if (imageToEdit.preview) {
                URL.revokeObjectURL(imageToEdit.preview);
            }

            if (onImageSelect) {
                onImageSelect(editedImageFile);
            }
        } catch (error) {
            console.error('Ошибка при сохранении отредактированного изображения:', error);
            setError('Не удалось сохранить отредактированное изображение');
        }
        
        setEditorOpen(false);
        setImageToEdit(null);
    };

    // Очистка preview URLs при размонтировании
    React.useEffect(() => {
        return () => {
            images.forEach(image => {
                if (image.preview) {
                    URL.revokeObjectURL(image.preview);
                }
            });
        };
    }, [images]);

    return (
        <Box>
            <ImageEditor
                open={editorOpen}
                onClose={() => {
                    setEditorOpen(false);
                    setImageToEdit(null);
                }}
                image={imageToEdit}
                onSave={handleEditSave}
            />

            <Box
                {...getRootProps()}
                sx={{
                    p: 2,
                    border: theme => `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                }}
            >
                <input {...getInputProps()} />
                <UploadIcon sx={{ fontSize: 40, color: 'action.active', mb: 1 }} />
                <Typography>
                    {isDragActive
                        ? 'Перетащите изображения сюда'
                        : 'Перетащите изображения сюда или кликните для выбора'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                    Поддерживаемые форматы: JPG, PNG, WEBP. Максимальный размер: 10MB
                </Typography>
            </Box>

            {uploading && (
                <Box sx={{ width: '100%', mt: 2 }}>
                    {Object.entries(uploadProgress).map(([filename, progress]) => (
                        <Box key={filename} sx={{ mb: 1 }}>
                            <Typography variant="caption">{filename}</Typography>
                            <LinearProgress variant="determinate" value={progress} />
                        </Box>
                    ))}
                </Box>
            )}

            <AnimatePresence>
                {images.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <ImageList sx={{ mt: 2 }} cols={3} rowHeight={200}>
                            {images.map((image) => (
                                <ImageListItem key={image.id}>
                                    <img
                                        src={image.preview}
                                        alt={image.name}
                                        loading="lazy"
                                        style={{ height: '200px', objectFit: 'cover' }}
                                    />
                                    <ImageListItemBar
                                        title={image.name}
                                        actionIcon={
                                            <IconButton
                                                sx={{ color: 'white' }}
                                                onClick={(e) => handleMenuOpen(e, image)}
                                                aria-label="меню"
                                            >
                                                <MoreIcon />
                                            </IconButton>
                                        }
                                    />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    </motion.div>
                )}
            </AnimatePresence>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => handleEditClick(selectedImage)}>
                    <EditIcon sx={{ mr: 1 }} /> Редактировать
                </MenuItem>
                <MenuItem onClick={() => handleDeleteImage(selectedImage)}>
                    <DeleteIcon sx={{ mr: 1 }} /> Удалить
                </MenuItem>
            </Menu>

            <Snackbar
                open={Boolean(error)}
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

export default ImageUploader;
