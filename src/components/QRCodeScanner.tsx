import React, { useState, useCallback } from 'react';
import QrScanner from 'react-qr-scanner';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Card,
    CardContent,
    Typography,
    Stack,
    Grid,
    useTheme,
    alpha,
    CircularProgress,
    Alert,
    Fade,
    Container,
} from '@mui/material';
import {
    Close as CloseIcon,
    CameraAlt as CameraIcon,
    Badge as BadgeIcon,
    Work as WorkIcon,
    Email as EmailIcon,
    RestartAlt as RestartIcon,
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Employee } from '../types/employee';

interface QRCodeScannerProps {
    onResult?: (result: string) => void;
    onError?: (error: Error) => void;
    onScanComplete?: (employee: Employee) => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onResult, onError, onScanComplete }) => {
    const [scanning, setScanning] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scannedEmployee, setScannedEmployee] = useState<Employee | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const { user } = useAuth();
    const theme = useTheme();

    const handleReset = useCallback(() => {
        setScanning(true);
        setScannedEmployee(null);
        setShowResult(false);
        setError(null);
    }, []);

    const handleScan = useCallback(async (data: { text: string } | null) => {
        if (!data?.text || loading) return;

        try {
            setLoading(true);
            setError(null);

            // First verify the QR code format
            if (!data.text.match(/^[A-Z0-9]+$/)) {
                throw new Error('Invalid QR code format');
            }

            const { data: employees, error: employeeError } = await supabase
                .from('employees')
                .select('*')
                .eq('employee_id', data.text)
                .single(); // Use single() to get better error handling

            if (employeeError) {
                if (employeeError.code === 'PGRST116') {
                    throw new Error('Employee not found');
                }
                throw new Error(`Database error: ${employeeError.message}`);
            }

            // Record the scan
            const { error: scanError } = await supabase
                .from('scans')
                .insert({
                    employee_id: data.text,
                    scanned_by: user?.id
                });

            if (scanError) {
                throw new Error(`Failed to record scan: ${scanError.message}`);
            }

            setScannedEmployee(employees);
            onResult?.(data.text);
            onScanComplete?.(employees);
            setShowResult(true);
            setScanning(false);

            await Swal.fire({
                icon: 'success',
                title: 'Employee Verified!',
                html: `
                    <div style="margin-top: 1rem;">
                        <h3>${employees.first_name} ${employees.last_name}</h3>
                        <p>Employee ID: ${employees.employee_id}</p>
                        <p>Department: ${employees.department}</p>
                        <p>Position: ${employees.position}</p>
                    </div>
                `,
                showConfirmButton: true,
                showCancelButton: true,
                confirmButtonText: 'Scan Another',
                cancelButtonText: 'View Details',
                confirmButtonColor: theme.palette.primary.main,
                cancelButtonColor: theme.palette.secondary.main,
                allowOutsideClick: false
            });

        } catch (err) {
            const errorMessage = err instanceof Error 
                ? err.message 
                : 'Failed to verify employee. Please try again.';
            
            setError(errorMessage);
            onError?.(new Error(errorMessage));
            
            await Swal.fire({
                icon: 'error',
                title: 'Scan Failed',
                text: errorMessage,
                confirmButtonColor: theme.palette.error.main,
                confirmButtonText: 'Try Again'
            });
            
            handleReset();
        } finally {
            setLoading(false);
        }
    }, [loading, onResult, onScanComplete, onError, user, theme, handleReset]);

    const handleError = useCallback((err: Error) => {
        setError(err.message);
        onError?.(err);
        Swal.fire({
            icon: 'error',
            title: 'Camera Error',
            text: err.message,
            confirmButtonColor: theme.palette.error.main
        });
    }, [onError, theme]);

    const toggleCamera = useCallback(() => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    }, []);

    return (
        <Container maxWidth="md">
            <Box sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                minHeight: '60vh',
                position: 'relative'
            }}>
                            {error && (
                                    <Alert 
                                        severity="error"
                        sx={{ width: '100%', mb: 2 }}
                                        action={
                                            <Button 
                                color="inherit" 
                                                size="small" 
                                                onClick={handleReset}
                                startIcon={<RestartIcon />}
                            >
                                Retry
                                            </Button>
                                        }
                                    >
                                        {error}
                                    </Alert>
                            )}

                {scanning && (
                                <Fade in={true}>
                                    <Box
                                        sx={{
                                width: '100%', 
                                maxWidth: '600px',
                                            position: 'relative',
                                '& video': {
                                    borderRadius: 2,
                                    boxShadow: theme => `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`
                                },
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                    border: '2px solid',
                                    borderColor: 'primary.main',
                                                borderRadius: 2,
                                    animation: 'pulse 2s infinite'
                                },
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    top: '50%',
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    backgroundColor: theme => alpha(theme.palette.primary.main, 0.8),
                                    animation: 'scan 2s linear infinite'
                                },
                                '@keyframes pulse': {
                                                '0%': {
                                        opacity: 1,
                                        transform: 'scale(1)'
                                                },
                                                '50%': {
                                        opacity: 0.5,
                                        transform: 'scale(1.02)'
                                                },
                                                '100%': {
                                        opacity: 1,
                                        transform: 'scale(1)'
                                    }
                                },
                                '@keyframes scan': {
                                    '0%': {
                                        transform: 'translateY(-100px)',
                                        opacity: 0
                                    },
                                    '50%': {
                                        opacity: 1
                                    },
                                    '100%': {
                                        transform: 'translateY(100px)',
                                        opacity: 0
                                    }
                                }
                            }}
                        >
                            <QrScanner
                                delay={300}
                                onError={handleError}
                                onScan={handleScan}
                                            constraints={{ 
                                    video: {
                                        facingMode,
                                        width: { ideal: 1920 },
                                        height: { ideal: 1080 }
                                    }
                                }}
                                style={{ width: '100%' }}
                            />
                            {loading && (
                                        <Box
                                            sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                        bottom: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: alpha('#000', 0.3),
                                        borderRadius: 2
                                    }}
                                >
                                    <CircularProgress color="primary" />
                                    </Box>
                            )}
                            <Stack 
                                direction="row" 
                                spacing={2} 
                                sx={{ 
                                    mt: 2,
                                    justifyContent: 'center'
                                }}
                            >
                                <Button
                                    variant="contained"
                                    startIcon={<CameraIcon />}
                                    onClick={toggleCamera}
                                    disabled={loading}
                                    sx={{
                                        borderRadius: 2,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: theme => `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                                        }
                                    }}
                                >
                                    Switch Camera
                                </Button>
                        </Stack>
                        </Box>
            </Fade>
                )}

            <Dialog
                    open={showResult && !!scannedEmployee}
                onClose={handleReset}
                maxWidth="sm"
                fullWidth
                    TransitionComponent={Fade}
                >
                    <DialogTitle sx={{ pr: 6 }}>
                        Employee Details
                    <IconButton 
                        onClick={handleReset} 
                        sx={{
                                position: 'absolute', 
                                right: 8, 
                                top: 8,
                                transition: 'all 0.2s',
                            '&:hover': {
                                    transform: 'rotate(90deg)'
                                }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                    <DialogContent>
                    {scannedEmployee && (
                            <Card elevation={0} sx={{ bgcolor: 'background.default' }}>
                                <CardContent>
                        <Stack spacing={3}>
                                        <Typography variant="h5" gutterBottom>
                                        {scannedEmployee.first_name} {scannedEmployee.last_name}
                                    </Typography>
                            <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <BadgeIcon color="primary" />
                                                    <Typography>
                                                        ID: {scannedEmployee.employee_id}
                                                    </Typography>
                                            </Stack>
                                </Grid>
                                            <Grid item xs={12}>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <WorkIcon color="primary" />
                                                    <Typography>
                                                        Department: {scannedEmployee.department}
                                                    </Typography>
                                            </Stack>
                                </Grid>
                                <Grid item xs={12}>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <EmailIcon color="primary" />
                                                    <Typography>
                                                        Position: {scannedEmployee.position}
                                                    </Typography>
                                            </Stack>
                                </Grid>
                            </Grid>
                        </Stack>
                                </CardContent>
                            </Card>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
        </Container>
    );
};

export default QRCodeScanner; 