export interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    position: string;
    created_at: string;
    updated_at: string;
}

export interface EmployeeFormData {
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    position: string;
} 