import { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Button,
    Grid,
    Container
} from '@mui/material';
import {
    NavigateBefore as PrevIcon,
    NavigateNext as NextIcon,
    GetApp as DownloadIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const MotionPaper = motion(Paper);

const PhotoBookPreview = ({ format, pages }) => {
    const [currentPage, setCurrentPage] = useState(0);

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(0, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(pages.length - 1, prev + 1));
    };

    // Вычисляем размеры страницы на основе формата
    const getPageDimensions = () => {
        const baseWidth = 800; // Базовая ширина для предпросмотра
        const [width, height] = format.size.split('×').map(dim => parseInt(dim));
        const ratio = height / width;
        return {
            width: baseWidth,
            height: baseWidth * ratio
        };
    };

    const { width, height } = getPageDimensions();

    const handleDownload = () => {
        // TODO: Добавить функционал экспорта в PDF
        console.log('Download functionality will be added here');
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ width: '100%', p: 2 }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Typography variant="h4" gutterBottom>
                        Предпросмотр фотокниги
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        Формат: {format.name} ({format.size})
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownload}
                        sx={{ mt: 2 }}
                    >
                        Скачать PDF
                    </Button>
                </Box>

                <Grid container justifyContent="center" alignItems="center" spacing={2}>
                    <Grid item>
                        <IconButton 
                            onClick={handlePrevPage}
                            disabled={currentPage === 0}
                            size="large"
                        >
                            <PrevIcon />
                        </IconButton>
                    </Grid>

                    <Grid item>
                        <Box sx={{ position: 'relative', width, height }}>
                            <AnimatePresence mode="wait">
                                <MotionPaper
                                    key={currentPage}
                                    initial={{ opacity: 0, x: 100 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ duration: 0.3 }}
                                    elevation={3}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        position: 'relative',
                                        backgroundColor: '#fff',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gridTemplateRows: 'repeat(2, 1fr)',
                                        gap: 2,
                                        p: 2
                                    }}
                                >
                                    {pages[currentPage]?.photos.map((photo, index) => (
                                        <Box
                                            key={photo.id}
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                position: 'relative',
                                                gridColumn: photo.position % 2 === 0 ? 1 : 2,
                                                gridRow: photo.position < 2 ? 1 : 2
                                            }}
                                        >
                                            <img
                                                src={photo.preview}
                                                alt={`Photo ${index + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </MotionPaper>
                            </AnimatePresence>
                        </Box>
                    </Grid>

                    <Grid item>
                        <IconButton
                            onClick={handleNextPage}
                            disabled={currentPage === pages.length - 1}
                            size="large"
                        >
                            <NextIcon />
                        </IconButton>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle1">
                        Страница {currentPage + 1} из {pages.length}
                    </Typography>
                </Box>
            </Box>
        </Container>
    );
};

export default PhotoBookPreview;
