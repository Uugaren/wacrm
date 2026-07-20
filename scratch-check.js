const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: msgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('LATEST MESSAGES IN DB:', msgs);
}

check();
