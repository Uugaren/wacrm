// ============================================================
// GET /api/v1/n8n/config — fetch n8n config (is_active, system_prompt) via Public API
// ============================================================

import { requireApiKey } from '@/lib/auth/api-context';
import { ok, toApiErrorResponse } from '@/lib/api/v1/respond';

const DEFAULT_SYSTEM_PROMPT =
  'Você é um assistente virtual atencioso e eficiente de atendimento via WhatsApp.';

export async function GET(request: Request) {
  try {
    const ctx = await requireApiKey(request);

    const { data: config } = await ctx.supabase
      .from('n8n_config')
      .select('is_active, system_prompt, webhook_url, updated_at')
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    return ok({
      is_active: config?.is_active ?? true,
      system_prompt: config?.system_prompt || DEFAULT_SYSTEM_PROMPT,
      webhook_url: config?.webhook_url || 'https://n8n.mercativus.online/webhook/wacrm',
      updated_at: config?.updated_at || null,
    });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
