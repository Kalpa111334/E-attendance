export const DEPARTMENTS = [
    'IT',
    'HR',
    'Finance',
    'Marketing',
    'Sales',
    'Operations',
    'Engineering',
    'Research',
    'Development',
    'Customer Service',
    'Administration',
    'Transport',
    'Maintenance',
    'Security'
] as const;

export type Department = typeof DEPARTMENTS[number];

export const isDepartment = (value: string): value is Department => {
    return DEPARTMENTS.includes(value as Department);
}; 