import React, { useState, useEffect } from 'react';
import 'sweetalert2/dist/sweetalert2.min.css';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    Chip,
    Grid,
    useTheme,
    alpha,
    Stack,
    IconButton,
    Slide,
    Paper,
    Divider,
    Fade,
    Zoom,
    Avatar,
    Tooltip,
} from '@mui/material';
import { QrReader } from 'react-qr-reader';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Employee } from '../types/employee';
import {
    Close as CloseIcon,
    CheckCircle as SuccessIcon,
    CameraAlt as CameraIcon,
    RestartAlt as RestartIcon,
    QrCode2 as QrCodeIcon,
    Badge as BadgeIcon,
    Work as WorkIcon,
    Email as EmailIcon,
} from '@mui/icons-material';
import Swal from 'sweetalert2';

const QRCodeScanner: React.FC = () => {
    const [scanning, setScanning] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scannedEmployee, setScannedEmployee] = useState<Employee | null>(null);
    const [showResult, setShowResult] = useState(false);
    const { user } = useAuth();
    const theme = useTheme();

    // Add lastScannedCode to prevent duplicate scans
    const lastScannedCode = React.useRef<string | null>(null);
    const isProcessing = React.useRef(false);

    const showSuccessAlert = async (employee: Employee) => {
        setScanning(false); // Pause scanning
        const result = await Swal.fire({
            icon: 'success',
            title: 'Employee Verified!',
            html: `
                <div style="margin-top: 1rem;">
                    <h3>${employee.first_name} ${employee.last_name}</h3>
                    <p>Employee ID: ${employee.employee_id}</p>
                    <p>Department: ${employee.department}</p>
                    <p>Position: ${employee.position}</p>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Scan Another',
            confirmButtonColor: theme.palette.primary.main,
            allowOutsideClick: false,
            customClass: {
                popup: 'animated fadeInDown'
            }
        });

        if (result.isConfirmed) {
            handleReset();
        }
    };

    const showErrorAlert = (message: string) => {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: message,
            confirmButtonColor: theme.palette.error.main,
            showConfirmButton: true,
            confirmButtonText: 'Try Again',
            customClass: {
                popup: 'animated fadeInDown'
            }
        });
    };

    const handleScan = async (result: string | null) => {
        if (!result || loading || isProcessing.current) return;
        if (lastScannedCode.current === result) return; // Prevent duplicate scans

        try {
            lastScannedCode.current = result;
            isProcessing.current = true;
            setLoading(true);
            setError(null);

            // Show loading alert
            Swal.fire({
                title: 'Processing...',
                html: 'Verifying employee details',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Fetch employee details
            const { data: employees, error: employeeError } = await supabase
                .from('employees')
                .select('*')
                .eq('employee_id', result)
                .limit(1);

            if (employeeError) throw employeeError;

            if (!employees || employees.length === 0) {
                throw new Error('Invalid QR code. Employee not found.');
            }

            const employee = employees[0];

            // Record the scan
            const { error: scanError } = await supabase
                .from('scans')
                .insert([{
                    employee_id: result,
                    scanned_by: user?.id,
                }]);

            if (scanError) throw scanError;

            // Close loading alert and show success
            Swal.close();
            await showSuccessAlert(employee);
            setScannedEmployee(employee);

        } catch (err: any) {
            Swal.close();
            showErrorAlert(err.message);
            setError(err.message);
        } finally {
            setLoading(false);
            // Reset processing flag after delay
            setTimeout(() => {
                isProcessing.current = false;
            }, 1000);
        }
    };

    const handleError = (err: Error) => {
        showErrorAlert('Failed to access camera: ' + err.message);
        setError('Failed to access camera: ' + err.message);
    };

    const handleReset = () => {
        setScanning(true);
        setError(null);
        setScannedEmployee(null);
        setShowResult(false);
        isProcessing.current = false;
        lastScannedCode.current = null; // Reset last scanned code
    };

    // Add some custom styles
    useEffect(() => {
        // Add custom styles for animations
        const style = document.createElement('style');
        style.innerHTML = `
            .animated {
                animation-duration: 0.3s;
                animation-fill-mode: both;
            }
            
            @keyframes fadeInDown {
                from {
                    opacity: 0;
                    transform: translate3d(0, -20px, 0);
                }
                to {
                    opacity: 1;
                    transform: translate3d(0, 0, 0);
                }
            }
            
            .fadeInDown {
                animation-name: fadeInDown;
            }
            
            .swal2-popup {
                border-radius: 15px !important;
                padding: 2rem !important;
            }
            
            .swal2-title {
                color: ${theme.palette.text.primary} !important;
            }
            
            .swal2-html-container {
                color: ${theme.palette.text.secondary} !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, [theme]);

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
                        <Stack spacing={3}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Avatar
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        mx: 'auto',
                                        mb: 2,
                                    }}
                                >
                                    <QrCodeIcon sx={{ fontSize: 36 }} />
                                </Avatar>
                                <Typography 
                                    variant="h5" 
                                    gutterBottom
                                    sx={{
                                        fontWeight: 600,
                                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    QR Code Scanner
                                </Typography>
                                <Typography color="textSecondary">
                                    Position the QR code within the frame to scan
                                </Typography>
                            </Box>

                            {error && (
                                <Zoom in={true}>
                                    <Alert 
                                        severity="error"
                                        sx={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            borderRadius: 2,
                                            boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`,
                                        }}
                                        action={
                                            <Button 
                                                color="error" 
                                                size="small" 
                                                onClick={handleReset}
                                                sx={{
                                                    '&:hover': {
                                                        transform: 'translateY(-1px)',
                                                    },
                                                    transition: 'transform 0.2s',
                                                }}
                                            >
                                                Try Again
                                            </Button>
                                        }
                                    >
                                        {error}
                                    </Alert>
                                </Zoom>
                            )}

                            {loading && (
                                <Fade in={true}>
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                                        <Stack spacing={2} alignItems="center">
                                            <CircularProgress 
                                                size={60}
                                                sx={{
                                                    color: theme.palette.primary.main,
                                                    animation: 'pulse 1.5s ease-in-out infinite',
                                                }}
                                            />
                                            <Typography variant="body2" color="textSecondary">
                                                Processing QR Code...
                                            </Typography>
                                        </Stack>
                                    </Box>
                                </Fade>
                            )}

                            {scanning && !loading && (
                                <Zoom in={true}>
                                    <Box
                                        sx={{
                                            maxWidth: 500,
                                            mx: 'auto',
                                            position: 'relative',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                border: `2px solid ${theme.palette.primary.main}`,
                                                borderRadius: 2,
                                                animation: 'scanning 2s infinite',
                                            },
                                            '@keyframes scanning': {
                                                '0%': {
                                                    borderColor: theme.palette.primary.main,
                                                    transform: 'scale(1)',
                                                },
                                                '50%': {
                                                    borderColor: theme.palette.secondary.main,
                                                    transform: 'scale(1.02)',
                                                },
                                                '100%': {
                                                    borderColor: theme.palette.primary.main,
                                                    transform: 'scale(1)',
                                                },
                                            },
                                        }}
                                    >
                                        <QrReader
                                            constraints={{ 
                                                facingMode: "environment"
                                            }}
                                            onResult={(result, error) => {
                                                if (error) {
                                                    if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
                                                        handleError(new Error('Please grant camera permission or check if your device has a camera'));
                                                    }
                                                    return;
                                                }
                                                if (result) {
                                                    handleScan(result.getText());
                                                }
                                            }}
                                            containerStyle={{ width: '100%' }}
                                            videoStyle={{ 
                                                width: '100%', 
                                                borderRadius: '8px',
                                                filter: 'contrast(1.1) brightness(1.1)',
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: '200px',
                                                height: '200px',
                                                border: `2px solid ${theme.palette.success.main}`,
                                                borderRadius: '8px',
                                                pointerEvents: 'none',
                                                '&::after': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: '2px',
                                                    background: theme.palette.success.main,
                                                    animation: 'scan 2s linear infinite',
                                                },
                                                '@keyframes scan': {
                                                    '0%': {
                                                        transform: 'translateY(0)',
                                                    },
                                                    '50%': {
                                                        transform: 'translateY(200px)',
                                                    },
                                                    '100%': {
                                                        transform: 'translateY(0)',
                                                    },
                                                },
                                            }}
                                        />
                                    </Box>
                                </Zoom>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            </Fade>

            <Dialog
                open={showResult}
                onClose={handleReset}
                maxWidth="sm"
                fullWidth
                TransitionComponent={Slide}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(theme.palette.background.paper, 0.95)})`,
                        backdropFilter: 'blur(10px)',
                    }
                }}
            >
                <DialogTitle 
                    sx={{ 
                        p: 3, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.success.main, 0.05)})`,
                    }}
                >
                    <SuccessIcon color="success" />
                    <Typography 
                        variant="h6" 
                        component="span" 
                        sx={{ 
                            flexGrow: 1,
                            fontWeight: 600,
                        }}
                    >
                        Employee Verified
                    </Typography>
                    <IconButton 
                        onClick={handleReset} 
                        size="small"
                        sx={{
                            '&:hover': {
                                transform: 'rotate(90deg)',
                            },
                            transition: 'transform 0.3s',
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {scannedEmployee && (
                        <Stack spacing={3}>
                            <Zoom in={true}>
                                <Box sx={{ textAlign: 'center', py: 2 }}>
                                    <Box
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '50%',
                                            bgcolor: alpha(theme.palette.success.main, 0.1),
                                            color: theme.palette.success.main,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mx: 'auto',
                                            mb: 2,
                                            animation: 'success-pulse 2s infinite',
                                            '@keyframes success-pulse': {
                                                '0%': {
                                                    transform: 'scale(1)',
                                                    boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.4)}`,
                                                },
                                                '70%': {
                                                    transform: 'scale(1.1)',
                                                    boxShadow: `0 0 0 10px ${alpha(theme.palette.success.main, 0)}`,
                                                },
                                                '100%': {
                                                    transform: 'scale(1)',
                                                    boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0)}`,
                                                },
                                            },
                                        }}
                                    >
                                        <SuccessIcon sx={{ fontSize: 40 }} />
                                    </Box>
                                    <Typography 
                                        variant="h5"
                                        sx={{
                                            fontWeight: 600,
                                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        }}
                                    >
                                        {scannedEmployee.first_name} {scannedEmployee.last_name}
                                    </Typography>
                                    <Typography color="textSecondary" sx={{ mt: 1 }}>
                                        Employee ID: {scannedEmployee.employee_id}
                                    </Typography>
                                </Box>
                            </Zoom>

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Fade in={true} style={{ transitionDelay: '100ms' }}>
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
                                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                                        Department
                                                    </Typography>
                                                    <Chip
                                                        label={scannedEmployee.department}
                                                        sx={{
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            color: theme.palette.primary.main,
                                                            fontWeight: 500,
                                                        }}
                                                    />
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Fade>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Fade in={true} style={{ transitionDelay: '200ms' }}>
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
                                                    <WorkIcon />
                                                </Avatar>
                                                <Box sx={{ flexGrow: 1 }}>
                                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                                        Position
                                                    </Typography>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                                        {scannedEmployee.position}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Fade>
                                </Grid>
                                <Grid item xs={12}>
                                    <Fade in={true} style={{ transitionDelay: '300ms' }}>
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
                                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                                        Email
                                                    </Typography>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                                        {scannedEmployee.email}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Fade>
                                </Grid>
                            </Grid>

                            <Fade in={true} style={{ transitionDelay: '400ms' }}>
                                <Button
                                    variant="contained"
                                    startIcon={<RestartIcon />}
                                    onClick={handleReset}
                                    fullWidth
                                    size="large"
                                    sx={{
                                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                        transition: 'transform 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                        },
                                    }}
                                >
                                    Scan Another QR Code
                                </Button>
                            </Fade>
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default QRCodeScanner; 