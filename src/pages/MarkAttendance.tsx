import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Paper, Alert, alpha, useTheme } from '@mui/material';
import { supabase } from '../config/supabase';
import { format } from 'date-fns';
import { sendNotification } from '../utils/whatsappNotification';
import { useSnackbar } from 'notistack';

interface WorkingHoursRecord {
    check_in: string;
    check_out: string | null;
    total_hours: number | null;
    is_late: boolean;
}

const MarkAttendance: React.FC = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [employeeData, setEmployeeData] = useState<any>(null);

    useEffect(() => {
        const markAttendance = async () => {
            try {
                if (!employeeId) {
                    throw new Error('Employee ID is required');
                }

                // Verify employee
                const { data: employee, error: employeeError } = await supabase
                    .from('employees')
                    .select('id, employee_id, first_name, last_name, department, position')
                    .eq('employee_id', employeeId)
                    .single();

                if (employeeError || !employee) {
                    throw new Error('Invalid QR code or employee not found');
                }

                setEmployeeData(employee);

                // Get or create working hours record for today
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { data: hoursRecord, error: hoursError } = await supabase
                    .from('working_hours')
                    .select('*')
                    .eq('employee_id', employeeId)
                    .gte('date', today.toISOString())
                    .lt('date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
                    .single();

                if (hoursError && hoursError.code !== 'PGRST116') {
                    throw new Error('Failed to check working hours');
                }

                const currentTime = new Date();
                let updatedHoursRecord;

                if (!hoursRecord) {
                    // First scan of the day - check in
                    const { data: newRecord, error: createError } = await supabase
                        .from('working_hours')
                        .insert({
                            employee_id: employeeId,
                            check_in: currentTime.toISOString(),
                            date: today.toISOString(),
                            is_late: currentTime.getHours() >= 9 // Consider late if check-in after 9 AM
                        })
                        .select()
                        .single();

                    if (createError) {
                        throw new Error('Failed to create working hours record');
                    }
                    updatedHoursRecord = newRecord;

                    // Send notification for check-in
                    await sendNotification({
                        to: employee.phone_number,
                        message: `Check-in recorded at ${format(currentTime, 'hh:mm a')}${
                            currentTime.getHours() >= 9 ? ' (Late)' : ''
                        }`
                    });
                } else if (!hoursRecord.check_out) {
                    // Check out
                    const checkInTime = new Date(hoursRecord.check_in);
                    const totalHours = (currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

                    const { data: record, error: updateError } = await supabase
                        .from('working_hours')
                        .update({
                            check_out: currentTime.toISOString(),
                            total_hours: parseFloat(totalHours.toFixed(2))
                        })
                        .eq('id', hoursRecord.id)
                        .select()
                        .single();

                    if (updateError) {
                        throw new Error('Failed to update working hours record');
                    }
                    updatedHoursRecord = record;

                    // Send notification for check-out
                    await sendNotification({
                        to: employee.phone_number,
                        message: `Check-out recorded at ${format(currentTime, 'hh:mm a')}. Total hours: ${totalHours.toFixed(2)}`
                    });
                } else {
                    throw new Error('Already checked out for today');
                }

                setSuccess(true);
                enqueueSnackbar('Attendance marked successfully!', { variant: 'success' });

                // Redirect after 3 seconds
                setTimeout(() => {
                    navigate('/');
                }, 3000);

            } catch (err: any) {
                console.error('Error marking attendance:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        markAttendance();
    }, [employeeId, navigate, enqueueSnackbar]);

    if (loading) {
        return (
            <Box 
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    p: 3
                }}
            >
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Processing attendance...</Typography>
            </Box>
        );
    }

    return (
        <Box 
            sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                p: 3
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    borderRadius: 4,
                    background: theme => alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(10px)',
                    border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    maxWidth: 400,
                    width: '100%'
                }}
            >
                {error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                ) : success && employeeData ? (
                    <>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Attendance marked successfully!
                        </Alert>
                        <Typography variant="h6" gutterBottom>
                            {employeeData.first_name} {employeeData.last_name}
                        </Typography>
                        <Typography color="textSecondary" gutterBottom>
                            ID: {employeeData.employee_id}
                        </Typography>
                        <Typography color="textSecondary">
                            Department: {employeeData.department}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                            Redirecting to home page...
                        </Typography>
                    </>
                ) : null}
            </Paper>
        </Box>
    );
};

export default MarkAttendance; 