import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars are missing, export null — the app shows a setup notice instead of crashing.
export const supabase = url && key ? createClient(url, key) : null;
