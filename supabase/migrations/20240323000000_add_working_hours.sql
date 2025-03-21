-- Create working_hours table
CREATE TABLE IF NOT EXISTS public.working_hours (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.employees(employee_id),
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5,2),
    is_late BOOLEAN DEFAULT FALSE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(employee_id, date)
);

-- Create company_settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default settings
INSERT INTO public.company_settings (setting_key, setting_value)
VALUES 
    ('work_start_time', '09:00'),
    ('work_end_time', '17:00'),
    ('late_threshold_minutes', '15'),
    ('admin_phone', '')
ON CONFLICT (setting_key) DO NOTHING;

-- Create function to calculate working hours
CREATE OR REPLACE FUNCTION public.calculate_working_hours(
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE
) RETURNS DECIMAL AS $$
BEGIN
    RETURN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if check-in is late
CREATE OR REPLACE FUNCTION public.is_late_check_in(
    check_in_time TIMESTAMP WITH TIME ZONE
) RETURNS BOOLEAN AS $$
DECLARE
    work_start TIME;
    threshold INTEGER;
BEGIN
    -- Get work start time from settings
    SELECT CAST(setting_value AS TIME)
    INTO work_start
    FROM public.company_settings
    WHERE setting_key = 'work_start_time';

    -- Get late threshold from settings
    SELECT CAST(setting_value AS INTEGER)
    INTO threshold
    FROM public.company_settings
    WHERE setting_key = 'late_threshold_minutes';

    -- Compare check-in time with work start time plus threshold
    RETURN CAST(check_in_time AT TIME ZONE 'UTC' AS TIME) > 
           work_start + (threshold || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update working hours
CREATE OR REPLACE FUNCTION public.update_working_hours()
RETURNS TRIGGER AS $$
DECLARE
    last_record public.working_hours%ROWTYPE;
    scan_date DATE;
BEGIN
    scan_date := date(timezone('UTC', NEW.created_at));
    
    -- Try to find existing record for today
    SELECT *
    INTO last_record
    FROM public.working_hours
    WHERE employee_id = NEW.employee_id
    AND date = scan_date;

    IF NOT FOUND THEN
        -- First scan of the day - create check-in record
        INSERT INTO public.working_hours (
            employee_id,
            check_in,
            date,
            is_late
        ) VALUES (
            NEW.employee_id,
            NEW.created_at,
            scan_date,
            public.is_late_check_in(NEW.created_at)
        );
    ELSE
        -- Update check-out time and calculate total hours
        UPDATE public.working_hours
        SET
            check_out = NEW.created_at,
            total_hours = public.calculate_working_hours(check_in, NEW.created_at)
        WHERE id = last_record.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for scans
DROP TRIGGER IF EXISTS update_working_hours_on_scan ON public.scans;
CREATE TRIGGER update_working_hours_on_scan
    AFTER INSERT ON public.scans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_working_hours();

-- Enable RLS on new tables
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for working_hours
CREATE POLICY "Enable read access for authenticated users"
    ON public.working_hours
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users"
    ON public.working_hours
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
    ON public.working_hours
    FOR UPDATE
    TO authenticated
    USING (true);

-- Create policies for company_settings
CREATE POLICY "Enable read access for authenticated users"
    ON public.company_settings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update access for authenticated users"
    ON public.company_settings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE email IN (
            SELECT email FROM public.employees WHERE position = 'Admin'
        )
    ));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_working_hours_employee_id
    ON public.working_hours(employee_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_date
    ON public.working_hours(date);
CREATE INDEX IF NOT EXISTS idx_company_settings_key
    ON public.company_settings(setting_key); 