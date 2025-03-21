import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, alpha, useTheme, IconButton, Tooltip } from '@mui/material';
import QrScanner from 'react-qr-scanner';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { sendSMSNotification } from '../utils/smsNotification';
import { FlipCameraIos as FlipCameraIcon } from '@mui/icons-material';

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

    const handleScan = useCallback(async (data: { text: string } | null) => {
        if (!data?.text || loading) return;

        try {
            setLoading(true);
            setError(null);

            // Get employee details
            const { data: employee, error: employeeError } = await supabase
                .from('employees')
                .select('*')
                .eq('employee_id', data.text)
                .single();

            if (employeeError) {
                throw new Error(`Employee not found: ${employeeError.message}`);
            }

            const today = format(new Date(), 'yyyy-MM-dd');

            // Get working hours record
            const { data: hoursRecord, error: hoursError } = await supabase
                .from('working_hours')
                .select('*')
                .eq('employee_id', data.text)
                .eq('date', today)
                .single();

            if (hoursError && hoursError.code !== 'PGRST116') {
                throw new Error(`Failed to get working hours: ${hoursError.message}`);
            }

            // If this is a late check-in, send SMS notification
            if (hoursRecord?.is_late) {
                const checkInTime = format(new Date(hoursRecord.check_in), 'hh:mm a');
                await sendSMSNotification({
                    employeeName: `${employee.first_name} ${employee.last_name}`,
                    checkInTime,
                    isLate: true
                });
            }

            // If employee hasn't checked in by a certain time, send absent notification
            const currentHour = new Date().getHours();
            if (!hoursRecord && currentHour >= 11) { // 11 AM threshold
                await sendSMSNotification({
                    employeeName: `${employee.first_name} ${employee.last_name}`,
                    isAbsent: true
                });
            }

            // If employee is leaving early, send notification
            if (hoursRecord?.check_out) {
                const checkOutTime = new Date(hoursRecord.check_out);
                const workEndHour = 17; // 5 PM
                if (checkOutTime.getHours() < workEndHour) {
                    await sendSMSNotification({
                        employeeName: `${employee.first_name} ${employee.last_name}`,
                        checkOutTime: format(checkOutTime, 'hh:mm a'),
                        isEarlyLeave: true
                    });
                }
            }

            setScannedEmployee(employee);
            setWorkingHours(hoursRecord);
            onResult?.(data.text);
            onScanComplete?.(employee);
            setShowResult(true);
            setScanning(false);

        } catch (err: any) {
            setError(err.message);
            onError?.(err.message);
        } finally {
            setLoading(false);
        }
    }, [loading, onResult, onError, onScanComplete, user?.id]);

    const handleError = useCallback((err: Error) => {
        setError(`Scanner error: ${err.message}`);
        onError?.(`Scanner error: ${err.message}`);
    }, [onError]);

    const handleReset = () => {
        setScanning(true);
        setError(null);
        setScannedEmployee(null);
        setShowResult(false);
        setWorkingHours(null);
    };

    const handleSwitchCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    return (
        <Box sx={{ position: 'relative', width: '100%', maxWidth: 500, mx: 'auto' }}>
            {scanning ? (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: 4,
                        overflow: 'hidden',
                        position: 'relative',
                        background: theme => alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                        border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                            '0%': {
                                boxShadow: theme => `0 0 0 0 ${alpha(theme.palette.primary.main, 0.4)}`
                            },
                            '70%': {
                                boxShadow: theme => `0 0 0 10px ${alpha(theme.palette.primary.main, 0)}`
                            },
                            '100%': {
                                boxShadow: theme => `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}`
                            }
                        }
                    }}
                >
                    <QrScanner
                        onError={handleError}
                        onScan={handleScan}
                        style={{ width: '100%' }}
                        constraints={{
                            video: {
                                facingMode: facingMode
                            }
                        }}
                    />
                    <Tooltip title="Switch Camera">
                        <IconButton
                            onClick={handleSwitchCamera}
                                        sx={{
                                                position: 'absolute',
                                top: 16,
                                right: 16,
                                backgroundColor: theme => alpha(theme.palette.background.paper, 0.8),
                                backdropFilter: 'blur(4px)',
                                '&:hover': {
                                    backgroundColor: theme => alpha(theme.palette.background.paper, 0.9),
                                }
                            }}
                        >
                            <FlipCameraIcon />
                        </IconButton>
                    </Tooltip>
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: '50%',
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