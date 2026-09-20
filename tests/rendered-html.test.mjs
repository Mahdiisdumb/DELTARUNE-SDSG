import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const localGatePages = [
  "public/orchard.html",
  "public/verif/index.html",
  "public/setup/index.html",
  "public/app/index.html",
  "public/app/offline/index.html",
  "public/play/play/index.html",
  "public/play/rush/index.html",
];

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server renders the local Vinetrap frame", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Project Vinetrap/i);
  assert.match(html, /src="\/orchard\.html"/i);
});

test("all local ownership-gate entry points are installed", async () => {
  for (const relativePath of localGatePages) {
    const html = await readFile(new URL(relativePath, root), "utf8");
    assert.match(html, /shared\/local-gate\.js/);
  }

  const loader = await readFile(
    new URL("public/play/play/loader.js", root),
    "utf8",
  );
  assert.match(loader, /shared\/local-gate\.js/);
});

test("the protected-asset manifest matches every local file", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("app/keys/play/asset-manifest.json", root),
      "utf8",
    ),
  );

  assert.equal(Object.keys(manifest).length, 102);
  for (const [assetKey, record] of Object.entries(manifest)) {
    assert.match(assetKey, /^(chapter[1-5]|play|rush|shared)::/);
    assert.equal(typeof record.localPath, "string");
    assert.ok(record.localPath.length > 0);
    const asset = await stat(
      new URL(`public/local-assets/${record.localPath}`, root),
    );
    assert.equal(asset.size, record.bytes, assetKey);
  }
});

test("local gameplay pages do not load analytics", async () => {
  for (const scope of [
    "chapter1",
    "chapter2",
    "chapter3",
    "chapter4",
    "chapter5",
    "play",
    "rush",
  ]) {
    const html = await readFile(
      new URL(`public/play/${scope}/index.html`, root),
      "utf8",
    );
    assert.doesNotMatch(html, /googletagmanager\.com/);
  }
});

test("chapter preload packages contain the Chinese language profiles", async () => {
  const packagePattern =
    /\}\((\{"files":\[[\s\S]*?\],"remote_package_size":\d+,"package_uuid":"[^"]+"\})\);/;

  for (const scope of [
    "chapter1",
    "chapter2",
    "chapter3",
    "chapter4",
    "chapter5",
  ]) {
    const [runnerJs, runnerData] = await Promise.all([
      readFile(
        new URL(`public/local-assets/${scope}/runner.js`, root),
        "utf8",
      ),
      readFile(new URL(`public/local-assets/${scope}/runner.data`, root)),
    ]);
    const match = runnerJs.match(packagePattern);
    assert.ok(match, `${scope} package metadata`);
    const metadata = JSON.parse(match[1]);
    assert.equal(metadata.remote_package_size, runnerData.length);

    for (const fileName of [
      "lang_en.json",
      "lang_en_names.json",
      "lang_en_names_recruitable.json",
    ]) {
      const record = metadata.files.find(
        ({ filename }) => filename === `/assets/lang/${fileName}`,
      );
      assert.ok(record, `${scope}/${fileName}`);
      const contents = runnerData
        .subarray(record.start, record.end)
        .toString("utf8");
      JSON.parse(contents);
      assert.match(contents, /[\u3400-\u9fff]/u);
    }
  }
});
