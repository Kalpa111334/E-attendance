import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, CircularProgress, Alert, Stack, useTheme, alpha } from '@mui/material';
import { QrReader } from 'react-qr-reader';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { sendLateCheckInNotification } from '../utils/smsNotification';

interface QRCodeScannerProps {
    onResult?: (result: string) => void;
    onError?: (error: string) => void;
    onScanComplete?: () => void;
}

interface WorkingHoursConfig {
    start_time: string;
    end_time: string;
    late_threshold_minutes: number;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onResult, onError, onScanComplete }) => {
    const [data, setData] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanType, setScanType] = useState<'check_in' | 'check_out'>('check_in');
    const { user } = useAuth();
    const theme = useTheme();
    const lastScanRef = useRef<string | null>(null);

    const handleScan = async (result: string | null) => {
        if (!result || result === lastScanRef.current) return;
        lastScanRef.current = result;

        try {
            setLoading(true);
            setError(null);

            // Verify QR code
            const { data: employee, error: employeeError } = await supabase
                .from('employees')
                .select('*')
                .eq('employee_id', result)
                .single();

            if (employeeError) throw new Error('Invalid QR code');

            // Get working hours config
            const { data: config, error: configError } = await supabase
                .from('working_hours_config')
                .select('*')
                .single();

            if (configError) throw new Error('Failed to load working hours configuration');

            // Record the scan
            const { data: scan, error: scanError } = await supabase
                .from('scans')
                .insert({
                    employee_id: result,
                    scanned_by: user?.id,
                    scan_type: scanType,
                    created_at: new Date().toISOString(),
                })
                .select('*, employees(*)')
                .single();

            if (scanError) throw scanError;

            // If it's a late check-in, send notifications
            if (scan.is_late && scan.scan_type === 'check_in') {
                const minutesLate = calculateMinutesLate(scan.created_at, config.start_time);
                await sendLateCheckInNotification(result, scan.created_at, minutesLate);
            }

            // Show success message with appropriate details
            const message = scan.scan_type === 'check_out' && scan.working_hours
                ? `Successfully recorded ${scan.scan_type}. Total working hours: ${scan.working_hours} hours`
                : `Successfully recorded ${scan.scan_type}${scan.is_late ? ' (Late)' : ''}`;

            onResult?.(message);
            onScanComplete?.();

        } catch (err: any) {
            const errorMessage = err.message || 'Failed to process scan';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setLoading(false);
            // Reset last scan after a delay
            setTimeout(() => {
                lastScanRef.current = null;
            }, 5000);
        }
    };

    const calculateMinutesLate = (scanTime: string, scheduledStart: string): number => {
        const scanDate = new Date(scanTime);
        const [hours, minutes] = scheduledStart.split(':').map(Number);
        const scheduleDate = new Date(scanDate);
        scheduleDate.setHours(hours, minutes, 0, 0);
        return Math.floor((scanDate.getTime() - scheduleDate.getTime()) / (1000 * 60));
    };

    const toggleScanType = () => {
        setScanType(prev => prev === 'check_in' ? 'check_out' : 'check_in');
    };

    return (
        <Box sx={{ 
            width: '100%',
            maxWidth: 500,
            mx: 'auto',
            p: 3,
            borderRadius: 4,
            bgcolor: theme => alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
            boxShadow: theme => `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
        }}>
            <Stack spacing={3}>
                <Button
                    onClick={toggleScanType}
                    variant="contained"
                    color={scanType === 'check_in' ? 'primary' : 'secondary'}
                    sx={{
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}
                >
                    {`Scan Type: ${scanType === 'check_in' ? 'Check In' : 'Check Out'}`}
                </Button>

                <Box
                    sx={{
                        position: 'relative',
                        '& video': {
                            borderRadius: 2,
                            width: '100%',
                        },
                    }}
                >
                    <QrReader
                        onResult={(result) => result && handleScan(result.getText())}
                        constraints={{ facingMode: 'environment' }}
                        videoStyle={{ borderRadius: '8px' }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            border: `2px solid ${theme.palette.primary.main}`,
                            borderRadius: 2,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                                '0%': {
                                    opacity: 1,
                                    transform: 'scale(1)',
                                },
                                '50%': {
                                    opacity: 0.5,
                                    transform: 'scale(1.02)',
                                },
                                '100%': {
                                    opacity: 1,
                                    transform: 'scale(1)',
                                },
                            },
                        }}
                    />
                </Box>

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Alert 
                        severity="error"
                        sx={{
                            borderRadius: 2,
                            boxShadow: theme => `0 4px 12px ${alpha(theme.palette.error.main, 0.1)}`,
                        }}
                    >
                        {error}
                    </Alert>
                )}

                <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                    sx={{ mt: 2 }}
                >
                    Position the QR code within the frame to {scanType === 'check_in' ? 'check in' : 'check out'}
                </Typography>
            </Stack>
        </Box>
    );
};

export default QRCodeScanner; 