// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "your-anon-key";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase environment variables are missing. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to your .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
