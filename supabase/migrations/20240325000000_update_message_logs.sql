-- Rename sms_logs table to message_logs
ALTER TABLE IF EXISTS public.sms_logs 
RENAME TO message_logs;

-- Add type column to message_logs
ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'sms'
CHECK (type IN ('sms', 'whatsapp'));

-- Add admin_whatsapp to company_settings if not exists
INSERT INTO public.company_settings (setting_key, setting_value)
VALUES 
    ('admin_whatsapp', '')
ON CONFLICT (setting_key) DO NOTHING;

-- Update indexes
DROP INDEX IF EXISTS idx_sms_logs_status;
DROP INDEX IF EXISTS idx_sms_logs_created_at;
DROP INDEX IF EXISTS idx_sms_logs_phone_number;

CREATE INDEX IF NOT EXISTS idx_message_logs_status ON public.message_logs(status);
CREATE INDEX IF NOT EXISTS idx_message_logs_type ON public.message_logs(type);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON public.message_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_message_logs_phone_number ON public.message_logs(phone_number); 