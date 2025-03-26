-- Drop the existing enum type (this will also drop any constraints using it)
DROP TYPE IF EXISTS department_enum CASCADE;

-- Create the enum type with the updated values
CREATE TYPE department_enum AS ENUM (
    'dt_activity',
    'kitchen',
    'food_and_beverage',
    'butchery',
    'operations',
    'maintenance',
    'reservations',
    'housekeeping',
    'pastry',
    'stores',
    'purchasing',
    'accounts',
    'it',
    'transport',
    'security',
    'human_resources'
);

-- First add the column if it doesn't exist
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS department department_enum;

-- Set a default value for existing rows (optional)
UPDATE employees
SET department = 'dt_activity'
WHERE department IS NULL; 