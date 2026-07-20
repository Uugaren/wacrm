const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE TABLE IF NOT EXISTS n8n_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  system_prompt TEXT NOT NULL DEFAULT 'Você é um assistente virtual atencioso e eficiente de atendimento via WhatsApp.',
  webhook_url TEXT DEFAULT 'https://n8n.mercativus.online/webhook/wacrm',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_n8n_config_account ON n8n_config(account_id);

ALTER TABLE n8n_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage n8n config" ON n8n_config;
CREATE POLICY "Users can manage n8n config" ON n8n_config FOR ALL
  USING (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = n8n_config.account_id
      AND accounts.owner_user_id = auth.uid()
  ));

-- Grant service role full access (bypasses RLS already, but just to be safe)
GRANT ALL ON n8n_config TO service_role;
GRANT ALL ON n8n_config TO authenticated;
`;

async function run() {
  console.log('Applying 039_n8n_config migration...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).catch(() => ({ data: null, error: { message: 'rpc not available' } }));

  if (error) {
    console.log('RPC not available, trying raw REST approach...');
    // Try via PostgreSQL REST endpoint using service role
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await resp.text();
    console.log('REST result:', resp.status, text);
  } else {
    console.log('Migration applied successfully!', data);
  }
}

run();
