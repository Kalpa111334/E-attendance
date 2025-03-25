import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    SelectChangeEvent,
} from '@mui/material';
import { supabase } from '../config/supabase';
import type { Employee, EmployeeFormData } from '../types/employee';
import { useNavigate } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';

interface EmployeeFormProps {
    employee_id?: string; // If provided, we're in edit mode
}

const DEPARTMENTS = [
    'Dutch Activity',
    'Kitchen',
    'Food & Beverage Department',
    'Butchery',
    'Operations',
    'Maintenance',
    'Reservations',
    'House Keeping',
    'Pastry Kitchen',
    'Stores',
    'Purchasing & Stores',
    'Accounts Department',
    'IT'
];

const POSITIONS = [
    'Manager',
    'Senior Engineer',
    'Software Engineer',
    'Marketing Specialist',
    'Sales Representative',
    'HR Coordinator',
    'Financial Analyst',
    'Operations Manager',
    'Support Specialist',
    'Research Scientist',
];

const initialFormData: EmployeeFormData = {
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    position: '',
};

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee_id }) => {
    const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const theme = useTheme();

    useEffect(() => {
        if (employee_id) {
            fetchEmployee();
        }
    }, [employee_id]);

    const fetchEmployee = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('employee_id', employee_id)
                .single();

            if (error) throw error;

            if (data) {
                const { first_name, last_name, email, department, position } = data;
                setFormData({ first_name, last_name, email, department, position });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            if (employee_id) {
                // Update existing employee
                const { error } = await supabase
                    .from('employees')
                    .update(formData)
                    .eq('employee_id', employee_id);

                if (error) throw error;
            } else {
                // Create new employee
                const { error } = await supabase
                    .from('employees')
                    .insert([formData]);

                if (error) throw error;
            }

            setSuccess(true);
            setTimeout(() => {
                navigate('/employees');
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name as string]: value,
        }));
    };

    if (loading && employee_id) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            py: { xs: 4, md: 6 },
            px: { xs: 2, md: 4 },
            background: `linear-gradient(135deg, 
                ${alpha('#4158D0', 0.15)} 0%,
                ${alpha('#C850C0', 0.15)} 46.52%,
                ${alpha('#FFCC70', 0.15)} 100%)`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
                    radial-gradient(circle at 0% 0%, ${alpha('#4158D0', 0.2)} 0%, transparent 30%),
                    radial-gradient(circle at 100% 0%, ${alpha('#C850C0', 0.2)} 0%, transparent 30%),
                    radial-gradient(circle at 100% 100%, ${alpha('#FFCC70', 0.2)} 0%, transparent 30%),
                    radial-gradient(circle at 0% 100%, ${alpha('#4158D0', 0.2)} 0%, transparent 30%)
                `,
                animation: 'gradient 15s ease-in-out infinite',
            },
            '@keyframes gradient': {
                '0%, 100%': { opacity: 0.5 },
                '50%': { opacity: 0.8 },
            }
        }}>
            <Card sx={{
                maxWidth: 800,
                mx: 'auto',
                backdropFilter: 'blur(10px)',
                background: alpha(theme.palette.background.paper, 0.8),
                borderRadius: 3,
                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                transition: 'all 0.3s ease-in-out',
                overflow: 'hidden',
                position: 'relative',
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
                        ${theme.palette.primary.main})`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s infinite linear',
                },
                '@keyframes shimmer': {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
            }}>
                <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                    <Typography 
                        variant="h5" 
                        gutterBottom
                        sx={{
                            fontWeight: 700,
                            background: `linear-gradient(45deg, 
                                ${theme.palette.primary.main}, 
                                ${theme.palette.secondary.main})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 3,
                            position: 'relative',
                            display: 'inline-block',
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                bottom: -8,
                                left: 0,
                                width: '40%',
                                height: 3,
                                borderRadius: 1.5,
                                background: `linear-gradient(90deg, 
                                    ${theme.palette.primary.main}, 
                                    ${theme.palette.secondary.main})`,
                            }
                        }}
                    >
                        {employee_id ? 'Edit Employee' : 'Add New Employee'}
                    </Typography>

                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ 
                                mb: 3,
                                borderRadius: 2,
                                animation: 'slideIn 0.3s ease-out',
                                '@keyframes slideIn': {
                                    from: { transform: 'translateX(-100%)', opacity: 0 },
                                    to: { transform: 'translateX(0)', opacity: 1 },
                                }
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert 
                            severity="success" 
                            sx={{ 
                                mb: 3,
                                borderRadius: 2,
                                animation: 'slideIn 0.3s ease-out',
                            }}
                        >
                            Employee {employee_id ? 'updated' : 'created'} successfully!
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    name="first_name"
                                    label="First Name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                                            },
                                            '&.Mui-focused': {
                                                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                                            }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    name="last_name"
                                    label="Last Name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                                            },
                                            '&.Mui-focused': {
                                                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                                            }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    name="email"
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                                            },
                                            '&.Mui-focused': {
                                                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                                            }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel>Department</InputLabel>
                                    <Select
                                        name="department"
                                        value={formData.department}
                                        label="Department"
                                        onChange={handleChange}
                                        sx={{
                                            borderRadius: 2,
                                            '&:hover': {
                                                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                                            },
                                            '&.Mui-focused': {
                                                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                                            }
                                        }}
                                    >
                                        {DEPARTMENTS.map((dept) => (
                                            <MenuItem key={dept} value={dept}>
                                                {dept}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                        name="position"
                                    label="Position"
                                        value={formData.position}
                                        onChange={handleChange}
                                    fullWidth
                                    required
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                                            },
                                            '&.Mui-focused': {
                                                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
                                            }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    gap: 2, 
                                    justifyContent: 'flex-end',
                                    mt: 2 
                                }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate('/employees')}
                                        sx={{
                                            borderRadius: 2,
                                            px: 3,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                                            }
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={loading}
                                        sx={{
                                            borderRadius: 2,
                                            px: 3,
                                            background: `linear-gradient(45deg, 
                                                ${theme.palette.primary.main}, 
                                                ${theme.palette.secondary.main})`,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                                            },
                                            '&:disabled': {
                                                background: theme.palette.action.disabledBackground,
                                            }
                                        }}
                                    >
                                        {loading ? (
                                            <CircularProgress 
                                                size={24} 
                                                sx={{ color: 'white' }}
                                            />
                                        ) : employee_id ? (
                                            'Update Employee'
                                        ) : (
                                            'Add Employee'
                                        )}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default EmployeeForm; 