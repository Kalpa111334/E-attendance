import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, alpha, useTheme, IconButton, Tooltip } from '@mui/material';
import QrScanner from 'react-qr-scanner';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { sendNotification } from '../utils/whatsappNotification';
import { FlipCameraIos as FlipCameraIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

interface QRCodeScannerProps {
    onResult?: (result: string) => void;
    onError?: (error: string) => void;
    onScanComplete?: (employee: any) => void;
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

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onResult, onError, onScanComplete }) => {
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

    const handleScan = useCallback(async (data: { text: string } | null) => {
        if (!data?.text || loading) return;

        try {
            setLoading(true);
            setError(null);

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

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [loading, onResult, onError, onScanComplete, user?.id]);

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

    const handleSwitchCamera = useCallback(async () => {
        try {
            setIsFlipping(true);
            setCameraError(null);
            const newMode = facingMode === 'environment' ? 'user' : 'environment';
            setKey(prev => prev + 1);
            setFacingMode(newMode);
            
            enqueueSnackbar(`Switched to ${newMode === 'user' ? 'Front' : 'Back'} Camera`, { 
                variant: 'success',
                autoHideDuration: 2000
            });
        } catch (err) {
            console.error('Camera switch error:', err);
            setCameraError('Failed to switch camera. Please try again.');
            enqueueSnackbar('Failed to switch camera', { 
                variant: 'error',
                autoHideDuration: 3000
            });
        } finally {
            setIsFlipping(false);
        }
    }, [enqueueSnackbar, facingMode]);

    // Add effect to handle camera errors
    useEffect(() => {
        if (cameraError) {
            const timer = setTimeout(() => setCameraError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [cameraError]);

    return (
        <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
            {scanning ? (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: 4,
                        background: theme => alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                        border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        position: 'relative',
                        overflow: 'hidden'
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
                                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                background: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: 1,
                                fontSize: '0.875rem'
                            }}
                        >
                            {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
                        </Typography>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: theme => `linear-gradient(90deg, 
                                    ${alpha(theme.palette.primary.main, 0)} 0%, 
                                    ${theme.palette.primary.main} 50%, 
                                    ${alpha(theme.palette.primary.main, 0)} 100%)`,
                                animation: 'scan 2s linear infinite',
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
                        />
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center' }}>
                        <Tooltip title={`Switch to ${facingMode === 'environment' ? 'Front' : 'Back'} Camera`}>
                            <IconButton
                                onClick={handleSwitchCamera}
                                disabled={isFlipping}
                                sx={{
                                    background: theme => alpha(theme.palette.primary.main, 0.1),
                                    '&:hover': {
                                        background: theme => alpha(theme.palette.primary.main, 0.2)
                                    },
                                    '&:disabled': {
                                        opacity: 0.5
                                    }
                                }}
                            >
                                {isFlipping ? (
                                    <CircularProgress size={24} />
                                ) : (
                                    <FlipCameraIcon />
                                )}
                            </IconButton>
                        </Tooltip>
                        <Typography
                            variant="body2"
                            sx={{
                                color: theme => alpha(theme.palette.text.primary, 0.7)
                            }}
                        >
                            {isFlipping ? 'Switching...' : `Click to switch to ${facingMode === 'environment' ? 'Front' : 'Back'} Camera`}
                        </Typography>
                    </Box>
                    {cameraError && (
                        <Alert 
                            severity="error" 
                            sx={{ mt: 2 }}
                            onClose={() => setCameraError(null)}
                        >
                            {cameraError}
                        </Alert>
                    )}
                </Paper>
            ) : null}

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert 
                    severity="error" 
                    sx={{ mt: 2 }}
                    onClose={() => {
                        setError(null);
                        handleReset();
                    }}
                >
                    {error}
                </Alert>
            )}

            {showResult && scannedEmployee && (
                <Paper
                    elevation={0}
                    sx={{ 
                        p: 3, 
                        mt: 2,
                        borderRadius: 4,
                        background: theme => alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                        border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
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
                </Paper>
            )}
        </Box>
    );
};

export default QRCodeScanner; 