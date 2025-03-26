import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Box, 
    Typography, 
    CircularProgress, 
    Paper, 
    Alert, 
    alpha, 
    useTheme 
} from '@mui/material';
import { supabase } from '../config/supabase';
import { format } from 'date-fns';
import { sendNotification, MessageType } from '../utils/whatsappNotification';
import { useSnackbar } from 'notistack';

// Interface for employee data
interface Employee {
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    position: string;
    phone_number: string;
}

// Interface for working hours record
interface WorkingHoursRecord {
    id: string;
    employee_id: string;
    date: string;
    check_in: string;
    check_out: string | null;
    total_hours: number | null;
    is_late: boolean;
}

// Constants moved outside component to avoid recreating each render
const LATE_HOUR = 9;
const REDIRECT_DELAY = 3000;
const ERROR_MESSAGES = {
    NO_EMPLOYEE_ID: 'Employee ID is required',
    INVALID_QR: 'Invalid QR code or employee not found',
    HOURS_CHECK_FAILED: 'Failed to check working hours',
    CREATE_RECORD_FAILED: 'Failed to create attendance record',
    UPDATE_RECORD_FAILED: 'Failed to update attendance record',
    ALREADY_CHECKED_OUT: 'Already checked out for today'
} as const;

const MarkAttendance: React.FC = () => {
    // Hooks
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    
    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [employeeData, setEmployeeData] = useState<Employee | null>(null);

    // Memoized function to format notification message
    const formatNotificationMessage = React.useCallback((type: 'check-in' | 'check-out', time: Date, isLate?: boolean, totalHours?: number) => {
        if (type === 'check-in') {
            return `Check-in recorded at ${format(time, 'hh:mm a')}${isLate ? ' (Late)' : ''}`;
        }
        return `Check-out recorded at ${format(time, 'hh:mm a')}. Total hours: ${totalHours?.toFixed(2)}`;
    }, []);

    // Separate function for database operations
    const handleAttendanceRecord = async (
        employee: Employee,
        currentTime: Date,
        hoursRecord?: WorkingHoursRecord | null
    ) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!hoursRecord) {
            // Handle Check-in
            const isLate = currentTime.getHours() >= LATE_HOUR;
            const { data: newRecord, error: createError } = await supabase
                .from('working_hours')
                .insert({
                    employee_id: employee.employee_id,
                    date: today.toISOString(),
                    check_in: currentTime.toISOString(),
                    is_late: isLate
                })
                .select()
                .single();

            if (createError || !newRecord) {
                throw new Error(ERROR_MESSAGES.CREATE_RECORD_FAILED);
            }

            await sendNotification({
                phoneNumber: employee.phone_number,
                employeeName: `${employee.first_name} ${employee.last_name}`,
                department: employee.department,
                checkInTime: currentTime.toISOString(),
                isLate: isLate,
                customMessage: formatNotificationMessage('check-in', currentTime, isLate)
            });

            return newRecord;
        }

        if (!hoursRecord.check_out) {
            // Handle Check-out
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

            if (updateError || !record) {
                throw new Error(ERROR_MESSAGES.UPDATE_RECORD_FAILED);
            }

            await sendNotification({
                phoneNumber: employee.phone_number,
                employeeName: `${employee.first_name} ${employee.last_name}`,
                department: employee.department,
                checkOutTime: currentTime.toISOString(),
                customMessage: formatNotificationMessage('check-out', currentTime, undefined, totalHours)
            });

            return record;
        }

        throw new Error(ERROR_MESSAGES.ALREADY_CHECKED_OUT);
    };

    useEffect(() => {
        const markAttendance = async () => {
            try {
                if (!employeeId) {
                    throw new Error(ERROR_MESSAGES.NO_EMPLOYEE_ID);
                }

                // Verify employee
                const { data: employee, error: employeeError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('employee_id', employeeId)
                    .single();

                if (employeeError || !employee) {
                    throw new Error(ERROR_MESSAGES.INVALID_QR);
                }

                setEmployeeData(employee);

                // Get today's date range
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                // Check existing attendance record
                const { data: hoursRecord, error: hoursError } = await supabase
                    .from('working_hours')
                    .select('*')
                    .eq('employee_id', employeeId)
                    .gte('date', today.toISOString())
                    .lt('date', tomorrow.toISOString())
                    .single();

                if (hoursError && hoursError.code !== 'PGRST116') {
                    throw new Error(ERROR_MESSAGES.HOURS_CHECK_FAILED);
                }

                await handleAttendanceRecord(employee, new Date(), hoursRecord);

                setSuccess(true);
                enqueueSnackbar('Attendance marked successfully!', { variant: 'success' });

                // Redirect after delay
                setTimeout(() => {
                    navigate('/');
                }, REDIRECT_DELAY);

            } catch (err: any) {
                console.error('Error marking attendance:', err);
                setError(err.message);
                enqueueSnackbar(err.message, { variant: 'error' });
            } finally {
                setLoading(false);
            }
        };

        markAttendance();
    }, [employeeId, navigate, enqueueSnackbar, formatNotificationMessage]);

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
                <CircularProgress size={40} />
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
                p: 3,
                bgcolor: 'background.default'
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: 2,
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
                        <Alert severity="success" sx={{ mb: 3 }}>
                            Attendance marked successfully!
                        </Alert>
                        <Typography variant="h6" gutterBottom>
                            {employeeData.first_name} {employeeData.last_name}
                        </Typography>
                        <Typography color="textSecondary" gutterBottom>
                            Employee ID: {employeeData.employee_id}
                        </Typography>
                        <Typography color="textSecondary" gutterBottom>
                            Department: {employeeData.department}
                        </Typography>
                        <Typography color="textSecondary">
                            Position: {employeeData.position}
                        </Typography>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                mt: 3, 
                                textAlign: 'center',
                                color: 'text.secondary'
                            }}
                        >
                            Redirecting to home page...
                        </Typography>
                    </>
                ) : null}
            </Paper>
        </Box>
    );
};

export default React.memo(MarkAttendance);