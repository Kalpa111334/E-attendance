import React from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    useTheme,
    alpha,
    Stack,
    Paper,
    Avatar,
    Fade,
    Grow,
} from '@mui/material';
import {
    QrCode as QrIcon,
    Assessment as ReportIcon,
    People as PeopleIcon,
    Security as SecurityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    const features = [
        {
            icon: <QrIcon sx={{ fontSize: 40 }} />,
            title: 'QR Code Scanning',
            description: 'Quick and secure attendance tracking with QR code technology'
        },
        {
            icon: <ReportIcon sx={{ fontSize: 40 }} />,
            title: 'Attendance Reports',
            description: 'Generate detailed reports with customizable time periods'
        },
        {
            icon: <PeopleIcon sx={{ fontSize: 40 }} />,
            title: 'Employee Management',
            description: 'Efficiently manage employee data and departments'
        },
        {
            icon: <SecurityIcon sx={{ fontSize: 40 }} />,
            title: 'Secure System',
            description: 'Advanced security measures to protect attendance data'
        }
    ];

    const stats = [
        { label: 'Active Employees', value: '500+' },
        { label: 'Departments', value: '14' },
        { label: 'Daily Scans', value: '1000+' },
        { label: 'Success Rate', value: '99.9%' }
    ];

    return (
        <Box sx={{
            background: alpha(theme.palette.background.default, 0.8),
            position: 'relative',
            '&::before': {
                content: '""',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%)`,
                animation: 'pulse 15s ease-in-out infinite',
                zIndex: 0,
            },
        }}>
            {/* Enhanced Hero Section */}
            <Box sx={{
                background: `linear-gradient(135deg, 
                    ${theme.palette.primary.main} 0%, 
                    ${theme.palette.secondary.main} 100%)`,
                color: 'white',
                pt: { xs: 4, sm: 6, md: 12 },
                pb: { xs: 16, sm: 20, md: 24 },
                position: 'relative',
                overflow: 'hidden',
                minHeight: { xs: 'auto', md: '85vh' },
                display: 'flex',
                alignItems: 'center',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'url(/pattern.svg)',
                    opacity: 0.1,
                    animation: 'float 30s linear infinite',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200%',
                    height: '200%',
                    background: `radial-gradient(circle at center, 
                        ${alpha(theme.palette.common.white, 0.1)} 0%,
                        transparent 50%)`,
                    animation: 'pulse 10s ease-in-out infinite',
                },
                '@keyframes float': {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '100% 100%' },
                },
                '@keyframes pulse': {
                    '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
                    '50%': { transform: 'translate(-50%, -50%) scale(1.2)' },
                },
            }}>
                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                    <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
                        <Fade in timeout={1000}>
                            <Grid item xs={12} md={6}>
                                <Box sx={{
                                    textAlign: { xs: 'center', md: 'left' },
                                    position: 'relative',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: -20,
                                        left: -20,
                                        right: -20,
                                        bottom: -20,
                                        background: `radial-gradient(circle at center, 
                                            ${alpha(theme.palette.common.white, 0.1)} 0%,
                                            transparent 70%)`,
                                        zIndex: -1,
                                    },
                                }}>
                                    <Typography 
                                        variant="h2" 
                                        sx={{
                                            fontWeight: 800,
                                            mb: { xs: 1, sm: 2 },
                                            fontSize: {
                                                xs: '2.5rem',
                                                sm: '3rem',
                                                md: '4rem'
                                            },
                                            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                            position: 'relative',
                                            display: 'inline-block',
                                            '&::after': {
                                                content: '""',
                                                position: 'absolute',
                                                bottom: -10,
                                                left: 0,
                                                width: '60%',
                                                height: 4,
                                                background: theme.palette.secondary.main,
                                                borderRadius: 2,
                                                transform: 'scaleX(0)',
                                                animation: 'slideIn 1s ease-out forwards',
                                                animationDelay: '0.5s',
                                            },
                                            '@keyframes slideIn': {
                                                to: { transform: 'scaleX(1)' },
                                            },
                                        }}
                                    >
                                        Digital ID
                                    </Typography>
                                    <Typography 
                                        variant="h5" 
                                        sx={{
                                            mb: { xs: 4, md: 6 },
                                            opacity: 0.9,
                                            fontWeight: 300,
                                            fontSize: {
                                                xs: '1.2rem',
                                                sm: '1.5rem',
                                                md: '2rem'
                                            },
                                            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                            background: `linear-gradient(45deg, 
                                                ${theme.palette.common.white}, 
                                                ${alpha(theme.palette.common.white, 0.8)})`,
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        }}
                                    >
                                        Modern Attendance Management System
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={() => navigate('/login')}
                                        sx={{
                                            px: { xs: 4, sm: 6 },
                                            py: { xs: 1.5, sm: 2 },
                                            fontSize: { xs: '1.1rem', sm: '1.25rem' },
                                            borderRadius: 3,
                                            background: theme.palette.common.white,
                                            color: theme.palette.primary.main,
                                            boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.2)}`,
                                            transition: 'all 0.3s ease-in-out',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.3)}`,
                                                background: theme.palette.common.white,
                                            },
                                            '&:active': {
                                                transform: 'translateY(-2px)',
                                            },
                                        }}
                                    >
                                        Get Started
                                    </Button>
                                </Box>
                            </Grid>
                        </Fade>
                        <Grid item xs={12} md={6}>
                            <Grow in timeout={1500}>
                                <Box sx={{
                                    position: 'relative',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '120%',
                                        height: '120%',
                                        background: `radial-gradient(circle at center, 
                                            ${alpha(theme.palette.common.white, 0.1)} 0%,
                                            transparent 70%)`,
                                        animation: 'pulse 3s ease-in-out infinite',
                                        borderRadius: '50%',
                                    },
                                }}>
                                    <Box
                                        component="img"
                                        src="/hero-image.svg"
                                        alt="Hero"
                                        sx={{
                                            width: '100%',
                                            maxWidth: { xs: 400, md: 600 },
                                            height: 'auto',
                                            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.2))',
                                            animation: 'float 6s ease-in-out infinite',
                                            '@keyframes float': {
                                                '0%, 100%': {
                                                    transform: 'translateY(0) rotate(0deg)',
                                                },
                                                '50%': {
                                                    transform: 'translateY(-20px) rotate(2deg)',
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                            </Grow>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Enhanced Stats Section */}
            <Container maxWidth="lg" sx={{ 
                mt: { xs: -10, sm: -12, md: -16 },
                px: { xs: 2, sm: 4 },
                position: 'relative',
                zIndex: 3,
            }}>
                <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                    {stats.map((stat, index) => (
                        <Grow in timeout={1000 + index * 200} key={index}>
                            <Grid item xs={6} sm={6} md={3}>
                                <Paper sx={{
                                    p: { xs: 2, sm: 3, md: 4 },
                                    textAlign: 'center',
                                    background: alpha(theme.palette.background.paper, 0.9),
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 3,
                                    boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                    transition: 'all 0.3s ease-in-out',
                                    '&:hover': {
                                        transform: { xs: 'none', sm: 'translateY(-8px)' },
                                        boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.2)}`,
                                    },
                                }}>
                                    <Typography 
                                        variant="h4" 
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: {
                                                xs: '1.5rem',
                                                sm: '2rem',
                                                md: '2.5rem'
                                            },
                                            background: `linear-gradient(45deg, 
                                                ${theme.palette.primary.main}, 
                                                ${theme.palette.secondary.main})`,
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            mb: { xs: 1, sm: 2 },
                                        }}
                                    >
                                        {stat.value}
                                    </Typography>
                                    <Typography 
                                        sx={{
                                            color: theme.palette.text.secondary,
                                            fontSize: {
                                                xs: '0.75rem',
                                                sm: '0.875rem',
                                                md: '1rem'
                                            },
                                            fontWeight: 500,
                                        }}
                                    >
                                        {stat.label}
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grow>
                    ))}
                </Grid>
            </Container>

            {/* Features Section - Enhanced Responsiveness */}
            <Container maxWidth="lg" sx={{ 
                py: { xs: 4, sm: 6, md: 8 },
                px: { xs: 2, sm: 3, md: 4 }
            }}>
                <Fade in timeout={1000}>
                    <Typography variant="h3" align="center" sx={{
                        mb: { xs: 3, sm: 4, md: 6 },
                        fontWeight: 800,
                        fontSize: {
                            xs: '1.75rem',
                            sm: '2.25rem',
                            md: '3rem'
                        },
                    }}>
                        Key Features
                    </Typography>
                </Fade>
                <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                    {features.map((feature, index) => (
                        <Grow in timeout={1000 + index * 200} key={index}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{
                                    height: '100%',
                                    '&:hover': {
                                        transform: { xs: 'none', sm: 'translateY(-8px)' },
                                    },
                                }}>
                                    <CardContent sx={{ 
                                        p: { xs: 2, sm: 3 },
                                        textAlign: { xs: 'center', sm: 'left' }
                                    }}>
                                        <Avatar sx={{
                                            width: { xs: 48, sm: 56, md: 64 },
                                            height: { xs: 48, sm: 56, md: 64 },
                                            mx: { xs: 'auto', sm: 0 },
                                            '& .MuiSvgIcon-root': {
                                                fontSize: { xs: 28, sm: 32, md: 40 }
                                            }
                                        }}>
                                            {feature.icon}
                                        </Avatar>
                                        <Typography variant="h6" gutterBottom sx={{
                                            mt: 2,
                                            fontSize: {
                                                xs: '1rem',
                                                sm: '1.25rem'
                                            },
                                        }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography 
                                            color="text.secondary"
                                            sx={{
                                                fontSize: {
                                                    xs: '0.875rem',
                                                    sm: '1rem'
                                                },
                                            }}
                                        >
                                            {feature.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grow>
                    ))}
                </Grid>
            </Container>

            {/* CTA Section - Enhanced Responsiveness */}
            <Box sx={{
                py: { xs: 4, sm: 6, md: 8 },
                px: { xs: 2, sm: 3 },
            }}>
                <Container maxWidth="md">
                    <Fade in timeout={1000}>
                        <Stack spacing={{ xs: 2, sm: 3 }} alignItems="center" textAlign="center">
                            <Typography variant="h4" sx={{
                                fontWeight: 700,
                                fontSize: {
                                    xs: '1.5rem',
                                    sm: '2rem',
                                    md: '2.5rem'
                                },
                            }}>
                                Ready to Get Started?
                            </Typography>
                            <Typography 
                                color="text.secondary"
                                sx={{
                                    maxWidth: 600,
                                    fontSize: {
                                        xs: '0.875rem',
                                        sm: '1rem'
                                    },
                                    px: { xs: 2, sm: 0 }
                                }}
                            >
                                Join hundreds of organizations that trust our system for their attendance management needs.
                            </Typography>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => navigate('/login')}
                                sx={{
                                    px: { xs: 3, sm: 4 },
                                    py: { xs: 1, sm: 1.5 },
                                    fontSize: { xs: '1rem', sm: '1.1rem' },
                                    mt: { xs: 2, sm: 3 }
                                }}
                            >
                                Start Now
                            </Button>
                        </Stack>
                    </Fade>
                </Container>
            </Box>
        </Box>
    );
};

export default LandingPage; 