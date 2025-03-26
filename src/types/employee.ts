export interface Department {
    id: string;
    code: string;
    name: string;
}

export interface Employee {
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    department_id: string;
    department?: Department;
    position: string;
    created_at: string;
}

export interface EmployeeFormData {
    first_name: string;
    last_name: string;
    email: string;
    department_id: string;
    position: string;
} 