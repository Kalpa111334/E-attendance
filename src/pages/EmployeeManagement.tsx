import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, TextField,
    Button, IconButton, Avatar, Chip, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Alert, useTheme, alpha,
    InputAdornment, Menu, MenuItem, Divider,
    Tab, Tabs, Stack
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
    Sort as SortIcon,
    CloudUpload as UploadIcon,
    Schedule as ScheduleIcon
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import BulkEmployeeUpload from '../components/BulkEmployeeUpload';
import RosterManagement from '../components/RosterManagement';
import { useSnackbar } from 'notistack';
import { debounce } from 'lodash';
import UniversalQRCode from '../components/UniversalQRCode';

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
    scans?: Array<{ id: number; created_at: string }>;
    scan_count?: number;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`employee-tabpanel-${index}`}
            aria-labelledby={`employee-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
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
    const [tabValue, setTabValue] = useState(0);

    const theme = useTheme();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    // Fetch employees
    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('employees')
                .select(`
                    *,
                    scans (
                        id,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            // Transform data to include scan count
            const employeesWithMetadata = data?.map(emp => ({
                ...emp,
                scan_count: emp.scans?.length || 0
            })) || [];

            setEmployees(employeesWithMetadata);
            setError(null);
        } catch (err) {
            console.error('Error fetching employees:', err);
            setError('Failed to fetch employees');
            enqueueSnackbar('Failed to load employees', { 
                variant: 'error',
                autoHideDuration: 5000 
            });
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
        try {
            if (!selectedEmployee) {
                throw new Error('No employee selected');
            }

            setProcessingId(selectedEmployee.id.toString());

            // Delete employee and related records in a transaction
            const { data, error } = await supabase.rpc('delete_employee_with_records', {
                p_employee_id: selectedEmployee.employee_id
            });

            if (error) {
                console.error('Delete error:', error);
                throw new Error(error.message || 'Failed to delete employee');
            }

            // Optimistic update - remove from local state immediately
            setEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
            setSelectedEmployee(null);
            setIsDeleteDialogOpen(false);
            enqueueSnackbar('Employee deleted successfully', { 
                variant: 'success',
                autoHideDuration: 3000 
            });

        } catch (error) {
            console.error('Delete operation failed:', error);
            enqueueSnackbar(
                error instanceof Error ? error.message : 'Failed to delete employee',
                { variant: 'error', autoHideDuration: 5000 }
            );
            // Refresh the list in case of error to ensure consistency
            await fetchEmployees();
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

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    // Add debounced search
    const debouncedSearch = useCallback(
        debounce((term: string) => {
            setSearchTerm(term);
        }, 300),
        []
    );

    // Add bulk delete functionality
    const handleBulkDelete = async (selectedIds: number[]) => {
        try {
            setLoading(true);
            const { error } = await supabase.rpc('delete_multiple_employees', {
                p_employee_ids: selectedIds
            });

            if (error) throw error;

            // Optimistic update
            setEmployees(prev => prev.filter(emp => !selectedIds.includes(emp.id)));
            enqueueSnackbar(`Successfully deleted ${selectedIds.length} employees`, {
                variant: 'success'
            });
        } catch (err) {
            console.error('Bulk delete error:', err);
            enqueueSnackbar('Failed to delete selected employees', { 
                variant: 'error' 
            });
            await fetchEmployees(); // Refresh on error
        } finally {
            setLoading(false);
        }
    };

    // Add export functionality
    const handleExport = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .csv();

            if (error) throw error;

            // Create and download CSV file
            const blob = new Blob([data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            enqueueSnackbar('Employee data exported successfully', {
                variant: 'success'
            });
        } catch (err) {
            console.error('Export error:', err);
            enqueueSnackbar('Failed to export employee data', { 
                variant: 'error' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
            <Box sx={{ 
            maxWidth: 1200, 
            mx: 'auto', 
            mt: { xs: 2, sm: 3, md: 4 }, 
            p: { xs: 1, sm: 2, md: 3 }
        }}>
            <Card>
                <CardContent>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs 
                            value={tabValue} 
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                    sx={{
                                '& .MuiTab-root': {
                                    minHeight: { xs: 48, sm: 64 },
                                    fontSize: { xs: '0.875rem', sm: '1rem' },
                                    fontWeight: 600,
                                    minWidth: { xs: 'auto', sm: 160 },
                                    px: { xs: 2, sm: 3 },
                                },
                                '& .Mui-selected': {
                                    color: theme.palette.primary.main,
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: theme.palette.primary.main,
                                    height: 3,
                                },
                            }}
                        >
                            <Tab 
                                icon={<QrCodeIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />} 
                                iconPosition="start" 
                                label="Employee List" 
                            />
                            <Tab 
                                icon={<UploadIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />} 
                                iconPosition="start" 
                                label="Bulk Upload" 
                            />
                            <Tab 
                                icon={<ScheduleIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />} 
                                iconPosition="start" 
                                label="Roster"
                                sx={{
                                    '&.Mui-selected': {
                                        background: alpha(theme.palette.primary.main, 0.1),
                                    },
                                }}
                            />
                        </Tabs>
            </Box>

                    <TabPanel value={tabValue} index={0}>
                        <Stack 
                            direction={{ xs: 'column', sm: 'row' }} 
                            spacing={{ xs: 2, sm: 3 }} 
                            sx={{ mb: { xs: 2, sm: 3 } }}
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
                            <Button
                                startIcon={<FilterIcon />}
                                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                                variant="outlined"
                                sx={{ 
                                    minWidth: { xs: '100%', sm: 120 },
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Filter
                            </Button>
                            <Button
                                startIcon={<SortIcon />}
                                onClick={(e) => setAnchorEl(e.currentTarget)}
                                variant="outlined"
                                sx={{ 
                                    minWidth: { xs: '100%', sm: 120 },
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Sort By
                            </Button>
                        </Stack>

            {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: { xs: 2, sm: 4 } }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            ) : (
                            <Grid container spacing={{ xs: 2, sm: 3 }}>
                    {filteredEmployees.map((employee) => (
                        <Grid item xs={12} sm={6} md={4} key={employee.id}>
                            <Card 
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                                    transform: { xs: 'none', sm: 'translateY(-4px)' },
                                        boxShadow: theme.shadows[8],
                                    },
                                }}
                            >
                                <CardContent>
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    mb: { xs: 1, sm: 2 },
                                                    flexDirection: { xs: 'column', sm: 'row' },
                                                    textAlign: { xs: 'center', sm: 'left' }
                                                }}>
                                        <Avatar
                                            src={employee.avatar_url}
                                            sx={{ 
                                                            width: { xs: 48, sm: 56 }, 
                                                            height: { xs: 48, sm: 56 },
                                                            mb: { xs: 1, sm: 0 },
                                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                            }}
                                        >
                                            {employee.first_name[0]}
                                        </Avatar>
                                                    <Box sx={{ 
                                                        ml: { xs: 0, sm: 2 },
                                                        flex: 1 
                                                    }}>
                                                        <Typography variant="h6" sx={{
                                                            fontSize: { xs: '1rem', sm: '1.25rem' }
                                                        }}>
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
                                                        sx={{ 
                                                            mt: { xs: 1, sm: 0 },
                                                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                        }}
                                        />
                                    </Box>

                                                <Typography 
                                                    variant="body2" 
                                                    color="textSecondary" 
                                                    sx={{ 
                                                        mb: { xs: 1, sm: 2 },
                                                        textAlign: { xs: 'center', sm: 'left' }
                                                    }}
                                                >
                                        {employee.email}
                                    </Typography>

                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    mb: { xs: 1, sm: 2 },
                                                    justifyContent: { xs: 'center', sm: 'flex-start' }
                                                }}>
                                        <Chip
                                            label={employee.department}
                                            size="small"
                                            sx={{
                                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                                color: 'white',
                                                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                        }}
                                                    />
                                                    <Typography 
                                                        variant="caption" 
                                                        color="textSecondary" 
                                                        sx={{ ml: 1 }}
                                                    >
                                            ID: {employee.employee_id}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ 
                                        display: 'flex', 
                                                    justifyContent: 'space-around',
                                                    mt: { xs: 2, sm: 'auto' }, 
                                                    pt: { xs: 1, sm: 2 },
                                        borderTop: `1px solid ${theme.palette.divider}`
                                    }}>
                                        <Tooltip title="Generate QR Code">
                                            <IconButton 
                                                onClick={() => handleGenerateQR(employee)}
                                                disabled={processingId === employee.id.toString()}
                                                            sx={{ 
                                                                '& svg': { 
                                                                    fontSize: { xs: 20, sm: 24 } 
                                                                }
                                                            }}
                                            >
                                                {processingId === employee.id.toString() ? 
                                                                <CircularProgress size={20} /> : 
                                                    <QrCodeIcon />
                                                }
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit">
                                            <IconButton 
                                                onClick={() => navigate(`/employees/edit/${employee.employee_id}`)}
                                                color="primary"
                                                            sx={{ 
                                                                '& svg': { 
                                                                    fontSize: { xs: 20, sm: 24 } 
                                                                }
                                                            }}
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
                                                            sx={{ 
                                                                '& svg': { 
                                                                    fontSize: { xs: 20, sm: 24 } 
                                                                }
                                                            }}
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
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <BulkEmployeeUpload />
                    </TabPanel>

                    <TabPanel value={tabValue} index={2}>
                        <Box sx={{ 
                            background: theme.palette.background.paper,
                            borderRadius: 2,
                            boxShadow: theme.shadows[1],
                            p: { xs: 2, sm: 3 },
                            minHeight: 400,
                        }}>
                            <RosterManagement />
                        </Box>
                    </TabPanel>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '90%', sm: 'auto' },
                        minWidth: { sm: 400 },
                        p: { xs: 1, sm: 2 }
                    }
                }}
            >
                <DialogTitle sx={{ 
                    fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }}>
                    Confirm Delete
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        Are you sure you want to delete {selectedEmployee?.first_name} {selectedEmployee?.last_name}?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: { xs: 1, sm: 2 } }}>
                    <Button 
                        onClick={() => setIsDeleteDialogOpen(false)}
                        disabled={!!processingId}
                        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDelete}
                        color="error"
                        variant="contained"
                        disabled={!!processingId}
                        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                        {processingId ? <CircularProgress size={20} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmployeeManagement; 