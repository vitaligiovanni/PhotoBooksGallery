import { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    Grid,
    Typography,
    IconButton,
    Card,
    CardMedia,
    CardActions,
    CardContent
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ImageEditor from './ImageEditor';

const MotionCard = motion(Card);

const PhotoUploader = ({ onPhotosChange }) => {
    const [photos, setPhotos] = useState([]);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        const newPhotos = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file)
        }));
        
        setPhotos(prevPhotos => {
            const updatedPhotos = [...prevPhotos, ...newPhotos];
            onPhotosChange(updatedPhotos);
            return updatedPhotos;
        });
    };

    const handleDelete = (photoId) => {
        setPhotos(prevPhotos => {
            const updatedPhotos = prevPhotos.filter(photo => photo.id !== photoId);
            onPhotosChange(updatedPhotos);
            return updatedPhotos;
        });
    };

    const handleEdit = (photo) => {
        setSelectedPhoto(photo);
        setIsEditorOpen(true);
    };

    const handleEditorClose = () => {
        setIsEditorOpen(false);
        setSelectedPhoto(null);
    };

    const handlePhotoSave = (editedBlob) => {
        if (selectedPhoto) {
            const editedFile = new File([editedBlob], selectedPhoto.file.name, {
                type: 'image/jpeg'
            });

            setPhotos(prevPhotos => {
                const updatedPhotos = prevPhotos.map(photo =>
                    photo.id === selectedPhoto.id
                        ? {
                            ...photo,
                            file: editedFile,
                            preview: URL.createObjectURL(editedBlob)
                        }
                        : photo
                );
                onPhotosChange(updatedPhotos);
                return updatedPhotos;
            });
        }
        handleEditorClose();
    };

    // Очистка URL при размонтировании
    const cleanup = useCallback(() => {
        photos.forEach(photo => {
            URL.revokeObjectURL(photo.preview);
        });
    }, [photos]);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return (
        <Box sx={{ width: '100%', p: 2 }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="photo-upload"
                    multiple
                    type="file"
                    onChange={handleFileSelect}
                />
                <label htmlFor="photo-upload">
                    <Button
                        component="span"
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        size="large"
                    >
                        Загрузить фотографии
                    </Button>
                </label>
            </Box>

            <Grid container spacing={2}>
                {photos.map((photo) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                        <MotionCard
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <CardMedia
                                component="img"
                                height="200"
                                image={photo.preview}
                                alt={photo.file.name}
                                sx={{ objectFit: 'cover' }}
                            />
                            <CardContent>
                                <Typography variant="body2" noWrap>
                                    {photo.file.name}
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <IconButton 
                                    size="small" 
                                    onClick={() => handleEdit(photo)}
                                    color="primary"
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    onClick={() => handleDelete(photo.id)}
                                    color="error"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </CardActions>
                        </MotionCard>
                    </Grid>
                ))}
            </Grid>

            {selectedPhoto && (
                <ImageEditor
                    open={isEditorOpen}
                    onClose={handleEditorClose}
                    image={selectedPhoto.file}
                    onSave={handlePhotoSave}
                />
            )}
        </Box>
    );
};

export default PhotoUploader;
