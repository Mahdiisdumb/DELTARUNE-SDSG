import assetManifest from "./asset-manifest.json";

type AssetRequest = {
  asset_path?: unknown;
  play_scope?: unknown;
};

type AssetRecord = {
  bytes: number;
  contentType: string;
  localPath: string;
};

const assets = assetManifest as Record<string, AssetRecord>;
const assetKeys = new Map(
  Object.keys(assets).map((key) => [key.toLowerCase(), key]),
);

function normalizePath(value: unknown) {
  return String(value ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");
}

function normalizeScope(value: unknown) {
  const scope = normalizePath(value);
  return scope || "play";
}

function localScope(assetPath: string, playScope: string) {
  const lowerPath = assetPath.toLowerCase();
  if (
    lowerPath.startsWith("mus/")
    || lowerPath.startsWith("common/chapters/")
    || lowerPath.startsWith("common/borders/")
  ) {
    return "shared";
  }

  return playScope;
}

function describeAsset(request: Request, rawAsset: AssetRequest) {
  const assetPath = normalizePath(rawAsset?.asset_path);
  const playScope = normalizeScope(rawAsset?.play_scope);
  const cacheScope = localScope(assetPath, playScope);
  const manifestKey = `${cacheScope}::${assetPath}`;
  const canonicalKey = assetKeys.get(manifestKey.toLowerCase());
  const record = canonicalKey ? assets[canonicalKey] : null;

  if (!record) {
    return null;
  }

  const encodedPath = record.localPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const localPath = `/local-assets/${encodedPath}`;

  return {
    asset_path: assetPath,
    play_scope: playScope,
    cache_scope: cacheScope,
    cache_key: manifestKey,
    cdn_path: localPath,
    url: new URL(localPath, request.url).toString(),
    expires_at: null,
    size: record.bytes,
    size_bytes: record.bytes,
    content_type: record.contentType,
    supports_chunked_delivery: false,
    chunk_bytes: 0,
  };
}

export async function GET() {
  return Response.json({
    ok: true,
    service: "local_deltarune_play",
    assets: Object.keys(assets).length,
  });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const action = String(payload?.action ?? "");

  if (action === "create_play_session") {
    const playScope = normalizeScope(payload?.play_scope);
    return Response.json({
      ok: true,
      session_id: `local-${playScope}`,
      session_salt: "local-static-assets",
      play_scope: playScope,
      force_encrypt: false,
      persistent: true,
    });
  }

  if (action === "close_play_session") {
    return Response.json({ ok: true, closed: true });
  }

  if (action === "create_cdn_asset_manifest") {
    const requestedAssets = Array.isArray(payload?.assets) ? payload.assets : [];
    const entries = requestedAssets
      .map((asset: AssetRequest) => describeAsset(request, asset))
      .filter(Boolean);

    if (entries.length !== requestedAssets.length) {
      return Response.json(
        { ok: false, error: "A requested local asset was not found." },
        { status: 404 },
      );
    }

    return Response.json({ ok: true, entries });
  }

  if (action === "get_play_eta_manifest") {
    const requestedAssets = Array.isArray(payload?.assets) ? payload.assets : [];
    const entries = requestedAssets
      .map((asset: AssetRequest) => describeAsset(request, asset))
      .filter(Boolean)
      .map((entry) => ({
        asset_path: entry!.asset_path,
        play_scope: entry!.play_scope,
        cache_scope: entry!.cache_scope,
        cache_key: entry!.cache_key,
        size_bytes: entry!.size_bytes,
        supports_chunked_delivery: false,
        chunk_bytes: 0,
      }));

    return Response.json({ ok: true, entries });
  }

  return Response.json(
    { ok: false, error: `Unsupported local play action: ${action}` },
    { status: 400 },
  );
}
