import React, { useState, useEffect, useRef } from 'react';
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
    Container,
} from '@mui/material';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
import { toast } from 'react-toastify';

const QRCodeScanner: React.FC = () => {
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scannedEmployee, setScannedEmployee] = useState<Employee | null>(null);
    const [showResult, setShowResult] = useState(false);
    const { user } = useAuth();
    const theme = useTheme();
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

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

    useEffect(() => {
        // Initialize scanner
        scannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: 250 },
            false
        );

        scannerRef.current.render(onScanSuccess, onScanError);

        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear();
            }
        };
    }, []);

    const onScanSuccess = async (decodedText: string) => {
        try {
            setScanning(true);
            setError(null);

            // Process the QR code data
            const employeeData = JSON.parse(decodedText);
            
            // Record attendance
            const { error: attendanceError } = await supabase
                .from('attendance')
                .insert([
                    {
                        employee_id: employeeData.id,
                        timestamp: new Date().toISOString(),
                    },
                ]);

            if (attendanceError) throw attendanceError;

            toast.success('Attendance recorded successfully!');
        } catch (err: any) {
            setError(err.message || 'Failed to process QR code');
            toast.error('Failed to record attendance');
        } finally {
            setScanning(false);
        }
    };

    const onScanError = (error: string) => {
        setError(error);
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
        setScanning(false);
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
        <Container maxWidth="sm">
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    mt: 4,
                    borderRadius: 2,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.secondary.light, 0.1)} 100%)`,
                }}
            >
                <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 700 }}>
                    QR Code Scanner
                </Typography>
                
                <Box sx={{ mt: 4 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    
                    <Box
                        id="qr-reader"
                        sx={{
                            width: '100%',
                            maxWidth: 400,
                            margin: '0 auto',
                            '& video': {
                                width: '100% !important',
                                borderRadius: 2,
                            },
                        }}
                    />

                    {scanning && (
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
                            <CircularProgress size={20} />
                            <Typography>Processing...</Typography>
                        </Stack>
                    )}
                </Box>
            </Paper>

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
        </Container>
    );
};

export default QRCodeScanner; 