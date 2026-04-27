// Supabase Edge Function: invite-staff
//
// Actions:
//   POST { email, name, role } — invite a new staff member. Uses the service
//     role to create a staff row + auth.users entry and emails an invitation
//     link so the user can set their own password.
//   POST { action: 'delete', staffId } — delete a staff row and its auth user.
//
// Auth: the caller MUST be an authenticated admin. We verify this by:
//   1. Reading the Authorization: Bearer <user-jwt> header.
//   2. Calling supabase.auth.getUser(jwt) with the service role client.
//   3. Looking up the caller's staff row; it must have role='admin' and
//      active=true.
//
// Deploy:
//   supabase functions deploy invite-staff --no-verify-jwt
//
// Secrets required on the Supabase project:
//   SUPABASE_URL              (auto-set)
//   SUPABASE_SERVICE_ROLE_KEY (auto-set when deployed)
//   PUBLIC_SITE_URL           (e.g. https://pos.example.com — used as the
//                             redirect_to for invitation emails)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'

interface InvitePayload {
  action?: 'invite' | 'delete'
  email?: string
  name?: string
  role?: 'admin' | 'cashier'
  staffId?: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? ''
  if (!serviceKey || !supabaseUrl) {
    return json({ error: 'Server not configured.' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // --- Verify caller is an admin ------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return json({ error: 'Missing auth token.' }, 401)

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData.user) return json({ error: 'Invalid session.' }, 401)

  const { data: callerStaff, error: callerStaffErr } = await admin
    .from('staff')
    .select('role, active')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (callerStaffErr) return json({ error: callerStaffErr.message }, 500)
  if (!callerStaff || callerStaff.role !== 'admin' || callerStaff.active === false) {
    return json({ error: 'Admin access required.' }, 403)
  }

  let payload: InvitePayload
  try {
    payload = (await req.json()) as InvitePayload
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  // --- Delete flow --------------------------------------------------------
  if (payload.action === 'delete') {
    if (!payload.staffId) return json({ error: 'staffId is required.' }, 400)
    const { data: target, error: tErr } = await admin
      .from('staff')
      .select('user_id')
      .eq('id', payload.staffId)
      .maybeSingle()
    if (tErr) return json({ error: tErr.message }, 500)
    if (!target) return json({ error: 'Staff not found.' }, 404)

    if (target.user_id) {
      await admin.auth.admin.deleteUser(target.user_id)
    }
    const { error: delErr } = await admin
      .from('staff')
      .delete()
      .eq('id', payload.staffId)
    if (delErr) return json({ error: delErr.message }, 500)
    return json({ ok: true })
  }

  // --- Invite flow --------------------------------------------------------
  const email = (payload.email ?? '').trim().toLowerCase()
  const name = (payload.name ?? '').trim()
  const role = payload.role === 'admin' ? 'admin' : 'cashier'
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Email tidak valid.' }, 400)
  }
  if (!name) return json({ error: 'Nama wajib diisi.' }, 400)

  // Send invitation email via Supabase Auth admin API. This creates (or
  // returns the existing) auth.users row and emails the user a magic link
  // they can use to set their password.
  const redirectTo = publicSiteUrl
    ? `${publicSiteUrl.replace(/\/$/, '')}/reset-password`
    : undefined
  const { data: inviteData, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { full_name: name, staff_role: role },
    })
  if (inviteErr) {
    // Fallback: user may already exist; try to find by email.
    const { data: listData } = await admin.auth.admin.listUsers()
    const existing = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    )
    if (!existing) return json({ error: inviteErr.message }, 500)
    inviteData.user = existing
  }

  const userId = inviteData.user?.id
  if (!userId) return json({ error: 'Failed to create user.' }, 500)

  // Upsert the staff row. If the email was invited before, preserve the id.
  const { data: staffRow, error: upsertErr } = await admin
    .from('staff')
    .upsert(
      { email, name, role, user_id: userId, active: true },
      { onConflict: 'email' },
    )
    .select('*')
    .maybeSingle()
  if (upsertErr) return json({ error: upsertErr.message }, 500)

  return json({ ok: true, staff: staffRow })
})
