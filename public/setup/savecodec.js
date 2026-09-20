(function init_save_transfer_codec() {
  const codeAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const codePrefix = "DRW3";
  const legacyCodePrefix = "DRW2";
  const fileMagic = [0x44, 0x52, 0x53, 0x02];
  const legacyFileMagic = [0x44, 0x52, 0x53, 0x01];
  const shortCodeLength = 8;
  const shortCodeGroupSize = 4;
  const text_encoder = new TextEncoder();
  const text_decoder = new TextDecoder();
  const default_backend_config = {
    endpoint: "",
    createPath: "/api/codes",
    resolvePath: "/api/codes/{code}",
    timeoutMs: 3500,
  };
  const compressionFormats = [
    { id: 0, name: "raw" },
    { id: 1, name: "deflate-raw" },
    { id: 2, name: "deflate" },
    { id: 3, name: "gzip" },
  ];

  function normalizeCodeText(code) {
    return String(code ?? "")
      .toUpperCase()
      .replace(/[O]/g, "0")
      .replace(/[IL]/g, "1")
      .replace(/[^A-Z0-9]/g, "");
  }

  function normalizeShortCodeText(code) {
    return normalizeCodeText(code);
  }

  function isRawCodeText(code) {
    const normalized = normalizeCodeText(code);
    return normalized.startsWith(codePrefix) || normalized.startsWith(legacyCodePrefix);
  }

  function groupCodeText(rawCode, prefix = codePrefix) {
    const normalized = normalizeCodeText(rawCode);

    if (!normalized) {
      return "";
    }

    const payload = normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
    const groups = payload.match(/.{1,4}/g) ?? [];
    return groups.length > 0 ? [prefix, ...groups].join("-") : prefix;
  }

  function groupShortCodeText(code) {
    const normalized = normalizeShortCodeText(code).slice(0, shortCodeLength);
    const groups = normalized.match(new RegExp(`.{1,${shortCodeGroupSize}}`, "g")) ?? [];
    return groups.join("-");
  }

  function formatUserCodeInput(value) {
    const normalized = normalizeCodeText(value);

    if (!normalized) {
      return "";
    }

    if (
      normalized.startsWith(codePrefix)
      || codePrefix.startsWith(normalized)
      || normalized.startsWith(legacyCodePrefix)
      || legacyCodePrefix.startsWith(normalized)
    ) {
      const prefix = normalized.startsWith(legacyCodePrefix) || legacyCodePrefix.startsWith(normalized)
        ? legacyCodePrefix
        : codePrefix;

      if (normalized.length < prefix.length && prefix.startsWith(normalized)) {
        return normalized;
      }

      return groupCodeText(normalized, prefix);
    }

    return groupShortCodeText(normalized);
  }

  function encodeBase32(bytes) {
    let bitBuffer = 0;
    let bitCount = 0;
    let output = "";

    for (const byte of bytes) {
      bitBuffer = (bitBuffer << 8) | byte;
      bitCount += 8;

      while (bitCount >= 5) {
        output += codeAlphabet[(bitBuffer >> (bitCount - 5)) & 31];
        bitCount -= 5;
      }
    }

    if (bitCount > 0) {
      output += codeAlphabet[(bitBuffer << (5 - bitCount)) & 31];
    }

    return output;
  }

  function decodeBase32(text) {
    let bitBuffer = 0;
    let bitCount = 0;
    const output = [];

    for (const char of text) {
      const value = codeAlphabet.indexOf(char);

      if (value < 0) {
        throw new Error(`Invalid import code character "${char}".`);
      }

      bitBuffer = (bitBuffer << 5) | value;
      bitCount += 5;

      while (bitCount >= 8) {
        output.push((bitBuffer >> (bitCount - 8)) & 255);
        bitCount -= 8;
      }
    }

    return new Uint8Array(output);
  }

  function encodeBase64Url(bytes) {
    let binary = "";

    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function decodeBase64Url(text) {
    const normalized = String(text ?? "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const output = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      output[index] = binary.charCodeAt(index);
    }

    return output;
  }

  function toUint8Array(value) {
    if (value instanceof Uint8Array) {
      return value;
    }

    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }

    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }

    throw new Error("Unsupported save data format.");
  }

  function concatUint8Arrays(parts) {
    const totalLength = parts.reduce((length, part) => length + part.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;

    for (const part of parts) {
      output.set(part, offset);
      offset += part.length;
    }

    return output;
  }

  function writeVarUint(parts, value) {
    let remaining = Math.max(0, Math.floor(value));

    do {
      let byte = remaining & 127;
      remaining >>>= 7;

      if (remaining > 0) {
        byte |= 128;
      }

      parts.push(Uint8Array.of(byte));
    } while (remaining > 0);
  }

  function readVarUint(bytes, cursor) {
    let result = 0;
    let shift = 0;

    while (cursor.offset < bytes.length) {
      const byte = bytes[cursor.offset];
      cursor.offset += 1;
      result |= (byte & 127) << shift;

      if ((byte & 128) === 0) {
        return result >>> 0;
      }

      shift += 7;

      if (shift > 28) {
        throw new Error("That import code is corrupted.");
      }
    }

    throw new Error("That import code is incomplete.");
  }

  function normalizeRecord(record) {
    return {
      name: String(record.name ?? "")
        .replace(/^\/_savedata\//, "")
        .replace(/^_savedata\//, "")
        .replace(/^\//, ""),
      timestampMs: Math.max(0, Math.floor(record.timestampMs ?? Date.now())),
      mode: Math.max(0, Math.floor(record.mode ?? 33206)),
      contents: toUint8Array(record.contents),
    };
  }

  function encodeRecordName(parts, name) {
    const match = /^filech(\d+)_(\d+)$/i.exec(name);

    if (match) {
      parts.push(Uint8Array.of(1));
      writeVarUint(parts, Number(match[1]));
      writeVarUint(parts, Number(match[2]));
      return;
    }

    if (name.toLowerCase() === "dr.ini") {
      parts.push(Uint8Array.of(2));
      return;
    }

    const nameBytes = text_encoder.encode(name);
    parts.push(Uint8Array.of(0));
    writeVarUint(parts, nameBytes.length);
    parts.push(nameBytes);
  }

  function decodeRecordName(bytes, cursor) {
    if (cursor.offset >= bytes.length) {
      throw new Error("That import code is incomplete.");
    }

    const nameType = bytes[cursor.offset];
    cursor.offset += 1;

    if (nameType === 1) {
      const chapter = readVarUint(bytes, cursor);
      const slot = readVarUint(bytes, cursor);
      return `filech${chapter}_${slot}`;
    }

    if (nameType === 2) {
      return "dr.ini";
    }

    if (nameType === 0) {
      const nameLength = readVarUint(bytes, cursor);

      if (cursor.offset + nameLength > bytes.length) {
        throw new Error("That import code is incomplete.");
      }

      const name = text_decoder.decode(bytes.subarray(cursor.offset, cursor.offset + nameLength));
      cursor.offset += nameLength;
      return name;
    }

    throw new Error("That import code is not valid.");
  }

  function packRecords(records) {
    const normalizedRecords = records.map((record) => normalizeRecord(record));
    const parts = [Uint8Array.from(fileMagic)];
    writeVarUint(parts, normalizedRecords.length);

    for (const record of normalizedRecords) {
      encodeRecordName(parts, record.name);
      writeVarUint(parts, record.contents.length);
      parts.push(record.contents);
    }

    return concatUint8Arrays(parts);
  }

  function unpackRecords(bytes) {
    if (bytes.length < fileMagic.length + 1) {
      throw new Error("That import code is too short.");
    }

    for (let index = 0; index < fileMagic.length; index += 1) {
      if (bytes[index] !== fileMagic[index]) {
        throw new Error("That import code is not valid.");
      }
    }

    const cursor = { offset: fileMagic.length };
    const fileCount = readVarUint(bytes, cursor);
    const records = [];

    for (let index = 0; index < fileCount; index += 1) {
      const name = decodeRecordName(bytes, cursor);
      const contentLength = readVarUint(bytes, cursor);

      if (cursor.offset + contentLength > bytes.length) {
        throw new Error("That import code is incomplete.");
      }

      records.push({
        name,
        timestampMs: Date.now(),
        mode: 33206,
        contents: bytes.slice(cursor.offset, cursor.offset + contentLength),
      });

      cursor.offset += contentLength;
    }

    return records;
  }

  function unpackLegacyRecords(bytes) {
    if (bytes.length < 6) {
      throw new Error("That import code is too short.");
    }

    for (let index = 0; index < legacyFileMagic.length; index += 1) {
      if (bytes[index] !== legacyFileMagic[index]) {
        throw new Error("That import code is not valid.");
      }
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = legacyFileMagic.length;
    const fileCount = view.getUint16(offset);
    offset += 2;
    const records = [];

    for (let index = 0; index < fileCount; index += 1) {
      if (offset + 12 > bytes.length) {
        throw new Error("That import code is incomplete.");
      }

      const nameLength = view.getUint16(offset);
      offset += 2;

      if (offset + nameLength > bytes.length) {
        throw new Error("That import code is incomplete.");
      }

      const name = text_decoder.decode(bytes.subarray(offset, offset + nameLength));
      offset += nameLength;
      const timestampSeconds = view.getUint32(offset);
      offset += 4;
      const mode = view.getUint16(offset);
      offset += 2;
      const contentLength = view.getUint32(offset);
      offset += 4;

      if (offset + contentLength > bytes.length) {
        throw new Error("That import code is incomplete.");
      }

      records.push({
        name,
        timestampMs: timestampSeconds * 1000,
        mode,
        contents: bytes.slice(offset, offset + contentLength),
      });

      offset += contentLength;
    }

    return records;
  }

  async function collectStreamBytes(readable) {
    const arrayBuffer = await new Response(readable).arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async function compressBytes(bytes, formatName) {
    const sourceStream = new Blob([bytes]).stream();
    return collectStreamBytes(sourceStream.pipeThrough(new CompressionStream(formatName)));
  }

  async function decompressBytes(bytes, formatName) {
    const sourceStream = new Blob([bytes]).stream();
    return collectStreamBytes(sourceStream.pipeThrough(new DecompressionStream(formatName)));
  }

  function getCompressionFormatById(id) {
    return compressionFormats.find((format) => format.id === id) ?? null;
  }

  async function chooseBestPayload(packedBytes) {
    let best = {
      id: 0,
      bytes: packedBytes,
    };

    if (typeof CompressionStream !== "function" || typeof DecompressionStream !== "function") {
      return best;
    }

    for (const format of compressionFormats.slice(1)) {
      try {
        const compressedBytes = await compressBytes(packedBytes, format.name);

        if (compressedBytes.length < best.bytes.length) {
          best = {
            id: format.id,
            bytes: compressedBytes,
          };
        }
      } catch (error) {
        continue;
      }
    }

    return best;
  }

  async function buildWrappedPayloadBytesFromRecords(records) {
    const packedBytes = packRecords(records);
    const bestPayload = await chooseBestPayload(packedBytes);
    const payload = new Uint8Array(bestPayload.bytes.length + 1);
    payload[0] = bestPayload.id;
    payload.set(bestPayload.bytes, 1);
    return payload;
  }

  async function decodeWrappedPayloadBytes(payloadBytes) {
    if (!(payloadBytes instanceof Uint8Array) || payloadBytes.length === 0) {
      throw new Error("That import payload is empty.");
    }

    const compressionFormat = getCompressionFormatById(payloadBytes[0]);

    if (!compressionFormat) {
      throw new Error("That import payload uses an unknown compression format.");
    }

    let unpackedBytes = payloadBytes.slice(1);

    if (compressionFormat.name !== "raw") {
      if (typeof DecompressionStream !== "function") {
        throw new Error("This browser cannot decode compressed import codes.");
      }

      unpackedBytes = await decompressBytes(unpackedBytes, compressionFormat.name);
    }

    return unpackRecords(unpackedBytes);
  }

  async function buildPayloadTextFromRecords(records) {
    const payloadBytes = await buildWrappedPayloadBytesFromRecords(records);
    return encodeBase64Url(payloadBytes);
  }

  async function buildPayloadTextFromFiles(files) {
    const records = await Promise.all(Array.from(files ?? []).map(async (file) => ({
      name: file.name,
      timestampMs: file.lastModified || Date.now(),
      mode: 33206,
      contents: new Uint8Array(await file.arrayBuffer()),
    })));

    return buildPayloadTextFromRecords(records);
  }

  async function decodePayloadText(payloadText) {
    return decodeWrappedPayloadBytes(decodeBase64Url(payloadText));
  }

  function getBackendConfig() {
    return {
      ...default_backend_config,
      ...(window.save_transfer_backend_config ?? window.saveTransferBackendConfig ?? {}),
    };
  }

  function hasShortCodeBackend() {
    return Boolean(String(getBackendConfig().endpoint ?? "").trim());
  }

  function buildBackendUrl(kind, code = "") {
    const config = getBackendConfig();
    const endpoint = String(config.endpoint ?? "").trim();

    if (!endpoint) {
      return "";
    }

    const template = kind === "create" ? config.createPath : config.resolvePath;
    const path = String(template ?? "")
      .replace("{code}", encodeURIComponent(String(code ?? "").replace(/-/g, "")));
    const endpointUrl = new URL(endpoint);
    const normalizedPath = path.replace(/^\/+/, "");
    const endpointPath = endpointUrl.pathname.replace(/\/+$/, "");
    endpointUrl.pathname = endpointPath && endpointPath !== "/"
      ? `${endpointPath}/${normalizedPath}`
      : `/${normalizedPath}`;
    endpointUrl.search = "";
    endpointUrl.hash = "";
    return endpointUrl.toString();
  }

  async function fetchJson(url, options = {}) {
    const timeoutMs = Math.max(250, Math.floor(options.timeoutMs ?? getBackendConfig().timeoutMs ?? 3500));
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller?.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || `Transfer server request failed (${response.status}).`);
      }

      return data;
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  function validateShortCode(code) {
    const normalized = normalizeShortCodeText(code);

    if (normalized.length !== shortCodeLength) {
      throw new Error("The short transfer code format is invalid.");
    }

    return groupShortCodeText(normalized);
  }

  function responseUsesVolatileShortCodeStorage(response) {
    const storage = String(response?.storage ?? "").trim().toLowerCase();
    return storage === "memory" || response?.volatile === true || response?.persisted === false;
  }

  async function createShortCode(rawCode, payload, metadata = {}) {
    const url = buildBackendUrl("create");

    if (!url) {
      throw new Error("Short-code backend is not configured.");
    }

    const response = await fetchJson(url, {
      method: "POST",
      body: JSON.stringify({
        rawCode,
        payload,
        metadata,
      }),
    });

    console.log("[save-transfer] short-code create response", response);

    if (responseUsesVolatileShortCodeStorage(response)) {
      throw new Error("Short transfer codes are temporarily unavailable right now.");
    }

    return validateShortCode(response.shortCode ?? response.code ?? "");
  }

  async function resolveShortCode(code) {
    const shortCode = validateShortCode(code);
    const url = buildBackendUrl("resolve", shortCode);

    if (!url) {
      throw new Error("Short-code backend is not configured.");
    }

    let response;

    try {
      response = await fetchJson(url, {
        method: "GET",
      });
    } catch (error) {
      const message = String(error?.message ?? "");

      if (/short code not found or expired/i.test(message)) {
        throw new Error("That short code could not be resolved.");
      }

      throw error;
    }

    console.log("[save-transfer] short-code resolve response", response);

    const payload = String(response.payload ?? "");
    const rawCode = String(response.rawCode ?? response.code ?? "");

    if (!payload && !rawCode) {
      throw new Error("That short code could not be resolved.");
    }

    return {
      payload,
      rawCode,
      shortCode,
    };
  }

  async function buildRawCodeFromRecords(records) {
    const payloadBytes = await buildWrappedPayloadBytesFromRecords(records);
    return groupCodeText(encodeBase32(payloadBytes), codePrefix);
  }

  async function buildRawCodeFromFiles(files) {
    const records = await Promise.all(Array.from(files ?? []).map(async (file) => ({
      name: file.name,
      timestampMs: file.lastModified || Date.now(),
      mode: 33206,
      contents: new Uint8Array(await file.arrayBuffer()),
    })));

    return buildRawCodeFromRecords(records);
  }

  async function buildBestCodeFromRecords(records) {
    const normalizedRecords = records.map((record) => normalizeRecord(record));
    const payloadBytes = await buildWrappedPayloadBytesFromRecords(normalizedRecords);
    const rawCode = groupCodeText(encodeBase32(payloadBytes), codePrefix);
    const payload = encodeBase64Url(payloadBytes);

    if (!hasShortCodeBackend()) {
      return {
        code: rawCode,
        mode: "raw",
        rawCode,
        payload,
        shortCode: null,
        usedBackend: false,
        fallbackReason: "Short-code backend is not configured.",
      };
    }

    try {
      const shortCode = await createShortCode(rawCode, payload, {
        fileCount: normalizedRecords.length,
        totalBytes: normalizedRecords.reduce((total, record) => total + record.contents.length, 0),
      });

      return {
        code: shortCode,
        mode: "short",
        rawCode,
        payload,
        shortCode,
        usedBackend: true,
        fallbackReason: "",
      };
    } catch (error) {
      console.warn("Unable to create short transfer code, falling back to raw code:", error);
      return {
        code: rawCode,
        mode: "raw",
        rawCode,
        payload,
        shortCode: null,
        usedBackend: false,
        fallbackReason: error?.message || "The short-code backend could not be reached.",
      };
    }
  }

  async function buildBestCodeFromFiles(files) {
    const records = await Promise.all(Array.from(files ?? []).map(async (file) => ({
      name: file.name,
      timestampMs: file.lastModified || Date.now(),
      mode: 33206,
      contents: new Uint8Array(await file.arrayBuffer()),
    })));

    return buildBestCodeFromRecords(records);
  }

  async function decodeRawCode(code) {
    const normalized = normalizeCodeText(code);

    if (normalized.startsWith(codePrefix)) {
      const encodedPayload = normalized.slice(codePrefix.length);

      if (!encodedPayload) {
        throw new Error("Enter a valid import code.");
      }

      const wrappedBytes = decodeBase32(encodedPayload);

      if (wrappedBytes.length === 0) {
        throw new Error("Enter a valid import code.");
      }

      return decodeWrappedPayloadBytes(wrappedBytes);
    }

    if (normalized.startsWith(legacyCodePrefix)) {
      const encodedPayload = normalized.slice(legacyCodePrefix.length);

      if (!encodedPayload) {
        throw new Error("Enter a valid import code.");
      }

      const wrappedBytes = decodeBase32(encodedPayload);

      if (wrappedBytes.length === 0) {
        throw new Error("Enter a valid import code.");
      }

      const compressionFlag = wrappedBytes[0];
      let payloadBytes = wrappedBytes.slice(1);

      if (compressionFlag === 1) {
        if (typeof DecompressionStream !== "function") {
          throw new Error("This browser cannot decode compressed import codes.");
        }

        payloadBytes = await decompressBytes(payloadBytes, "gzip");
      }

      return unpackLegacyRecords(payloadBytes);
    }

    throw new Error("That import code format looks wrong.");
  }

  async function decodeCode(code) {
    if (isRawCodeText(code)) {
      return decodeRawCode(code);
    }

    const normalizedShortCode = normalizeShortCodeText(code);

    if (normalizedShortCode.length === shortCodeLength) {
      const resolved = await resolveShortCode(normalizedShortCode);

      if (resolved.payload) {
        return decodePayloadText(resolved.payload);
      }

      if (resolved.rawCode) {
        return decodeRawCode(resolved.rawCode);
      }
    }

    return decodeRawCode(code);
  }

  const save_transfer_codec = {
    codePrefix,
    legacyCodePrefix,
    shortCodeLength,
    buildCodeFromFiles: buildRawCodeFromFiles,
    buildCodeFromRecords: buildRawCodeFromRecords,
    buildPayloadTextFromFiles,
    buildPayloadTextFromRecords,
    buildBestCodeFromFiles,
    buildBestCodeFromRecords,
    createShortCode,
    resolveShortCode,
    decodeCode,
    decodeRawCode,
    decodePayloadText,
    normalizeCodeText,
    normalizeShortCodeText,
    groupCodeText,
    groupShortCodeText,
    formatUserCodeInput,
    hasShortCodeBackend,
    getBackendConfig,
  };

  window.save_transfer_codec = save_transfer_codec;
  window.saveTransferCodec = save_transfer_codec;
})();
