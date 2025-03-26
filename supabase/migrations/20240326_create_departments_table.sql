-- Drop existing relationship if it exists
ALTER TABLE IF EXISTS employees 
    DROP CONSTRAINT IF EXISTS employees_department_id_fkey;

-- Drop existing department_id column if it exists
ALTER TABLE IF EXISTS employees 
    DROP COLUMN IF EXISTS department_id;

-- Drop existing departments table if it exists
DROP TABLE IF EXISTS departments;

-- Create departments table
CREATE TABLE departments (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert initial departments
INSERT INTO departments (name) VALUES
    ('DT Activity'),
    ('Kitchen'),
    ('Food & Beverage'),
    ('Front Office'),
    ('Housekeeping'),
    ('Engineering'),
    ('Security'),
    ('Accounts'),
    ('HR'),
    ('Sales & Marketing');

-- Add department_id column to employees
ALTER TABLE employees ADD COLUMN department_id BIGINT REFERENCES departments(id);

-- Update existing employees with department_id
UPDATE employees e
SET department_id = d.id
FROM departments d
WHERE e.department = d.name;

-- Create trigger for departments updated_at
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Make department_id NOT NULL after data migration
ALTER TABLE employees ALTER COLUMN department_id SET NOT NULL;

-- Drop old department column
ALTER TABLE employees DROP COLUMN department;

-- Update index for new department_id
DROP INDEX IF EXISTS idx_employees_department;
CREATE INDEX idx_employees_department_id ON employees(department_id); 