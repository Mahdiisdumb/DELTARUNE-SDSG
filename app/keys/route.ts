const localVerification = {
  ok: true,
  valid: true,
  verified: true,
  owns_app: true,
  appid: 1671210,
  steamid: "local",
  key_id: "local-vinetrap",
  verification_mode: "local",
  source: "local-data-win",
  match_label: "Local DELTARUNE installation",
};

export async function GET() {
  return Response.json({
    ok: true,
    service: "local_deltarune_keys",
    status: "ready",
  });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));

  if (payload?.action === "verify") {
    return Response.json(localVerification);
  }

  if (payload?.action === "create_stats_session") {
    return Response.json({
      ok: true,
      disabled: true,
      reason: "Local replicas do not send play statistics.",
    });
  }

  return Response.json({
    ...localVerification,
    action: String(payload?.action ?? ""),
  });
}
