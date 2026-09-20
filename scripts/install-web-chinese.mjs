import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  cp,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const release = "260723";
const projectRoot = process.cwd();
const sourceRoot =
  process.argv[2] ?? "C:\\tmp\\DeltaruneChinese-src-260723";
const patchRoot =
  process.argv[3] ?? "C:\\tmp\\DeltaruneChinese-260723-install\\patch";
const backupRoot =
  process.argv[4] ?? "C:\\tmp\\DeltaruneChinese-web-backup-260723";
const assetRoot = path.join(projectRoot, "public", "local-assets");
const manifestPath = path.join(
  projectRoot,
  "app",
  "keys",
  "play",
  "asset-manifest.json",
);
const stageRoot = path.join(sourceRoot, "web-stage");
const packagePattern =
  /\}\((\{"files":\[[\s\S]*?\],"remote_package_size":\d+,"package_uuid":"[^"]+"\})\);/;

const scopeMap = [
  // The desktop main-menu data does not boot under the Web runner. Keep the
  // original Web chapter selector and patch only the actual game chapters.
  { web: "chapter1", source: "ch1" },
  { web: "chapter2", source: "ch2" },
  { web: "chapter3", source: "ch3" },
  { web: "chapter4", source: "ch4" },
  { web: "chapter5", source: "ch5" },
];
const chapterScopes = scopeMap;

function normalizeRelative(value) {
  return value.split(path.sep).join("/");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function digest(filePath) {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

async function assertGameData(filePath) {
  const contents = await readFile(filePath);
  if (contents.subarray(0, 4).toString("ascii") !== "FORM") {
    throw new Error(`Not a GameMaker data file: ${filePath}`);
  }
  return contents;
}

async function rebuildRunnerPackage(webScope, sourceScope) {
  const runnerJsPath = path.join(assetRoot, webScope, "runner.js");
  const runnerDataPath = path.join(assetRoot, webScope, "runner.data");
  const runnerJs = await readFile(runnerJsPath, "utf8");
  const runnerData = await readFile(runnerDataPath);
  const match = runnerJs.match(packagePattern);
  if (!match) {
    throw new Error(`Emscripten package metadata not found: ${runnerJsPath}`);
  }

  const metadata = JSON.parse(match[1]);
  if (metadata.remote_package_size !== runnerData.length) {
    throw new Error(`runner.data size mismatch before rebuild: ${webScope}`);
  }

  const overlays = new Map();
  for (const fileName of [
    "lang_en.json",
    "lang_en_names.json",
    "lang_en_names_recruitable.json",
  ]) {
    const sourcePath = path.join(
      sourceRoot,
      "workspace",
      "result",
      sourceScope,
      fileName,
    );
    const contents = await readFile(sourcePath);
    JSON.parse(contents.toString("utf8"));
    if (!/[\u3400-\u9fff]/u.test(contents.toString("utf8"))) {
      throw new Error(`Generated language file has no Chinese text: ${sourcePath}`);
    }
    overlays.set(`/assets/lang/${fileName}`, contents);
  }

  const packageParts = [];
  const rebuiltFiles = [];
  const seen = new Set();
  let offset = 0;

  for (const record of metadata.files) {
    if (
      !Number.isSafeInteger(record.start)
      || !Number.isSafeInteger(record.end)
      || record.start < 0
      || record.end < record.start
      || record.end > runnerData.length
    ) {
      throw new Error(`Invalid package range in ${webScope}: ${record.filename}`);
    }
    const contents =
      overlays.get(record.filename)
      ?? runnerData.subarray(record.start, record.end);
    packageParts.push(contents);
    rebuiltFiles.push({
      ...record,
      start: offset,
      end: offset + contents.length,
    });
    offset += contents.length;
    seen.add(record.filename);
  }

  for (const [filename, contents] of overlays) {
    if (seen.has(filename)) continue;
    packageParts.push(contents);
    rebuiltFiles.push({
      filename,
      start: offset,
      end: offset + contents.length,
      audio: 0,
    });
    offset += contents.length;
  }

  const rebuiltData = Buffer.concat(packageParts);
  const rebuiltMetadata = {
    ...metadata,
    files: rebuiltFiles,
    remote_package_size: rebuiltData.length,
    package_uuid: `${metadata.package_uuid}-chs-${release}`,
  };
  const rebuiltJs = runnerJs.replace(match[1], JSON.stringify(rebuiltMetadata));

  const stagedDir = path.join(stageRoot, webScope);
  await mkdir(stagedDir, { recursive: true });
  await writeFile(path.join(stagedDir, "runner.data"), rebuiltData);
  await writeFile(path.join(stagedDir, "runner.js"), rebuiltJs, "utf8");
}

await access(sourceRoot);
await access(patchRoot);
if (await exists(backupRoot)) {
  throw new Error(`Backup path already exists: ${backupRoot}`);
}
if (await exists(stageRoot)) {
  throw new Error(`Stage path already exists: ${stageRoot}`);
}

for (const { web, source } of scopeMap) {
  const sourceData = path.join(
    sourceRoot,
    "workspace",
    "result",
    source,
    "data.win",
  );
  await assertGameData(sourceData);
  const stagedDir = path.join(stageRoot, web);
  await mkdir(stagedDir, { recursive: true });
  await copyFile(sourceData, path.join(stagedDir, "game.unx"));
}

for (const { web, source } of chapterScopes) {
  await rebuildRunnerPackage(web, source);
}

const videoInstalls = [
  {
    source: path.join(
      patchRoot,
      "chapter3_windows",
      "vid",
      "tennaIntroF1_compressed_28.mp4",
    ),
    relative: path.join(
      "chapter3",
      "vid",
      "tennaintrof1_compressed_28.mp4",
    ),
  },
  {
    source: path.join(
      patchRoot,
      "chapter3_windows",
      "vid",
      "tennaIntroF1_zhname_compressed_28.mp4",
    ),
    relative: path.join(
      "chapter3",
      "vid",
      "tennaintrof1_zhname_compressed_28.mp4",
    ),
  },
  {
    source: path.join(
      patchRoot,
      "chapter5_windows",
      "vid",
      "ch5_intro_en.mp4",
    ),
    relative: path.join("chapter5", "vid", "ch5_intro_en.mp4"),
  },
];
for (const video of videoInstalls) {
  await access(video.source);
  const stagedPath = path.join(stageRoot, video.relative);
  await mkdir(path.dirname(stagedPath), { recursive: true });
  await copyFile(video.source, stagedPath);
}

const backupFiles = [manifestPath];
for (const { web } of scopeMap) {
  backupFiles.push(path.join(assetRoot, web, "game.unx"));
}
for (const { web } of chapterScopes) {
  backupFiles.push(path.join(assetRoot, web, "runner.data"));
  backupFiles.push(path.join(assetRoot, web, "runner.js"));
}
for (const video of videoInstalls) {
  const targetPath = path.join(assetRoot, video.relative);
  if (await exists(targetPath)) backupFiles.push(targetPath);
}

for (const sourcePath of backupFiles) {
  const relative = path.relative(projectRoot, sourcePath);
  const backupPath = path.join(backupRoot, relative);
  await mkdir(path.dirname(backupPath), { recursive: true });
  await copyFile(sourcePath, backupPath);
}

const backupManifest = [];
for (const sourcePath of backupFiles) {
  backupManifest.push({
    path: normalizeRelative(path.relative(projectRoot, sourcePath)),
    bytes: (await stat(sourcePath)).size,
    sha256: await digest(sourcePath),
  });
}
await writeFile(
  path.join(backupRoot, "backup-manifest.json"),
  `${JSON.stringify(backupManifest, null, 2)}\n`,
  "utf8",
);

for (const { web } of scopeMap) {
  await copyFile(
    path.join(stageRoot, web, "game.unx"),
    path.join(assetRoot, web, "game.unx"),
  );
}
for (const { web } of chapterScopes) {
  await copyFile(
    path.join(stageRoot, web, "runner.data"),
    path.join(assetRoot, web, "runner.data"),
  );
  await copyFile(
    path.join(stageRoot, web, "runner.js"),
    path.join(assetRoot, web, "runner.js"),
  );
}
for (const video of videoInstalls) {
  const targetPath = path.join(assetRoot, video.relative);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await copyFile(path.join(stageRoot, video.relative), targetPath);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const changedAssets = [];
for (const { web } of scopeMap) {
  changedAssets.push({
    key: `${web}::game.unx`,
    relative: path.join(web, "game.unx"),
    contentType: "application/octet-stream",
  });
}
for (const { web } of chapterScopes) {
  changedAssets.push(
    {
      key: `${web}::runner.data`,
      relative: path.join(web, "runner.data"),
      contentType: "application/octet-stream",
    },
    {
      key: `${web}::runner.js`,
      relative: path.join(web, "runner.js"),
      contentType: "text/javascript; charset=utf-8",
    },
  );
}
changedAssets.push(
  {
    key: "chapter3::vid/tennaintrof1_compressed_28.mp4",
    relative: path.join(
      "chapter3",
      "vid",
      "tennaintrof1_compressed_28.mp4",
    ),
    contentType: "video/mp4",
  },
  {
    key: "chapter3::vid/tennaintrof1_zhname_compressed_28.mp4",
    relative: path.join(
      "chapter3",
      "vid",
      "tennaintrof1_zhname_compressed_28.mp4",
    ),
    contentType: "video/mp4",
  },
  {
    key: "chapter5::vid/ch5_intro_en.mp4",
    relative: path.join("chapter5", "vid", "ch5_intro_en.mp4"),
    contentType: "video/mp4",
  },
);

for (const asset of changedAssets) {
  const localPath = normalizeRelative(asset.relative);
  const filePath = path.join(assetRoot, asset.relative);
  manifest[asset.key] = {
    bytes: (await stat(filePath)).size,
    contentType: asset.contentType,
    localPath,
  };
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

for (const [key, record] of Object.entries(manifest)) {
  const filePath = path.join(assetRoot, ...record.localPath.split("/"));
  const fileStat = await stat(filePath);
  if (fileStat.size !== record.bytes) {
    throw new Error(`Manifest size mismatch after install: ${key}`);
  }
}

console.log(
  JSON.stringify(
    {
      release,
      assets: Object.keys(manifest).length,
      backupRoot,
      changedAssets: changedAssets.length,
    },
    null,
    2,
  ),
);
