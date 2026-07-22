// supabase/functions/pexels-proxy/index.ts
// Proxies Pexels image search — keeps API key server-side only

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PEXELS_KEY = Deno.env.get("PEXELS_KEY") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const MAX_PER_PAGE = 15;

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("query")?.trim();

  if (!query) {
    return new Response(
      JSON.stringify({ error: "query param required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const perPage = Math.min(
    parseInt(url.searchParams.get("per_page") ?? "15", 10) || MAX_PER_PAGE,
    MAX_PER_PAGE
  );

  const pexelsUrl =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
    `&orientation=landscape&per_page=${perPage}`;

  const pexelsRes = await fetch(pexelsUrl, {
    headers: { Authorization: PEXELS_KEY },
  });

  if (!pexelsRes.ok) {
    return new Response(
      JSON.stringify({ error: "Pexels API error", status: pexelsRes.status }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = await pexelsRes.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
