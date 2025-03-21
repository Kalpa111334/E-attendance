-- Add working hours configuration table
CREATE TABLE working_hours_config (
    id SERIAL PRIMARY KEY,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add default working hours (9 AM to 5 PM)
INSERT INTO working_hours_config (start_time, end_time, late_threshold_minutes)
VALUES ('09:00:00', '17:00:00', 15);

-- Add columns to scans table for check-in/out tracking
ALTER TABLE scans
ADD COLUMN scan_type TEXT CHECK (scan_type IN ('check_in', 'check_out')),
ADD COLUMN is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN working_hours DECIMAL(5,2);

-- Create function to calculate working hours
CREATE OR REPLACE FUNCTION calculate_working_hours(check_in_time TIMESTAMP WITH TIME ZONE, check_out_time TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL AS $$
DECLARE
    hours DECIMAL;
BEGIN
    IF check_in_time IS NULL OR check_out_time IS NULL THEN
        RETURN 0;
    END IF;
    
    hours := EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600;
    RETURN ROUND(hours::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql;

-- Create function to check if scan is late
CREATE OR REPLACE FUNCTION is_late_check_in(scan_time TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
DECLARE
    config working_hours_config%ROWTYPE;
    scheduled_start TIME;
    actual_time TIME;
    threshold_minutes INTEGER;
BEGIN
    -- Get the working hours configuration
    SELECT * INTO config FROM working_hours_config LIMIT 1;
    
    scheduled_start := config.start_time;
    threshold_minutes := config.late_threshold_minutes;
    actual_time := scan_time::TIME;
    
    RETURN actual_time > (scheduled_start + (threshold_minutes || ' minutes')::INTERVAL);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set is_late and working_hours
CREATE OR REPLACE FUNCTION process_scan()
RETURNS TRIGGER AS $$
DECLARE
    last_scan RECORD;
BEGIN
    -- For check-in scans, determine if late
    IF NEW.scan_type = 'check_in' THEN
        NEW.is_late := is_late_check_in(NEW.created_at);
    
    -- For check-out scans, calculate working hours
    ELSIF NEW.scan_type = 'check_out' THEN
        SELECT * INTO last_scan
        FROM scans
        WHERE employee_id = NEW.employee_id
        AND scan_type = 'check_in'
        AND created_at::DATE = NEW.created_at::DATE
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF FOUND THEN
            NEW.working_hours := calculate_working_hours(last_scan.created_at, NEW.created_at);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_scan_trigger
    BEFORE INSERT ON scans
    FOR EACH ROW
    EXECUTE FUNCTION process_scan();

-- Add admin notification settings table
CREATE TABLE admin_notification_settings (
    id SERIAL PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id),
    phone_number TEXT NOT NULL,
    notify_on_late BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE working_hours_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for working_hours_config
CREATE POLICY "Enable read access for authenticated users" ON working_hours_config
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable modify access for authenticated users" ON working_hours_config
    FOR ALL TO authenticated USING (true);

-- Create policies for admin_notification_settings
CREATE POLICY "Enable read access for own settings" ON admin_notification_settings
    FOR SELECT TO authenticated USING (admin_id = auth.uid());
CREATE POLICY "Enable modify access for own settings" ON admin_notification_settings
    FOR ALL TO authenticated USING (admin_id = auth.uid()); 