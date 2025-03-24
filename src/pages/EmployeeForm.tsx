import React, { useState } from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Icon,
    SelectChangeEvent
} from '@mui/material';
import { DEPARTMENTS, getDepartmentColor, getDepartmentIcon } from '../constants/departments';

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    position: string;
    // ... other fields ...
}

const EmployeeForm = () => {
    const [formData, setFormData] = useState<FormData>({
        firstName: '',
        lastName: '',
        email: '',
        department: '',
        position: '',
        // ... other fields ...
    });

    const handleDepartmentChange = (event: SelectChangeEvent) => {
        setFormData(prev => ({
            ...prev,
            department: event.target.value
        }));
    };

    return (
        <form>
            {/* ... other form fields ... */}
            <FormControl fullWidth margin="normal">
                <InputLabel id="department-label">Department</InputLabel>
                <Select
                    labelId="department-label"
                    id="department"
                    value={formData.department}
                    onChange={handleDepartmentChange}
                    label="Department"
                >
                    {DEPARTMENTS.map((dept) => (
                        <MenuItem 
                            key={dept} 
                            value={dept}
                            sx={{ 
                                color: getDepartmentColor(dept),
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <Icon>{getDepartmentIcon(dept)}</Icon>
                            {dept}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            {/* ... other form fields ... */}
        </form>
    );
};

export default EmployeeForm; 