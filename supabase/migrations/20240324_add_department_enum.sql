-- Drop existing constraint if it exists
ALTER TABLE employees DROP CONSTRAINT IF EXISTS valid_department;

-- Drop existing type if it exists
DROP TYPE IF EXISTS department_enum CASCADE;

-- Create department enum type
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
    'Security',
    'Dutch Activity',
    'Kitchen',
    'Food & Beverage Department',
    'Butchery',
    'Reservations',
    'House Keeping',
    'Pastry Kitchen',
    'Stores',
    'Purchasing & Stores',
    'Accounts Department'
);

-- Add the department column without NOT NULL constraint first
ALTER TABLE employees 
    ADD COLUMN department department_enum;

-- Set a default value for existing rows
UPDATE employees 
SET department = 'Administration'::department_enum 
WHERE department IS NULL;

-- Now add the NOT NULL constraint
ALTER TABLE employees 
    ALTER COLUMN department SET NOT NULL; 