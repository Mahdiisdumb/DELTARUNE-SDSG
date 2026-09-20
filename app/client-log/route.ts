type ClientLogPayload = {
  type?: unknown;
  url?: unknown;
  timestamp?: unknown;
  details?: unknown;
};

function cleanText(value: unknown, maxLength = 4_000) {
  return String(value ?? "").slice(0, maxLength);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as ClientLogPayload;
  const event = {
    type: cleanText(payload.type, 120),
    url: cleanText(payload.url, 1_000),
    timestamp: cleanText(payload.timestamp, 80),
    details: payload.details ?? null,
  };

  console.error(`[client-runtime] ${JSON.stringify(event)}`);
  return Response.json({ ok: true });
}

