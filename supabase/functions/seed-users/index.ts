import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PASSWORD = "BuildTrack2026!";

const USERS = [
  { email: "admin@buildtrack.com.au", full_name: "Mike Johnson", role: "admin" },
  { email: "sarah@buildtrack.com.au", full_name: "Sarah Williams", role: "manager" },
  { email: "tom@buildtrack.com.au", full_name: "Tom Brown", role: "employee" },
  { email: "jake@buildtrack.com.au", full_name: "Jake Davis", role: "employee" },
  { email: "ryan@buildtrack.com.au", full_name: "Ryan Chen", role: "employee" },
  { email: "emma@buildtrack.com.au", full_name: "Emma Wilson", role: "employee" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
_report_id ON daily_expenses(daily_report_id);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: { email: string; status: string; error?: string }[] = [];

    for (const user of USERS) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: user.full_name },
      });

      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          results.push({ email: user.email, status: "already_exists" });
        } else {
          results.push({ email: user.email, status: "error", error: error.message });
        }
      } else {
        results.push({ email: user.email, status: "created", id: data.user?.id });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
