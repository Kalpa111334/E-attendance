-- Add departments to company settings if not exists
INSERT INTO company_settings (setting_key, setting_value, setting_type, description)
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
    )::text,
    'json_array',
    'List of company departments')
ON CONFLICT (setting_key) 
DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Create an index on the department column for better performance
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- Add check constraint to ensure department is from the allowed list
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