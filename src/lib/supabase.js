const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');  // ← ADD THIS LINE

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { 
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws }  // ← ADD THIS LINE
  }
);

module.exports = { supabaseAdmin };