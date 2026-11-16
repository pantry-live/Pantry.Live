const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent";
const DAILY_LIMIT = 20;
const MAX_PROMPT_CHARS = 5000;
const ALLOWED_ORIGINS = [
  "https://pantrycooking.app",
  "http://127.0.0.1:5500"
];
const RECIPE_FIELDS = ["title", "category", "subcategory", "ingredients", "steps"];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    category: { type: "STRING" },
    subcategory: { type: "STRING" },
    ingredients: { type: "STRING" },
    steps: { type: "STRING" }
  },
  required: RECIPE_FIELDS,
  propertyOrdering: RECIPE_FIELDS
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Vary": "Origin"
  };
}

function reply(request, body, status = 200, type = "text/plain") {
  return new Response(body, {
    status,
    headers: { ...corsHeaders(request), "Content-Type": type }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }
    if (request.method !== "POST") {
      return reply(request, "Method not allowed", 405);
    }

        // 0. Per-IP rate limit, before any Google or Gemini calls
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return reply(request, "Too many requests", 429);

    // 1. Sign-in token
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return reply(request, "Sign-in required", 401);

    // 2. Ask Google whether the token is valid
    const res = await fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token)
    );
    if (!res.ok) return reply(request, "Invalid sign-in", 401);
    const info = await res.json();
    if (info.aud !== env.GOOGLE_CLIENT_ID) return reply(request, "Wrong app", 401);

    // 3. Tester list
    if (!info.email) return reply(request, "Invalid sign-in", 401);
    const email = info.email.toLowerCase();
    const testers = JSON.parse((await env.PANTRY_KV.get("testers")) || "[]");
    if (!testers.includes(email)) return reply(request, "Not a tester", 403);

    // 4. Daily limit
    const today = new Date().toISOString().slice(0, 10);
    const key = "count:" + email + ":" + today;
    const used = parseInt((await env.PANTRY_KV.get(key)) || "0", 10);
    if (used >= DAILY_LIMIT) return reply(request, "Daily limit reached", 429);

    // 5. The prompt from the browser
    let body;
    try {
      body = await request.json();
    } catch {
      return reply(request, "Bad request", 400);
    }
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > MAX_PROMPT_CHARS) {
      return reply(request, "Bad request", 400);
    }

    await env.PANTRY_KV.put(key, String(used + 1), { expirationTtl: 172800 });

    // 6. Call Gemini with the secret key and return its answer unchanged
    const geminiRes = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.7
        }
      })
    });

    const text = await geminiRes.text();
    return reply(request, text, geminiRes.status, "application/json");
  }
};