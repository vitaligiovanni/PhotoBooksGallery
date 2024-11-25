import React, { useState } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    Paper
} from '@mui/material';

const formats = [
    { 
        id: '20x20', 
        name: '20×20', 
        size: '20×20', 
        isSquare: true,
        description: 'Квадратный формат',
        width: 20,
        height: 20
    },
    { 
        id: '30x40', 
        name: '30×40', 
        size: '30×40', 
        isSquare: false,
        description: 'Прямоугольный формат',
        width: 30,
        height: 40
    },
    { 
        id: '40x30', 
        name: '40×30', 
        size: '40×30', 
        isSquare: false,
        description: 'Прямоугольный формат',
        width: 40,
        height: 30
    },
    { 
        id: '30x30', 
        name: '30×30', 
        size: '30×30', 
        isSquare: true,
        description: 'Квадратный формат',
        width: 30,
        height: 30
    }
];

const FormatPreview = ({ format, selected }) => {
    // Базовый размер для превью
    const baseSize = 150;
    const scale = baseSize / Math.max(format.width, format.height);
    
    const previewWidth = format.width * scale;
    const previewHeight = format.height * scale;

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
        }}>
            <Paper
                elevation={selected ? 3 : 1}
                sx={{
                    width: previewWidth * 2 + 20, // *2 для разворота, +20 для переплета
                    height: previewHeight,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: selected ? 'primary.light' : 'background.paper',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Левая страница */}
                <Box sx={{
                    width: previewWidth,
                    height: previewHeight,
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'grey.300',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'white'
                }}>
                    <Typography variant="caption" color="text.secondary">
                        {format.width}×{format.height}
                    </Typography>
                </Box>
                
                {/* Переплет */}
                <Box sx={{
                    width: 20,
                    height: '100%',
                    bgcolor: selected ? 'primary.main' : 'grey.300'
                }} />
                
                {/* Правая страница */}
                <Box sx={{
                    width: previewWidth,
                    height: previewHeight,
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'grey.300',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'white'
                }}>
                    <Typography variant="caption" color="text.secondary">
                        {format.width}×{format.height}
                    </Typography>
                </Box>
            </Paper>
            
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle1" gutterBottom>
                    {format.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {format.description}
                </Typography>
            </Box>
        </Box>
    );
};

const PhotoBookFormat = ({ onFormatSelect }) => {
    const [selectedFormat, setSelectedFormat] = useState(formats[0]);

    const handleFormatChange = (event) => {
        const format = formats.find(f => f.id === event.target.value);
        setSelectedFormat(format);
        onFormatSelect(format);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
                Выберите формат фотокниги
            </Typography>
            
            <FormControl component="fieldset" sx={{ width: '100%' }}>
                <RadioGroup
                    value={selectedFormat.id}
                    onChange={handleFormatChange}
                >
                    <Grid container spacing={4}>
                        {formats.map((format) => (
                            <Grid item xs={12} sm={6} key={format.id}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 4
                                        },
                                        border: '2px solid',
                                        borderColor: selectedFormat.id === format.id ? 'primary.main' : 'transparent',
                                    }}
                                    onClick={() => handleFormatChange({ target: { value: format.id } })}
                                >
                                    <CardContent sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 2
                                    }}>
                                        <FormatPreview 
                                            format={format} 
                                            selected={selectedFormat.id === format.id}
                                        />
                                        
                                        <FormControlLabel
                                            value={format.id}
                                            control={<Radio />}
                                            label=""
                                            sx={{ m: 0 }}
                                        />
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </RadioGroup>
            </FormControl>
        </Box>
    );
};

export default PhotoBookFormat;
