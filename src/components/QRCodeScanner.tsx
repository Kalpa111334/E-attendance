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

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanComplete, onError }) => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'rear' | 'front'>('rear');
    const [torchEnabled, setTorchEnabled] = useState(false);

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
        if (data?.text) {
            try {
                const parsedData = JSON.parse(data.text);
                onScanComplete?.(parsedData);
            } catch (err) {
                setError('Invalid QR code format');
                onError?.('Invalid QR code format');
            }
        }
    };

    const handleError = (err: any) => {
        setError('Failed to access camera');
        onError?.('Failed to access camera');
        console.error('QR Scanner error:', err);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'rear' ? 'front' : 'rear');
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