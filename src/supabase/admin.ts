import { createClient } from '@supabase/supabase-js';

// Service-role client for trusted server contexts (the Stripe webhook), which
// must write across users and bypass RLS. Returns null if the key isn't set,
// so callers can degrade gracefully until SUPABASE_SERVICE_ROLE_KEY is provided.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
