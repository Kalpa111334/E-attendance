-- Create enum type for departments
CREATE TYPE department_enum AS ENUM (
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
);

-- Add check constraint for valid departments
ALTER TABLE employees
    ADD CONSTRAINT valid_department
    CHECK (department::department_enum IS NOT NULL);

-- Convert existing department column to use enum
ALTER TABLE employees
    ALTER COLUMN department TYPE department_enum
    USING department::department_enum; 