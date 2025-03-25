-- Create department enum type
DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add check constraint for valid departments
ALTER TABLE employees
    ALTER COLUMN department TYPE department_enum
    USING department::department_enum;

-- Add not null constraint
ALTER TABLE employees
    ALTER COLUMN department SET NOT NULL; 