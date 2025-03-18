import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    Alert,
    useTheme,
    alpha,
    Paper,
    Divider,
    Stack,
    LinearProgress,
    Fade,
    Grow,
    Zoom,
    Avatar,
    Tooltip,
} from '@mui/material';
import {
    People as PeopleIcon,
    QrCode as QrCodeIcon,
    Upload as UploadIcon,
    QrCodeScanner as ScannerIcon,
    TrendingUp as TrendingUpIcon,
    Group as GroupIcon,
    AccessTime as TimeIcon,
    ArrowUpward as ArrowUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
    totalEmployees: number;
    recentScans: number;
    departmentCounts: Record<string, number>;
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalEmployees: 0,
        recentScans: 0,
        departmentCounts: {},
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const theme = useTheme();
    const { user } = useAuth();

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            // Fetch total employees
            const { data: employees, error: employeesError } = await supabase
                .from('employees')
                .select('department');

            if (employeesError) throw employeesError;

            // Calculate department counts
            const departmentCounts = employees?.reduce((acc: Record<string, number>, curr) => {
                acc[curr.department] = (acc[curr.department] || 0) + 1;
                return acc;
            }, {});

            // Fetch recent scans (last 24 hours)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const { count: recentScans, error: scansError } = await supabase
                .from('scans')
                .select('id', { count: 'exact' })
                .gte('created_at', yesterday.toISOString());

            if (scansError) throw scansError;

            setStats({
                totalEmployees: employees?.length || 0,
                recentScans: recentScans || 0,
                departmentCounts: departmentCounts || {},
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, title, value, color, trend, gradient }: any) => (
        <Zoom in={true} style={{ transitionDelay: '100ms' }}>
            <Card sx={{ 
                    height: '100%',
                    background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(color, 0.1)}`,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                    transform: { xs: 'none', sm: 'translateY(-4px)' },
                        boxShadow: `0 8px 24px ${alpha(color, 0.2)}`,
                }
            }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        alignItems={{ xs: 'center', sm: 'flex-start' }} 
                        spacing={{ xs: 1, sm: 2 }}
                    >
                        <Avatar
                            className="stat-icon"
                            sx={{
                                width: { xs: 48, sm: 56 },
                                height: { xs: 48, sm: 56 },
                                bgcolor: alpha(color, 0.2),
                                color: 'white',
                            }}
                        >
                            <Icon sx={{ fontSize: { xs: 24, sm: 32 } }} />
                        </Avatar>
                        <Box sx={{ 
                            flexGrow: 1,
                            textAlign: { xs: 'center', sm: 'left' }
                        }}>
                            <Typography 
                                color="textSecondary" 
                                variant="body2" 
                                gutterBottom
                                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                            >
                                {title}
                            </Typography>
                            <Typography 
                                variant="h4" 
                                sx={{ 
                                    fontWeight: 700,
                                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                                    background: gradient,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                {value}
                            </Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </Zoom>
    );

    const ActionCard = ({ icon: Icon, title, description, onClick, color, delay = 0 }: any) => (
        <Grow in={true} style={{ transformOrigin: '0 0 0', transitionDelay: `${delay}ms` }}>
            <Card 
                sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    p: { xs: 1, sm: 2 },
                    '&:hover': {
                        transform: { xs: 'none', sm: 'translateY(-4px) scale(1.02)' },
                    }
                }}
                onClick={onClick}
            >
                <CardContent>
                    <Stack 
                        spacing={{ xs: 1, sm: 2 }} 
                        alignItems="center" 
                        textAlign="center"
                    >
                        <Avatar
                            sx={{
                                width: { xs: 48, sm: 64 },
                                height: { xs: 48, sm: 64 },
                            }}
                            className="action-icon"
                        >
                            <Icon sx={{ fontSize: { xs: 24, sm: 32 } }} />
                        </Avatar>
                        <Box>
                        <Typography 
                                variant="h6" 
                            gutterBottom 
                            sx={{ 
                                    fontSize: { xs: '1rem', sm: '1.25rem' },
                                    fontWeight: 600 
                                }}
                            >
                                {title}
                                                            </Typography>
                            <Typography 
                                variant="body2" 
                                color="textSecondary"
                                sx={{ 
                                    display: { xs: 'none', sm: 'block' },
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                            >
                                {description}
                            </Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </Grow>
    );

    if (loading) {
        return (
            <Box sx={{ py: 4 }}>
                <Fade in={true}>
                    <Card>
                        <CardContent>
                            <Stack spacing={3}>
                                <LinearProgress 
                                    sx={{ 
                                        height: 8, 
                                        borderRadius: 4,
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 4,
                                        }
                                    }} 
                                />
                                <Typography variant="h6" textAlign="center" color="textSecondary">
                                    Loading dashboard data...
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Fade>
            </Box>
        );
    }

    if (error) {
        return (
            <Fade in={true}>
                <Alert 
                    severity="error" 
                    sx={{ 
                        mt: 4,
                        borderRadius: 2,
                        boxShadow: theme.shadows[2],
                    }}
                >
                    {error}
                </Alert>
            </Fade>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            background: `linear-gradient(135deg, 
                ${alpha('#4158D0', 0.15)} 0%,
                ${alpha('#C850C0', 0.15)} 46.52%,
                ${alpha('#FFCC70', 0.15)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 3, sm: 4 },
        }}>
            <Box sx={{ 
                position: 'relative',
                zIndex: 1,
            }}>
                <Fade in={true}>
                    <Box sx={{ 
                        mb: { xs: 2, sm: 4 },
                        p: { xs: 2, sm: 3 },
                    }}>
                        <Typography 
                            variant="h4" 
                            gutterBottom 
                            sx={{ 
                                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                                fontWeight: 800,
                            }}
                        >
                            Welcome back, {user?.email}
                        </Typography>
                        <Typography 
                            sx={{
                                fontSize: { xs: '0.875rem', sm: '1rem', md: '1.1rem' },
                            }}
                        >
                            Here's what's happening with your employee management system
                        </Typography>
                    </Box>
                </Fade>

                <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 4 } }}>
                    {[
                        {
                            icon: PeopleIcon,
                            title: "Total Employees",
                            value: stats.totalEmployees,
                            color: theme.palette.primary.main,
                            trend: 12,
                            gradient: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        },
                        {
                            icon: TimeIcon,
                            title: "Recent Scans (24h)",
                            value: stats.recentScans,
                            color: theme.palette.success.main,
                            trend: 8,
                            gradient: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                        },
                        {
                            icon: GroupIcon,
                            title: "Departments",
                            value: Object.keys(stats.departmentCounts).length,
                            color: theme.palette.info.main,
                            trend: 5,
                            gradient: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
                        }
                    ].map((stat, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <StatCard
                                icon={stat.icon}
                                title={stat.title}
                                value={stat.value}
                                color={stat.color}
                                trend={stat.trend}
                                gradient={stat.gradient}
                            />
                        </Grid>
                    ))}
                </Grid>

                <Box sx={{ 
                    mb: { xs: 2, sm: 4 },
                    p: { xs: 2, sm: 3 },
                }}>
                    <Typography 
                        variant="h5" 
                        gutterBottom 
                        sx={{ 
                            mb: { xs: 2, sm: 3 },
                            fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        }}
                    >
                        Quick Actions
                    </Typography>
                    <Grid container spacing={{ xs: 2, sm: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <ActionCard
                                icon={PeopleIcon}
                                title="Manage Employees"
                                description="View and manage employee records"
                                onClick={() => navigate('/employees')}
                                color={theme.palette.primary.main}
                                delay={100}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <ActionCard
                                icon={QrCodeIcon}
                                title="Add Employee"
                                description="Create a new employee record"
                                onClick={() => navigate('/employees/new')}
                                color={theme.palette.secondary.main}
                                delay={200}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <ActionCard
                                icon={UploadIcon}
                                title="Bulk Generate"
                                description="Import multiple employees via CSV"
                                onClick={() => navigate('/bulk-generate')}
                                color={theme.palette.warning.main}
                                delay={300}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <ActionCard
                                icon={ScannerIcon}
                                title="Scan QR Code"
                                description="Verify employee QR codes"
                                onClick={() => navigate('/scanner')}
                                color={theme.palette.success.main}
                                delay={400}
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Fade in={true}>
                    <Paper sx={{ 
                        p: { xs: 2, sm: 3, md: 4 },
                        '& .MuiTypography-root': {
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                        }
                    }}>
                        <Typography 
                            variant="h5" 
                            gutterBottom 
                            sx={{ 
                                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                            }}
                        >
                            Department Distribution
                        </Typography>
                        <Divider sx={{ my: { xs: 1, sm: 2 } }} />
                        <Grid container spacing={{ xs: 1, sm: 2 }}>
                            {Object.entries(stats.departmentCounts).map(([department, count], index) => {
                                const percentage = (count / stats.totalEmployees) * 100;
                                return (
                                    <Grid item xs={12} sm={6} md={4} key={department}>
                                        <Grow in={true} style={{ transformOrigin: '0 0 0', transitionDelay: `${index * 100}ms` }}>
                                            <Card sx={{ 
                                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
                                                transition: 'transform 0.3s ease-in-out',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                }
                                            }}>
                                                <CardContent>
                                                    <Stack spacing={1}>
                                                        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                                                            {department}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ flexGrow: 1 }}>
                                                                <Tooltip title={`${percentage.toFixed(1)}%`} placement="top">
                                                                    <LinearProgress
                                                                        variant="determinate"
                                                                        value={percentage}
                                                                        sx={{
                                                                            height: 8,
                                                                            borderRadius: 4,
                                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                                            '& .MuiLinearProgress-bar': {
                                                                                borderRadius: 4,
                                                                                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                                                            }
                                                                        }}
                                                                    />
                                                                </Tooltip>
                                                            </Box>
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    color: theme.palette.primary.main,
                                                                    fontWeight: 600,
                                                                    minWidth: 40,
                                                                    textAlign: 'right',
                                                                }}
                                                            >
                                                                {count}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        </Grow>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Paper>
                </Fade>
            </Box>
        </Box>
    );
};

export default Dashboard; 