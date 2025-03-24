export const DEPARTMENTS = [
    'Administration',
    'Human Resources',
    'Finance',
    'IT',
    'Operations',
    'Transport Section',
    'Marketing',
    'Sales'
] as const;

export type Department = typeof DEPARTMENTS[number];

export const isDepartment = (value: string): value is Department => {
    return DEPARTMENTS.includes(value as Department);
};

export const getDepartmentColor = (department: Department) => {
    const colors = {
        'Administration': '#1976d2',
        'Human Resources': '#388e3c',
        'Finance': '#d32f2f',
        'IT': '#7b1fa2',
        'Operations': '#f57c00',
        'Transport Section': '#0288d1',
        'Marketing': '#c2185b',
        'Sales': '#00796b'
    };
    return colors[department] || '#757575';
};

export const getDepartmentIcon = (department: Department) => {
    switch (department) {
        case 'Transport Section':
            return 'directions_bus';
        case 'Administration':
            return 'admin_panel_settings';
        case 'Human Resources':
            return 'people';
        case 'Finance':
            return 'attach_money';
        case 'IT':
            return 'computer';
        case 'Operations':
            return 'build';
        case 'Marketing':
            return 'campaign';
        case 'Sales':
            return 'store';
        default:
            return 'work';
    }
}; 