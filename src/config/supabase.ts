/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// Hardcoded fallback values (same as your .env)
const FALLBACK_URL = 'https://xwazylolnibuvkcghgmp.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3YXp5bG9sbmlidXZrY2doZ21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMTgxMzgsImV4cCI6MjA1Nzc5NDEzOH0.tZOvTEgFXm9GCXmo3kdjhag2YXWi5vkqPUAoBz1ysPY';

// Try to get from environment variables, fallback to hardcoded values if not available
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

// Debug logging
console.log('Environment Variables Status:', {
    VITE_SUPABASE_URL: !!import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    usingFallbackUrl: supabaseUrl === FALLBACK_URL,
    usingFallbackKey: supabaseKey === FALLBACK_KEY
});

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseKey); 