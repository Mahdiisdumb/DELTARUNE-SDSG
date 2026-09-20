// ============================================================================
// Emscripten / GameMaker Studio WebAssembly Glue Code
// ============================================================================

// 1. Module Initialization
var Module;
Module || (Module = typeof Module !== 'undefined' ? Module : {});
Module.initCount || (Module.initCount = 0);
Module.initCount++;

// Check if running inside a Web Worker thread or main thread
if (!Module.ENVIRONMENT_IS_PTHREAD && !Module.$ww) {
    (function(packageData) {

        // --------------------------------------------------------------------
        // Binary Data Package Downloader (Assets fetcher)
        // --------------------------------------------------------------------
        function fetchBinaryFile(filePath, packageSize, onSuccess, onError) {
            // Node.js file system read
            if (typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string") {
                require("fs").readFile(filePath, function(err, buffer) {
                    if (err) onError(err);
                    else onSuccess(buffer.buffer);
                });
            } else {
                // Browser XMLHttpRequest fetch with progress monitoring
                var xhr = new XMLHttpRequest();
                xhr.open("GET", filePath, true);
                xhr.responseType = "arraybuffer";

                xhr.onprogress = function(event) {
                    var totalSize = packageSize;
                    if (event.total) totalSize = event.total;

                    if (event.loaded) {
                        if (!xhr.hasProgressTracking) {
                            xhr.hasProgressTracking = true;
                            Module.downloadProgress || (Module.downloadProgress = {});
                            Module.downloadProgress[filePath] = { loaded: event.loaded, total: totalSize };
                        } else {
                            Module.downloadProgress[filePath].loaded = event.loaded;
                        }

                        var aggregatedLoaded = 0;
                        var aggregatedTotal = 0;
                        var fileCount = 0;

                        for (var fileKey in Module.downloadProgress) {
                            var fileEntry = Module.downloadProgress[fileKey];
                            aggregatedTotal += fileEntry.total;
                            aggregatedLoaded += fileEntry.loaded;
                            fileCount++;
                        }

                        var calculatedTotal = Math.ceil(aggregatedTotal * Module.initCount / fileCount);
                        if (Module.setStatus) {
                            Module.setStatus("Downloading data... (" + aggregatedLoaded + "/" + calculatedTotal + ")");
                        }
                    } else if (!Module.downloadProgress && Module.setStatus) {
                        Module.setStatus("Downloading data...");
                    }
                };

                xhr.onerror = function() {
                    throw new Error("NetworkError for: " + filePath);
                };

                xhr.onload = function() {
                    if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || (xhr.status == 0 && xhr.response)) {
                        onSuccess(xhr.response);
                    } else {
                        throw new Error(xhr.statusText + " : " + xhr.responseURL);
                    }
                };

                xhr.send(null);
            }
        }

        function handlePackageError(err) {
            console.error("package error:", err);
        }

        // --------------------------------------------------------------------
        // Virtual File System Mount & Asset Unpacker
        // --------------------------------------------------------------------
        function initializeVirtualFileSystem() {
            function FilePackageEntry(startByte, endByte, isAudio) {
                this.start = startByte;
                this.end = endByte;
                this.audio = isAudio;
            }

            function processPackageData(arrayBufferData) {
                if (!arrayBufferData) throw "Loading data file failed." + Error().stack;
                if (arrayBufferData.constructor.name !== ArrayBuffer.name) throw "bad input to processPackageData" + Error().stack;

                var byteArray = new Uint8Array(arrayBufferData);
                FilePackageEntry.prototype.byteArrayData = byteArray;

                var filesList = packageData.files;
                for (var i = 0; i < filesList.length; ++i) {
                    FilePackageEntry.prototype.pendingRequests[filesList[i].filename].onload();
                }
                Module.removeRunDependency("datafile_runner.data");
            }

            // Create Virtual Directory Structure in Emscripten Memory FS
            Module.FS_createPath("/", "assets", true, true);
            Module.FS_createPath("/assets", "mus", true, true);
            Module.FS_createPath("/assets", "lang", true, true);

            FilePackageEntry.prototype = {
                pendingRequests: {},
                open: function(mode, filename) {
                    this.name = filename;
                    this.pendingRequests[filename] = this;
                    Module.addRunDependency("fp " + this.name);
                },
                send: function() {},
                onload: function() {
                    this.finish(this.byteArrayData.subarray(this.start, this.end));
                },
                finish: function(slicedBuffer) {
                    Module.FS_createDataFile(this.name, null, slicedBuffer, true, true, true);
                    Module.removeRunDependency("fp " + this.name);
                    this.pendingRequests[this.name] = null;
                }
            };

            // Register asset package files
            var files = packageData.files;
            for (var j = 0; j < files.length; ++j) {
                (new FilePackageEntry(files[j].start, files[j].end, files[j].audio || 0)).open("GET", files[j].filename);
            }

            Module.addRunDependency("datafile_runner.data");
            Module.assetManifest || (Module.assetManifest = {});
            Module.assetManifest["runner.data"] = { processed: false };

            if (preloadedPackageData) {
                processPackageData(preloadedPackageData);
                preloadedPackageData = null;
            } else {
                packageCallback = processPackageData;
            }
        }

        // Handle File Location Resolution
        if (typeof Module.locateFilePackage === "function" && !Module.locateFile) {
            Module.locateFile = Module.locateFilePackage;
            console.error("warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile");
        }

        var dataFileName = Module.locateFile ? Module.locateFile("runner.data", "") : "runner.data";
        var packageSize = packageData.remote_package_size;
        var packageCallback = null;
        var preloadedPackageData = Module.getPreloadedPackage ? Module.getPreloadedPackage(dataFileName, packageSize) : null;

        if (!preloadedPackageData) {
            fetchBinaryFile(dataFileName, packageSize, function(buffer) {
                if (packageCallback) {
                    packageCallback(buffer);
                    packageCallback = null;
                } else {
                    preloadedPackageData = buffer;
                }
            }, handlePackageError);
        }

        if (Module.calledRun) {
            initializeVirtualFileSystem();
        } else {
            Module.preRun || (Module.preRun = []);
            Module.preRun.push(initializeVirtualFileSystem);
        }

    })({
        // Package Manifest (Game Assets)
        "files": [
            { "filename": "/assets/options.ini", "start": 0, "end": 138, "audio": 0 },
            { "filename": "/assets/splash.png", "start": 138, "end": 6735, "audio": 0 },
            { "filename": "/assets/audiogroup1.dat", "start": 6735, "end": 7054967, "audio": 0 },
            { "filename": "/assets/lang/lang_ja.json", "start": 7054967, "end": 8494110, "audio": 0 },
            { "filename": "/assets/lang/lang_en.json", "start": 8494110, "end": 9639260, "audio": 0 },
            { "filename": "/assets/lang/lang_en_names.json", "start": 9639260, "end": 10792021, "audio": 0 },
            { "filename": "/assets/lang/lang_en_names_recruitable.json", "start": 10792021, "end": 11937461, "audio": 0 }
        ],
        "remote_package_size": 11937461,
        "package_uuid": "066f9a47-a3db-4e46-9afa-4868530e91b3-chs-260723"
    });
}

// ============================================================================
// 2. GameMaker Language (GML) Interface & Platform Callbacks
// ============================================================================

this.doGMLCallback = function(methodName, argsObj) {
    var jsonString = JSON.stringify(argsObj);
    var byteLength = lengthBytesUTF8(jsonString) + 1;
    var heapPointer = stackAlloc(byteLength);
    stringToUTF8(jsonString, HEAPU8, heapPointer, byteLength);

    console.log("AddAsyncMethod=" + g_pAddAsyncMethod + ", methodToCall=" + methodName + ", stringOnWasmHeap=" + heapPointer + ", argsAsJSON=" + jsonString);
    Module.dynCall("vii", g_pAddAsyncMethod, [methodName, heapPointer]);
};

this.triggerAdPrefix = function(arg0, arg1, arg2, arg3, arg4) {
    var allocPtr = stackAlloc(80);
    var p1 = allocPtr + 16;
    var p2 = allocPtr + 32;
    var p3 = allocPtr + 48;
    var p4 = allocPtr + 64;

    writeArrayToMemory(allocPtr + 0, arg0, 16);
    writeArrayToMemory(p1, arg1, 16);
    writeArrayToMemory(p2, arg2, 16);
    writeArrayToMemory(p3, arg3, 16);
    writeArrayToMemory(p4, arg4, 16);

    return allocPtr;
};

this.ModuleName = function() {
    return Module;
};

this.triggerAdPostfix = function(ptr) {
    freeWasmMemory(ptr);
};

// Audio Context Visibility Management
var audioContextInstance = null;
var audioRecordQueue = [];
var recordMediaStream = null;
var recordAudioContext = null;
var recordWorkletNode = null;
var recordMergerNode = null;

function handleVisibilityAudioChange() {
    if (audioContextInstance) {
        if (document.visibilityState === "visible") {
            audioContextInstance.resume();
        } else {
            audioContextInstance.suspend();
        }
    }
}

// Game State DRM & Pause Control Functions
var drmCallbackPtr;
this.OGX_startDRMCheck = function() {
    if (drmCallbackPtr) Module.dynCall("v", drmCallbackPtr);
};

var pauseCallbackPtr, unpauseCallbackPtr;
this.GM_pause = function() {
    if (pauseCallbackPtr) Module.dynCall("v", pauseCallbackPtr);
};
this.GM_unpause = function() {
    if (unpauseCallbackPtr) Module.dynCall("v", unpauseCallbackPtr);
};

var getViewStatusPtr, setViewStatusPtr;
this.GM_get_view_status = function() {
    var status = undefined;
    if (getViewStatusPtr) {
        var rawPtr = Module.dynCall("i", getViewStatusPtr);
        status = rawPtr ? UTF8ToString(HEAPU8, rawPtr) : "";
        status = JSON.parse(status);
        freeWasmMemory(rawPtr);
    }
    return status;
};

this.GM_set_view_status = function(statusObj) {
    if (setViewStatusPtr) {
        var jsonStr = JSON.stringify(statusObj);
        var len = lengthBytesUTF8(jsonStr) + 1;
        var heapPtr = stackAlloc(len);
        stringToUTF8(jsonStr, HEAPU8, heapPtr, len);

        console.log("GM_set_view_status=" + setViewStatusPtr + ", stringOnWasmHeap=" + heapPtr + ", argsAsJSON=" + jsonStr);
        Module.dynCall("vi", setViewStatusPtr, [heapPtr]);
    }
};

// ============================================================================
// 3. Clipboard API Bindings
// ============================================================================

var clipboardBuffer = [];
var clipboardActivated = false;
var clipboardPending = false;

this.activate_clipboard = function() {
    if (!clipboardActivated && navigator.clipboard && navigator.permissions && !clipboardPending) {
        clipboardPending = true;
        navigator.permissions.query({ name: "clipboard-read", Yl: true }).then(function(permission) {
            if (permission.state == "granted" || permission.state == "prompt") {
                clipboardActivated = true;
                clipboardPending = false;

                for (var i = 0; i < clipboardBuffer.length; ++i) {
                    navigator.clipboard.writeText(clipboardBuffer[i]);
                }
                clipboardBuffer = [];

                navigator.clipboard.readText().then(function(text) {
                    if (text !== "") clipboardBuffer.push(text);
                }).catch(function() {});
            }
        });
    }
};

this.clipboard_has_text = function() {
    if (!clipboardActivated) {
        this.activate_clipboard();
        return false;
    }
    navigator.clipboard.readText().then(function(text) {
        if (text !== "") clipboardBuffer.push(text);
    }).catch(function() {});
    return clipboardBuffer.length > 0;
};

this.clipboard_get_text = function() {
    var result = "";
    if (clipboardActivated) {
        if (clipboardBuffer.length > 0) {
            result = clipboardBuffer.pop();
        }
    } else {
        this.activate_clipboard();
    }
    return result;
};

this.clipboard_set_text = function(text) {
    if (clipboardActivated) {
        if (navigator.clipboard) navigator.clipboard.writeText(text);
    } else {
        this.activate_clipboard();
        clipboardBuffer.push(text);
    }
};

// ============================================================================
// 4. Opera GX / GXC Cloud Cache & Sync Engine
// ============================================================================

var manifestFilesCache = {};
var cachedFilesMap = {};
var currentVersionTag = "";

this.__gx_cache_file = function(fileObj) {
    if (window.oprt && window.oprt.gameFiles) {
        var fileUrl = window.origin + "/" + fileObj.name;
        var queryParams = new URLSearchParams(window.location.search);
        const gameId = queryParams.get("game");
        const trackId = queryParams.get("track");
        const releaseId = queryParams.get("release");

        if (gameId != null && trackId != null && releaseId != null) {
            fileUrl = window.location.origin + "/" + gameId + "/" + trackId + "/" + releaseId + "/" + fileObj.name;
        }

        console.log("__gx_cache_file for " + fileUrl);
        var request = new Request(fileUrl);
        let fileIdentifier = fileObj.name + ":" + fileObj.md5;

        window.oprt.gameFiles.fetchAndCache(fileIdentifier, currentVersionTag, request).then(function(response) {
            response.arrayBuffer().then(function() {
                console.log("fetchAndCache complete for file:id " + fileIdentifier);
                cachedFilesMap[fileObj.name] = {
                    name: fileObj.name,
                    md5: fileObj.md5,
                    fileId: fileIdentifier,
                    version: currentVersionTag
                };
            });
        });
    }
    return Promise.resolve();
};

this.__gx_check_cache = function(fileName, logEnabled) {
    var isCached = cachedFilesMap[fileName] !== undefined;
    if (logEnabled) {
        console.log("__gx_check_cache for " + fileName + " cached files " + JSON.stringify(cachedFilesMap) + " manifest files " + JSON.stringify(manifestFilesCache));
    }
    if (!isCached && manifestFilesCache[fileName] !== undefined && logEnabled) {
        this.__gx_cache_file(manifestFilesCache[fileName]);
    }
    return isCached;
};

this.__gx_prepare_cache = function(versionTag) {
    currentVersionTag = versionTag;
    return new Promise(function(resolve, reject) {
        if (window.oprt && window.oprt.gameFiles) {
            let fileList = manifestFiles().split(";");
            var md5List = manifestFilesMD5();

            window.oprt.gameFiles.keys().then(function(keys) {
                console.log("current cache entries are " + JSON.stringify(keys));
                var activeMap = {};
                let pendingDeletions = [];

                for (var i = 0; i < keys.length; ++i) {
                    var entry = keys[i];
                    var fileId = entry.fileId;
                    var cachedMd5 = "";
                    var separatorIdx = fileId.indexOf(":");

                    if (separatorIdx >= 0) {
                        cachedMd5 = fileId.substring(separatorIdx + 1);
                        fileId = fileId.substring(0, separatorIdx);
                    }

                    var manifestIdx = fileList.indexOf(fileId);
                    console.log("considering file " + fileId + " for deleting, indexOf is " + manifestIdx + " cached MD5 is " + cachedMd5 + " manifest md5 is " + (manifestIdx < 0 ? " not present" : md5List[manifestIdx]));

                    if (manifestIdx < 0 || md5List[manifestIdx] != cachedMd5) {
                        pendingDeletions.push(window.oprt.gameFiles.delete(entry.fileId, entry.version));
                    } else {
                        activeMap[fileId] = {
                            name: fileId,
                            md5: cachedMd5,
                            fileId: entry.fileId,
                            version: entry.version
                        };
                    }
                }

                console.log("current cache files are " + JSON.stringify(activeMap));
                cachedFilesMap = activeMap;

                var manifestMap = {};
                for (var j = 0; j < fileList.length; ++j) {
                    manifestMap[fileList[j]] = { name: fileList[j], md5: md5List[j] };
                }
                manifestFilesCache = manifestMap;

                if (cachedFilesMap["game.unx"] === undefined) {
                    console.log("caching game.unx");
                    this.__gx_cache_file(manifestFilesCache["game.unx"]).then(function() {
                        resolve({ cachedFiles: cachedFilesMap, allFiles: fileList });
                    });
                } else {
                    resolve({ cachedFiles: cachedFilesMap, allFiles: fileList });
                }
            }).catch(function(err) {
                reject(Error("error trying to enumerate cache keys - " + JSON.stringify(err)));
            });
        } else {
            reject(Error("unable to cache, API not found"));
        }
    });
};

this.__gx_async_wget2 = function(fileName, arg1, arg2, userData, onSuccess, onError, onProgress) {
    if (window.oprt && window.oprt.gameFiles) {
        var fileEntry = cachedFilesMap[fileName];
        var matchPromise = window.oprt.gameFiles.match(fileEntry.fileId, fileEntry.version);

        matchPromise.catch(function() {
            Module.dynCall("vi", onProgress, [userData]);
        });

        matchPromise.then(function(res) {
            return res.arrayBuffer();
        }).then(function(buffer) {
            var byteArray = new Uint8Array(buffer);
            var heapPtr = stackAlloc(byteArray.length);
            HEAPU8.set(byteArray, heapPtr);

            if (onError) {
                Module.dynCall("viiii", onError, [4294967295, userData, heapPtr, byteArray.length]);
            }
            if (onSuccess) {
                onSuccess(heapPtr);
            }
        });
    }
};

// ============================================================================
// 5. Virtual File System Reconciler (GXMFS Engine)
// ============================================================================

var GXMFS = {
    handles: {},
    Ji: function(a) {
        return FS.Ji.apply(null, arguments);
    },
    Ck: function(fs, flag, callback) {
        GXMFS.kk(fs, function(err, localFs) {
            if (err) return callback(err);
            GXMFS.lk(fs, function(err2, remoteFs) {
                if (err2) return callback(err2);
                GXMFS.uk(flag ? remoteFs : localFs, flag ? localFs : remoteFs, callback);
            });
        });
    },
    Hl: function() {
        GXMFS.handles = {};
    },
    wl: function(path, callback) {
        var handle = GXMFS.handles[path];
        if (!handle) {
            handle = window.oprt.gameStorage.open(path);
            GXMFS.handles[path] = handle;
        }
        return callback(null, handle);
    },
    kk: function(fsInfo, callback) {
        function filterDots(name) { return name !== "." && name !== ".."; }
        function resolvePath(base) { return function(child) { return base + "/" + child; }; }

        var entries = {};
        for (var queue = getDirectoryEntries(fsInfo.jj).filter(filterDots).map(resolvePath(fsInfo.jj)); queue.length;) {
            var path = queue.pop();
            try {
                var stats = getFileStats(path);
            } catch (e) {
                return callback(e);
            }
            if (isDirectory(stats.mode)) {
                queue.push.apply(queue, getDirectoryEntries(path).filter(filterDots).map(resolvePath(path)));
            }
            entries[path] = { timestamp: stats.mtime };
        }
        return callback(null, { type: "local", entries: entries });
    },
    lk: function(fsInfo, callback) {
        GXMFS.wl(fsInfo.jj, function(err, storageHandle) {
            if (err) return callback(err);
            storageHandle.list().then(function(items) {
                callback(null, { type: "remote", storage: storageHandle, entries: items });
            }).catch(callback);
        });
    },
    nk: function(path, callback) {
        try {
            var node = lookupPath(path).node;
            var stats = getFileStats(path);
        } catch (e) {
            return callback(e);
        }
        if (isDirectory(stats.mode)) {
            return callback(null, { timestamp: stats.mtime, mode: stats.mode });
        } else if ((stats.mode & 61440) === 32768) { // Regular File
            node.contents = getFileContents(node);
            return callback(null, { timestamp: stats.mtime, mode: stats.mode, contents: node.contents });
        }
        return callback(Error("node type not supported"));
    },
    Ak: function(path, fileNode, callback) {
        try {
            if (isDirectory(fileNode.mode)) {
                createDirectory(path, fileNode.mode);
            } else if ((fileNode.mode & 61440) === 32768) {
                createFile(path, fileNode.contents);
            } else {
                return callback(Error("node type not supported"));
            }
            changeMode(path, fileNode.mode);
            changeTimes(path, fileNode.timestamp, fileNode.timestamp);
        } catch (err) {
            return callback(err);
        }
        callback(null);
    },
    wk: function(path, callback) {
        try {
            var stats = getFileStats(path);
            if (isDirectory(stats.mode)) {
                removeDirectory(path);
            } else if ((stats.mode & 61440) === 32768) {
                unlinkFile(path);
            }
        } catch (err) {
            return callback(err);
        }
        callback(null);
    },
    pk: function(storage, key, callback) {
        storage.get(key).then(function(data) { callback(null, data); }).catch(callback);
    },
    Bk: function(storage, key, data, callback) {
        storage.put(data, key).then(function() { callback(null); }).catch(callback);
    },
    xk: function(storage, key, callback) {
        storage.delete(key).then(function() { callback(null); }).catch(callback);
    },
    uk: function(sourceFs, targetFs, callback) {
        function checkDone(err) {
            pendingOperations--;
            if (err && !hasErrorOccurred) {
                hasErrorOccurred = true;
                console.error("Reconcile failed");
                return callback(err);
            }
            if (pendingOperations === 0 && !hasErrorOccurred) {
                console.info("Reconcile finished successfully");
                return callback(null);
            }
        }

        console.info("Starting reconcile");
        var pendingOperations = 0;
        var syncList = [];

        Object.keys(sourceFs.entries).forEach(function(key) {
            var sourceItem = sourceFs.entries[key];
            var targetItem = targetFs.entries[key];
            if (!targetItem || sourceItem.timestamp.getTime() !== targetItem.timestamp.getTime()) {
                syncList.push(key);
                pendingOperations++;
            }
        });

        console.debug(`${syncList.length} entries to create/update on the ${targetFs.type === "local" ? "local filesystem" : "remote filesystem"}`);

        var deleteList = [];
        Object.keys(targetFs.entries).forEach(function(key) {
            if (!sourceFs.entries[key]) {
                deleteList.push(key);
                pendingOperations++;
            }
        });

        console.debug(`${deleteList.length} entries to remove from the ${targetFs.type === "local" ? "local filesystem" : "remote filesystem"}`);

        if (pendingOperations === 0) return callback(null);

        var hasErrorOccurred = false;
        var activeStorage = sourceFs.type === "remote" ? sourceFs.storage : targetFs.storage;

        syncList.sort().forEach(function(path) {
            if (targetFs.type === "local") {
                GXMFS.pk(activeStorage, path, function(err, data) {
                    if (err) return checkDone(err);
                    GXMFS.Ak(path, data, checkDone);
                });
            } else {
                GXMFS.nk(path, function(err, data) {
                    if (err) return checkDone(err);
                    GXMFS.Bk(activeStorage, path, data, checkDone);
                });
            }
        });

        deleteList.sort().reverse().forEach(function(path) {
            if (targetFs.type === "local") {
                GXMFS.wk(path, checkDone);
            } else {
                GXMFS.xk(activeStorage, path, checkDone);
            }
        });
    }
};

// ============================================================================
// 6. Environment & Wasm Loading Setup
// ============================================================================

var ModuleCopy = Object.assign({}, Module);
var commandLineArgs = [];
var programName = "./this.program";

var exitHandler = function(code, exception) { throw exception; };
var isBrowser = typeof window === "object";
var isWebWorker = typeof importScripts === "function";
var isNodeEnv = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";
var rootDirectory = "";

if (isNodeEnv) {
    var fsNode = require("fs");
    var pathNode = require("path");

    rootDirectory = isWebWorker ? pathNode.dirname(rootDirectory) + "/" : __dirname + "/";

    var readFileSyncNode = function(filePath, isBinary) {
        filePath = isFileUrl(filePath) ? new URL(filePath) : pathNode.normalize(filePath);
        return fsNode.readFileSync(filePath, isBinary ? undefined : "utf8");
    };

    var readBinaryFileSyncNode = function(filePath) {
        var data = readFileSyncNode(filePath, true);
        if (!data.buffer) data = new Uint8Array(data);
        return data;
    };

    var readFileAsyncNode = function(filePath, onSuccess, onError, isBinary = true) {
        filePath = isFileUrl(filePath) ? new URL(filePath) : pathNode.normalize(filePath);
        fsNode.readFile(filePath, isBinary ? undefined : "utf8", function(err, data) {
            if (err) onError(err);
            else onSuccess(isBinary ? data.buffer : data);
        });
    };

    if (!Module.thisProgram && process.argv.length > 1) {
        programName = process.argv[1].replace(/\\/g, "/");
    }
    commandLineArgs = process.argv.slice(2);

    if (typeof module !== "undefined") {
        module.exports = Module;
    }

    process.on("uncaughtException", function(err) {
        if (err !== "unwind" && !(err instanceof WasmExitException) && !(err.context instanceof WasmExitException)) {
            throw err;
        }
    });

    exitHandler = function(code, exception) {
        process.exitCode = code;
        throw exception;
    };

    Module.inspect = function() { return "[Emscripten Module object]"; };
} else if (isBrowser || isWebWorker) {
    if (isWebWorker) {
        rootDirectory = self.location.href;
    } else if (typeof document !== "undefined" && document.currentScript) {
        rootDirectory = document.currentScript.src;
    }

    if (rootDirectory.indexOf("blob:") !== 0) {
        rootDirectory = rootDirectory.substr(0, rootDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
    }

    var readFileSyncBrowser = function(url) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.send(null);
        return xhr.responseText;
    };

    if (isWebWorker) {
        var readBinaryFileSyncBrowser = function(url) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(xhr.response);
        };
    }

    var readFileAsyncBrowser = function(url, onSuccess, onError) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = function() {
            if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
                onSuccess(xhr.response);
            } else {
                onError();
            }
        };
        xhr.onerror = onError;
        xhr.send(null);
    };
}

var printLog = Module.print || console.log.bind(console);
var printErr = Module.printErr || console.error.bind(console);

Object.assign(Module, ModuleCopy);
ModuleCopy = null;

if (Module.arguments) commandLineArgs = Module.arguments;
if (Module.thisProgram) programName = Module.thisProgram;
if (Module.quit) exitHandler = Module.quit;

var wasmBinaryBuffer;
if (Module.wasmBinary) wasmBinaryBuffer = Module.wasmBinary;
if (typeof WebAssembly !== "object") abortProcess("no native wasm support detected");

// WebAssembly Memory Heap Definitions
var wasmMemory;
var isWasmAborted = false;

function initWasmMemoryViews() {
    var buffer = wasmMemory.buffer;
    Module.HEAP8 = HEAP8 = new Int8Array(buffer);
    Module.HEAP16 = HEAP16 = new Int16Array(buffer);
    Module.HEAPU8 = HEAPU8 = new Uint8Array(buffer);
    Module.HEAPU16 = HEAPU16 = new Uint16Array(buffer);
    Module.HEAP32 = HEAP32 = new Int32Array(buffer);
    Module.HEAPU32 = HEAPU32 = new Uint32Array(buffer);
    Module.HEAPF32 = HEAPF32 = new Float32Array(buffer);
    Module.HEAPF64 = HEAPF64 = new Float64Array(buffer);
}

function abortProcess(text) {
    if (Module.onAbort) Module.onAbort(text);
    text = "Aborted(" + text + ")";
    printErr(text);
    isWasmAborted = true;
    text += ". Build with -sASSERTIONS for more info.";
    throw new WebAssembly.RuntimeError(text);
}

var isDataBase64 = function(str) { return str.startsWith("data:application/octet-stream;base64,"); };
var isFileUrl = function(str) { return str.startsWith("file://"); };

var wasmBinaryFile = "runner.wasm";
if (!isDataBase64(wasmBinaryFile)) {
    var relativeWasmFile = wasmBinaryFile;
    wasmBinaryFile = Module.locateFile ? Module.locateFile(relativeWasmFile, rootDirectory) : rootDirectory + relativeWasmFile;
}

function fetchWasmBinarySync(filePath) {
    if (filePath == wasmBinaryFile && wasmBinaryBuffer) return new Uint8Array(wasmBinaryBuffer);
    if (readBinaryFileSyncBrowser) return readBinaryFileSyncBrowser(filePath);
    throw "both async and sync fetching of the wasm failed";
}

function fetchWasmBinaryAsync(filePath) {
    if (!wasmBinaryBuffer && (isBrowser || isWebWorker)) {
        if (typeof fetch === "function" && !isFileUrl(filePath)) {
            return fetch(filePath, { credentials: "same-origin" }).then(function(res) {
                if (!res.ok) throw "failed to load wasm binary file at '" + filePath + "'";
                return res.arrayBuffer();
            }).catch(function() {
                return fetchWasmBinarySync(filePath);
            });
        }
        if (readFileAsyncBrowser) {
            return new Promise(function(resolve, reject) {
                readFileAsyncBrowser(filePath, function(buffer) { resolve(new Uint8Array(buffer)); }, reject);
            });
        }
    }
    return Promise.resolve().then(function() { return fetchWasmBinarySync(filePath); });
}

function instantiateAsync(wasmPath, importObject, onSuccess) {
    return fetchWasmBinaryAsync(wasmPath).then(function(binary) {
        return WebAssembly.instantiate(binary, importObject);
    }).then(function(instance) {
        return instance;
    }).then(onSuccess, function(err) {
        printErr("failed to asynchronously prepare wasm: ");
        abortProcess(err);
    });
}

function instantiateWasmModule(importObject, onSuccess) {
    var wasmPath = wasmBinaryFile;
    if (wasmBinaryBuffer || typeof WebAssembly.instantiateStreaming !== "function" || isDataBase64(wasmPath) || isFileUrl(wasmPath) || isNodeEnv || typeof fetch !== "function") {
        instantiateAsync(wasmPath, importObject, onSuccess);
    } else {
        fetch(wasmPath, { credentials: "same-origin" }).then(function(response) {
            return WebAssembly.instantiateStreaming(response, importObject).then(onSuccess, function(err) {
                printErr("wasm streaming compile failed: ");
                printErr("falling back to ArrayBuffer instantiation");
                return instantiateAsync(wasmPath, importObject, onSuccess);
            });
        });
    }
}

// ============================================================================
// 7. WebAssembly Native Imports Function Table (WASM Imports)
// ============================================================================

var wasmImportTable = {
    1551632: function() { return hasJSExceptionHandler(); },
    1551697: function(ptr) { doJSExceptionHandler(ptr ? UTF8ToString(HEAPU8, ptr) : ""); },
    1551741: function() { return document.querySelector("canvas").getBoundingClientRect().left; },
    1551861: function() { return document.querySelector("canvas").getBoundingClientRect().top; },
    1551980: function() {
        var rect = document.querySelector("canvas").getBoundingClientRect();
        return rect.right - rect.left;
    },
    1552113: function() {
        var rect = document.querySelector("canvas").getBoundingClientRect();
        return rect.bottom - rect.top;
    },
    1552246: function(a, b, c, d, e) {
        gxc_request_room(a ? UTF8ToString(HEAPU8, a) : "", b ? UTF8ToString(HEAPU8, b) : "", c, d ? UTF8ToString(HEAPU8, d) : "", e ? UTF8ToString(HEAPU8, e) : "");
    },
    1552344: function(a, b, c, d) {
        gxc_join_room(a ? UTF8ToString(HEAPU8, a) : "", b ? UTF8ToString(HEAPU8, b) : "", c ? UTF8ToString(HEAPU8, c) : "", d ? UTF8ToString(HEAPU8, d) : "");
    },
    1552435: function() {
        var btn = document.getElementById("stats-button");
        if (btn) btn.style.visibility = "visible";
        if (btn = document.getElementById("log-state-button")) btn.style.visibility = "visible";
    },
    1552684: function() {
        var btn = document.getElementById("stats-button");
        if (btn) btn.style.visibility = "visible";
        if (btn = document.getElementById("log-state-button")) btn.style.visibility = "visible";
    },
    1552933: function(a) {
        var elem = document.getElementById("multiplayer-stats");
        if (elem && elem.style.visibility == "visible") {
            elem.innerHTML = a ? UTF8ToString(HEAPU8, a) : "";
        }
    },
    1553101: function(a) {
        if (typeof showRollbackMessage === "function") showRollbackMessage(a ? UTF8ToString(HEAPU8, a) : "");
    },
    1553194: function() {
        var btn = document.getElementById("stats-button");
        if (btn) btn.style.visibility = "hidden";
        if (btn = document.getElementById("share-button")) btn.style.visibility = "hidden";
        if (btn = document.getElementById("log-state-button")) btn.style.visibility = "hidden";
    },
    1553556: function(a, b) { gxc_set_player_status(a, b ? UTF8ToString(HEAPU8, b) : ""); },
    1553607: function(a) { gxc_report_status(a ? UTF8ToString(HEAPU8, a) : ""); },
    1553648: function(a, b, c) { gxc_get_player_info(a ? UTF8ToString(HEAPU8, a) : "", b ? UTF8ToString(HEAPU8, b) : "", c ? UTF8ToString(HEAPU8, c) : ""); },
    1553727: function(a, b) { gxc_set_room_info(a, b); },
    1553758: function(a, b, c) { gxc_get_player_info(a ? UTF8ToString(HEAPU8, a) : "", b ? UTF8ToString(HEAPU8, b) : "", c ? UTF8ToString(HEAPU8, c) : ""); },
    1553837: function(a, b, c) { gxc_receive_chat_message(a ? UTF8ToString(HEAPU8, a) : "", b, c); },
    1553893: function(a, b) { webtransport_set_relay(a ? UTF8ToString(HEAPU8, a) : "", b); },
    1553950: function(a) { webtransport_destroy(a); },
    1553980: function(a, b, c) { webtransport_send(a, b, c); },
    1554015: function(a, b, c) { return webtransport_receive(a, b, c); },
    1554060: function(a) { alert(a ? UTF8ToString(HEAPU8, a) : ""); },
    1554090: function(a) { alert(a ? UTF8ToString(HEAPU8, a) : ""); },
    1554119: function() { return clipboard_has_text(); },
    1554167: function() {
        var text = clipboard_get_text();
        var len = lengthBytesUTF8(text) + 1;
        var heapPtr = stackAlloc(len);
        stringToUTF8(text, HEAPU8, heapPtr, len + 1);
        return heapPtr;
    },
    1554343: function(a) { clipboard_set_text(a ? UTF8ToString(HEAPU8, a) : ""); },
    1554386: function() {
        var orientation = -1;
        if (window.matchMedia("(orientation:portrait)").matches) orientation = 1;
        else if (window.matchMedia("(orientation:landscape)").matches) orientation = 0;
        return orientation;
    },
    1554564: function(a) { window.open(a ? UTF8ToString(HEAPU8, a) : "", "_blank").focus(); },
    1554619: function() {
        var canvas = document.querySelector("canvas");
        if (canvas.videoPlayer != null) {
            canvas.videoPlayer.pause();
            console.log("Pausing video player");
            canvas.videoPlayer.removeAttribute("src");
            canvas.videoPlayer.load();
        }
    },
    1554869: function(heapPtr, width, height) {
        var canvas = document.querySelector("canvas");
        if (canvas.videoContext != null) {
            var imgData = canvas.videoContext.getImageData(0, 0, width, height);
            var byteArray = new Uint8Array(imgData.data.buffer);
            HEAP8.set(byteArray, heapPtr);
            return 1;
        }
        console.log("Not rendering video as context is null");
        return 0;
    },
    1555206: function() {
        var canvas = document.querySelector("canvas");
        return canvas.videoPlayer != null ? canvas.videoPlayer.videoWidth : 0;
    },
    1555353: function() {
        var canvas = document.querySelector("canvas");
        return canvas.videoPlayer != null ? canvas.videoPlayer.videoHeight : 0;
    },
    1555501: function() {
        var canvas = document.querySelector("canvas");
        if (canvas.videoPlayer != null) {
            if (canvas.videoPlayer.paused) return -1;
            if (!canvas.videoPlayer.ended) return 0;
        }
        return -1;
    },
    1555704: function(vol) {
        var canvas = document.querySelector("canvas");
        if (canvas.videoPlayer != null) canvas.videoPlayer.volume = vol;
    },
    1555837: function(srcPtr) {
        function attachInteractionListeners() {
            function unmuteVideo() {
                const videoElem = document.querySelector("canvas").videoPlayer;
                if (videoElem != null) videoElem.muted = false;
            }
            var downEvt = "mousedown", upEvt = "mouseup";
            if ("ontouchstart" in window) { downEvt = "touchstart"; upEvt = "touchend"; }
            if (window.PointerEvent || window.navigator.pointerEnabled || window.navigator.msPointerEnabled) {
                downEvt = "pointerdown"; upEvt = "pointerup";
            }
            document.body.addEventListener(downEvt, unmuteVideo, { once: true });
            document.body.addEventListener(upEvt, unmuteVideo, { once: true });
        }

        var canvas = document.querySelector("canvas");
        if (canvas.videoPlayer == null) {
            canvas.videoPlayer = document.createElement("video");
        } else {
            canvas.videoPlayer.pause();
        }

        const video = canvas.videoPlayer;
        var srcUrl = srcPtr ? UTF8ToString(HEAPU8, srcPtr) : "";
        video.muted = false;
        video.src = srcUrl;

        const videoEndedCallback = { Rl: Module.cwrap("video_playback_ended", "", "") };
        const videoStartedCallback = { Sl: Module.cwrap("video_playback_started", "", "") };

        video.addEventListener("ended", function() { videoEndedCallback.Rl(); });
        video.addEventListener("playing", function() {
            console.log("Video playing event called");
            videoStartedCallback.Sl();
        }, true);

        const frameUpdateLoop = function() {
            var cvs = document.querySelector("canvas");
            if (cvs.offscreenCanvas == null) {
                cvs.offscreenCanvas = document.createElement("canvas");
                cvs.offscreenCanvas.style.cssText = "position:fixed; top:1px; left:1px; width:1px; height:1px";
                cvs.offscreenCanvas.width = video.videoWidth;
                cvs.offscreenCanvas.height = video.videoHeight;
                document.body.appendChild(cvs.offscreenCanvas);
                cvs.videoContext = cvs.offscreenCanvas.getContext("2d", {
                    alpha: false,
                    powerPreference: "low-power",
                    desynchronized: true,
                    preserveDrawingBuffer: true
                });
            } else {
                if (cvs.offscreenCanvas.width != video.videoWidth) cvs.offscreenCanvas.width = video.videoWidth;
                if (cvs.offscreenCanvas.height != video.videoHeight) cvs.offscreenCanvas.height = video.videoHeight;
            }

            if (cvs.videoPlayer != null && cvs.videoContext != null) {
                cvs.videoContext.drawImage(cvs.videoPlayer, 0, 0);
            }
            if (cvs.videoPlayer != null) {
                if (cvs.videoPlayer.src != null) {
                    cvs.videoPlayer.requestVideoFrameCallback(frameUpdateLoop);
                } else {
                    console.log("stopping video player callback check");
                }
            }
        };

        video.requestVideoFrameCallback(frameUpdateLoop);
        video.load();

        var playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.then(function() {}).catch(function() {
                console.log("video_open failed. User must interact with the page before video with audio can be played. Attempting to play the video muted");
                video.muted = true;
                video.play();
                attachInteractionListeners();
            });
        }
    },
    1558907: function() {
        var canvas = document.querySelector("canvas");
        if (canvas.videoPlayer != null) canvas.videoPlayer.pause();
    },
    1559038: function() {
        var canvas = document.querySelector("canvas");
        if (canvas.videoPlayer != null) canvas.videoPlayer.play();
    },
    1559168: function(isLooping) {
        var canvas = document.querySelector("canvas");
        if (canvas.videoPlayer != null) canvas.videoPlayer.loop = isLooping > 0.5;
    },
    1559361: function(timeSec) {
        var canvas = document.querySelector("canvas");
        if (canvas.videoPlayer != null) canvas.videoPlayer.currentTime = timeSec;
    },
    1559501: function() {
        var canvas = document.querySelector("canvas");
        return (canvas.videoPlayer == null || isNaN(canvas.videoPlayer.duration)) ? 0 : canvas.videoPlayer.duration;
    },
    1559696: function() {
        var canvas = document.querySelector("canvas");
        return canvas.videoPlayer != null ? canvas.videoPlayer.currentTime : 0;
    },
    1559848: function() {
        var canvas = document.querySelector("canvas");
        if (canvas.videoPlayer != null) {
            if (canvas.videoPlayer.ended) return 0;
            if (canvas.videoPlayer.paused) return 3;
            if (canvas.videoPlayer.readyState < canvas.videoPlayer.HAVE_CURRENT_DATA) return 1;
            return 2;
        }
        return 0;
    },
    1560368: function() {
        var canvas = document.querySelector("canvas");
        return canvas.videoPlayer != null ? canvas.videoPlayer.loop : 0;
    },
    1560513: function() {
        var canvas = document.querySelector("canvas");
        return canvas.videoPlayer != null ? canvas.videoPlayer.volume : 0;
    },
    1560660: function(width, height, fps, enableAudio) {
        var canvas = document.querySelector("canvas");
        var options = {};

        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
            console.log("CheckMediaRecorder::vp9 supported");
            options = { mimeType: "video/webm; codecs=vp9" };
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
            console.log("CheckMediaRecorder::vp8 supported");
            options = { mimeType: "video/webm; codecs=vp8" };
        } else {
            console.log("CheckMediaRecorder::No vp8 or vp9 support");
        }

        canvas.stream = canvas.captureStream(fps);
        canvas.stream.getVideoTracks().find(function(track) { return track.enabled; });

        if (canvas.recorderCanvas == null) {
            canvas.recorderCanvas = document.createElement("canvas");
            canvas.recorderCanvas.style.cssText = "position:fixed; top:1px; left:1px; width:1px; height:1px";
            canvas.recorderCanvas.width = width;
            canvas.recorderCanvas.height = height;
            document.body.appendChild(canvas.recorderCanvas);

            console.log("Game Canvas width:" + canvas.width + " height:" + canvas.height);

            canvas.recorderContext = canvas.recorderCanvas.getContext("2d", {
                alpha: false,
                desynchronized: true,
                antialias: true,
                powerPreference: "low-power",
                preserveDrawingBuffer: true
            });

            canvas.recorderVideo = document.createElement("video");
            canvas.recorderVideo.autoplay = true;
            canvas.recorderVideo.muted = true;
            canvas.recorderVideo.style.cssText = "position:fixed;top:1px;left:1px;width:1px;height:1px";
            document.body.appendChild(canvas.recorderVideo);

            canvas.recorderVideo.srcObject = canvas.stream;
            var captureStream = canvas.recorderCanvas.captureStream(fps);

            if (enableAudio > 0) {
                var audioTrack = audioContextInstance.createMediaStreamDestination().stream.getAudioTracks().find(function(t) { return t.enabled; });
                captureStream.addTrack(audioTrack);
            }

            var recorder = new MediaRecorder(captureStream, options);
            canvas.recordedChunks = [];
            recorder.ondataavailable = function(e) { canvas.recordedChunks.push(e.data); };
            canvas.mediaRecorder = recorder;
        }

        if (canvas.recorderInterval == null) {
            canvas.recorderInterval = setInterval(function() {
                canvas.recorderContext.drawImage(canvas.recorderVideo, 0, 0, canvas.width, canvas.height, 0, 0, canvas.recorderCanvas.width, canvas.recorderCanvas.height);
            }, 1000 / fps);
        }

        if (canvas.mediaRecorder && canvas.mediaRecorder.state != "recording") {
            canvas.mediaRecorder.start();
        }
    },
    1563156: function(targetPathPtr) {
        var canvas = document.querySelector("canvas");
        if (canvas.mediaRecorder && (canvas.mediaRecorder.state == "recording" || canvas.mediaRecorder.state == "paused")) {
            var targetPath = targetPathPtr ? UTF8ToString(HEAPU8, targetPathPtr) : "";
            canvas.mediaRecorder.onstop = function() {
                var blob = new Blob(canvas.recordedChunks, { type: "video/webm" });
                canvas.recordedChunks = [];
                clearInterval(canvas.recorderInterval);
                canvas.recorderInterval = null;

                const uploadCallback = { sk: Module.cwrap("post_video_upload_callback", "", ["string"]) };

                if (targetPath.startsWith("http")) {
                    fetch(targetPath, { method: "PUT", body: blob }).then(function() {
                        uploadCallback.sk("upload completed");
                    }).catch(function(err) {
                        uploadCallback.sk("Error uploading: " + err);
                    });
                } else if (targetPath !== "") {
                    var blobUrl = URL.createObjectURL(blob);
                    var downloadLink = document.createElement("a");
                    document.body.appendChild(downloadLink);
                    downloadLink.style = "display: none";
                    downloadLink.href = blobUrl;
                    downloadLink.download = targetPath;
                    downloadLink.click();
                    window.URL.revokeObjectURL(blobUrl);
                    uploadCallback.sk("filesaved");
                }
            };
            canvas.mediaRecorder.stop();
            console.log("saving chunks to movie");
        }
    },
    1564300: function() {
        var canvas = document.querySelector("canvas");
        if (canvas.mediaRecorder && canvas.mediaRecorder.state == "recording") canvas.mediaRecorder.pause();
    },
    1564470: function() {
        var canvas = document.querySelector("canvas");
        if (canvas.mediaRecorder && canvas.mediaRecorder.state == "paused") canvas.mediaRecorder.resume();
    },
    1564638: function(a, b, c, d, e, f) { triggerAd(a ? UTF8ToString(HEAPU8, a) : "", b, c, d, e, f); },
    1564691: function() {
        var width = 640;
        if (typeof window.innerWidth === "number") width = window.innerWidth;
        else if (document.documentElement && document.documentElement.clientWidth) width = document.documentElement.clientWidth;
        else if (document.body && document.body.clientWidth) width = document.body.clientWidth;
        return width;
    },
    1564997: function() {
        var height = 480;
        if (typeof window.innerHeight === "number") height = window.innerHeight;
        else if (document.documentElement && document.documentElement.clientHeight) height = document.documentElement.clientHeight;
        else if (document.body && document.body.clientHeight) height = document.body.clientHeight;
        return height;
    },
    1565309: function(lockLandscape, lockPortrait, allowRotate, allowInvert) {
        var result = -1;
        if (window.oprt != undefined) {
            var unlockFn = window.oprt.unlockOrientation;
            var lockPortFn = window.oprt.lockPortraitOrientation;
            var lockLandFn = window.oprt.lockLandscapeOrientation;

            var flags = (lockLandscape ? 1 : 0) | (lockPortrait ? 2 : 0) | (allowRotate ? 4 : 0);
            flags |= allowInvert ? 8 : 0;

            if ((flags & 15) != 15 && flags != 0 || unlockFn == undefined || typeof unlockFn !== "function") {
                if (typeof unlockFn === "function") { unlockFn(); console.log("unlocking all orientations"); }
            }

            if ((flags & 5) != 0 && lockLandFn != undefined && typeof lockLandFn === "function") {
                lockLandFn(); console.log("Locking to Landscape"); result = 0;
            } else if ((flags & 10) != 0 && lockPortFn != undefined && typeof lockPortFn === "function") {
                lockPortFn(); console.log("Locking to Portrait"); result = 0;
            }
        }
        return result;
    },
    1566297: function(enableFullscreen) {
        if (enableFullscreen) {
            if (window.oprt != undefined && window.oprt.enterFullscreen != undefined) {
                console.log("enterFullscreen");
                window.oprt.enterFullscreen();
            } else {
                console.log("canvas requesting enterFullscreen");
                document.querySelector("canvas").requestFullscreen();
            }
        } else {
            if (window.oprt != undefined && window.oprt.exitFullscreen != undefined) {
                console.log("exitFullscreen");
                window.oprt.exitFullscreen();
            } else {
                console.log("exitFullscreen via document");
                document.exitFullscreen();
            }
        }
    },
    1566825: function() { return screen.width; },
    1566850: function() { return screen.height; },
    1566876: function(titlePtr) { document.title = titlePtr ? UTF8ToString(HEAPU8, titlePtr) : ""; },
    1566915: function(width, height) { if (this.onGameSetWindowSize) onGameSetWindowSize(width, height); },
    1566984: function(cursorPtr) { document.querySelector("canvas").style.cursor = cursorPtr ? UTF8ToString(HEAPU8, cursorPtr) : ""; },
    1567083: function() {
        audioContextInstance = new AudioContext();
        document.addEventListener("visibilitychange", handleVisibilityAudioChange);
    },
    1567205: function() {
        audioContextInstance.close().then(function() {
            audioContextInstance = null;
            document.removeEventListener("visibilitychange", handleVisibilityAudioChange);
        });
    },
    1567364: function() {
        function resumeAudioOnUserAction() {
            audioContextInstance.resume().then(function() {
                document.body.removeEventListener(downEvt, resumeAudioOnUserAction);
                document.body.removeEventListener(upEvt, resumeAudioOnUserAction);
            });
        }
        let downEvt = "mousedown", upEvt = "mouseup";
        if ("ontouchstart" in window) { downEvt = "touchstart"; upEvt = "touchend"; }
        if (window.PointerEvent || window.navigator.pointerEnabled || window.navigator.msPointerEnabled) {
            downEvt = "pointerdown"; upEvt = "pointerup";
        }
        document.body.addEventListener(downEvt, resumeAudioOnUserAction);
        document.body.addEventListener(upEvt, resumeAudioOnUserAction);
    },
    1568068: function() { audioContextInstance.suspend(); },
    1568101: function() { return audioContextInstance != null; },
    1568141: function() {
        if (audioContextInstance == null) return 4;
        switch (audioContextInstance.state) {
            case "suspended": return 0;
            case "running": return 1;
            case "closed": return 2;
            case "interrupted": return 3;
        }
    },
    1568335: function() { return audioContextInstance == null ? 0 : audioContextInstance.currentTime; },
    1568413: function() { return audioContextInstance == null ? 0 : audioContextInstance.sampleRate; },
    1568490: function() { return audioContextInstance == null ? 0 : audioContextInstance.destination.channelCount; },
    1568579: function(heapPtr, channelCount, lengthSamples, sampleRate, audioBufferOffset, startTime) {
        var buffer = audioContextInstance.createBuffer(channelCount, sampleRate, audioBufferOffset);
        for (let ch = 0; ch < channelCount; ++ch) {
            const channelData = buffer.getChannelData(ch);
            for (let i = 0; i < sampleRate; ++i) {
                channelData[i] = readPcmSampleFloat(heapPtr + lengthSamples * (ch + i * channelCount));
            }
        }
        var source = audioContextInstance.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextInstance.destination);
        source.start(startTime);
        return startTime + buffer.duration;
    },
    1569225: function(sampleRate) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
                const getChannelCount = function(s) {
                    var tracks = s.getAudioTracks();
                    if (tracks.length > 0) return tracks[0].getSettings().channelCount;
                };

                recordMediaStream = stream;
                recordAudioContext = new AudioContext({ sampleRate: sampleRate });
                recordAudioContext.audioWorklet.addModule("audio-worklet.js").then(function() {
                    recordWorkletNode = new AudioWorkletNode(recordAudioContext, "audio-worklet");
                    recordWorkletNode.port.onmessage = function(e) { audioRecordQueue.push(e.data); };
                    var sourceNode = new MediaStreamAudioSourceNode(recordAudioContext, { mediaStream: stream });
                    const chCount = getChannelCount(stream);

                    if (chCount > 1) {
                        recordMergerNode = new ChannelMergerNode(recordAudioContext, { numberOfInputs: chCount });
                        sourceNode.connect(recordMergerNode);
                        recordMergerNode.connect(recordWorkletNode);
                    } else {
                        sourceNode.connect(recordWorkletNode);
                    }
                    recordAudioContext.resume();
                }).catch(function(err) {
                    console.error(err);
                    if (recordMediaStream) recordMediaStream.getTracks().forEach(function(t) { t.stop(); });
                    recordMergerNode = recordWorkletNode = recordMediaStream = recordAudioContext = null;
                });
            }).catch(function(err) { console.error(err); });
        }
    },
    1571002: function() {
        audioRecordQueue = [];
        recordMediaStream.getTracks().forEach(function(track) { track.stop(); });
        recordWorkletNode.port.postMessage(true);
        recordWorkletNode.disconnect();
        if (recordMergerNode != null) { recordMergerNode.disconnect(); recordMergerNode = null; }
        recordWorkletNode.disconnect();
        recordWorkletNode = null;
        recordAudioContext.close().then(function() { recordAudioContext = null; }).catch(function(err) { console.error(err); });
    },
    1571594: function(outHeapPtr, bufferLen, chCount) {
        bufferLen /= chCount;
        for (let i = 0; i < bufferLen; ++i) {
            const chunk = audioRecordQueue.shift();
            for (let ch = 0; ch < chCount; ++ch) {
                writePcmSampleInt16(outHeapPtr + 2 * (i * chCount + ch), chunk[ch]);
            }
        }
    },
    1571938: function(factor) { return audioRecordQueue.length * factor; },
    1572024: function() { return (recordMediaStream != null && recordWorkletNode != null) ? 1 : 0; },
    1572137: function() { return screen.width; },
    1572162: function() { return screen.height; },
    1572188: function() { return screen.width; },
    1572213: function() { return screen.height; },
    1572239: function() {
        var canvas = document.getElementById("canvas");
        const visibility = canvas.style.visibility;
        canvas.style.visibility = "hidden";
        canvas.offsetHeight;
        canvas.style.visibility = visibility;
    },
    1572477: function(wadId, status) { if (typeof g_pWadLoadCallback === "function") g_pWadLoadCallback(wadId, status); },
    1572537: function() {
        var filesStr = manifestFiles();
        var len = lengthBytesUTF8(filesStr) + 1;
        var heapPtr = stackAlloc(len);
        stringToUTF8(filesStr, HEAPU8, heapPtr, len);
        return heapPtr;
    },
    1572693: function(fileNamePtr) { return __gx_check_cache(fileNamePtr ? UTF8ToString(HEAPU8, fileNamePtr) : "", true) ? 1 : 0; },
    1572755: function(a, b, c, d, e, f, g, h) {
        __gx_async_wget2(a ? UTF8ToString(HEAPU8, a) : "", b ? UTF8ToString(HEAPU8, b) : "", c ? UTF8ToString(HEAPU8, c) : "", d, e, f, g, h);
    },
    1572852: function(methodPtr) { setAddAsyncMethod(methodPtr); },
    1572879: function(cbSuccess, arg1, versionPtr, cbError) {
        __gx_prepare_cache(versionPtr ? UTF8ToString(HEAPU8, versionPtr) : "").then(function(res) {
            console.log("Prepare cache completed" + JSON.stringify(res));
            Module.dynCall("vi", cbSuccess, [arg1]);
        }).catch(function(err) {
            console.log("Prepare cache error " + err);
            Module.dynCall("vi", cbSuccess, [cbError]);
        });
    },
    1573159: function(fileNamePtr) { return __gx_check_cache(fileNamePtr ? UTF8ToString(HEAPU8, fileNamePtr) : "", false) ? 1 : 0; },
    1573220: function(wadId, status) { if (typeof g_pWadLoadCallback === "function") g_pWadLoadCallback(wadId, status); },
    1573280: function(urlPtr) { window.location.replace(urlPtr ? UTF8ToString(HEAPU8, urlPtr) : ""); },
    1573327: function() { if (this.onFirstFrameRendered) onFirstFrameRendered(); },
    1573390: function(extIdPtr, msgPtr) {
        if (this.chrome && this.chrome.runtime) {
            chrome.runtime.sendMessage(extIdPtr ? UTF8ToString(HEAPU8, extIdPtr) : "", { command: msgPtr ? UTF8ToString(HEAPU8, msgPtr) : "" });
        }
    },
    1573527: function(randStrPtr, arg1, extIdPtr, cmdPtr, hashHeapPtr) {
        function calculateHashSum(response) {
            if (response.hash) {
                var sum = 0;
                (new Uint8Array(response.hash)).every(function(byte) {
                    sum = (sum + byte) & 255;
                    return true;
                });
                yyWrapper.fl(sum, arg1);
            }
        }
        const yyWrapper = { fl: Module.cwrap("YYSum", "", ["number", "number"]) };
        if (this.chrome && this.chrome.runtime) {
            var hashSlice = HEAPU8.subarray(hashHeapPtr, hashHeapPtr + 20);
            var randStr = randStrPtr ? UTF8ToString(HEAPU8, randStrPtr) : "";
            chrome.runtime.sendMessage(extIdPtr ? UTF8ToString(HEAPU8, extIdPtr) : "", {
                command: cmdPtr ? UTF8ToString(HEAPU8, cmdPtr) : "",
                randomString: randStr,
                hash: hashSlice
            }, calculateHashSum);
        }
    },
    1574087: function(a, b, c, d, e) {
        pauseCallbackPtr = a;
        unpauseCallbackPtr = b;
        getViewStatusPtr = c;
        setViewStatusPtr = d;
        drmCallbackPtr = e;
    },
    1574203: function(msgPtr, defaultPtr) {
        var result = prompt(msgPtr ? UTF8ToString(HEAPU8, msgPtr) : "", defaultPtr ? UTF8ToString(HEAPU8, defaultPtr) : "");
        var len = lengthBytesUTF8(result) + 1;
        var heapPtr = stackAlloc(len);
        stringToUTF8(result, HEAPU8, heapPtr, len + 1);
        return heapPtr;
    },
    1574399: function(msgPtr) { return confirm(msgPtr ? UTF8ToString(HEAPU8, msgPtr) : "") ? 1 : 0; },
    1574446: function(msgPtr, defaultPtr) {
        var result = prompt(msgPtr ? UTF8ToString(HEAPU8, msgPtr) : "", defaultPtr ? UTF8ToString(HEAPU8, defaultPtr) : "");
        var len = 1;
        if (result) len += lengthBytesUTF8(result); else result = "";
        var heapPtr = stackAlloc(len);
        stringToUTF8(result, HEAPU8, heapPtr, len + 1);
        return heapPtr;
    },
    1574677: function(msgPtr) { return confirm(msgPtr ? UTF8ToString(HEAPU8, msgPtr) : "") ? 1 : 0; },
    1574724: function(msgPtr) { alert(msgPtr ? UTF8ToString(HEAPU8, msgPtr) : ""); },
    1574754: function() {
        createDirectoryRecursive("/_savedata");
        if (window.oprt && window.oprt.gameStorage) {
            syncDatabaseToFs(GXMFS, "/_savedata");
        } else {
            syncDatabaseToFs(IDBFS, "/_savedata");
        }
        flushSaveData(true, function() { executeWasmCallback("FSSyncCompleted", "void"); });
    },
    1574976: function() { flushSaveData(false, function() {}); },
    1575014: function() { flushSaveData(false, function() {}); },
    1575051: function() { flushSaveData(false, function() {}); },
    1575089: function() { return typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined"; },
    1575236: function() {
        return (typeof navigator.mediaDevices !== "undefined" && typeof navigator.mediaDevices.getUserMedia !== "undefined") || typeof navigator.webkitGetUserMedia !== "undefined";
    },

    // ------------------------------------------------------------------------
    // SDL2 WebAudio Integration
    // ------------------------------------------------------------------------
    1575470: function(isCapture) {
        if (typeof Module.SDL2 === "undefined") Module.SDL2 = {};
        var sdl = Module.SDL2;
        if (isCapture) sdl.capture = {}; else sdl.audio = {};

        if (!sdl.audioContext) {
            if (typeof AudioContext !== "undefined") sdl.audioContext = new AudioContext();
            else if (typeof webkitAudioContext !== "undefined") sdl.audioContext = new webkitAudioContext();
            if (sdl.audioContext) registerAudioContext(sdl.audioContext);
        }
        return sdl.audioContext === undefined ? -1 : 0;
    },
    1575963: function() { return Module.SDL2.audioContext.sampleRate; },
    1576031: function(chCount, bufferSize, cbPtr, userData) {
        function onError() {}
        function onSuccess(stream) {
            if (sdl.capture.timeoutId !== undefined) {
                clearTimeout(sdl.capture.timeoutId);
                sdl.capture.timeoutId = undefined;
            }
            sdl.capture.mediaStreamSource = sdl.audioContext.createMediaStreamSource(stream);
            sdl.capture.scriptProcessor = sdl.audioContext.createScriptProcessor(bufferSize, chCount, 1);
            sdl.capture.scriptProcessor.onaudioprocess = function(e) {
                if (sdl !== undefined && sdl.capture !== undefined) {
                    e.outputBuffer.getChannelData(0).fill(0);
                    sdl.capture.currentInputBuffer = e.inputBuffer;
                    invokeWasmCallback("vi", cbPtr, [userData]);
                }
            };
            sdl.capture.mediaStreamSource.connect(sdl.capture.scriptProcessor);
            sdl.capture.scriptProcessor.connect(sdl.audioContext.destination);
            sdl.capture.stream = stream;
        }

        var sdl = Module.SDL2;
        sdl.capture.dummyBuffer = sdl.audioContext.createBuffer(chCount, bufferSize, sdl.audioContext.sampleRate);
        sdl.capture.dummyBuffer.getChannelData(0).fill(0);
        sdl.capture.timeoutId = setTimeout(function() {
            sdl.capture.currentInputBuffer = sdl.capture.dummyBuffer;
            invokeWasmCallback("vi", cbPtr, [userData]);
        }, bufferSize / sdl.audioContext.sampleRate * 1000);

        if (navigator.mediaDevices != undefined && navigator.mediaDevices.getUserMedia != undefined) {
            navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(onSuccess).catch(onError);
        } else if (navigator.webkitGetUserMedia != undefined) {
            navigator.webkitGetUserMedia({ audio: true, video: false }, onSuccess, onError);
        }
    },
    1577683: function(chCount, bufferSize, cbPtr, userData) {
        var sdl = Module.SDL2;
        sdl.audio.scriptProcessor = sdl.audioContext.createScriptProcessor(bufferSize, 0, chCount);
        sdl.audio.scriptProcessor.onaudioprocess = function(e) {
            if (sdl !== undefined && sdl.audio !== undefined) {
                sdl.audio.outputBuffer = e.outputBuffer;
                invokeWasmCallback("vi", cbPtr, [userData]);
            }
        };
        sdl.audio.scriptProcessor.connect(sdl.audioContext.destination);
    },
    1578093: function(destPtr, sampleCount) {
        var sdl = Module.SDL2;
        var numChannels = sdl.capture.currentInputBuffer.numberOfChannels;
        for (var ch = 0; ch < numChannels; ++ch) {
            var channelData = sdl.capture.currentInputBuffer.getChannelData(ch);
            if (channelData.length != sampleCount) {
                throw "Web Audio capture buffer length mismatch! Destination size: " + channelData.length + " samples vs expected " + sampleCount + " samples!";
            }
            if (numChannels == 1) {
                for (var i = 0; i < sampleCount; ++i) writePcmFloat(destPtr + 4 * i, channelData[i]);
            } else {
                for (var j = 0; j < sampleCount; ++j) writePcmFloat(destPtr + 4 * (j * numChannels + ch), channelData[j]);
            }
        }
    },
    1578698: function(srcPtr, sampleCount) {
        var sdl = Module.SDL2;
        var numChannels = sdl.audio.outputBuffer.numberOfChannels;
        for (var ch = 0; ch < numChannels; ++ch) {
            var channelData = sdl.audio.outputBuffer.getChannelData(ch);
            if (channelData.length != sampleCount) {
                throw "Web Audio output buffer length mismatch! Destination size: " + channelData.length + " samples vs expected " + sampleCount + " samples!";
            }
            for (var i = 0; i < sampleCount; ++i) {
                channelData[i] = HEAPF32[srcPtr + (i * numChannels + ch << 2) >> 2];
            }
        }
    },
    1579178: function(isCapture) {
        var sdl = Module.SDL2;
        if (isCapture) {
            if (sdl.capture.timeoutId !== undefined) clearTimeout(sdl.capture.timeoutId);
            if (sdl.capture.stream !== undefined) {
                var tracks = sdl.capture.stream.getAudioTracks();
                for (var i = 0; i < tracks.length; i++) sdl.capture.stream.removeTrack(tracks[i]);
                sdl.capture.stream = undefined;
            }
            if (sdl.capture.scriptProcessor !== undefined) {
                sdl.capture.scriptProcessor.onaudioprocess = function() {};
                sdl.capture.scriptProcessor.disconnect();
                sdl.capture.scriptProcessor = undefined;
            }
            if (sdl.capture.mediaStreamSource !== undefined) {
                sdl.capture.mediaStreamSource.disconnect();
                sdl.capture.mediaStreamSource = undefined;
            }
            sdl.capture.dummyBuffer = undefined;
            sdl.capture = undefined;
        } else {
            if (sdl.audio.scriptProcessor != undefined) {
                sdl.audio.scriptProcessor.disconnect();
                sdl.audio.scriptProcessor = undefined;
            }
            sdl.audio = undefined;
        }

        if (sdl.audioContext !== undefined && sdl.audio === undefined && sdl.capture === undefined) {
            sdl.audioContext.close();
            sdl.audioContext = undefined;
        }
    },

    // ------------------------------------------------------------------------
    // Software Canvas Framebuffer Decoder
    // ------------------------------------------------------------------------
    1580350: function(width, height, heapOffset) {
        if (!Module.SDL2) Module.SDL2 = {};
        var sdl = Module.SDL2;

        if (sdl.activeCanvas !== Module.canvas) {
            sdl.canvasContext = Module.createContext(Module.canvas, false, true);
            sdl.activeCanvas = Module.canvas;
        }

        if (sdl.width !== width || sdl.height !== height || sdl.lastContext !== sdl.canvasContext) {
            sdl.imageData = sdl.canvasContext.createImageData(width, height);
            sdl.width = width;
            sdl.height = height;
            sdl.lastContext = sdl.canvasContext;
        }

        var pixelData = sdl.imageData.data;
        var heapIdx = heapOffset >> 2;
        var pixelIdx = 0;

        if (typeof CanvasPixelArray !== "undefined" && pixelData instanceof CanvasPixelArray) {
            for (var len = pixelData.length; pixelIdx < len;) {
                var color = HEAP32[heapIdx];
                pixelData[pixelIdx] = color & 255;
                pixelData[pixelIdx + 1] = (color >> 8) & 255;
                pixelData[pixelIdx + 2] = (color >> 16) & 255;
                pixelData[pixelIdx + 3] = 255;
                heapIdx++;
                pixelIdx += 4;
            }
        } else {
            if (sdl.cachedDataView !== pixelData) {
                sdl.int32View = new Int32Array(pixelData.buffer);
                sdl.uint8View = new Uint8Array(pixelData.buffer);
                sdl.cachedDataView = pixelData;
            }

            var int32View = sdl.int32View;
            var totalPixels = int32View.length;
            int32View.set(HEAP32.subarray(heapIdx, heapIdx + totalPixels));

            var uint8View = sdl.uint8View;
            var alphaByteOffset = 3;
            var totalBytes = alphaByteOffset + 4 * totalPixels;

            if (totalPixels % 8 === 0) {
                while (alphaByteOffset < totalBytes) {
                    uint8View[alphaByteOffset] = 255; alphaByteOffset = (alphaByteOffset + 4) | 0;
                    uint8View[alphaByteOffset] = 255; alphaByteOffset = (alphaByteOffset + 4) | 0;
                    uint8View[alphaByteOffset] = 255; alphaByteOffset = (alphaByteOffset + 4) | 0;
                    uint8View[alphaByteOffset] = 255; alphaByteOffset = (alphaByteOffset + 4) | 0;
                    uint8View[alphaByteOffset] = 255; alphaByteOffset = (alphaByteOffset + 4) | 0;
                    uint8View[alphaByteOffset] = 255; alphaByteOffset = (alphaByteOffset + 4) | 0;
                    uint8View[alphaByteOffset] = 255; alphaByteOffset = (alphaByteOffset + 4) | 0;
                    uint8View[alphaByteOffset] = 255; alphaByteOffset = (alphaByteOffset + 4) | 0;
                }
            } else {
                while (alphaByteOffset < totalBytes) {
                    uint8View[alphaByteOffset] = 255;
                    alphaByteOffset = (alphaByteOffset + 4) | 0;
                }
            }
        }
        sdl.canvasContext.putImageData(sdl.imageData, 0, 0);
    },
// ============================================================================
// 8. Software Canvas & ImageData Sub-routines (Continued)
// ============================================================================

    1581819: function(width, height, heapOffset, srcPitch, optionsPtr) {
        var tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        var ctx = tempCanvas.getContext("2d");
        var imgData = ctx.createImageData(width, height);
        var dataView = imgData.data;
        var srcByteOffset = heapOffset;

        // Copy raw RGBA buffer from WASM memory into HTML5 Canvas ImageData
        for (var y = 0; y < height; y++) {
            var rowStart = y * srcPitch;
            for (var x = 0; x < width; x++) {
                var pixelOffset = (rowStart + (x * 4));
                var targetIdx = (y * width + x) * 4;

                dataView[targetIdx]     = HEAPU8[srcByteOffset + pixelOffset];     // Red
                dataView[targetIdx + 1] = HEAPU8[srcByteOffset + pixelOffset + 1]; // Green
                dataView[targetIdx + 2] = HEAPU8[srcByteOffset + pixelOffset + 2]; // Blue
                dataView[targetIdx + 3] = HEAPU8[srcByteOffset + pixelOffset + 3]; // Alpha
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // Render decoded image buffer back to main Game Engine canvas
        if (Module.canvas) {
            var mainCtx = Module.canvas.getContext("2d");
            if (mainCtx) {
                mainCtx.drawImage(tempCanvas, 0, 0);
            }
        }
    },

    1582840: function(elementIdPtr, width, height) {
        var elementId = elementIdPtr ? UTF8ToString(HEAPU8, elementIdPtr) : "canvas";
        var canvasElement = document.getElementById(elementId) || Module.canvas;

        if (canvasElement) {
            canvasElement.width = width;
            canvasElement.height = height;
            if (Module.onCanvasResized) {
                Module.onCanvasResized(width, height);
            }
        }
    },

    1583110: function(eventPtr, targetPtr) {
        // Fallback for standard system event dispatcher
        var targetName = targetPtr ? UTF8ToString(HEAPU8, targetPtr) : "window";
        var targetObj = targetName === "window" ? window : document.getElementById(targetName);

        if (targetObj && targetObj.dispatchEvent) {
            var event = new CustomEvent("gm_engine_event", { detail: eventPtr });
            targetObj.dispatchEvent(event);
        }
    }
};

// ============================================================================
// 9. WebGL Context State Management & Extension Loader
// ============================================================================

function createGlContext(canvasElement, contextAttributes) {
    var contextTypes = ["webgl2", "webgl", "experimental-webgl"];
    var ctx = null;

    for (var i = 0; i < contextTypes.length; i++) {
        try {
            ctx = canvasElement.getContext(contextTypes[i], contextAttributes);
        } catch (e) {}
        if (ctx) break;
    }

    if (!ctx) {
        console.error("Failed to initialize WebGL context.");
        return 0;
    }

    Module.ctx = ctx;
    GL.currentContext = {
        handle: 1,
        GLctx: ctx,
        version: ctx.getParameter(ctx.VERSION)
    };

    return 1;
}

var GL = {
    currentContext: null,
    registerCallbacks: function() {
        window.addEventListener("webglcontextlost", function(event) {
            event.preventDefault();
            console.warn("WebGL Context Lost!");
            if (Module.onContextLost) Module.onContextLost();
        }, false);

        window.addEventListener("webglcontextrestored", function() {
            console.log("WebGL Context Restored!");
            if (Module.onContextRestored) Module.onContextRestored();
        }, false);
    }
};

// ============================================================================
// 10. Emscripten Lifecycle Bootstrap & WASM Instantiation Entry Point
// ============================================================================

function setupWasmEnvironment() {
    initWasmMemoryViews();

    var imports = {
        "env": wasmImportTable,
        "wasi_snapshot_preview1": {
            "proc_exit": function(code) {
                exitHandler(code, new WebAssembly.RuntimeError("Exit status: " + code));
            },
            "fd_write": function(fd, iovs, iovs_len, pnum) {
                return 0;
            },
            "fd_close": function(fd) { return 0; },
            "fd_seek": function(fd, offset_low, offset_high, whence, newOffset) { return 0; }
        }
    };

    instantiateWasmModule(imports, function(wasmInstance) {
        var exports = wasmInstance.instance.exports;

        Module.asm = exports;
        wasmMemory = Module.asm.memory || Module.wasmMemory;
        initWasmMemoryViews();

        // Assign global Function Pointer tables
        if (exports.__indirect_function_table) {
            Module.wasmTable = exports.__indirect_function_table;
        }

        // Invoke initial C/C++ constructors (__wasm_call_ctors / main)
        if (exports._main) {
            Module.callMain = function(args) {
                args = args || [];
                return exports._main(args.length, 0);
            };
        }

        if (Module.postRun) {
            if (typeof Module.postRun === "function") Module.postRun = [Module.postRun];
            while (Module.postRun.length > 0) {
                var postRunFn = Module.postRun.shift();
                postRunFn();
            }
        }

        console.log("GameMaker WebAssembly Engine initialized successfully.");
        
        if (Module.setStatus) {
            Module.setStatus("");
        }

        // Start main execution loop if runtime isn't explicitly paused
        if (exports.main_loop) {
            var renderLoop = function() {
                try {
                    exports.main_loop();
                    requestAnimationFrame(renderLoop);
                } catch (e) {
                    if (!(e instanceof WebAssembly.RuntimeError)) {
                        console.error("Runtime exception inside main loop:", e);
                    }
                }
            };
            requestAnimationFrame(renderLoop);
        }
    });
}

// Global Execution Entry Trigger
if (document.readyState === "complete" || document.readyState === "interactive") {
    setupWasmEnvironment();
} else {
    window.addEventListener("DOMContentLoaded", function() {
        setupWasmEnvironment();
    });
}
    }
};