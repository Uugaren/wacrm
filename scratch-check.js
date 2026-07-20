const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: configs } = await supabase.from('whatsapp_config').select('*');
  const { data: accts } = await supabase.from('accounts').select('*');
  console.log('WHATSAPP CONFIGS IN DB:', configs);
  console.log('ACCOUNTS IN DB:', accts);
}

check();
