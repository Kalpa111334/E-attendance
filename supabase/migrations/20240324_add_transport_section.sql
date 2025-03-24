-- First, ensure the department is in the allowed list
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE employees DROP CONSTRAINT IF EXISTS valid_department;

    -- Add the constraint back with Transport Section included
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

    -- Update the departments list in company_settings
    UPDATE company_settings
    SET setting_value = json_build_array(
        'Administration',
        'Human Resources',
        'Finance',
        'IT',
        'Operations',
        'Transport Section',
        'Marketing',
        'Sales'
    )::text
    WHERE setting_key = 'departments';

    -- If no update was made (i.e., no row existed), insert the new row
    IF NOT FOUND THEN
        INSERT INTO company_settings (setting_key, setting_value)
        VALUES (
            'departments',
            json_build_array(
                'Administration',
                'Human Resources',
                'Finance',
                'IT',
                'Operations',
                'Transport Section',
                'Marketing',
                'Sales'
            )::text
        );
    END IF;
END $$; 