// Shared CORS headers for Supabase Edge Functions in this project.
// Admin-only functions (like phase1-audit) are still called from the browser
// with the user's JWT, so the preflight response needs these headers even
// though the actual authorization check happens inside the function.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
