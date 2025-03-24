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
    department: string;
    // ... other form fields
}

const EmployeeForm: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
        department: '',
        // ... other initial values
    });

    return (
        <FormControl fullWidth required>
            <InputLabel>Department</InputLabel>
            <Select
                value={formData.department}
                onChange={(e: SelectChangeEvent) => setFormData(prev => ({ 
                    ...prev, 
                    department: e.target.value 
                }))}
                label="Department"
            >
                {DEPARTMENTS.map((dept) => (
                    <MenuItem 
                        key={dept} 
                        value={dept}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <Icon sx={{ color: getDepartmentColor(dept) }}>
                            {getDepartmentIcon(dept)}
                        </Icon>
                        {dept}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default EmployeeForm; 