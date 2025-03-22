import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Button,
    IconButton,
    TextField,
    MenuItem,
    Stack,
    Chip,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
    Paper,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Schedule as ScheduleIcon,
    Today as TodayIcon,
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';

interface Shift {
    id: number;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    shift_type: 'morning' | 'afternoon' | 'night';
    created_at: string;
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    position: string;
    avatar_url?: string;
}

const RosterManagement: React.FC = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');
    const [selectedShiftType, setSelectedShiftType] = useState<'morning' | 'afternoon' | 'night'>('morning');
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);

    const theme = useTheme();

    const shiftTypes = {
        morning: {
            label: 'Morning Shift',
            color: theme.palette.info.main,
            defaultStart: '08:00',
            defaultEnd: '16:00',
        },
        afternoon: {
            label: 'Afternoon Shift',
            color: theme.palette.warning.main,
            defaultStart: '16:00',
            defaultEnd: '00:00',
        },
        night: {
            label: 'Night Shift',
            color: theme.palette.error.main,
            defaultStart: '00:00',
            defaultEnd: '08:00',
        },
    };

    useEffect(() => {
        fetchEmployees();
        fetchShifts();
    }, [selectedDate]);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('id, employee_id, first_name, last_name, department, position, avatar_url')
                .eq('status', 'active');

            if (error) throw error;
            setEmployees(data || []);
        } catch (err) {
            console.error('Error fetching employees:', err);
            setError('Failed to fetch employees');
        }
    };

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('date', format(selectedDate, 'yyyy-MM-dd'))
                .order('start_time', { ascending: true });

            if (error) throw error;
            setShifts(data || []);
        } catch (err) {
            console.error('Error fetching shifts:', err);
            setError('Failed to fetch shifts');
        } finally {
            setLoading(false);
        }
    };

    const handleAddShift = async () => {
        if (!selectedEmployee || !startTime || !endTime) return;

        try {
            const newShift = {
                employee_id: selectedEmployee,
                date: format(selectedDate, 'yyyy-MM-dd'),
                start_time: format(startTime, 'HH:mm'),
                end_time: format(endTime, 'HH:mm'),
                shift_type: selectedShiftType,
            };

            const { error } = await supabase
                .from('shifts')
                .insert([newShift]);

            if (error) throw error;

            setIsAddShiftOpen(false);
            fetchShifts();
        } catch (err) {
            console.error('Error adding shift:', err);
            setError('Failed to add shift');
        }
    };

    const handleDeleteShift = async (shiftId: number) => {
        try {
            const { error } = await supabase
                .from('shifts')
                .delete()
                .eq('id', shiftId);

            if (error) throw error;
            fetchShifts();
        } catch (err) {
            console.error('Error deleting shift:', err);
            setError('Failed to delete shift');
        }
    };

    const getEmployeeName = (employeeId: string) => {
        const employee = employees.find(emp => emp.employee_id === employeeId);
        return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
                <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={2} 
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    sx={{ mb: 3 }}
                >
                    <DatePicker
                        label="Select Date"
                        value={selectedDate}
                        onChange={(newValue) => newValue && setSelectedDate(newValue)}
                        sx={{ width: { xs: '100%', sm: 200 } }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setIsAddShiftOpen(true)}
                        sx={{
                            height: { sm: 56 },
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        }}
                    >
                        Add Shift
                    </Button>
                </Stack>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        {Object.entries(shiftTypes).map(([type, { label, color }]) => (
                            <Grid item xs={12} md={4} key={type}>
                                <Paper
                                    sx={{
                                        p: 2,
                                        height: '100%',
                                        background: alpha(color, 0.05),
                                        borderRadius: 2,
                                    }}
                                >
                                    <Typography 
                                        variant="h6" 
                                        gutterBottom
                                        sx={{ 
                                            color: color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                        }}
                                    >
                                        <ScheduleIcon />
                                        {label}
                                    </Typography>
                                    <Stack spacing={2}>
                                        {shifts
                                            .filter(shift => shift.shift_type === type)
                                            .map(shift => {
                                                const employee = employees.find(
                                                    emp => emp.employee_id === shift.employee_id
                                                );
                                                return (
                                                    <Card
                                                        key={shift.id}
                                                        sx={{
                                                            p: 1,
                                                            background: alpha(color, 0.1),
                                                        }}
                                                    >
                                                        <Stack
                                                            direction="row"
                                                            alignItems="center"
                                                            spacing={1}
                                                        >
                                                            <Avatar
                                                                src={employee?.avatar_url}
                                                                sx={{ width: 32, height: 32 }}
                                                            >
                                                                {employee?.first_name[0]}
                                                            </Avatar>
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography variant="subtitle2">
                                                                    {getEmployeeName(shift.employee_id)}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="textSecondary"
                                                                >
                                                                    {shift.start_time} - {shift.end_time}
                                                                </Typography>
                                                            </Box>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteShift(shift.id)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                    </Card>
                                                );
                                            })}
                                        {shifts.filter(shift => shift.shift_type === type).length === 0 && (
                                            <Typography
                                                variant="body2"
                                                color="textSecondary"
                                                align="center"
                                                sx={{ py: 2 }}
                                            >
                                                No shifts scheduled
                                            </Typography>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Add Shift Dialog */}
                <Dialog 
                    open={isAddShiftOpen} 
                    onClose={() => setIsAddShiftOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Add New Shift</DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 2 }}>
                            <TextField
                                select
                                label="Employee"
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                fullWidth
                            >
                                {employees.map((employee) => (
                                    <MenuItem key={employee.employee_id} value={employee.employee_id}>
                                        {employee.first_name} {employee.last_name} - {employee.department}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Shift Type"
                                value={selectedShiftType}
                                onChange={(e) => setSelectedShiftType(e.target.value as any)}
                                fullWidth
                            >
                                {Object.entries(shiftTypes).map(([type, { label }]) => (
                                    <MenuItem key={type} value={type}>
                                        {label}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TimePicker
                                label="Start Time"
                                value={startTime}
                                onChange={setStartTime}
                            />

                            <TimePicker
                                label="End Time"
                                value={endTime}
                                onChange={setEndTime}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIsAddShiftOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={handleAddShift}
                            variant="contained"
                            disabled={!selectedEmployee || !startTime || !endTime}
                        >
                            Add Shift
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
};

export default RosterManagement; 