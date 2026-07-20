import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  registerPhoneNumber,
  subscribeWabaToApp,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'

/**
 * Resolve the caller's account_id from their profile. Inlined here
 * (rather than going through `@/lib/auth/account.getCurrentAccount`)
 * because the GET handler wants to return shaped 200s for every
 * non-auth failure mode, not throw — keeping the helper minimal lets
 * the existing response branches stay as-is.
 *
 * Returns null if the user has no profile or no account; callers
 * should treat that the same as "not connected".
 */
async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.account_id) return null
  return data.account_id as string
}

// Lazy-initialised service-role client. We need it to detect a
// phone_number_id already claimed by a *different* user — under RLS,
// the user's own session can't see other users' rows, so the conflict
// would be invisible without the service role.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

/**
 * GET /api/whatsapp/config
 *
 * Used by the "Test API Connection" button and by the page to check
 * whether the saved config is healthy. Returns 200 in all non-auth cases
 * so the UI can render an appropriate message rather than show a 500.
 *
 * Response shape:
 *   { connected: true,  phone_info: {...} }
 *   { connected: false, reason: 'no_config',        message: '...' }
 *   { connected: false, reason: 'token_corrupted',  message: '...', needs_reset: true }
 *   { connected: false, reason: 'meta_api_error',   message: '...' }
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const baseUrl = (process.env.UAZAPI_BASE_URL || 'https://jarentech.uazapi.com').replace(/\/+$/, '')
    const token = process.env.UAZAPI_TOKEN || 'ccb5fd49-dc6f-47e8-9fa4-988bf9b3b4a5'
    const instance = process.env.UAZAPI_INSTANCE_NAME || 'w7GXlg'

    const res = await fetch(`${baseUrl}/instance/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        token,
        apikey: token,
      },
    })

    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        baseUrl,
        instance,
        reason: 'uazapi_error',
        message: `Uazapi returned status ${res.status}`,
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    const isConnected = Boolean(data?.status?.connected || data?.instance?.status === 'connected')
    const statusStr = data?.instance?.status || (isConnected ? 'connected' : 'disconnected')
    const qrcode = data?.instance?.qrcode || data?.qrcode?.base64 || data?.qrcode || data?.base64 || null
    const profileName = data?.instance?.profileName || null
    const profilePicUrl = data?.instance?.profilePicUrl || null
    const owner = data?.instance?.owner || null

    const accountId = await resolveAccountId(supabase, user.id)
    if (accountId) {
      try {
        let encryptedToken = token
        try {
          encryptedToken = encrypt(token)
        } catch {
          // fallback if ENCRYPTION_KEY not set or formatting differs
        }
        await supabaseAdmin()
          .from('whatsapp_config')
          .upsert(
            {
              account_id: accountId,
              user_id: user.id,
              phone_number_id: instance,
              waba_id: baseUrl,
              access_token: encryptedToken,
              status: isConnected ? 'connected' : 'disconnected',
              connected_at: isConnected ? new Date().toISOString() : null,
              registered_at: isConnected ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'account_id' }
          )
      } catch (err) {
        console.warn('Failed to sync whatsapp_config row in DB:', err)
      }
    }

    return NextResponse.json({
      connected: isConnected,
      status: statusStr,
      baseUrl,
      instance,
      qrcode,
      profileName,
      profilePicUrl,
      owner,
      phone_info: {
        id: instance,
        display_phone_number: owner ? `+${owner}` : instance,
        verified_name: profileName || instance,
      },
    })
  } catch (error) {
    console.error('Error fetching Uazapi status:', error)
    return NextResponse.json(
      { connected: false, reason: 'unknown', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/whatsapp/config
 *
 * Calls Uazapi connect endpoint to retrieve or refresh the QR code / pairing status.
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const baseUrl = (process.env.UAZAPI_BASE_URL || 'https://jarentech.uazapi.com').replace(/\/+$/, '')
    const token = process.env.UAZAPI_TOKEN || 'ccb5fd49-dc6f-47e8-9fa4-988bf9b3b4a5'
    const instance = process.env.UAZAPI_INSTANCE_NAME || 'w7GXlg'

    const connectUrl = `${baseUrl}/instance/connect`
    const res = await fetch(connectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token,
        apikey: token,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json().catch(() => ({}))

    const qrcode =
      data?.instance?.qrcode ||
      data?.qrcode?.base64 ||
      data?.qrcode ||
      data?.base64 ||
      null

    return NextResponse.json({
      success: res.ok || Boolean(qrcode),
      qrcode,
      instance,
      data,
    })
  } catch (error) {
    console.error('Error in WhatsApp config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/whatsapp/config
 *
 * Removes the authenticated user's WhatsApp configuration row.
 * Used by the "Reset Configuration" button to recover from a corrupted
 * encrypted token (mismatched ENCRYPTION_KEY across environments).
 */
export async function DELETE() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    const { error: deleteError } = await supabase
      .from('whatsapp_config')
      .delete()
      .eq('account_id', accountId)

    if (deleteError) {
      console.error('Error deleting whatsapp_config:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in WhatsApp config DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
