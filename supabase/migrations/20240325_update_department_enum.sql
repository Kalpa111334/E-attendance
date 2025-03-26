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

-- Update the employees table to use the new enum type
ALTER TABLE employees
    ALTER COLUMN department TYPE department_enum
    USING department::department_enum; 