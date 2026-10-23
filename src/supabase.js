
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kvcnrmjhkwtqaregcmqe.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_20CHPF6NTSF8zZGWt-vVzw_0cvOJwpg';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
