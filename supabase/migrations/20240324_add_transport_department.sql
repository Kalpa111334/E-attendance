-- Create company_settings table if not exists
CREATE TABLE IF NOT EXISTS company_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
);

-- Add departments to company settings if not exists
INSERT INTO company_settings (setting_key, setting_value)
VALUES 
    ('departments', 
    json_build_array(
        'Administration',
        'Human Resources',
        'Finance',
        'IT',
        'Operations',
        'Transport Section',
        'Marketing',
        'Sales'
    )::text)
ON CONFLICT (setting_key) 
DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Create an index on the department column for better performance
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- Update any existing employees with invalid departments to 'Administration'
UPDATE employees 
SET department = 'Administration'
WHERE department NOT IN (
    'Administration',
    'Human Resources',
    'Finance',
    'IT',
    'Operations',
    'Transport Section',
    'Marketing',
    'Sales'
);

-- Now add the constraint after fixing existing data
ALTER TABLE employees DROP CONSTRAINT IF EXISTS valid_department;
ALTER TABLE employees ADD CONSTRAINT valid_department 
    CHECK (department = ANY(ARRAY[
        'Administration',
        'Human Resources',
        'Finance',
        'IT',
        'Operations',
        'Transport Section',
        'Marketing',
        'Sales'
    ])); 