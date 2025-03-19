/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xwazylolnibuvkcghgmp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3YXp5bG9sbmlidXZrY2doZ21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMTgxMzgsImV4cCI6MjA1Nzc5NDEzOH0.tZOvTEgFXm9GCXmo3kdjhag2YXWi5vkqPUAoBz1ysPY';

// Debug logging
console.log('Supabase Configuration:', {
    url: supabaseUrl,
    keyLength: supabaseKey?.length || 0
});

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseKey); 