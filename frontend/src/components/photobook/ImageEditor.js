import React, { useState, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Slider,
    Typography,
    Box,
    CircularProgress
} from '@mui/material';
import {
    Save as SaveIcon,
    RestartAlt as ResetIcon
} from '@mui/icons-material';
import Cropper from 'react-easy-crop';

const filters = {
    none: { name: 'Original', filter: 'none' },
    grayscale: { name: 'Black & White', filter: 'grayscale(100%)' },
    sepia: { name: 'Sepia', filter: 'sepia(100%)' },
    warm: { name: 'Warm', filter: 'saturate(150%) hue-rotate(30deg)' },
    cool: { name: 'Cool', filter: 'saturate(150%) hue-rotate(-30deg)' },
    vintage: { name: 'Vintage', filter: 'sepia(50%) hue-rotate(-30deg) saturate(120%)' },
    fade: { name: 'Fade', filter: 'opacity(85%) hue-rotate(20deg)' },
    dramatic: { name: 'Dramatic', filter: 'contrast(120%) saturate(110%)' }
};

const ImageEditor = ({ open, onClose, image, onSave }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [blur, setBlur] = useState(0);
    const [opacity, setOpacity] = useState(100);
    const [currentFilter, setCurrentFilter] = useState('none');
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    React.useEffect(() => {
        if (image) {
            const url = URL.createObjectURL(image);
            setImageUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [image]);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const resetToOriginal = useCallback(() => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setBlur(0);
        setOpacity(100);
        setCurrentFilter('none');
    }, []);

    // Вычисляем стили для изображения
    const imageStyle = useMemo(() => {
        return {
            filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) opacity(${opacity}%) ${filters[currentFilter].filter}`
        };
    }, [brightness, contrast, saturation, blur, opacity, currentFilter]);

    const handleSave = useCallback(async () => {
        if (!imageUrl || !croppedAreaPixels) return;
        setIsProcessing(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            canvas.width = croppedAreaPixels.width;
            canvas.height = croppedAreaPixels.height;

            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) opacity(${opacity}%) ${filters[currentFilter].filter}`;

            ctx.drawImage(
                img,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            );

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            onSave(blob);
            onClose();
        } catch (error) {
            console.error('Error saving image:', error);
        } finally {
            setIsProcessing(false);
        }
    }, [imageUrl, croppedAreaPixels, brightness, contrast, saturation, blur, opacity, currentFilter, onSave, onClose]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Edit Image</Typography>
                    <Button
                        startIcon={<ResetIcon />}
                        onClick={resetToOriginal}
                        color="primary"
                    >
                        Reset to Original
                    </Button>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ position: 'relative', height: 400, width: '100%', mb: 2 }}>
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={4/3}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        style={{
                            containerStyle: {
                                width: '100%',
                                height: '100%',
                                position: 'relative'
                            },
                            mediaStyle: imageStyle
                        }}
                    />
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>Adjustments</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                            <Typography variant="caption">Brightness</Typography>
                            <Slider
                                value={brightness}
                                onChange={(_, value) => setBrightness(value)}
                                min={0}
                                max={200}
                                valueLabelDisplay="auto"
                            />
                        </Box>
                        <Box>
                            <Typography variant="caption">Contrast</Typography>
                            <Slider
                                value={contrast}
                                onChange={(_, value) => setContrast(value)}
                                min={0}
                                max={200}
                                valueLabelDisplay="auto"
                            />
                        </Box>
                        <Box>
                            <Typography variant="caption">Saturation</Typography>
                            <Slider
                                value={saturation}
                                onChange={(_, value) => setSaturation(value)}
                                min={0}
                                max={200}
                                valueLabelDisplay="auto"
                            />
                        </Box>
                        <Box>
                            <Typography variant="caption">Blur</Typography>
                            <Slider
                                value={blur}
                                onChange={(_, value) => setBlur(value)}
                                min={0}
                                max={20}
                                valueLabelDisplay="auto"
                            />
                        </Box>
                        <Box>
                            <Typography variant="caption">Opacity</Typography>
                            <Slider
                                value={opacity}
                                onChange={(_, value) => setOpacity(value)}
                                min={0}
                                max={100}
                                valueLabelDisplay="auto"
                            />
                        </Box>
                    </Box>

                    <Typography gutterBottom sx={{ mt: 2 }}>Filters</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {Object.entries(filters).map(([key, { name }]) => (
                            <Button
                                key={key}
                                variant={currentFilter === key ? 'contained' : 'outlined'}
                                size="small"
                                onClick={() => setCurrentFilter(key)}
                            >
                                {name}
                            </Button>
                        ))}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    color="primary"
                    disabled={isProcessing}
                    startIcon={isProcessing ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImageEditor;
