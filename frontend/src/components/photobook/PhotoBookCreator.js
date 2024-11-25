import { useState } from 'react';
import {
    Box,
    Stepper,
    Step,
    StepLabel,
    Button,
    Paper,
} from '@mui/material';
import PhotoBookFormatSelector from './PhotoBookFormatSelector';
import PhotoUploader from './PhotoUploader';
import PhotoBookPages from './PhotoBookPages';
import PhotoBookPreview from './PhotoBookPreview';

const steps = [
    'Выберите формат',
    'Загрузите фотографии',
    'Создайте страницы',
    'Предпросмотр'
];

const PhotoBookCreator = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [selectedFormat, setSelectedFormat] = useState(null);
    const [uploadedPhotos, setUploadedPhotos] = useState([]);
    const [pages, setPages] = useState([
        {
            spreadId: 0,
            leftPage: { photos: [] },
            rightPage: { photos: [] }
        }
    ]);

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleFormatSelect = (format) => {
        setSelectedFormat({
            ...format,
            dimensions: {
                width: format.width * 2, // Умножаем ширину на 2 для разворота
                height: format.height
            }
        });
        setActiveStep(1);
    };

    const handlePhotosUpload = (photos) => {
        setUploadedPhotos(photos);
    };

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <PhotoBookFormatSelector
                        onFormatSelect={handleFormatSelect}
                        selectedFormat={selectedFormat}
                    />
                );
            case 1:
                return (
                    <PhotoUploader
                        onPhotosChange={handlePhotosUpload}
                        photos={uploadedPhotos}
                    />
                );
            case 2:
                return (
                    <PhotoBookPages
                        format={selectedFormat}
                        availablePhotos={uploadedPhotos.map(photo => ({
                            id: photo.id,
                            url: photo.preview || photo.url,
                            file: photo.file
                        }))}
                        pages={pages}
                        onPagesChange={setPages}
                        onPhotosAdd={(files) => {
                            const newPhotos = files.map((file, index) => ({
                                id: Date.now() + index,
                                file,
                                preview: URL.createObjectURL(file)
                            }));
                            setUploadedPhotos(prev => [...prev, ...newPhotos]);
                        }}
                    />
                );
            case 3:
                return (
                    <PhotoBookPreview
                        format={selectedFormat}
                        pages={pages}
                    />
                );
            default:
                return 'Неизвестный шаг';
        }
    };

    const isStepValid = (step) => {
        switch (step) {
            case 0:
                return !!selectedFormat;
            case 1:
                return uploadedPhotos.length > 0;
            case 2:
                return pages.some(page => page.leftPage.photos.length > 0 || page.rightPage.photos.length > 0);
            case 3:
                return true;
            default:
                return false;
        }
    };

    return (
        <Box sx={{ 
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default'
        }}>
            {/* Верхняя панель со степпером */}
            <Paper 
                elevation={2}
                sx={{
                    p: 2,
                    borderRadius: 0,
                    zIndex: 1,
                }}
            >
                <Stepper activeStep={activeStep}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Paper>

            {/* Основной контент */}
            <Box sx={{ 
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <Box sx={{ 
                    flex: 1,
                    overflow: 'auto',
                    p: 2
                }}>
                    {getStepContent(activeStep)}
                </Box>

                {/* Нижняя панель с кнопками навигации */}
                <Paper 
                    elevation={3}
                    sx={{
                        p: 2,
                        borderRadius: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        zIndex: 1,
                    }}
                >
                    <Button
                        variant="outlined"
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        sx={{ mr: 1 }}
                    >
                        Назад
                    </Button>
                    <Button
                        variant="contained"
                        disabled={!isStepValid(activeStep)}
                        onClick={handleNext}
                    >
                        {activeStep === steps.length - 1 ? 'Завершить' : 'Далее'}
                    </Button>
                </Paper>
            </Box>
        </Box>
    );
};

export default PhotoBookCreator;
