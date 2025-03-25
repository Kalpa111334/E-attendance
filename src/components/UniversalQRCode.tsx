import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import { Box, Typography, Paper, Button, alpha, useTheme, Snackbar, Alert } from '@mui/material';
import { Download as DownloadIcon, Share as ShareIcon } from '@mui/icons-material';
import { supabase } from '../config/supabase';

interface UniversalQRCodeProps {
    employeeId: string;
    employeeName: string;
}

const UniversalQRCode: React.FC<UniversalQRCodeProps> = ({ employeeId, employeeName }) => {
    const theme = useTheme();
    const [qrValue, setQrValue] = useState('');
    const [showCopiedAlert, setShowCopiedAlert] = useState(false);
    
    useEffect(() => {
        // Generate the attendance URL
        // Replace this with your actual hosted application URL
        const baseUrl = window.location.origin;
        const attendanceUrl = `${baseUrl}/mark-attendance/${employeeId}`;
        setQrValue(attendanceUrl);
    }, [employeeId]);

    const handleDownload = () => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `qr-code-${employeeId}.png`;
            link.href = url;
            link.click();
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Attendance QR Code',
                    text: `Scan to mark attendance for ${employeeName}`,
                    url: qrValue
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // Fallback to copying to clipboard
            await navigator.clipboard.writeText(qrValue);
            setShowCopiedAlert(true);
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 4,
                background: theme => alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                maxWidth: 400,
                mx: 'auto'
            }}
        >
            <Typography variant="h6" align="center" gutterBottom>
                Universal Attendance QR Code
            </Typography>
            <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 3 }}>
                Scan with any QR code scanner to mark attendance
            </Typography>
            
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mb: 3,
                    p: 2,
                    background: 'white',
                    borderRadius: 2
                }}
            >
                <QRCode
                    value={qrValue}
                    size={200}
                    level="H"
                    includeMargin
                    renderAs="canvas"
                />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                >
                    Download
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={handleShare}
                >
                    Share
                </Button>
            </Box>

            <Typography 
                variant="caption" 
                align="center" 
                sx={{ 
                    display: 'block',
                    mt: 2,
                    color: theme => alpha(theme.palette.text.secondary, 0.8)
                }}
            >
                Employee ID: {employeeId}
            </Typography>

            <Snackbar
                open={showCopiedAlert}
                autoHideDuration={3000}
                onClose={() => setShowCopiedAlert(false)}
            >
                <Alert severity="success" sx={{ width: '100%' }}>
                    QR code URL copied to clipboard!
                </Alert>
            </Snackbar>
        </Paper>
    );
};

export default UniversalQRCode; 