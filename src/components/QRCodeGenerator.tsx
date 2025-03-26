import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { TextField, Button, Box, Card, CardContent, Typography, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { supabase } from '../config/supabase';
import type { Employee, EmployeeFormData, Department } from '../types/employee';
import { SelectChangeEvent } from '@mui/material/Select';

const QRCodeGenerator: React.FC = () => {
    const [employee, setEmployee] = useState<EmployeeFormData>({
        first_name: '',
        last_name: '',
        email: '',
        department_id: '',
        position: '',
    });
    const [departments, setDepartments] = useState<Department[]>([]);
    const [generatedId, setGeneratedId] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name');

            if (error) throw error;
            setDepartments(data || []);
        } catch (err: any) {
            console.error('Error fetching departments:', err);
            setErrors(prev => ({ ...prev, department: 'Failed to load departments' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!employee.first_name) newErrors.first_name = 'First name is required';
        if (!employee.last_name) newErrors.last_name = 'Last name is required';
        if (!employee.email) {
            newErrors.email = 'Email is required';
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(employee.email)) {
            newErrors.email = 'Invalid email address';
        }
        if (!employee.department_id) newErrors.department = 'Department is required';
        if (!employee.position) newErrors.position = 'Position is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const generateQRCode = async () => {
        if (!validateForm()) return;

        try {
            const { data, error } = await supabase
                .from('employees')
                .insert([employee])
                .select()
                .single();

            if (error) throw error;
            
            setGeneratedId(data.employee_id);
            setNotification({
                type: 'success',
                message: 'Employee QR code generated successfully!'
            });
        } catch (error: any) {
            setNotification({
                type: 'error',
                message: error.message || 'Failed to generate QR code'
            });
            console.error('Error creating employee:', error);
        }
    };

    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEmployee(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleDepartmentChange = (e: SelectChangeEvent<string>) => {
        const { value } = e.target;
        setEmployee(prev => ({ ...prev, department_id: value }));
        if (errors.department) {
            setErrors(prev => ({ ...prev, department: '' }));
        }
    };

    const handleCloseNotification = () => {
        setNotification(null);
    };

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
            <Card>
                <CardContent>
                    <Typography variant="h5" gutterBottom>
                        Generate Employee QR Code
                    </Typography>
                    <Box component="form" sx={{ '& .MuiTextField-root': { m: 1, width: '100%' } }}>
                        <TextField
                            name="first_name"
                            label="First Name"
                            value={employee.first_name}
                            onChange={handleTextInputChange}
                            error={!!errors.first_name}
                            helperText={errors.first_name}
                            required
                        />
                        <TextField
                            name="last_name"
                            label="Last Name"
                            value={employee.last_name}
                            onChange={handleTextInputChange}
                            error={!!errors.last_name}
                            helperText={errors.last_name}
                            required
                        />
                        <TextField
                            name="email"
                            label="Email"
                            type="email"
                            value={employee.email}
                            onChange={handleTextInputChange}
                            error={!!errors.email}
                            helperText={errors.email}
                            required
                        />
                        <FormControl fullWidth required sx={{ m: 1 }}>
                            <InputLabel>Department</InputLabel>
                            <Select
                                name="department_id"
                                value={employee.department_id}
                                label="Department"
                                onChange={handleDepartmentChange}
                                error={!!errors.department}
                            >
                                {departments.map((dept) => (
                                    <MenuItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            name="position"
                            label="Position"
                            value={employee.position}
                            onChange={handleTextInputChange}
                            error={!!errors.position}
                            helperText={errors.position}
                            required
                        />
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={generateQRCode}
                                sx={{ mt: 2 }}
                            >
                                Generate QR Code
                            </Button>
                        </Box>
                        {generatedId && (
                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <QRCode value={generatedId} size={200} />
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                    Employee ID: {generatedId}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>
            <Snackbar
                open={!!notification}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={handleCloseNotification} 
                    severity={notification?.type || 'info'}
                    sx={{ width: '100%' }}
                >
                    {notification?.message || ''}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default QRCodeGenerator; 