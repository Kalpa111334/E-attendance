import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
    Search as SearchIcon,
    Download as DownloadIcon,
    QrCode as QrCodeIcon,
} from '@mui/icons-material';
import { supabase } from '../config/supabase';
import type { Employee } from '../types/employee';
import QRCode from 'qrcode';

const EmployeeDashboard: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [department, setDepartment] = useState('all');
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setEmployees(data || []);
            // Extract unique departments
            const uniqueDepartments = [...new Set(data?.map(emp => emp.department) || [])];
            setDepartments(uniqueDepartments);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadQRCode = async (employee: Employee) => {
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(employee.employee_id, {
                margin: 1,
                scale: 8,
                errorCorrectionLevel: 'H',
                type: 'image/png'
            });
            
            const link = document.createElement('a');
            link.href = qrCodeDataUrl;
            link.download = `qr-${employee.employee_id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Failed to generate QR code:', err);
        }
    };

    const filteredEmployees = employees.filter(employee => {
        const matchesSearch = (
            employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const matchesDepartment = department === 'all' || employee.department === department;

        return matchesSearch && matchesDepartment;
    });

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ mt: 4, mx: 2 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
            <Card>
                <CardContent>
                    <Typography variant="h5" gutterBottom>
                        Employee Dashboard
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            label="Search"
                            variant="outlined"
                            size="small"
                            fullWidth
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

                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Department</InputLabel>
                            <Select
                                value={department}
                                label="Department"
                                onChange={(e) => setDepartment(e.target.value)}
                            >
                                <MenuItem value="all">All Departments</MenuItem>
                                {departments.map((dept) => (
                                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Department</TableCell>
                                    <TableCell>Position</TableCell>
                                    <TableCell>Employee ID</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredEmployees.map((employee) => (
                                    <TableRow key={employee.id}>
                                        <TableCell>
                                            {employee.first_name} {employee.last_name}
                                        </TableCell>
                                        <TableCell>{employee.email}</TableCell>
                                        <TableCell>{employee.department}</TableCell>
                                        <TableCell>{employee.position}</TableCell>
                                        <TableCell>{employee.employee_id}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Download QR Code">
                                                <IconButton
                                                    onClick={() => downloadQRCode(employee)}
                                                    size="small"
                                                >
                                                    <DownloadIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="View QR Code">
                                                <IconButton
                                                    onClick={() => window.open(`/qr/${employee.employee_id}`, '_blank')}
                                                    size="small"
                                                >
                                                    <QrCodeIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
};

export default EmployeeDashboard; 