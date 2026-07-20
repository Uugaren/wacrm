// ============================================================
// GET  /api/account/n8n — read n8n config (is_active, system_prompt, webhook_url)
// POST /api/account/n8n — upsert n8n config for this account
// ============================================================

import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';

const DEFAULT_SYSTEM_PROMPT =
  'Você é um assistente virtual atencioso e eficiente de atendimento via WhatsApp.';
const DEFAULT_WEBHOOK_URL = 'https://n8n.mercativus.online/webhook/wacrm';

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    const { data: config } = await ctx.supabase
      .from('n8n_config')
      .select('*')
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (!config) {
      return NextResponse.json({
        is_active: true,
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        webhook_url: DEFAULT_WEBHOOK_URL,
      });
    }

    return NextResponse.json({
      is_active: config.is_active ?? true,
      system_prompt: config.system_prompt || DEFAULT_SYSTEM_PROMPT,
      webhook_url: config.webhook_url || DEFAULT_WEBHOOK_URL,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');

    const body = (await request.json().catch(() => ({}))) as {
      is_active?: boolean;
      system_prompt?: string;
      webhook_url?: string;
    };

    const is_active = typeof body.is_active === 'boolean' ? body.is_active : true;
    const system_prompt =
      typeof body.system_prompt === 'string'
        ? body.system_prompt.trim()
        : DEFAULT_SYSTEM_PROMPT;
    const webhook_url =
      typeof body.webhook_url === 'string'
        ? body.webhook_url.trim()
        : DEFAULT_WEBHOOK_URL;

    // Check existing
    const { data: existing } = await ctx.supabase
      .from('n8n_config')
      .select('id')
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await ctx.supabase
        .from('n8n_config')
        .update({
          is_active,
          system_prompt,
          webhook_url,
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', ctx.accountId)
        .select('*')
        .single();

      if (error) {
        console.error('[POST /api/account/n8n] update error:', error);
        return NextResponse.json({ error: 'Failed to update n8n settings' }, { status: 500 });
      }

      return NextResponse.json({ config: updated });
    }

    // Insert new
    const { data: created, error } = await ctx.supabase
      .from('n8n_config')
      .insert({
        account_id: ctx.accountId,
        user_id: ctx.userId,
        is_active,
        system_prompt,
        webhook_url,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[POST /api/account/n8n] insert error:', error);
      return NextResponse.json({ error: 'Failed to save n8n settings' }, { status: 500 });
    }

    return NextResponse.json({ config: created }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
