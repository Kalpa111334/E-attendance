-- Add working_hours table to track daily check-in/out times
CREATE TABLE working_hours (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(employee_id),
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5,2),
    is_late BOOLEAN DEFAULT FALSE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(employee_id, date)
);

-- Add settings table for company configuration
CREATE TABLE company_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default settings
INSERT INTO company_settings (setting_key, setting_value) VALUES
    ('work_start_time', '09:00'),
    ('work_end_time', '17:00'),
    ('late_threshold_minutes', '15'),
    ('admin_phone', '');

-- Add function to calculate working hours
CREATE OR REPLACE FUNCTION calculate_working_hours(check_in_time TIMESTAMP WITH TIME ZONE, check_out_time TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL AS $$
BEGIN
    RETURN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0;
END;
$$ LANGUAGE plpgsql;

-- Add function to check if check-in is late
CREATE OR REPLACE FUNCTION is_late_check_in(check_in_time TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
DECLARE
    work_start TIME;
    threshold INTEGER;
BEGIN
    -- Get work start time from settings
    SELECT CAST(setting_value AS TIME) INTO work_start
    FROM company_settings
    WHERE setting_key = 'work_start_time';

    -- Get late threshold from settings
    SELECT CAST(setting_value AS INTEGER) INTO threshold
    FROM company_settings
    WHERE setting_key = 'late_threshold_minutes';

    -- Compare check-in time with work start time plus threshold
    RETURN CAST(check_in_time AS TIME) > work_start + (threshold || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update working hours on scan
CREATE OR REPLACE FUNCTION update_working_hours()
RETURNS TRIGGER AS $$
DECLARE
    last_record working_hours%ROWTYPE;
    current_date DATE;
BEGIN
    current_date := CURRENT_DATE;
    
    -- Try to find existing record for today
    SELECT * INTO last_record
    FROM working_hours
    WHERE employee_id = NEW.employee_id
    AND date = current_date;

    IF NOT FOUND THEN
        -- First scan of the day - create check-in record
        INSERT INTO working_hours (
            employee_id,
            check_in,
            date,
            is_late
        ) VALUES (
            NEW.employee_id,
            NEW.created_at,
            current_date,
            is_late_check_in(NEW.created_at)
        );
    ELSE
        -- Update check-out time and calculate total hours
        UPDATE working_hours
        SET
            check_out = NEW.created_at,
            total_hours = calculate_working_hours(check_in, NEW.created_at)
        WHERE id = last_record.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for scans
CREATE TRIGGER update_working_hours_on_scan
    AFTER INSERT ON scans
    FOR EACH ROW
    EXECUTE FUNCTION update_working_hours();

-- Enable RLS on new tables
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for working_hours
CREATE POLICY "Enable read access for authenticated users" ON working_hours
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON working_hours
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON working_hours
    FOR UPDATE TO authenticated USING (true);

-- Create policies for company_settings
CREATE POLICY "Enable read access for authenticated users" ON company_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable update access for authenticated users" ON company_settings
    FOR UPDATE TO authenticated
    USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE auth.email() IN (
            SELECT email FROM employees WHERE position = 'Admin'
        )
    ));

-- Create indexes
CREATE INDEX idx_working_hours_employee_id ON working_hours(employee_id);
CREATE INDEX idx_working_hours_date ON working_hours(date);
CREATE INDEX idx_company_settings_key ON company_settings(setting_key); 