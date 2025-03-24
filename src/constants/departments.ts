export const DEPARTMENTS = [
    'Administration',
    'Human Resources',
    'Information Technology',
    'Finance',
    'Operations',
    'Marketing',
    'Sales',
    'Transport Section'
] as const;

export type Department = typeof DEPARTMENTS[number];

export function isDepartment(value: any): value is Department {
    return DEPARTMENTS.includes(value as Department);
}

export function getDepartmentColor(department: Department): string {
    switch (department) {
        case 'Administration':
            return '#2196F3';  // Blue
        case 'Human Resources':
            return '#4CAF50';  // Green
        case 'Information Technology':
            return '#9C27B0';  // Purple
        case 'Finance':
            return '#FF9800';  // Orange
        case 'Operations':
            return '#F44336';  // Red
        case 'Marketing':
            return '#00BCD4';  // Cyan
        case 'Sales':
            return '#795548';  // Brown
        case 'Transport Section':
            return '#607D8B';  // Blue Grey
        default:
            return '#757575';  // Grey
    }
}

export function getDepartmentIcon(department: Department): string {
    switch (department) {
        case 'Administration':
            return 'admin_panel_settings';
        case 'Human Resources':
            return 'people';
        case 'Information Technology':
            return 'computer';
        case 'Finance':
            return 'attach_money';
        case 'Operations':
            return 'build';
        case 'Marketing':
            return 'campaign';
        case 'Sales':
            return 'shopping_cart';
        case 'Transport Section':
            return 'local_shipping';
        default:
            return 'business';
    }
} 