-- Add Transport Section to valid departments
DO $$ 
BEGIN
    -- Update the departments list in company_settings
    UPDATE company_settings 
    SET setting_value = jsonb_set(
        setting_value,
        '{departments}',
        (
            SELECT jsonb_agg(DISTINCT jsonb_array_elements(setting_value->'departments') || '"Transport Section"')
            FROM company_settings
            WHERE setting_key = 'departments'
        )
    )
    WHERE setting_key = 'departments';

    -- If no rows were updated, insert new setting
    IF NOT FOUND THEN
        INSERT INTO company_settings (setting_key, setting_value)
        VALUES (
            'departments',
            '{"departments": ["Administration", "Human Resources", "Information Technology", "Finance", "Operations", "Marketing", "Sales", "Transport Section"]}'::jsonb
        );
    END IF;
END $$; 