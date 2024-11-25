import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    Button,
    IconButton,
    Container,
} from '@mui/material';
import {
    Menu as MenuIcon,
    ExitToApp as LogoutIcon,
} from '@mui/icons-material';

const Layout = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ flexGrow: 1, cursor: 'pointer' }}
                        onClick={() => navigate('/dashboard')}
                    >
                        PhotoBooks Gallery
                    </Typography>
                    <Button 
                        color="inherit"
                        startIcon={<LogoutIcon />}
                        onClick={handleLogout}
                    >
                        Выйти
                    </Button>
                </Toolbar>
            </AppBar>
            <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
                <Outlet />
            </Box>
            <Box 
                component="footer" 
                sx={{ 
                    py: 3, 
                    px: 2, 
                    mt: 'auto',
                    backgroundColor: (theme) =>
                        theme.palette.mode === 'light'
                            ? theme.palette.grey[200]
                            : theme.palette.grey[800],
                }}
            >
                <Container maxWidth="sm">
                    <Typography variant="body2" color="text.secondary" align="center">
                        © {new Date().getFullYear()} PhotoBooks Gallery. Все права защищены.
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
};

export default Layout;
