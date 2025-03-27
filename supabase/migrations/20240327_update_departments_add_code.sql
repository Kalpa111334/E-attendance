-- Add code column to departments
ALTER TABLE departments ADD COLUMN code TEXT;

-- Update existing departments with code
UPDATE departments
SET code = LOWER(REPLACE(name, ' & ', '_and_'));

UPDATE departments
SET code = LOWER(REPLACE(REPLACE(name, ' ', '_'), '&', 'and'));

-- Make code NOT NULL and UNIQUE
ALTER TABLE departments ALTER COLUMN code SET NOT NULL;
ALTER TABLE departments ADD CONSTRAINT departments_code_unique UNIQUE (code);

-- Insert departments
INSERT INTO departments (name, code)
VALUES
    ('IT', 'it'),
    ('HR', 'hr'),
    ('Finance', 'finance'),
    ('Marketing', 'marketing'),
    ('Sales', 'sales'),
    ('Operations', 'operations'),
    ('Engineering', 'engineering'),
    ('Research', 'research'),
    ('Development', 'development'),
    ('Customer Service', 'customer_service'),
    ('Administration', 'administration'),
    ('Transport', 'transport'),
    ('Maintenance', 'maintenance'),
    ('Security', 'security'),
    ('Dutch Activity', 'dutch_activity'),
    ('Kitchen', 'kitchen'),
    ('Food & Beverage Department', 'food_and_beverage_department'),
    ('Butchery', 'butchery'),
    ('Reservations', 'reservations'),
    ('House Keeping', 'house_keeping'),
    ('Pastry Kitchen', 'pastry_kitchen'),
    ('Stores', 'stores'),
    ('Purchasing & Stores', 'purchasing_and_stores'),
    ('Accounts Department', 'accounts_department')
ON CONFLICT (name) DO UPDATE
SET code = EXCLUDED.code; 