import { useState, useRef } from 'react';
import {
    Box,
    Button,
    Typography,
    IconButton,
    Card,
    CardMedia,
    Paper
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    AddPhotoAlternate as AddPhotoIcon
} from '@mui/icons-material';
import PhotoBookPage from './PhotoBookPage';

const PhotoBookPages = ({ format, availablePhotos, pages, onPagesChange, onPhotosAdd }) => {
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const fileInputRef = useRef(null);

    const handleAddSpread = () => {
        onPagesChange([
            ...pages,
            { 
                spreadId: pages.length / 2,
                leftPage: { photos: [] },
                rightPage: { photos: [] }
            }
        ]);
    };

    const handleDeleteSpread = (spreadIndex) => {
        const newPages = pages.filter((_, index) => index !== spreadIndex);
        onPagesChange(newPages);
    };

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            onPhotosAdd(files);
        }
        event.target.value = '';
    };

    const handlePhotoAdd = (spreadIndex, isRightPage, position, photo) => {
        const newPages = [...pages];
        const spread = newPages[spreadIndex];
        if (spread) {
            const targetPage = isRightPage ? spread.rightPage : spread.leftPage;
            targetPage.photos = [
                ...targetPage.photos.filter(p => p.position !== position),
                { ...photo, position }
            ];
            onPagesChange(newPages);
            setSelectedPhotos(prev => [...prev, photo.id]);
        }
    };

    const handlePhotoRemove = (spreadIndex, isRightPage, position) => {
        const newPages = [...pages];
        const spread = newPages[spreadIndex];
        if (spread) {
            const targetPage = isRightPage ? spread.rightPage : spread.leftPage;
            const removedPhoto = targetPage.photos.find(p => p.position === position);
            if (removedPhoto) {
                setSelectedPhotos(prev => prev.filter(id => id !== removedPhoto.id));
            }
            targetPage.photos = targetPage.photos.filter(p => p.position !== position);
            onPagesChange(newPages);
        }
    };

    // Рассчитываем размеры на основе пропорций формата
    const calculatePageDimensions = () => {
        const maxWidth = 800; // Максимальная ширина разворота
        const maxHeight = 600; // Максимальная высота разворота
        
        if (!format || !format.dimensions) {
            return { width: 0, height: 0 };
        }

        // Получаем размеры из формата
        const formatWidth = format.dimensions.width; // Уже содержит ширину разворота (2 страницы)
        const formatHeight = format.dimensions.height;
        
        // Рассчитываем масштаб, сохраняя пропорции
        const scale = Math.min(
            maxWidth / formatWidth,
            maxHeight / formatHeight
        );
        
        return {
            width: formatWidth * scale,
            height: formatHeight * scale
        };
    };

    const { width: pageWidth, height: pageHeight } = calculatePageDimensions();

    return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
            {/* Панель с доступными фотографиями */}
            <Box sx={{ 
                width: 250,
                p: 2,
                borderRight: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <Typography variant="h6" gutterBottom>
                    Доступные фотографии
                </Typography>
                
                <Box sx={{ 
                    flex: 1,
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1,
                    p: 1
                }}>
                    {/* Кнопка добавления фотографий */}
                    <Card
                        sx={{
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '2px dashed',
                            borderColor: 'grey.300',
                            '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: 'action.hover'
                            }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <AddPhotoIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                    </Card>

                    {/* Миниатюры фотографий */}
                    {availablePhotos
                        .filter(photo => !selectedPhotos.includes(photo.id))
                        .map((photo) => (
                            <Card
                                key={photo.id}
                                sx={{
                                    aspectRatio: '1',
                                    cursor: 'grab',
                                    '&:hover': {
                                        boxShadow: 3
                                    }
                                }}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('photo', JSON.stringify(photo));
                                }}
                            >
                                <CardMedia
                                    component="img"
                                    image={photo.preview || photo.url}
                                    alt={`Photo ${photo.id}`}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </Card>
                        ))}
                </Box>

                <input
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />
            </Box>

            {/* Область разворотов */}
            <Box sx={{ 
                flex: 1,
                p: 3,
                bgcolor: 'grey.100',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                {pages.map((spread, spreadIndex) => (
                    <Paper
                        key={spreadIndex}
                        elevation={3}
                        sx={{
                            display: 'flex',
                            backgroundColor: 'white',
                            marginBottom: '-5px',
                            position: 'relative',
                            zIndex: pages.length - spreadIndex,
                            gap: 0,
                            p: 0
                        }}
                    >
                        <IconButton
                            size="small"
                            onClick={() => handleDeleteSpread(spreadIndex)}
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                bgcolor: 'background.paper',
                                zIndex: 1,
                                '&:hover': {
                                    bgcolor: 'error.light',
                                    color: 'common.white'
                                }
                            }}
                        >
                            <DeleteIcon />
                        </IconButton>

                        {/* Левая страница */}
                        <PhotoBookPage
                            pageWidth={pageWidth / 2}
                            pageHeight={pageHeight}
                            photos={spread.leftPage.photos}
                            onPhotoAdd={(position, photo) => handlePhotoAdd(spreadIndex, false, position, photo)}
                            onPhotoRemove={(position) => handlePhotoRemove(spreadIndex, false, position)}
                        />
                        
                        {/* Правая страница */}
                        <PhotoBookPage
                            pageWidth={pageWidth / 2}
                            pageHeight={pageHeight}
                            photos={spread.rightPage.photos}
                            onPhotoAdd={(position, photo) => handlePhotoAdd(spreadIndex, true, position, photo)}
                            onPhotoRemove={(position) => handlePhotoRemove(spreadIndex, true, position)}
                        />
                    </Paper>
                ))}

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddSpread}
                >
                    Добавить разворот
                </Button>
            </Box>
        </Box>
    );
};

export default PhotoBookPages;
