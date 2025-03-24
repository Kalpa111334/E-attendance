-- Function to delete an employee and all related records
CREATE OR REPLACE FUNCTION delete_employee_with_records(p_employee_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete related scan records
    DELETE FROM scans WHERE employee_id = p_employee_id;
    
    -- Delete the employee
    DELETE FROM employees WHERE employee_id = p_employee_id;
END;
$$;

-- Function to delete multiple employees and their related records
CREATE OR REPLACE FUNCTION delete_multiple_employees(p_employee_ids INTEGER[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    employee_id_text TEXT;
BEGIN
    -- Get the employee_ids in text format
    FOR employee_id_text IN 
        SELECT employee_id FROM employees WHERE id = ANY(p_employee_ids)
    LOOP
        -- Use the single employee delete function
        PERFORM delete_employee_with_records(employee_id_text);
    END LOOP;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_employee_with_records(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_multiple_employees(INTEGER[]) TO authenticated; 