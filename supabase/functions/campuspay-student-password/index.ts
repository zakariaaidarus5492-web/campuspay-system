import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in required.' }, 401);
  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user?.email) return json({ error: 'Invalid session.' }, 401);
  const { data: profile } = await client.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (profile?.role !== 'student') return json({ error: 'Student account required.' }, 403);
  try {
    const { oldPassword, newPassword } = await req.json();
    if (typeof newPassword !== 'string' || newPassword.length < 6) throw new Error('New password must contain at least 6 characters.');
    const verify = createClient(url, anon, { auth: { persistSession: false } });
    const { error: passwordError } = await verify.auth.signInWithPassword({ email: user.email, password: oldPassword });
    if (passwordError) throw new Error('Current password is incorrect.');
    const root = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { error } = await root.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) throw error;
    const { data: profileRow, error: profileError } = await client.from('profiles').select('student_id').eq('user_id', user.id).single();
    if (profileError) throw profileError;
    if (profileRow.student_id) {
      const { error: auditError } = await client.from('audit_logs').insert({ id: `LOG-${crypto.randomUUID()}`, action: `Student ${profileRow.student_id} changed password`, actor: user.id });
      if (auditError) throw auditError;
    }
    return json({ ok: true });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Password update failed.' }, 400); }
});
