-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial department data
INSERT INTO departments (code, name) VALUES
    ('dt_activity', 'DT Activity'),
    ('kitchen', 'Kitchen'),
    ('food_and_beverage', 'Food & Beverage'),
    ('butchery', 'Butchery'),
    ('operations', 'Operations'),
    ('maintenance', 'Maintenance'),
    ('reservations', 'Reservations'),
    ('housekeeping', 'Housekeeping'),
    ('pastry', 'Pastry'),
    ('stores', 'Stores'),
    ('purchasing', 'Purchasing'),
    ('accounts', 'Accounts'),
    ('it', 'IT'),
    ('transport', 'Transport'),
    ('security', 'Security'),
    ('human_resources', 'Human Resources');

-- Add department_id to employees table
ALTER TABLE employees
ADD COLUMN department_id UUID REFERENCES departments(id);

-- Migrate existing department data
UPDATE employees e
SET department_id = d.id
FROM departments d
WHERE e.department::text = d.code;

-- Drop the old department enum type and column
ALTER TABLE employees DROP COLUMN IF EXISTS department;
DROP TYPE IF EXISTS department_enum CASCADE; 