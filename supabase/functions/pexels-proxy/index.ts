// supabase/functions/pexels-proxy/index.ts
// Proxies Pexels image search — keeps API key server-side only

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PEXELS_KEY = Deno.env.get("PEXELS_KEY") ?? "";
const ALLOWED_ORIGINS_RAW =
  Deno.env.get("ALLOWED_ORIGINS") ??
  Deno.env.get("ALLOWED_ORIGIN") ??
  "*";
const MAX_PER_PAGE = 15;

const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function resolveAllowedOrigin(requestOrigin: string | null): string {
  if (ALLOWED_ORIGINS.includes("*")) return "*";
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;

  // Keep local development working even when production origin list is strict.
  if (requestOrigin === "http://127.0.0.1:8000" || requestOrigin === "http://localhost:8000") {
    return requestOrigin;
  }

  // Fallback to the first configured origin.
  return ALLOWED_ORIGINS[0] ?? "*";
}

function corsHeadersFor(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

serve(async (req: Request) => {
  const requestOrigin = req.headers.get("origin");
  const allowedOrigin = resolveAllowedOrigin(requestOrigin);
  const corsHeaders = corsHeadersFor(allowedOrigin);

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
