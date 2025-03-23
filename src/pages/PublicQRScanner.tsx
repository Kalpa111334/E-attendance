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
    Divider,
    Chip,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import QRCodeScanner from '../components/QRCodeScanner';
import { supabase } from '../config/supabase';

interface Employee {
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    position: string;
    lead?: {
        employee_id: string;
        first_name: string;
        last_name: string;
        position: string;
    };
}

const PublicQRScanner: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [scannedEmployee, setScannedEmployee] = useState<Employee | null>(null);
    const theme = useTheme();

    const handleScanComplete = async (employee: Employee) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);
            setScannedEmployee(employee);

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

                    {scannedEmployee && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Employee Details
                            </Typography>
                            <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <PersonIcon color="primary" />
                                    <Typography variant="subtitle1">
                                        {scannedEmployee.first_name} {scannedEmployee.last_name}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                    ID: {scannedEmployee.employee_id}
                                </Typography>
                                <Chip 
                                    label={scannedEmployee.department}
                                    size="small"
                                    sx={{ mb: 1 }}
                                />
                                <Typography variant="body2" gutterBottom>
                                    Position: {scannedEmployee.position}
                                </Typography>
                                
                                {scannedEmployee.lead && (
                                    <>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="subtitle2" color="primary" gutterBottom>
                                            Team Lead
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PersonIcon color="secondary" />
                                            <Box>
                                                <Typography variant="body2">
                                                    {scannedEmployee.lead.first_name} {scannedEmployee.lead.last_name}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    {scannedEmployee.lead.position}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Paper>
                        </Box>
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