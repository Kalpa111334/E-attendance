import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, TextField,
    Button, IconButton, Avatar, Chip, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Alert, useTheme, alpha,
    InputAdornment, Menu, MenuItem, Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    MoreVert as MoreVertIcon,
    QrCode as QrCodeIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Sort as SortIcon
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    position: string;
    avatar_url?: string;
    status: 'active' | 'inactive';
    created_at: string;
}

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const [sortBy, setSortBy] = useState<'name' | 'department' | 'recent'>('recent');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');

    const theme = useTheme();
    const navigate = useNavigate();

    // Fetch employees
    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const { data, error: supabaseError } = await supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;
            setEmployees(data || []);
        } catch (err) {
            setError('Failed to fetch employees');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Handle QR Code generation
    const handleGenerateQR = async (employee: Employee) => {
        try {
            setProcessingId(employee.id.toString());
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

            const link = document.createElement('a');
            link.href = qrUrl;
            link.download = `${employee.employee_id}-qr.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            setError('Failed to generate QR code');
        } finally {
            setProcessingId(null);
        }
    };

    // Handle employee deletion
    const handleDelete = async () => {
        if (!selectedEmployee) return;

        try {
            setProcessingId(selectedEmployee.id.toString());
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', selectedEmployee.id);

            if (error) throw error;
            await fetchEmployees();
            setIsDeleteDialogOpen(false);
            setSelectedEmployee(null);
        } catch (err) {
            setError('Failed to delete employee');
        } finally {
            setProcessingId(null);
        }
    };

    // Filter and sort employees
    const filteredEmployees = employees
        .filter(employee => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchLower) ||
                employee.email.toLowerCase().includes(searchLower) ||
                employee.employee_id.toLowerCase().includes(searchLower);
            
            const matchesDepartment = filterDepartment === 'all' || 
                employee.department === filterDepartment;

            return matchesSearch && matchesDepartment;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
                case 'department':
                    return a.department.localeCompare(b.department);
                default:
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });

    // Get unique departments
    const departments = [...new Set(employees.map(emp => emp.department))];

    return (
        <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
            {/* Header Section */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 4 
            }}>
                <Typography variant="h4" fontWeight="bold">
                    Employee Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/employees/new')}
                    sx={{
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        boxShadow: `0 2px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
                    }}
                >
                    Add Employee
                </Button>
            </Box>

            {/* Search and Filter Section */}
            <Card sx={{ mb: 4, boxShadow: theme.shadows[2] }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Button
                                fullWidth
                                startIcon={<FilterIcon />}
                                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                                variant="outlined"
                            >
                                Filter
                            </Button>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Button
                                fullWidth
                                startIcon={<SortIcon />}
                                onClick={(e) => setAnchorEl(e.currentTarget)}
                                variant="outlined"
                            >
                                Sort By
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Employee Cards */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            ) : (
                <Grid container spacing={3}>
                    {filteredEmployees.map((employee) => (
                        <Grid item xs={12} sm={6} md={4} key={employee.id}>
                            <Card 
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: theme.shadows[8],
                                    },
                                }}
                            >
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Avatar
                                            src={employee.avatar_url}
                                            sx={{ 
                                                width: 56, 
                                                height: 56,
                                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                            }}
                                        >
                                            {employee.first_name[0]}
                                        </Avatar>
                                        <Box sx={{ ml: 2, flex: 1 }}>
                                            <Typography variant="h6">
                                                {employee.first_name} {employee.last_name}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                {employee.position}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={employee.status}
                                            color={employee.status === 'active' ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </Box>

                                    <Typography variant="body2" color="textSecondary" gutterBottom>
                                        {employee.email}
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Chip
                                            label={employee.department}
                                            size="small"
                                            sx={{
                                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                                color: 'white',
                                            }}
                                        />
                                        <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                                            ID: {employee.employee_id}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        mt: 'auto', 
                                        pt: 2,
                                        borderTop: `1px solid ${theme.palette.divider}`
                                    }}>
                                        <Tooltip title="Generate QR Code">
                                            <IconButton 
                                                onClick={() => handleGenerateQR(employee)}
                                                disabled={processingId === employee.id.toString()}
                                            >
                                                {processingId === employee.id.toString() ? 
                                                    <CircularProgress size={24} /> : 
                                                    <QrCodeIcon />
                                                }
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit">
                                            <IconButton 
                                                onClick={() => navigate(`/employees/edit/${employee.employee_id}`)}
                                                color="primary"
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton 
                                                onClick={() => {
                                                    setSelectedEmployee(employee);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Sort Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem 
                    onClick={() => {
                        setSortBy('recent');
                        setAnchorEl(null);
                    }}
                    selected={sortBy === 'recent'}
                >
                    Most Recent
                </MenuItem>
                <MenuItem 
                    onClick={() => {
                        setSortBy('name');
                        setAnchorEl(null);
                    }}
                    selected={sortBy === 'name'}
                >
                    Name
                </MenuItem>
                <MenuItem 
                    onClick={() => {
                        setSortBy('department');
                        setAnchorEl(null);
                    }}
                    selected={sortBy === 'department'}
                >
                    Department
                </MenuItem>
            </Menu>

            {/* Filter Menu */}
            <Menu
                anchorEl={filterAnchorEl}
                open={Boolean(filterAnchorEl)}
                onClose={() => setFilterAnchorEl(null)}
            >
                <MenuItem 
                    onClick={() => {
                        setFilterDepartment('all');
                        setFilterAnchorEl(null);
                    }}
                    selected={filterDepartment === 'all'}
                >
                    All Departments
                </MenuItem>
                <Divider />
                {departments.map(dept => (
                    <MenuItem 
                        key={dept}
                        onClick={() => {
                            setFilterDepartment(dept);
                            setFilterAnchorEl(null);
                        }}
                        selected={filterDepartment === dept}
                    >
                        {dept}
                    </MenuItem>
                ))}
            </Menu>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
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
                        onClick={() => setIsDeleteDialogOpen(false)}
                        disabled={!!processingId}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDelete}
                        color="error"
                        variant="contained"
                        disabled={!!processingId}
                    >
                        {processingId ? <CircularProgress size={24} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmployeeManagement; 