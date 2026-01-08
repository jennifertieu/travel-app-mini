import { createClient } from '@supabase/supabase-js';
import { Database } from '@travel-app/shared-types';

const supabaseUrl = 'https://imzyqjkdbxeubmmmwlyk.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

