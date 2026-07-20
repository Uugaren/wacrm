-- ============================================================
-- Migration 039: N8N Config
-- Stores per-account n8n automation settings (is_active & system_prompt).
-- ============================================================

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
  USING (EXISTS (SELECT 1 FROM accounts WHERE accounts.id = n8n_config.account_id AND accounts.owner_user_id = auth.uid()));
