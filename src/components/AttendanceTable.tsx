import React, { useState } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Typography,
    Box,
    alpha,
    useTheme,
    IconButton,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import { Share as ShareIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { sendNotification } from '../utils/whatsappNotification';
import { toast } from 'react-toastify';

interface AttendanceRecord {
    employee_id: string;
    employees: {
        first_name: string;
        last_name: string;
        department: string;
    };
    created_at: string;
}

interface AttendanceTableProps {
    records: AttendanceRecord[];
    title: string;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ records, title }) => {
    const theme = useTheme();
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [phoneError, setPhoneError] = useState<string | null>(null);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const formatAttendanceRecordsForSMS = (records: AttendanceRecord[]): string => {
        const dateRange = records.length > 0 ? 
            `${format(new Date(records[0].created_at), 'MMM dd')} - ${format(new Date(records[records.length - 1].created_at), 'MMM dd, yyyy')}` :
            'No records';

        let message = `Attendance Records (${dateRange})\n\n`;
        
        records.forEach((record, index) => {
            if (index < 10) { // Limit to first 10 records to avoid SMS length issues
                message += `${record.employees.first_name} ${record.employees.last_name}\n`;
                message += `Time: ${format(new Date(record.created_at), 'hh:mm a')}\n`;
                if (index < records.length - 1) message += '\n';
            }
        });

        if (records.length > 10) {
            message += `\n... and ${records.length - 10} more records`;
        }

        return message;
    };

    const validatePhoneNumber = (phone: string): boolean => {
        // Remove any whitespace and validate the number
        const cleanNumber = phone.trim();
        // Validate international format with country code
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        return phoneRegex.test(cleanNumber);
    };

    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove any whitespace from input
        const value = e.target.value.trim();
        setPhoneNumber(value);
        
        if (value && !validatePhoneNumber(value)) {
            setPhoneError('Please enter a valid WhatsApp number with country code (e.g., +1234567890)');
        } else {
            setPhoneError(null);
        }
    };

    const handleShareViaWhatsApp = async () => {
        try {
            if (!validatePhoneNumber(phoneNumber)) {
                setPhoneError('Please enter a valid WhatsApp number with country code (e.g., +1234567890)');
                return;
            }

            setLoading(true);
            setPhoneError(null);
            const message = formatAttendanceRecordsForSMS(records);
            
            await sendNotification({
                employeeName: 'Admin',
                phoneNumber: phoneNumber.trim(),
                customMessage: message,
                isAttendanceReport: true
            });

            toast.success('Attendance records shared successfully via WhatsApp');
            setShareDialogOpen(false);
            setPhoneNumber('');
        } catch (error) {
            console.error('Error sharing attendance records:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to share attendance records';
            setPhoneError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper 
            elevation={0}
            sx={{
                width: '100%',
                overflow: 'hidden',
                bgcolor: theme => alpha(theme.palette.background.paper, 0.7),
                backdropFilter: 'blur(20px)',
                borderRadius: 2,
                border: theme => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
        >
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        {title}
                    </Typography>
                    <Tooltip title="Share via WhatsApp">
                        <IconButton 
                            onClick={() => setShareDialogOpen(true)}
                            sx={{
                                bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                                '&:hover': {
                                    bgcolor: theme => alpha(theme.palette.primary.main, 0.2),
                                }
                            }}
                        >
                            <ShareIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
                <TableContainer sx={{ maxHeight: 440 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        color: 'white'
                                    }}
                                >
                                    Employee ID
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        color: 'white'
                                    }}
                                >
                                    Name
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        color: 'white'
                                    }}
                                >
                                    Department
                                </TableCell>
                                <TableCell 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        color: 'white'
                                    }}
                                >
                                    Scan Time
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {records
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((record, index) => (
                                    <TableRow
                                        key={`${record.employee_id}-${record.created_at}`}
                                        sx={{
                                            '&:nth-of-type(odd)': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                            },
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                            },
                                        }}
                                    >
                                        <TableCell>{record.employee_id}</TableCell>
                                        <TableCell>
                                            {`${record.employees.first_name} ${record.employees.last_name}`}
                                        </TableCell>
                                        <TableCell>{record.employees.department}</TableCell>
                                        <TableCell>
                                            {format(new Date(record.created_at), 'MMM dd, yyyy hh:mm a')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 100]}
                    component="div"
                    count={records.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Box>

            {/* Share Dialog */}
            <Dialog 
                open={shareDialogOpen} 
                onClose={() => !loading && setShareDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        bgcolor: theme => alpha(theme.palette.background.paper, 0.9),
                        backdropFilter: 'blur(20px)',
                    }
                }}
            >
                <DialogTitle>Share Attendance Records</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enter the WhatsApp number to share the attendance records.
                    </Typography>
                    <TextField
                        label="WhatsApp Number"
                        type="tel"
                        fullWidth
                        value={phoneNumber}
                        onChange={handlePhoneNumberChange}
                        placeholder="+1234567890"
                        disabled={loading}
                        error={!!phoneError}
                        helperText={phoneError || "Include country code (e.g., +1 for USA)"}
                        sx={{ mt: 1 }}
                        InputProps={{
                            sx: {
                                '&.Mui-error': {
                                    animation: 'shake 0.5s',
                                    '@keyframes shake': {
                                        '0%, 100%': { transform: 'translateX(0)' },
                                        '25%': { transform: 'translateX(-5px)' },
                                        '75%': { transform: 'translateX(5px)' },
                                    },
                                },
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button 
                        onClick={() => {
                            setShareDialogOpen(false);
                            setPhoneError(null);
                            setPhoneNumber('');
                        }} 
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleShareViaWhatsApp}
                        disabled={!phoneNumber || loading || !!phoneError}
                        sx={{
                            background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        }}
                    >
                        {loading ? 'Sending...' : 'Share via WhatsApp'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default AttendanceTable; 