-- Drop the existing enum type (this will also drop any constraints using it)
DROP TYPE IF EXISTS department_enum CASCADE;

-- Create the enum type with the updated values
CREATE TYPE department_enum AS ENUM (
    'DT Activity',
    'Kitchen',
    'Food & Beverage',
    'Butchery',
    'Operations',
    'Maintenance',
    'Reservations',
    'Housekeeping',
    'Pastry',
    'Stores',
    'Purchasing',
    'Accounts',
    'IT',
    'Transport',
    'Security',
    'Human Resources'
);

-- First add the column if it doesn't exist
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS department department_enum;

-- Set a default value for existing rows (optional)
UPDATE employees
SET department = 'DT Activity'
WHERE department IS NULL; 