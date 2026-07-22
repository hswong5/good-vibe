// supabase/functions/pexels-proxy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PEXELS_KEY = Deno.env.get("PEXELS_KEY") ?? "";
const MAX_PER_PAGE = 15;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "GET") return json({ error: "method not allowed" }, 405);
  if (!PEXELS_KEY) return json({ error: "PEXELS_KEY secret not configured" }, 500);

  const url = new URL(req.url);
  const query = url.searchParams.get("query")?.trim();
  if (!query) return json({ error: "query param required" }, 400);

  const perPage = Math.min(
    parseInt(url.searchParams.get("per_page") ?? "15", 10) || MAX_PER_PAGE,
    MAX_PER_PAGE,
  );

  const pexelsUrl =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
    `&orientation=landscape&per_page=${perPage}`;

  let pexelsRes: Response;
  try {
    pexelsRes = await fetch(pexelsUrl, { headers: { Authorization: PEXELS_KEY } });
  } catch (e) {
    return json({ error: "failed to reach Pexels", detail: String(e) }, 502);
  }

  if (!pexelsRes.ok) {
    const text = await pexelsRes.text().catch(() => "");
    return json(
      { error: "Pexels API error", status: pexelsRes.status, body: text.slice(0, 200) },
      502,
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
