import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Tooltip,
    CircularProgress,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Stack,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    QrCode as QrCodeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { toast } from 'react-toastify';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';

interface Employee {
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    position: string;
    created_at: string;
}

const EmployeeList: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [department, setDepartment] = useState('all');
    const [departments, setDepartments] = useState<string[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const navigate = useNavigate();
    const theme = useTheme();

    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                setEmployees(data);
                const uniqueDepts = Array.from(new Set(data
                    .filter(emp => emp.department)
                    .map(emp => emp.department)
                ));
                setDepartments(uniqueDepts);
                toast.success('Employees loaded successfully');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to fetch employees');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleDeleteEmployee = async () => {
        if (!selectedEmployee) return;

        try {
            setProcessingId(selectedEmployee.id);
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', selectedEmployee.id);

            if (error) throw error;

            toast.success('Employee deleted successfully');
            await fetchEmployees();
            setDeleteDialogOpen(false);
            setSelectedEmployee(null);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to delete employee');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDownloadQR = async (employee: Employee) => {
        try {
            setProcessingId(employee.id);
            const qrData = JSON.stringify({
                id: employee.employee_id,
                name: `${employee.first_name} ${employee.last_name}`,
                email: employee.email
            });

            const qrUrl = await QRCode.toDataURL(qrData, {
                errorCorrectionLevel: 'H',
                margin: 1,
                width: 300
            });

            const blob = await (await fetch(qrUrl)).blob();
            saveAs(blob, `${employee.employee_id}-qr.png`);
            toast.success('QR Code downloaded successfully');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to generate QR code');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteAllEmployees = async () => {
        try {
            setIsDeletingAll(true);
            const { error } = await supabase
                .from('employees')
                .delete()
                .neq('id', ''); // Delete all records

            if (error) throw error;

            toast.success('All employees deleted successfully');
            await fetchEmployees();
            setDeleteAllDialogOpen(false);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to delete employees');
        } finally {
            setIsDeletingAll(false);
        }
    };

    const filteredEmployees = employees.filter(employee => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchLower) ||
            employee.email.toLowerCase().includes(searchLower) ||
            employee.employee_id.toLowerCase().includes(searchLower);

        const matchesDepartment = department === 'all' || employee.department === department;

        return matchesSearch && matchesDepartment;
    });

    return (
        <Box sx={{
            minHeight: '100vh',
            background: `linear-gradient(135deg, 
                ${alpha(theme.palette.primary.light, 0.15)} 0%, 
                ${alpha(theme.palette.secondary.light, 0.15)} 50%,
                ${alpha(theme.palette.primary.light, 0.15)} 100%)`,
            position: 'relative',
            p: { xs: 1, sm: 2, md: 4 },
            overflow: 'hidden',
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
                    radial-gradient(circle at 0% 0%, ${alpha('#7c3aed', 0.15)} 0%, transparent 30%),
                    radial-gradient(circle at 100% 0%, ${alpha('#2563eb', 0.15)} 0%, transparent 30%),
                    radial-gradient(circle at 100% 100%, ${alpha('#db2777', 0.15)} 0%, transparent 30%),
                    radial-gradient(circle at 0% 100%, ${alpha('#9333ea', 0.15)} 0%, transparent 30%)
                `,
                animation: 'gradient 15s ease-in-out infinite',
            },
            '@keyframes gradient': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
            },
        }}>
            <Card sx={{
                maxWidth: 1200,
                margin: '0 auto',
                width: '100%',
                backdropFilter: 'blur(10px)',
                background: alpha(theme.palette.background.paper, 0.8),
                borderRadius: 4,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                boxShadow: `
                    0 4px 6px ${alpha(theme.palette.primary.main, 0.1)},
                    0 10px 40px ${alpha(theme.palette.primary.main, 0.1)}
                `,
                position: 'relative',
                overflow: 'visible',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: `linear-gradient(90deg, 
                        ${theme.palette.primary.main},
                        ${theme.palette.secondary.main},
                        ${theme.palette.primary.main}
                    )`,
                    borderRadius: '4px 4px 0 0',
                },
            }}>
                <CardContent sx={{ 
                    p: { xs: 1, sm: 2, md: 4 }
                }}>
                    <Stack 
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between" 
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        spacing={{ xs: 2, sm: 0 }}
                        sx={{ mb: 3 }}
                    >
                        <Typography 
                            variant="h5" 
                            component="h1"
                            sx={{ 
                                fontSize: { xs: '1.25rem', sm: '1.5rem' }
                            }}
                        >
                            Employee List ({filteredEmployees.length})
                        </Typography>
                        <Stack 
                            direction={{ xs: 'column', sm: 'row' }} 
                            spacing={{ xs: 1, sm: 2 }}
                            width={{ xs: '100%', sm: 'auto' }}
                        >
                            <Button
                                fullWidth
                                variant="contained"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => setDeleteAllDialogOpen(true)}
                                disabled={employees.length === 0}
                                sx={{ 
                                    minWidth: { xs: '100%', sm: 120 }
                                }}
                            >
                                Delete All
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => navigate('/employees/new')}
                                sx={{ 
                                    minWidth: { xs: '100%', sm: 120 }
                                }}
                            >
                                Add Employee
                            </Button>
                        </Stack>
                    </Stack>

                    <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        spacing={{ xs: 2, sm: 2 }} 
                        sx={{ mb: 3 }}
                    >
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <FormControl 
                            size="small" 
                            sx={{ 
                                minWidth: { xs: '100%', sm: 200 }
                            }}
                        >
                            <InputLabel>Department</InputLabel>
                            <Select
                                value={department}
                                label="Department"
                                onChange={(e) => setDepartment(e.target.value)}
                            >
                                <MenuItem value="all">All Departments</MenuItem>
                                {departments.map(dept => (
                                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <TableContainer 
                        component={Paper}
                        sx={{
                            borderRadius: 2,
                            overflow: 'auto',
                            '& .MuiTable-root': {
                                minWidth: 800,
                            },
                            '& .MuiTableHead-root': {
                                background: `linear-gradient(45deg, 
                                    ${alpha(theme.palette.primary.main, 0.05)},
                                    ${alpha(theme.palette.secondary.main, 0.05)}
                                )`,
                            },
                            '& .MuiTableRow-root:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            },
                        }}
                    >
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Name</TableCell>
                                    <TableCell>ID</TableCell>
                                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
                                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Department</TableCell>
                                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Position</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEmployees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            No employees found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEmployees.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                                {employee.first_name} {employee.last_name}
                                            </TableCell>
                                            <TableCell>{employee.employee_id}</TableCell>
                                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                                {employee.email}
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                                <Chip 
                                                    label={employee.department} 
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                                {employee.position}
                                            </TableCell>
                                            <TableCell>
                                                <Stack 
                                                    direction="row" 
                                                    spacing={{ xs: 0.5, sm: 1 }}
                                                    justifyContent="center"
                                                >
                                                    <Tooltip title="Download QR Code">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDownloadQR(employee)}
                                                            disabled={processingId === employee.id}
                                                        >
                                                            {processingId === employee.id ? (
                                                                <CircularProgress size={20} />
                                                            ) : (
                                                                <DownloadIcon />
                                                            )}
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="View QR Code">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => window.open(`/qr/${employee.employee_id}`, '_blank')}
                                                        >
                                                            <QrCodeIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Edit">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => navigate(`/employees/edit/${employee.employee_id}`)}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => {
                                                                setSelectedEmployee(employee);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        backdropFilter: 'blur(20px)',
                        background: alpha(theme.palette.background.paper, 0.9),
                        boxShadow: `
                            0 4px 6px ${alpha(theme.palette.error.main, 0.1)},
                            0 10px 40px ${alpha(theme.palette.error.main, 0.2)}
                        `,
                        border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                    }
                }}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete {selectedEmployee?.first_name} {selectedEmployee?.last_name}?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={!!processingId}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDeleteEmployee}
                        color="error"
                        variant="contained"
                        disabled={!!processingId}
                    >
                        {processingId ? <CircularProgress size={20} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteAllDialogOpen}
                onClose={() => setDeleteAllDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        backdropFilter: 'blur(20px)',
                        background: alpha(theme.palette.background.paper, 0.9),
                        boxShadow: `
                            0 4px 6px ${alpha(theme.palette.error.main, 0.1)},
                            0 10px 40px ${alpha(theme.palette.error.main, 0.2)}
                        `,
                        border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                    }
                }}
            >
                <DialogTitle>Delete All Employees</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete all {employees.length} employees? This action cannot be undone.
                    </Typography>
                    <Alert severity="warning">
                        This will permanently delete all employee records and their associated data.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setDeleteAllDialogOpen(false)}
                        disabled={isDeletingAll}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDeleteAllEmployees}
                        color="error"
                        variant="contained"
                        disabled={isDeletingAll}
                    >
                        {isDeletingAll ? <CircularProgress size={20} /> : 'Delete All'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmployeeList; 