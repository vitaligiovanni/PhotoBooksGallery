import {
    Box,
    Card,
    CardContent,
    CardActionArea,
    Typography,
    Grid,
    Container
} from '@mui/material';
import { motion } from 'framer-motion';

const formats = [
    { 
        id: 'square_20',
        name: 'Квадратный',
        size: '20×20 см',
        description: 'Компактный квадратный формат',
        width: 20,
        height: 20
    },
    { 
        id: 'landscape_20_25',
        name: 'Средний альбомный',
        size: '20×25 см',
        description: 'Классический альбомный формат',
        width: 20,
        height: 25
    },
    { 
        id: 'landscape_20_30',
        name: 'Альбомный',
        size: '20×30 см',
        description: 'Расширенный альбомный формат',
        width: 20,
        height: 30
    },
    { 
        id: 'square_25',
        name: 'Большой квадратный',
        size: '25×25 см',
        description: 'Увеличенный квадратный формат',
        width: 25,
        height: 25
    },
    { 
        id: 'square_30',
        name: 'Премиум квадратный',
        size: '30×30 см',
        description: 'Премиальный большой формат',
        width: 30,
        height: 30
    },
    { 
        id: 'landscape_30_40',
        name: 'Премиум альбомный',
        size: '30×40 см',
        description: 'Максимальный альбомный формат',
        width: 30,
        height: 40
    }
];

const MotionCard = motion(Card);

const PhotoBookFormatSelector = ({ onFormatSelect }) => {
    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Typography variant="h4" gutterBottom align="center">
                    Выберите формат фотокниги
                </Typography>
                <Typography variant="subtitle1" gutterBottom align="center" color="text.secondary">
                    От формата зависит размер и внешний вид вашей фотокниги
                </Typography>

                <Grid container spacing={3} sx={{ mt: 2 }}>
                    {formats.map((format) => (
                        <Grid item xs={12} sm={6} md={4} key={format.id}>
                            <MotionCard
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <CardActionArea 
                                    onClick={() => onFormatSelect(format)}
                                    sx={{ height: '100%' }}
                                >
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            {format.name}
                                        </Typography>
                                        <Typography variant="h5" color="primary" gutterBottom>
                                            {format.size}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {format.description}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </MotionCard>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Container>
    );
};

export default PhotoBookFormatSelector;
