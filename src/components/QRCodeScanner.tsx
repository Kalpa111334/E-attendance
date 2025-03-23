import React, { useState, useEffect } from 'react';
import {
    Box,
    IconButton,
    Typography,
    CircularProgress,
    Alert,
    useTheme,
    alpha,
} from '@mui/material';
import {
    FlipCameraIos as FlipCameraIcon,
    Lightbulb as FlashIcon,
} from '@mui/icons-material';
import QrScanner from 'react-qr-scanner';

interface QRCodeScannerProps {
    onScanComplete?: (result: any) => void;
    onError?: (error: string) => void;
}

interface EmployeeQRData {
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    position: string;
    scanUrl?: string;
    lead?: {
        employee_id: string;
        first_name: string;
        last_name: string;
        position: string;
    };
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanComplete, onError }) => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'rear' | 'front'>('rear');
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [lastScannedData, setLastScannedData] = useState<string | null>(null);

    useEffect(() => {
        // Request camera permission on component mount
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => setLoading(false))
            .catch((err) => {
                setError('Camera permission denied');
                onError?.('Camera permission denied');
            });
    }, []);

    const handleScan = (data: { text: string } | null) => {
        if (!data?.text || data.text === lastScannedData) return;

        console.log('Raw QR code data:', data.text); // Debug log

        try {
            // Clean up the scanned text
            const cleanText = data.text.trim();
            console.log('Cleaned text:', cleanText);

            // Try to parse the JSON
            let parsedData;
            try {
                parsedData = JSON.parse(cleanText);
                console.log('Successfully parsed JSON:', parsedData);
            } catch (parseError) {
                console.error('Initial JSON parse failed:', parseError);
                // Try to handle potential encoding issues
                try {
                    // Try decoding as URI component
                    const decodedText = decodeURIComponent(cleanText);
                    console.log('URI decoded text:', decodedText);
                    parsedData = JSON.parse(decodedText);
                    console.log('Successfully parsed decoded JSON:', parsedData);
                } catch (decodeError) {
                    console.error('URI decode failed:', decodeError);
                    throw parseError; // If both attempts fail, throw the original error
                }
            }
            
            // Validate the parsed data
            console.log('Validating parsed data...');
            if (!validateEmployeeData(parsedData)) {
                console.log('Data validation failed. Available fields:', Object.keys(parsedData));
                throw new Error('Invalid employee data format - missing required fields');
            }

            console.log('Data validation successful');
            setLastScannedData(cleanText);
            setError(null);
            onScanComplete?.(parsedData);
        } catch (err) {
            if (err instanceof SyntaxError) {
                const errorMessage = 'Invalid QR code format: Not a valid JSON. Please regenerate the QR code.';
                console.error(errorMessage, err);
                setError(errorMessage);
                onError?.(errorMessage);
            } else {
                const errorMessage = (err as Error).message;
                console.error('Validation error:', errorMessage);
                setError(errorMessage);
                onError?.(errorMessage);
            }
        }
    };

    const validateEmployeeData = (data: any): data is EmployeeQRData => {
        if (!data || typeof data !== 'object') {
            console.log('Data is not an object');
            return false;
        }

        // Log the validation process
        const validation = {
            hasEmployeeId: typeof data.employee_id === 'string',
            hasFirstName: typeof data.first_name === 'string',
            hasLastName: typeof data.last_name === 'string',
            hasDepartment: typeof data.department === 'string',
            hasPosition: typeof data.position === 'string',
            hasLead: data.lead ? typeof data.lead === 'object' : 'optional'
        };

        console.log('Field validation results:', validation);

        const isValid = (
            validation.hasEmployeeId &&
            validation.hasFirstName &&
            validation.hasLastName &&
            validation.hasDepartment &&
            validation.hasPosition &&
            (!data.lead || (
                typeof data.lead === 'object' &&
                data.lead !== null &&
                typeof data.lead.employee_id === 'string' &&
                typeof data.lead.first_name === 'string' &&
                typeof data.lead.last_name === 'string' &&
                typeof data.lead.position === 'string'
            ))
        );

        console.log('Final validation result:', isValid);
        return isValid;
    };

    const handleError = (err: any) => {
        const errorMessage = err?.message || 'Failed to access camera';
        setError(errorMessage);
        onError?.(errorMessage);
        console.error('QR Scanner error:', err);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'rear' ? 'front' : 'rear');
        setLastScannedData(null); // Reset last scanned data when switching cameras
    };

    const toggleTorch = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode === 'rear' ? 'environment' : 'user',
                    //@ts-ignore
                    advanced: [{ torch: !torchEnabled }]
                }
            });
            setTorchEnabled(!torchEnabled);
        } catch (err) {
            console.error('Torch not supported:', err);
            setError('Torch/flashlight not supported on this device');
        }
    };

    return (
        <Box sx={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: '300px',
                    borderRadius: 1,
                    overflow: 'hidden',
                    '& > section': {
                        height: '100% !important',
                    },
                    '& video': {
                        objectFit: 'cover !important',
                    },
                }}
            >
                {loading ? (
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
                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    <QrScanner
                        delay={300}
                        onError={handleError}
                        onScan={handleScan}
                        style={{ width: '100%', height: '100%' }}
                        facingMode={facingMode === 'rear' ? 'environment' : 'user'}
                        constraints={{
                            video: {
                                facingMode: facingMode === 'rear' ? 'environment' : 'user'
                            }
                        }}
                    />
                )}

                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 2,
                        zIndex: 1,
                    }}
                >
                    <IconButton
                        onClick={toggleCamera}
                        sx={{
                            bgcolor: alpha(theme.palette.background.paper, 0.8),
                            '&:hover': {
                                bgcolor: alpha(theme.palette.background.paper, 0.9),
                            },
                        }}
                    >
                        <FlipCameraIcon />
                    </IconButton>
                    <IconButton
                        onClick={toggleTorch}
                        sx={{
                            bgcolor: alpha(theme.palette.background.paper, 0.8),
                            '&:hover': {
                                bgcolor: alpha(theme.palette.background.paper, 0.9),
                            },
                        }}
                        color={torchEnabled ? 'secondary' : 'default'}
                    >
                        <FlashIcon />
                    </IconButton>
                </Box>
            </Box>

            <Typography
                variant="caption"
                align="center"
                sx={{
                    display: 'block',
                    mt: 1,
                    color: theme.palette.text.secondary,
                }}
            >
                Point your camera at an employee's QR code
            </Typography>
        </Box>
    );
};

export default QRCodeScanner; 