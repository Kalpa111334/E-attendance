import { DEPARTMENTS, getDepartmentColor, getDepartmentIcon } from '../constants/departments';

const EmployeeForm: React.FC = () => {
    // ... existing code ...

    return (
        // ... existing JSX ...
        <FormControl fullWidth required>
            <InputLabel>Department</InputLabel>
            <Select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
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
        // ... rest of JSX ...
    );
};

export default EmployeeForm; 