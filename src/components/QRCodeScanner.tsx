import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, alpha, useTheme, IconButton, Tooltip, Button, Fade, Zoom, Stack } from '@mui/material';
import QrScanner from 'react-qr-scanner';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { sendNotification } from '../utils/whatsappNotification';
import { FlipCameraIos as FlipCameraIcon, Brightness6 as BrightnessIcon, PhotoCamera as CameraIcon, RestartAlt as RestartIcon, QrCode2 as QrCodeIcon, CameraEnhance as CameraEnhanceIcon, Cameraswitch as CameraswitchIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

interface QRCodeScannerProps {
    onResult?: (result: string) => void;
    onError?: (error: string) => void;
    onScanComplete?: (employee: any) => void;
    initialFacingMode?: 'user' | 'environment';
}

interface WorkingHoursRecord {
    check_in: string;
    check_out: string | null;
    total_hours: number | null;
    is_late: boolean;
}

interface QrScannerProps {
    onError?: (error: Error) => void;
    onScan?: (result: { text: string }) => void;
    facingMode?: 'user' | 'environment';
    delay?: number;
    style?: React.CSSProperties;
}

interface ScanResult {
    data: string;
}

interface CameraDevice {
    deviceId: string;
    label: string;
    type: 'user' | 'environment';
    capabilities: MediaTrackCapabilities;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ 
    onResult, 
    onError, 
    onScanComplete,
    initialFacingMode = 'environment'
}) => {
    const theme = useTheme();
    const { user } = useAuth();
    const [scanning, setScanning] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scannedEmployee, setScannedEmployee] = useState<any>(null);
    const [showResult, setShowResult] = useState(false);
    const [workingHours, setWorkingHours] = useState<WorkingHoursRecord | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isFlipping, setIsFlipping] = useState(false);
    const [key, setKey] = useState(0);
    const { enqueueSnackbar } = useSnackbar();
    const [cameraAvailable, setCameraAvailable] = useState(true);
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    const [scannerReady, setScannerReady] = useState(false);
    const [scanAttempts, setScanAttempts] = useState(0);
    const maxScanAttempts = 3;
    const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraQuality, setCameraQuality] = useState<'HD' | 'SD'>('HD');
    const [focusMode, setFocusMode] = useState<'auto' | 'continuous'>('continuous');

    const handleScan = useCallback(async (data: { text: string } | null) => {
        if (!data?.text || loading) return;

        try {
            setLoading(true);
            setError(null);
            setScanAttempts(prev => prev + 1);

            // Verify employee
            const { data: employee, error: employeeError } = await supabase
                .from('employees')
                .select('id, employee_id, first_name, last_name, department, position')
                .eq('employee_id', data.text)
                .single();

            if (employeeError || !employee) {
                console.error('Employee verification error:', employeeError);
                throw new Error('Invalid QR code or employee not found');
            }

            // Record the scan
            const { data: scan, error: scanError } = await supabase
                .from('scans')
                .insert({
                    employee_id: employee.employee_id,
                    scanned_by: user?.id,
                    location: 'Main Office' // Default location
                })
                .select()
                .single();

            if (scanError) {
                console.error('Scan recording error:', scanError);
                throw new Error('Failed to record scan');
            }

            // Get or create working hours record for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data: hoursRecord, error: hoursError } = await supabase
                .from('working_hours')
                .select('*')
                .eq('employee_id', employee.employee_id)
                .gte('date', today.toISOString())
                .lt('date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
                .single();

            if (hoursError && hoursError.code !== 'PGRST116') { // PGRST116 means no rows returned
                throw new Error('Failed to check working hours');
            }

            let updatedHoursRecord;
            if (!hoursRecord) {
                // First scan of the day - check in
                const { data: newRecord, error: createError } = await supabase
                    .from('working_hours')
                    .insert({
                        employee_id: employee.employee_id,
                        check_in: new Date().toISOString(),
                        date: today.toISOString()
                    })
                    .select()
                    .single();

                if (createError) {
                    throw new Error('Failed to create working hours record');
                }
                updatedHoursRecord = newRecord;

                // Check if this is a late check-in
                const { data: settings } = await supabase
                    .from('company_settings')
                    .select('setting_value')
                    .in('setting_key', ['work_start_time', 'late_threshold_minutes'])
                    .order('setting_key');

                if (settings && settings.length === 2) {
                    const workStartTime = settings[0].setting_value; // Format: "HH:mm"
                    const lateThreshold = parseInt(settings[1].setting_value);

                    const [startHour, startMinute] = workStartTime.split(':').map(Number);
                    const startTimeToday = new Date(today);
                    startTimeToday.setHours(startHour, startMinute + lateThreshold);

                    if (new Date() > startTimeToday) {
                        // Employee is late
                        const { data: updateData, error: updateError } = await supabase
                            .from('working_hours')
                            .update({ is_late: true })
                            .eq('id', newRecord.id)
                            .select()
                            .single();

                        if (!updateError) {
                            updatedHoursRecord = updateData;
                        }

                        // Send WhatsApp notification
                        await sendNotification({
                            employeeName: `${employee.first_name} ${employee.last_name}`,
                            department: employee.department,
                            checkInTime: format(new Date(), 'hh:mm a'),
                            isLate: true
                        });
                    }
                }
            } else {
                // Subsequent scan - check out
                const { data: updateData, error: updateError } = await supabase
                    .from('working_hours')
                    .update({
                        check_out: new Date().toISOString()
                    })
                    .eq('id', hoursRecord.id)
                    .select()
                    .single();

                if (updateError) {
                    throw new Error('Failed to update working hours record');
                }
                updatedHoursRecord = updateData;
            }

            setScannedEmployee(employee);
            setWorkingHours(updatedHoursRecord);
            onResult?.(data.text);
            onScanComplete?.(employee);
            setShowResult(true);
            setScanning(false);

            // Reset scan attempts on success
            setScanAttempts(0);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            onError?.(errorMessage);

            // Handle maximum scan attempts
            if (scanAttempts >= maxScanAttempts) {
                enqueueSnackbar('Maximum scan attempts reached. Please try again later.', {
                    variant: 'warning',
                    autoHideDuration: 4000
                });
                handleReset();
            }
        } finally {
            setLoading(false);
        }
    }, [loading, onResult, onError, onScanComplete, user?.id, scanAttempts]);

    const handleError = useCallback((err: Error) => {
        setError(err.message);
        onError?.(err.message);
    }, [onError]);

    const handleReset = () => {
        setScanning(true);
        setError(null);
        setScannedEmployee(null);
        setShowResult(false);
        setWorkingHours(null);
    };

    const initializeCamera = useCallback(async () => {
        try {
            // Request camera with advanced constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: initialFacingMode,
                    width: { ideal: cameraQuality === 'HD' ? 1920 : 1280 },
                    height: { ideal: cameraQuality === 'HD' ? 1080 : 720 },
                    frameRate: { ideal: 30 }
                }
            });

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = await Promise.all(
                devices
                    .filter(device => device.kind === 'videoinput')
                    .map(async device => {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: { deviceId: { exact: device.deviceId } }
                        });
                        const track = stream.getVideoTracks()[0];
                        const capabilities = track.getCapabilities();
                        stream.getTracks().forEach(track => track.stop());

                        const isUserFacing = device.label.toLowerCase().includes('front');
                        return {
                            deviceId: device.deviceId,
                            label: device.label || `Camera ${device.deviceId.slice(0, 4)}`,
                            type: isUserFacing ? 'user' as const : 'environment' as const,
                            capabilities
                        } satisfies CameraDevice;
                    })
            );

            setAvailableCameras(videoDevices);
            setCameraAvailable(videoDevices.length > 0);

            if (videoDevices.length > 0) {
                const defaultCamera = videoDevices.find(d => d.type === initialFacingMode) || videoDevices[0];
                setSelectedCamera(defaultCamera.deviceId);
                setFacingMode(defaultCamera.type);
                
                // Set torch availability
                setHasTorch('torch' in defaultCamera.capabilities);
            }

            stream.getTracks().forEach(track => track.stop());
            setScannerReady(true);
            
        } catch (err) {
            console.error('Camera initialization error:', err);
            setCameraError('Failed to initialize camera. Please check permissions.');
            setCameraAvailable(false);
        }
    }, [initialFacingMode, cameraQuality]);

    const handleSwitchCamera = useCallback(async () => {
        if (isFlipping || availableCameras.length < 2) return;

        try {
            setIsFlipping(true);
            setCameraError(null);

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const currentIndex = availableCameras.findIndex(cam => cam.deviceId === selectedCamera);
            const nextIndex = (currentIndex + 1) % availableCameras.length;
            const nextCamera = availableCameras[nextIndex];

            // Apply optimal settings for the new camera
            const constraints = {
                video: {
                    deviceId: { exact: nextCamera.deviceId },
                    width: { ideal: cameraQuality === 'HD' ? 1920 : 1280 },
                    height: { ideal: cameraQuality === 'HD' ? 1080 : 720 },
                    frameRate: { ideal: 30 }
                }
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);
            setSelectedCamera(nextCamera.deviceId);
            setFacingMode(nextCamera.type);
            setKey(prev => prev + 1);

            // Update torch availability for new camera
            const track = newStream.getVideoTracks()[0];
            setHasTorch('torch' in track.getCapabilities());

            enqueueSnackbar(`Switched to ${nextCamera.label} (${cameraQuality})`, {
                variant: 'success',
                autoHideDuration: 2000
            });

        } catch (err) {
            console.error('Camera switch error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to switch camera';
            setCameraError(errorMessage);
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setIsFlipping(false);
        }
    }, [enqueueSnackbar, isFlipping, selectedCamera, availableCameras, stream, cameraQuality]);

    // Add camera quality toggle
    const toggleCameraQuality = useCallback(() => {
        setCameraQuality(prev => prev === 'HD' ? 'SD' : 'HD');
        enqueueSnackbar(`Switched to ${cameraQuality === 'HD' ? 'Standard' : 'High'} Quality`, {
            variant: 'info'
        });
    }, [cameraQuality, enqueueSnackbar]);

    // Initialize camera on mount
    useEffect(() => {
        initializeCamera();
        return () => {
            // Cleanup stream on unmount
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [initializeCamera]);

    // Update stream reference when camera changes
    useEffect(() => {
        const updateStream = async () => {
            try {
                if (selectedCamera) {
                    const constraints = {
                        video: {
                            deviceId: { exact: selectedCamera },
                            facingMode: facingMode
                        }
                    };

                    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    // Update video element directly
                    const videoElement = document.querySelector('video');
                    if (videoElement) {
                        videoElement.srcObject = newStream;
                    }

                    setStream(newStream);

                    // Check torch capability
                    const track = newStream.getVideoTracks()[0];
                    // @ts-ignore - Torch capability check
                    setHasTorch(track.getCapabilities?.()?.torch || false);
                }
            } catch (err) {
                console.error('Stream update error:', err);
            }
        };

        updateStream();
    }, [selectedCamera, facingMode]);

    // Enhanced camera controls
    const handleTorchToggle = useCallback(async () => {
        try {
            const videoElement = document.querySelector('video');
            if (videoElement?.srcObject) {
                const stream = videoElement.srcObject as MediaStream;
                const track = stream.getVideoTracks()[0];
                // @ts-ignore - Torch control
                await track.applyConstraints({ torch: !torchEnabled });
                setTorchEnabled(!torchEnabled);
                enqueueSnackbar(`Torch ${!torchEnabled ? 'enabled' : 'disabled'}`, {
                    variant: 'success',
                    autoHideDuration: 2000
                });
            }
        } catch (err) {
            console.error('Torch toggle error:', err);
            enqueueSnackbar('Failed to toggle torch', {
                variant: 'error',
                autoHideDuration: 3000
            });
        }
    }, [torchEnabled, enqueueSnackbar]);

    return (
        <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
            {scanning ? (
                <Fade in timeout={300}>
                    <Paper
                        elevation={0}
                    sx={{
                            p: 2,
                            borderRadius: 4,
                            background: theme => alpha(theme.palette.background.paper, 0.8),
                            backdropFilter: 'blur(10px)',
                            border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        position: 'relative',
                            overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: '200px',
                                height: '200px',
                                border: `2px solid ${theme.palette.primary.main}`,
                                borderRadius: '10px',
                                transform: 'translate(-50%, -50%)',
                                animation: 'scan 2s infinite',
                                zIndex: 2
                            },
                            '@keyframes scan': {
                                '0%': {
                                    boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.4)}`
                            },
                            '100%': {
                                    boxShadow: `0 0 0 20px ${alpha(theme.palette.primary.main, 0)}`
                                }
                            }
                        }}
                    >
                        <Box sx={{ position: 'relative' }}>
                            <QrScanner
                                key={key}
                                onError={handleError}
                                onScan={(result) => result && handleScan({ text: result.text })}
                                facingMode={facingMode}
                                delay={1000}
                                style={{
                                    width: '100%',
                                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                                    transition: 'transform 0.3s ease',
                                    borderRadius: '8px'
                                }}
                            />

                            {/* Camera Controls Overlay */}
                            <Stack
                                direction="row"
                                spacing={2}
                                sx={{
                                    position: 'absolute',
                                    bottom: 16,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    borderRadius: 3,
                                    p: 1,
                                    backdropFilter: 'blur(4px)',
                                    zIndex: 2
                                }}
                            >
                                {availableCameras.length > 1 && (
                                    <Tooltip title={`Switch Camera (${availableCameras.length} available)`}>
                                        <IconButton
                                            onClick={handleSwitchCamera}
                                            disabled={isFlipping}
                                            color="primary"
                                            size="small"
                                            sx={{
                                                transition: 'transform 0.2s',
                                                '&:hover': {
                                                    transform: 'scale(1.1)'
                                                },
                                                '&:active': {
                                                    transform: 'scale(0.95)'
                                                }
                                            }}
                                        >
                                            {isFlipping ? (
                                                <CircularProgress size={20} />
                                            ) : (
                                                <CameraswitchIcon />
                                            )}
                                        </IconButton>
                                    </Tooltip>
                                )}

                                <Tooltip title={`Switch to ${cameraQuality === 'HD' ? 'Standard' : 'High'} Quality`}>
                                    <IconButton
                                        onClick={toggleCameraQuality}
                                        color="primary"
                                        size="small"
                                        sx={{
                                            transition: 'transform 0.2s',
                                            '&:hover': {
                                                transform: 'scale(1.1)'
                                            }
                                        }}
                                    >
                                        <CameraEnhanceIcon />
                                    </IconButton>
                                </Tooltip>

                                {hasTorch && (
                                    <Tooltip title={`${torchEnabled ? 'Disable' : 'Enable'} Torch`}>
                                        <IconButton
                                            onClick={handleTorchToggle}
                                            color="primary"
                                            size="small"
                                        >
                                            <BrightnessIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                <Tooltip title="Reset Scanner">
                                    <IconButton
                                        onClick={handleReset}
                                        color="primary"
                                        size="small"
                                    >
                                        <RestartIcon />
                                    </IconButton>
                                </Tooltip>
                            </Stack>

                            {/* Camera Info Overlay */}
                            <Zoom in={scannerReady}>
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 16,
                                        left: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        background: 'rgba(0, 0, 0, 0.6)',
                                        color: 'white',
                                        padding: '8px 12px',
                                        borderRadius: 2,
                                        backdropFilter: 'blur(4px)',
                                        zIndex: 2
                                    }}
                                >
                                    <QrCodeIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="caption">
                                        {availableCameras.find(cam => cam.deviceId === selectedCamera)?.label || 'Scanner Ready'}
                                    </Typography>
                                </Box>
                            </Zoom>
                        </Box>
                    </Paper>
                </Fade>
            ) : null}

            {showResult && scannedEmployee && (
                <Zoom in>
                    <Paper
                        elevation={0}
                                    sx={{
                            p: 3,
                            mt: 2,
                            borderRadius: 4,
                            background: theme => alpha(theme.palette.background.paper, 0.8),
                            backdropFilter: 'blur(10px)',
                            border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            position: 'relative'
                        }}
                    >
                        <Typography variant="h6" gutterBottom>
                            {scannedEmployee.first_name} {scannedEmployee.last_name}
                        </Typography>
                        <Typography color="textSecondary" gutterBottom>
                            ID: {scannedEmployee.employee_id}
                        </Typography>
                        <Typography color="textSecondary" gutterBottom>
                            Department: {scannedEmployee.department}
                        </Typography>
                        
                        {workingHours && (
                            <>
                                <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 600 }}>
                                    Today's Record:
                                </Typography>
                                <Typography color="textSecondary">
                                    Check-in: {format(new Date(workingHours.check_in), 'hh:mm a')}
                                    {workingHours.is_late && (
                                        <Typography component="span" color="error" sx={{ ml: 1 }}>
                                            (Late)
                                        </Typography>
                                    )}
                                </Typography>
                                {workingHours.check_out && (
                                    <>
                                        <Typography color="textSecondary">
                                            Check-out: {format(new Date(workingHours.check_out), 'hh:mm a')}
                                        </Typography>
                                        <Typography color="textSecondary">
                                            Total Hours: {workingHours.total_hours?.toFixed(2)}
                                        </Typography>
                                    </>
                                )}
                            </>
                        )}

                        <Button
                            variant="outlined"
                            startIcon={<CameraIcon />}
                            onClick={handleReset}
                            sx={{ mt: 2 }}
                            fullWidth
                        >
                            Scan Another QR Code
                        </Button>
                    </Paper>
                </Zoom>
            )}

                            {error && (
                <Zoom in>
                                    <Alert 
                                        severity="error"
                                        sx={{ 
                            mt: 2,
                                            borderRadius: 2,
                            animation: 'slideIn 0.3s ease-out',
                            '@keyframes slideIn': {
                                from: { transform: 'translateY(-20px)', opacity: 0 },
                                to: { transform: 'translateY(0)', opacity: 1 }
                            }
                                        }}
                                        action={
                                            <Button 
                                color="inherit"
                                                size="small" 
                                onClick={() => {
                                    setError(null);
                                    handleReset();
                                }}
                            >
                                Retry
                                            </Button>
                                        }
                                    >
                                        {error}
                                    </Alert>
                                </Zoom>
                            )}
        </Box>
    );
};

export default QRCodeScanner; 