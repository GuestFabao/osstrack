import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yultwpihlrrgzelkyidv.supabase.co';
const supabaseAnonKey = 'sb_publishable_IYTw-lZ4vYqIW1n-VBe7iA_b833hsHo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);