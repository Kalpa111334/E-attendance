import React from 'react';
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
import { sendSMSNotification } from '../utils/smsNotification';
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

    const handleShareViaSMS = async () => {
        try {
            setLoading(true);
            const message = formatAttendanceRecordsForSMS(records);
            
            const success = await sendSMSNotification({
                employeeName: 'Admin',
                phoneNumber,
                customMessage: message,
                isAttendanceReport: true
            });

            if (success) {
                toast.success('Attendance records shared successfully');
                setShareDialogOpen(false);
                setPhoneNumber('');
            } else {
                toast.error('Failed to share attendance records');
            }
        } catch (error) {
            console.error('Error sharing attendance records:', error);
            toast.error('Failed to share attendance records');
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
                    <Tooltip title="Share via SMS">
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
                        Enter the phone number to send the attendance records via SMS.
                    </Typography>
                    <TextField
                        label="Phone Number"
                        type="tel"
                        fullWidth
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        disabled={loading}
                        sx={{ mt: 1 }}
                        helperText="Include country code (e.g., +1 for USA)"
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button 
                        onClick={() => setShareDialogOpen(false)} 
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleShareViaSMS}
                        disabled={!phoneNumber || loading}
                        sx={{
                            background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        }}
                    >
                        {loading ? 'Sending...' : 'Send SMS'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default AttendanceTable; 