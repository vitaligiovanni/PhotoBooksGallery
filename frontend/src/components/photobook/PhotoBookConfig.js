import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Grid,
} from '@mui/material';
import { photobooks } from '../../services/api';

const formats = [
    { value: 'FORMAT_15x20', label: '15×20 см (стандартный)' },
    { value: 'FORMAT_20x20', label: '20×20 см (квадратный)' },
    { value: 'FORMAT_20x25', label: '20×25 см (средний альбомный)' },
    { value: 'FORMAT_20x30', label: '20×30 см (альбомный)' },
    { value: 'FORMAT_25x25', label: '25×25 см (большой квадратный)' },
    { value: 'FORMAT_30x30', label: '30×30 см (премиум квадратный)' },
    { value: 'FORMAT_30x40', label: '30×40 см (премиум альбомный)' },
];

const PhotoBookConfig = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        format: '',
        page_count: 10,
        paper_type: 'MATTE',
        cover_type: 'HARDCOVER',
        has_embossing: false,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await photobooks.create(formData);
            navigate(`/editor/${response.data.id}`);
        } catch (error) {
            console.error('Error creating photobook:', error);
        }
    };

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Создание новой фотокниги
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Название фотокниги"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Формат</InputLabel>
                                <Select
                                    name="format"
                                    value={formData.format}
                                    onChange={handleChange}
                                    label="Формат"
                                >
                                    {formats.map((format) => (
                                        <MenuItem key={format.value} value={format.value}>
                                            {format.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Количество разворотов"
                                name="page_count"
                                value={formData.page_count}
                                onChange={handleChange}
                                inputProps={{ min: 10, max: 100 }}
                                required
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            type="button"
                            variant="outlined"
                            sx={{ mr: 2 }}
                            onClick={() => navigate('/dashboard')}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                        >
                            Создать и перейти к редактированию
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default PhotoBookConfig;
