import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Paper,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    IconButton,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ShoppingCart as OrderIcon,
} from '@mui/icons-material';
import { photobooks } from '../../services/api';

const Dashboard = () => {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);

    useEffect(() => {
        loadPhotoBooks();
    }, []);

    const loadPhotoBooks = async () => {
        try {
            const response = await photobooks.getAll();
            setBooks(response.data);
        } catch (error) {
            console.error('Error loading photobooks:', error);
        }
    };

    const handleDelete = async () => {
        try {
            await photobooks.delete(selectedBook.id);
            setBooks(books.filter(book => book.id !== selectedBook.id));
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error('Error deleting photobook:', error);
        }
    };

    const handleCreateOrder = async (bookId) => {
        try {
            await photobooks.createOrder(bookId);
            loadPhotoBooks(); // Перезагружаем список для обновления статусов
        } catch (error) {
            console.error('Error creating order:', error);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Typography variant="h4" component="h1">
                    Мои фотокниги
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/create')}
                >
                    Создать новую
                </Button>
            </Box>

            <Grid container spacing={3}>
                {books.map((book) => (
                    <Grid item xs={12} sm={6} md={4} key={book.id}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" component="h2">
                                    {book.name}
                                </Typography>
                                <Typography color="textSecondary">
                                    Формат: {book.format.replace('FORMAT_', '').replace('_', '×')} см
                                </Typography>
                                <Typography color="textSecondary">
                                    Страниц: {book.page_count * 2}
                                </Typography>
                                <Typography color="textSecondary">
                                    Статус: {book.status === 'draft' ? 'Черновик' : 'Заказан'}
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <IconButton
                                    onClick={() => navigate(`/editor/${book.id}`)}
                                    disabled={book.status !== 'draft'}
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    onClick={() => {
                                        setSelectedBook(book);
                                        setDeleteDialogOpen(true);
                                    }}
                                    disabled={book.status !== 'draft'}
                                >
                                    <DeleteIcon />
                                </IconButton>
                                {book.status === 'draft' && (
                                    <IconButton
                                        color="primary"
                                        onClick={() => handleCreateOrder(book.id)}
                                    >
                                        <OrderIcon />
                                    </IconButton>
                                )}
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Удаление фотокниги</DialogTitle>
                <DialogContent>
                    <Typography>
                        Вы уверены, что хотите удалить фотокнигу "{selectedBook?.name}"?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Отмена
                    </Button>
                    <Button onClick={handleDelete} color="error">
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Dashboard;
