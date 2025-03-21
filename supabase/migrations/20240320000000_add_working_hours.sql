-- Add check_in_time and check_out_time columns to scans table
ALTER TABLE scans ADD COLUMN scan_type TEXT CHECK (scan_type IN ('check_in', 'check_out')) NOT NULL DEFAULT 'check_in';
ALTER TABLE scans ADD COLUMN check_in_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE scans ADD COLUMN check_out_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE scans ADD COLUMN working_hours DECIMAL(10,2);
ALTER TABLE scans ADD COLUMN is_late BOOLEAN DEFAULT FALSE;

-- Add admin_phone column to auth.users for SMS notifications
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS admin_phone TEXT;

-- Create function to calculate working hours
CREATE OR REPLACE FUNCTION calculate_working_hours()
RETURNS TRIGGER AS $$
DECLARE
    check_in_record RECORD;
    work_start_time TIME := '09:00:00'::TIME; -- Default work start time
    late_threshold INTERVAL := '15 minutes'; -- Late threshold
BEGIN
    IF NEW.scan_type = 'check_in' THEN
        NEW.check_in_time := NEW.created_at;
        -- Check if employee is late
        IF EXTRACT(HOUR FROM NEW.created_at::TIME) * 60 + EXTRACT(MINUTE FROM NEW.created_at::TIME) >
           EXTRACT(HOUR FROM work_start_time) * 60 + EXTRACT(MINUTE FROM work_start_time) + EXTRACT(MINUTE FROM late_threshold) THEN
            NEW.is_late := TRUE;
        END IF;
    ELSIF NEW.scan_type = 'check_out' THEN
        -- Find the corresponding check-in record
        SELECT * INTO check_in_record
        FROM scans
        WHERE employee_id = NEW.employee_id
        AND scan_type = 'check_in'
        AND DATE(created_at) = DATE(NEW.created_at)
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN
            NEW.check_in_time := check_in_record.check_in_time;
            NEW.check_out_time := NEW.created_at;
            -- Calculate working hours
            NEW.working_hours := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time))/3600;
            NEW.is_late := check_in_record.is_late;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for working hours calculation
CREATE TRIGGER calculate_working_hours_trigger
    BEFORE INSERT ON scans
    FOR EACH ROW
    EXECUTE FUNCTION calculate_working_hours(); 