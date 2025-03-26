import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Grid,
    Chip,
    useTheme,
    alpha,
    Stack,
    Paper,
    Divider,
    Tooltip,
    IconButton,
    Fade,
    Zoom,
    Grow,
    Avatar,
    Snackbar,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { supabase } from '../config/supabase';
import type { Employee } from '../types/employee';
import QRCode from 'qrcode.react';
import {
    Download as DownloadIcon,
    Share as ShareIcon,
    Print as PrintIcon,
    Email as EmailIcon,
    Badge as BadgeIcon,
    QrCode2 as QrCodeIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';

const QRCodeView: React.FC = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        if (employeeId) {
            fetchEmployee();
        }
    }, [employeeId]);

    const fetchEmployee = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select(`
                    *,
                    department:departments(id, name)
                `)
                .eq('employee_id', employeeId)
                .single();

            if (error) throw error;
            setEmployee(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!employee) return;

        const canvas = document.getElementById('employee-qr-code') as HTMLCanvasElement;
        if (!canvas) return;

        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-${employee.employee_id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowSuccess(true);
    };

    const handleShare = async () => {
        if (!employee) return;
        
        const canvas = document.getElementById('employee-qr-code') as HTMLCanvasElement;
        if (!canvas) return;

        try {
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                });
            });

            const file = new File([blob], `qr-${employee.employee_id}.png`, { type: 'image/png' });
            
            if (navigator.share) {
                await navigator.share({
                    title: `QR Code - ${employee.first_name} ${employee.last_name}`,
                    text: `Employee QR Code for ${employee.first_name} ${employee.last_name}`,
                    files: [file],
                });
                setShowSuccess(true);
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const handlePrint = () => {
        window.print();
        setShowSuccess(true);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Stack spacing={2} alignItems="center">
                    <CircularProgress 
                        size={60}
                        sx={{
                            color: theme.palette.primary.main,
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                    />
                    <Typography color="textSecondary">
                        Loading employee details...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    if (error || !employee) {
        return (
            <Box sx={{ mt: 4, mx: 2 }}>
                <Zoom in={true}>
                    <Alert 
                        severity="error"
                        action={
                            <Button 
                                color="error" 
                                size="small" 
                                onClick={() => window.history.back()}
                                sx={{
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                    },
                                    transition: 'transform 0.2s',
                                }}
                            >
                                Go Back
                            </Button>
                        }
                        sx={{
                            borderRadius: 2,
                            boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`,
                        }}
                    >
                        {error || 'Employee not found'}
                    </Alert>
                </Zoom>
            </Box>
        );
    }

    return (
        <Box sx={{ py: 4 }}>
            <Fade in={true}>
                <Card
                    sx={{
                        position: 'relative',
                        overflow: 'visible',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: -10,
                            left: -10,
                            right: -10,
                            bottom: -10,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                            borderRadius: '20px',
                            zIndex: -1,
                            animation: 'pulse 2s infinite',
                        },
                        '@keyframes pulse': {
                            '0%': {
                                transform: 'scale(1)',
                                opacity: 0.8,
                            },
                            '50%': {
                                transform: 'scale(1.02)',
                                opacity: 0.6,
                            },
                            '100%': {
                                transform: 'scale(1)',
                                opacity: 0.8,
                            },
                        },
                    }}
                >
                    <CardContent>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <Stack spacing={3} alignItems="center">
                                    <Zoom in={true}>
                                        <Paper
                                            elevation={3}
                                            sx={{
                                                p: 3,
                                                borderRadius: 2,
                                                bgcolor: '#fff',
                                                width: 'fit-content',
                                                position: 'relative',
                                                '&::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: -2,
                                                    left: -2,
                                                    right: -2,
                                                    bottom: -2,
                                                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                                    borderRadius: 'inherit',
                                                    zIndex: -1,
                                                },
                                            }}
                                        >
                                            <QRCode
                                                id="employee-qr-code"
                                                value={employee.employee_id}
                                                size={300}
                                                level="H"
                                                includeMargin
                                            />
                                        </Paper>
                                    </Zoom>

                                    <Stack direction="row" spacing={1}>
                                        <Tooltip title="Download QR Code">
                                            <IconButton
                                                onClick={handleDownload}
                                                sx={{
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                                                        transform: 'translateY(-2px)',
                                                    },
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <DownloadIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Share QR Code">
                                            <IconButton
                                                onClick={handleShare}
                                                sx={{
                                                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.secondary.main, 0.2),
                                                        transform: 'translateY(-2px)',
                                                    },
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <ShareIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Print QR Code">
                                            <IconButton
                                                onClick={handlePrint}
                                                sx={{
                                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.success.main, 0.2),
                                                        transform: 'translateY(-2px)',
                                                    },
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <PrintIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Stack spacing={3}>
                                    <Fade in={true}>
                                        <Box>
                                            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                                <Avatar
                                                    sx={{
                                                        width: 64,
                                                        height: 64,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        color: theme.palette.primary.main,
                                                    }}
                                                >
                                                    <QrCodeIcon sx={{ fontSize: 36 }} />
                                                </Avatar>
                                                <Box>
                                                    <Typography 
                                                        variant="h4"
                                                        sx={{
                                                            fontWeight: 600,
                                                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                                            WebkitBackgroundClip: 'text',
                                                            WebkitTextFillColor: 'transparent',
                                                        }}
                                                    >
                                                        {employee.first_name} {employee.last_name}
                                                    </Typography>
                                                    <Typography color="textSecondary">
                                                        Employee ID: {employee.employee_id}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                    </Fade>

                                    <Divider />

                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Grow in={true} style={{ transformOrigin: '0 0 0' }}>
                                                <Paper 
                                                    sx={{ 
                                                        p: 2, 
                                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                                        transition: 'transform 0.2s',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                        },
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={2}>
                                                        <Avatar
                                                            sx={{
                                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                                color: theme.palette.primary.main,
                                                            }}
                                                        >
                                                            <BadgeIcon />
                                                        </Avatar>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="body2" color="textSecondary">
                                                                Department
                                                            </Typography>
                                                            <Chip
                                                                label={employee.department?.name || 'N/A'}
                                                                sx={{
                                                                    mt: 0.5,
                                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                                    color: theme.palette.primary.main,
                                                                    fontWeight: 500,
                                                                }}
                                                            />
                                                        </Box>
                                                    </Stack>
                                                </Paper>
                                            </Grow>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Grow in={true} style={{ transformOrigin: '0 0 0', transitionDelay: '100ms' }}>
                                                <Paper 
                                                    sx={{ 
                                                        p: 2, 
                                                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                                                        transition: 'transform 0.2s',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                        },
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={2}>
                                                        <Avatar
                                                            sx={{
                                                                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                                                color: theme.palette.secondary.main,
                                                            }}
                                                        >
                                                            <BadgeIcon />
                                                        </Avatar>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="body2" color="textSecondary">
                                                                Position
                                                            </Typography>
                                                            <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 500 }}>
                                                                {employee.position}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </Paper>
                                            </Grow>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Grow in={true} style={{ transformOrigin: '0 0 0', transitionDelay: '200ms' }}>
                                                <Paper 
                                                    sx={{ 
                                                        p: 2, 
                                                        bgcolor: alpha(theme.palette.info.main, 0.05),
                                                        transition: 'transform 0.2s',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                        },
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={2}>
                                                        <Avatar
                                                            sx={{
                                                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                                                color: theme.palette.info.main,
                                                            }}
                                                        >
                                                            <EmailIcon />
                                                        </Avatar>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="body2" color="textSecondary">
                                                                Email
                                                            </Typography>
                                                            <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 500 }}>
                                                                {employee.email}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </Paper>
                                            </Grow>
                                        </Grid>
                                    </Grid>
                                </Stack>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Fade>

            <Snackbar
                open={showSuccess}
                autoHideDuration={3000}
                onClose={() => setShowSuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    severity="success"
                    icon={<CheckIcon />}
                    sx={{ 
                        borderRadius: 2,
                        boxShadow: theme.shadows[3],
                    }}
                >
                    Action completed successfully
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default QRCodeView; 