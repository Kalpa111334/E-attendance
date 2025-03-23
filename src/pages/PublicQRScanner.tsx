import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
} from '@mui/material';
import QRCodeScanner from '../components/QRCodeScanner';
import { supabase } from '../config/supabase';

const PublicQRScanner: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const theme = useTheme();

    const handleScanComplete = async (employee: any) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            // Record attendance
            const { error: attendanceError } = await supabase
                .from('working_hours')
                .insert({
                    employee_id: employee.employee_id,
                    date: new Date().toISOString(),
                    check_in: new Date().toISOString(),
                });

            if (attendanceError) throw attendanceError;

            setSuccess(`Attendance marked successfully for ${employee.first_name} ${employee.last_name}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ py: { xs: 2, sm: 3 } }}>
                <Paper 
                    elevation={2}
                    sx={{ 
                        p: { xs: 2, sm: 3 },
                        borderRadius: 2,
                        background: theme => alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <Typography 
                        variant="h5" 
                        component="h1" 
                        align="center"
                        sx={{ 
                            mb: 3,
                            color: theme.palette.primary.main,
                            fontWeight: 600
                        }}
                    >
                        Scan Employee QR Code
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                            {success}
                        </Alert>
                    )}

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <QRCodeScanner
                            onError={setError}
                            onScanComplete={handleScanComplete}
                        />
                    )}
                </Paper>
            </Box>
        </Container>
    );
};

export default PublicQRScanner; 