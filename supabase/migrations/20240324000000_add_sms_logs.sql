-- Create SMS logs table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone_number ON public.sms_logs(phone_number);

-- Add RLS policies
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view SMS logs
CREATE POLICY "Allow authenticated users to view SMS logs"
    ON public.sms_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert SMS logs
CREATE POLICY "Allow authenticated users to insert SMS logs"
    ON public.sms_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_sms_logs_updated_at
    BEFORE UPDATE ON public.sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column(); 