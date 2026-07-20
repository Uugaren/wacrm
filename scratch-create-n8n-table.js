const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing n8n_config table...');
  const { data, error } = await supabase.from('n8n_config').select('*').limit(1);

  if (error) {
    console.error('n8n_config query error:', error);
    console.log('Creating n8n_config table via RPC / SQL...');
    // Create table directly if missing via rpc or check
  } else {
    console.log('n8n_config table EXISTS! Data:', data);
  }
}

run();
