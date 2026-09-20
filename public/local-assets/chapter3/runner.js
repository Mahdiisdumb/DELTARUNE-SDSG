var k;
k || (k = typeof Module !== 'undefined' ? Module : {});
k.jk || (k.jk = 0);
k.jk++;

k.ENVIRONMENT_IS_PTHREAD || k.$ww || function(a) {
    function b(n, p, q, u) {
        if ("object" === typeof process && "object" === typeof process.versions && "string" === typeof process.versions.node) {
            require("fs").readFile(n, function(r, A) {
                r ? u(r) : q(A.buffer);
            });
        } else {
            var w = new XMLHttpRequest();
            w.open("GET", n, !0);
            w.responseType = "arraybuffer";
            w.onprogress = function(r) {
                var A = p;
                r.total && (A = r.total);
                if (r.loaded) {
                    w.Ai ? k.vj[n].loaded = r.loaded : (w.Ai = !0, k.vj || (k.vj = {}), k.vj[n] = {
                        loaded: r.loaded,
                        total: A
                    });
                    var z = A = r = 0, I;
                    for (I in k.vj) {
                        var N = k.vj[I];
                        r += N.total;
                        A += N.loaded;
                        z++;
                    }
                    r = Math.ceil(r * k.jk / z);
                    k.setStatus && k.setStatus(`Downloading data... (/)`);
                } else !k.vj && k.setStatus && k.setStatus("Downloading data...");
            };
            w.onerror = function() {
                throw Error("NetworkError for: " + n);
            };
            w.onload = function() {
                if (200 == w.status || 304 == w.status || 206 == w.status || 0 == w.status && w.response) {
                    q(w.response);
                } else {
                    throw Error(w.statusText + " : " + w.responseURL);
                }
            };
            w.send(null);
        }
    }

    function c(n) {
        console.error("package error:", n);
    }

    function d() {
        function n(w, r, A) {
            this.start = w;
            this.end = r;
            this.audio = A;
        }

        function p(w) {
            if (!w) throw "Loading data file failed." + Error().stack;
            if (w.constructor.name !== ArrayBuffer.name) throw "bad input to processPackageData" + Error().stack;
            w = new Uint8Array(w);
            n.prototype.Gi = w;
            w = a.files;
            for (var r = 0; r < w.length; ++r) n.prototype.Ai[w[r].filename].onload();
            k.removeRunDependency("datafile_runner.data");
        }

        // Initialize Virtual Filesystem structure
        try {
            k.FS_createPath("/", "assets", !0, !0);
            k.FS_createPath("/assets", "lang", !0, !0);
            k.FS_createPath("/assets", "vid", !0, !0);
            k.FS_createPath("/", "_savedata", !0, !0);
        } catch (err) {
            console.warn("Virtual path initialization warning:", err);
        }

        n.prototype = {
            Ai: {},
            open: function(w, r) {
                this.name = r;
                this.Ai[r] = this;
                k.addRunDependency(`fp ${this.name}`);
            },
            send: function() {},
            onload: function() {
                this.finish(this.Gi.subarray(this.start, this.end));
            },
            finish: function(w) {
                k.FS_createDataFile(this.name, null, w, !0, !0, !0);
                k.removeRunDependency(`fp ${this.name}`);
                this.Ai[this.name] = null;
            }
        };

        for (var q = a.files, u = 0; u < q.length; ++u) {
            (new n(q[u].start, q[u].end, q[u].audio || 0)).open("GET", q[u].filename);
        }
        
        k.addRunDependency("datafile_runner.data");
        k.al || (k.al = {});
        k.al["runner.data"] = { jm: !1 };
        h ? (p(h), h = null) : g = p;
    }

    "object" === typeof window ? window.encodeURIComponent(window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf("/")) + "/") : "undefined" === typeof process && "undefined" !== typeof location && encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf("/")) + "/");
    
    "function" !== typeof k.locateFilePackage || k.locateFile || (k.locateFile = k.locateFilePackage, l("warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)"));
    
    var e = k.locateFile ? k.locateFile("runner.data", "") : "runner.data",
        f = a.remote_package_size,
        g = null,
        h = k.getPreloadedPackage ? k.getPreloadedPackage(e, f) : null;
        
    h || b(e, f, function(n) {
        g ? (g(n), g = null) : h = n;
    }, c);

    k.calledRun ? d() : (k.preRun || (k.preRun = []), k.preRun.push(d));
}({
    "files": [
        { "filename": "/assets/options.ini", "start": 0, "end": 138, "audio": 0 },
        { "filename": "/assets/splash.png", "start": 138, "end": 6735, "audio": 0 },
        { "filename": "/assets/audiogroup1.dat", "start": 6735, "end": 7451451, "audio": 0 },
        { "filename": "/assets/lang/lang_ja.json", "start": 7451451, "end": 8911568, "audio": 0 },
        { "filename": "/assets/lang/lang_en.json", "start": 8911568, "end": 10066653, "audio": 0 },
        { "filename": "/assets/lang/lang_en_names.json", "start": 10066653, "end": 11228006, "audio": 0 },
        { "filename": "/assets/lang/lang_en_names_recruitable.json", "start": 11228006, "end": 12383432, "audio": 0 }
    ],
    "remote_package_size": 12383432,
    "package_uuid": "3b0d2fc3-9b3b-4268-be3f-52358db50553-chs-260723"
});

this.doGMLCallback = function(a, b) {
    b = JSON.stringify(b);
    var c = aa(b) + 1,
        d = m(c);
    t(b, v, d, c);
    console.log("AddAsyncMethod=" + g_pAddAsyncMethod + ", methodToCall=" + a + ", stringOnWasmHeap=" + d + ", argsAsJSON=" + b);
    k.dynCall("vii", g_pAddAsyncMethod, [a, d]);
};

this.triggerAdPrefix = function(a, b, c, d, e) {
    var f = m(80),
        g = f + 16,
        h = f + 32,
        n = f + 48,
        p = f + 64;
    ba(f + 0, a, 16);
    ba(g, b, 16);
    ba(h, c, 16);
    ba(n, d, 16);
    ba(p, e, 16);
    return f;
};

this.ModuleName = function() { return k; };
this.triggerAdPostfix = function(a) { ca(a); };

var da = null, fa = [], ha = null, ia = null, ja = null, ka = null, la = null;

function ma() {
    da && ("visible" === document.visibilityState ? da.resume() : da.suspend());
}

var na = void 0;
this.OGX_startDRMCheck = function() { na && k.dynCall("v", na); };

var oa = void 0, pa = void 0;
this.GM_pause = function() { oa && k.dynCall("v", oa); };
this.GM_unpause = function() { pa && k.dynCall("v", pa); };

var qa = void 0, ra = void 0;
this.GM_get_view_status = function() {
    var a = void 0;
    if (qa) {
        var b = k.dynCall("i", qa);
        a = b ? x(v, b) : "";
        a = JSON.parse(a);
        ca(b);
    }
    return a;
};

this.GM_set_view_status = function(a) {
    if (ra) {
        a = JSON.stringify(a);
        var b = aa(a) + 1,
            c = m(b);
        t(a, v, c, b);
        console.log("GM_set_view_status=" + ra + ", stringOnWasmHeap=" + c + ", argsAsJSON=" + a);
        k.dynCall("vi", ra, [c]);
    }
};

var sa = [], ta = !1, va = !1;

this.activate_clipboard = function() {
    !ta && navigator.clipboard && navigator.permissions && !va && (va = !0, navigator.permissions.query({
        name: "clipboard-read",
        Yl: !0
    }).then(function(a) {
        if ("granted" == a.state || "prompt" == a.state) {
            ta = !0;
            va = !1;
            for (a = 0; a < sa.length; ++a) navigator.clipboard.writeText(sa[a]);
            sa = [];
            navigator.clipboard.readText().then(b => { "" != b && sa.push(b); }).catch(() => {});
        }
    }));
};

this.clipboard_has_text = function() {
    if (!ta) return activate_clipboard(), !1;
    navigator.clipboard.readText().then(a => { "" != a && sa.push(a); }).catch(() => {});
    return 0 < sa.length;
};

this.clipboard_get_text = function() {
    var a = "";
    ta ? 0 < sa.length && (a = sa.pop()) : activate_clipboard();
    return a;
};

this.clipboard_set_text = function(a) {
    ta ? navigator.clipboard && navigator.clipboard.writeText(a) : (activate_clipboard(), sa.push(a));
};

var wa = {}, xa = {}, ya = "";

this.__gx_cache_file = function(a) {
    if (window.oprt && window.oprt.gameFiles) {
        var b = window.origin + "/" + a.name,
            c = new URLSearchParams(window.location.search);
        const d = c.get("game"),
            e = c.get("track");
        c = c.get("release");
        null != d && null != e && null != c && (b = window.location.origin + "/" + d + "/" + e + "/" + c + "/" + a.name);
        console.log("__gx_cache_file for " + b);
        b = new Request(b);
        let f = a.name + ":" + a.md5;
        window.oprt.gameFiles.fetchAndCache(f, ya, b).then(g => {
            g.arrayBuffer().then(function() {
                console.log("fetchAndCache complete for file:id " + f);
                xa[a.name] = { name: a.name, md5: a.md5, fileId: f, version: ya };
            });
        });
    }
    return Promise.resolve();
};

this.__gx_check_cache = function(a, b) {
    var c = void 0 != xa[a];
    b && console.log("__gx_check_cache for " + a + " cached files " + JSON.stringify(xa) + " manifest files " + JSON.stringify(wa));
    !c && void 0 != wa[a] && b && this.__gx_cache_file(wa[a]);
    return c;
};

this.__gx_prepare_cache = function(a) {
    ya = a;
    return new Promise(function(b, c) {
        if (window.oprt && window.oprt.gameFiles) {
            let e = manifestFiles().split(";");
            var d = manifestFilesMD5();
            window.oprt.gameFiles.keys().then(f => {
                console.log("current cache entries are " + JSON.stringify(f));
                var g = {};
                let h = [];
                for (var n = 0; n < f.length; ++n) {
                    var p = f[n], q = p.fileId, u = "", w = q.indexOf(":");
                    0 <= w && (u = q.substring(w + 1), q = q.substring(0, w));
                    w = e.indexOf(q);
                    console.log("considering file " + q + " for deleting, indexOf is " + w + " cached MD5 is " + u + " manifest md5 is " + (0 > w ? " not present" : d[w]));
                    0 > w || d[w] != u ? h.push(window.oprt.gameFiles.delete(p.fileId, p.version)) : g[q] = { name: q, md5: u, fileId: p.fileId, version: p.version };
                }
                console.log("current cache files are " + JSON.stringify(g));
                xa = g;
                f = {};
                for (n = 0; n < e.length; ++n) f[e[n]] = { name: e[n], md5: d[n] };
                wa = f;
                void 0 == xa["game.unx"] ? (console.log("caching game.unx"), this.__gx_cache_file(wa["game.unx"]).then(() => {
                    b({ cachedFiles: xa, allFiles: e });
                })) : b({ cachedFiles: xa, allFiles: e });
            }).catch(f => {
                c(Error("error trying to enumerate cache keys - " + JSON.stringify(f)));
            });
        } else {
            c(Error("unable to cache, API not found"));
        }
    });
};

this.__gx_load_split_unx = async function() {
    const parts = [
        "game.unx.000",
        "game.unx.001",
        "game.unx.002"
    ];

    let totalSize = 0;
    const chunks = [];

    for (const part of parts) {
        console.log("Loading " + part);

        const response = await fetch(part, { cache: "no-store" });

        if (!response.ok) {
            throw new Error("Failed to load " + part + " (" + response.status + ")");
        }

        const buffer = await response.arrayBuffer();
        const chunk = new Uint8Array(buffer);

        totalSize += chunk.length;
        chunks.push(chunk);
    }

    const result = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    console.log("Reassembled game.unx: " + totalSize + " bytes");

    return result;
};

this.__gx_async_wget2 = function(a, b, c, d, e, f, g) {
    if (window.oprt && window.oprt.gameFiles) {
        a = xa[a];
        a = window.oprt.gameFiles.match(a.fileId, a.version);
        a.catch(() => { k.dynCall("vi", g, [d]); });
        a.then(h => h.arrayBuffer()).then(h => {
            h = new Uint8Array(h);
            var n = m(h.length);
            v.set(h, n);
            f && k.dynCall("viiii", f, [4294967295, d, n, h.length]);
            e && e(n);
        });
    }
};

GXMFS = {
    gj: {},
    Ji: function(a) { return y.Ji.apply(null, arguments); },
    Ck: (a, b, c) => {
        GXMFS.kk(a, (d, e) => {
            if (d) return c(d);
            GXMFS.lk(a, (f, g) => {
                if (f) return c(f);
                GXMFS.uk(b ? g : e, b ? e : g, c);
            });
        });
    },
    Hl: () => { GXMFS.gj = {}; },
    wl: (a, b) => {
        var c = GXMFS.gj[a];
        c || (c = window.oprt.gameStorage.open(a), GXMFS.gj[a] = c);
        return b(null, c);
    },
    kk: (a, b) => {
        function c(h) { return "." !== h && ".." !== h; }
        function d(h) { return n => za(h + "/" + n); }
        var e = {};
        for (a = Aa(a.jj).filter(c).map(d(a.jj)); a.length;) {
            var f = a.pop();
            try { var g = Ba(f); } catch (h) { return b(h); }
            B(g.mode) && a.push.apply(a, Aa(f).filter(c).map(d(f)));
            e[f] = { timestamp: g.mtime };
        }
        return b(null, { type: "local", entries: e });
    },
    lk: (a, b) => {
        GXMFS.wl(a.jj, (c, d) => {
            if (c) return b(c);
            d.list().then(e => { b(null, { type: "remote", storage: d, entries: e }); }).catch(b);
        });
    },
    nk: (a, b) => {
        try {
            var c = Ca(a).node;
            var d = Ba(a);
        } catch (e) { return b(e); }
        return B(d.mode) ? b(null, { timestamp: d.mtime, mode: d.mode }) : 32768 === (d.mode & 61440) ? (c.Ci = Da(c), b(null, { timestamp: d.mtime, mode: d.mode, contents: c.Ci })) : b(Error("node type not supported"));
    },
    Ak: (a, b, c) => {
        try {
            if (B(b.mode)) Ea(a, b.mode);
            else if (32768 === (b.mode & 61440)) Fa(a, b.contents);
            else return c(Error("node type not supported"));
            Ga(a, b.mode);
            Ha(a, b.timestamp, b.timestamp);
        } catch (d) { return c(d); }
        c(null);
    },
    wk: (a, b) => {
        try {
            var c = Ba(a);
            B(c.mode) ? Ia(a) : 32768 === (c.mode & 61440) && Ja(a);
        } catch (d) { return b(d); }
        b(null);
    },
    pk: (a, b, c) => { a.get(b).then(d => { c(null, d); }).catch(c); },
    Bk: (a, b, c, d) => { a.put(c, b).then(() => { d(null); }).catch(d); },
    xk: (a, b, c) => { a.delete(b).then(() => { c(null); }).catch(c); },
    uk: (a, b, c) => {
        function d(p) {
            e--;
            if (p && !h) return h = !0, console.error("Reconcile failed"), c(p);
            if (0 === e && !h) return console.info("Reconcile finished successfully"), c(null);
        }
        console.info("Starting reconcile");
        var e = 0, f = [];
        Object.keys(a.entries).forEach(function(p) {
            var q = a.entries[p], u = b.entries[p];
            u && q.timestamp.getTime() == u.timestamp.getTime() || (f.push(p), e++);
        });
        console.debug(`${f.length} entries to create/update on the ${"local" === b.type ? "local filesystem" : "remote filesystem"}`);
        var g = [];
        Object.keys(b.entries).forEach(function(p) {
            a.entries[p] || (g.push(p), e++);
        });
        console.debug(`${g.length} entries to remove from the ${"local" === b.type ? "local filesystem" : "remote filesystem"}`);
        if (0 == e) return c(null);
        var h = !1, n = "remote" === a.type ? a.storage : b.storage;
        f.sort().forEach(p => {
            "local" === b.type ? GXMFS.pk(n, p, (q, u) => {
                if (q) return d(q);
                GXMFS.Ak(p, u, d);
            }) : GXMFS.nk(p, (q, u) => {
                if (q) return d(q);
                GXMFS.Bk(n, p, u, d);
            });
        });
        g.sort().reverse().forEach(p => { "local" === b.type ? GXMFS.wk(p, d) : GXMFS.xk(n, p, d); });
    }
};

var Ka = Object.assign({}, k), La = [], Ma = "./this.program", Na = (a, b) => { throw b; }, Oa = "object" == typeof window, Pa = "function" == typeof importScripts, Qa = "object" == typeof process && "object" == typeof process.versions && "string" == typeof process.versions.node, Ra = "", Sa, Ta, Ua;

if (Qa) {
    var fs = require("fs"), Va = require("path");
    Ra = Pa ? Va.dirname(Ra) + "/" : __dirname + "/";
    Sa = (a, b) => {
        a = Wa(a) ? new URL(a) : Va.normalize(a);
        return fs.readFileSync(a, b ? void 0 : "utf8");
    };
    Ua = a => {
        a = Sa(a, !0);
        a.buffer || (a = new Uint8Array(a));
        return a;
    };
    Ta = (a, b, c, d = !0) => {
        a = Wa(a) ? new URL(a) : Va.normalize(a);
        fs.readFile(a, d ? void 0 : "utf8", (e, f) => { e ? c(e) : b(d ? f.buffer : f); });
    };
    !k.thisProgram && 1 < process.argv.length && (Ma = process.argv[1].replace(/\\/g, "/"));
    La = process.argv.slice(2);
    "undefined" != typeof module && (module.exports = k);
    process.on("uncaughtException", a => {
        if (!("unwind" === a || a instanceof Xa || a.context instanceof Xa)) throw a;
    });
    Na = (a, b) => { process.exitCode = a; throw b; };
    k.inspect = () => "[Emscripten Module object]";
} else if (Oa || Pa) {
    Pa ? Ra = self.location.href : "undefined" != typeof document && document.currentScript && (Ra = document.currentScript.src);
    Ra = 0 !== Ra.indexOf("blob:") ? Ra.substr(0, Ra.replace(/[?#].*/, "").lastIndexOf("/") + 1) : "";
    Sa = a => {
        var b = new XMLHttpRequest();
        b.open("GET", a, !1);
        b.send(null);
        return b.responseText;
    };
    Pa && (Ua = a => {
        var b = new XMLHttpRequest();
        b.open("GET", a, !1);
        b.responseType = "arraybuffer";
        b.send(null);
        return new Uint8Array(b.response);
    });
    Ta = (a, b, c) => {
        var d = new XMLHttpRequest();
        d.open("GET", a, !0);
        d.responseType = "arraybuffer";
        d.onload = () => { 200 == d.status || 0 == d.status && d.response ? b(d.response) : c(); };
        d.onerror = c;
        d.send(null);
    };
}

var Ya = k.print || console.log.bind(console), l = k.printErr || console.error.bind(console);
Object.assign(k, Ka);
Ka = null;
k.arguments && (La = k.arguments);
k.thisProgram && (Ma = k.thisProgram);
k.quit && (Na = k.quit);

var Za;
k.wasmBinary && (Za = k.wasmBinary);
"object" != typeof WebAssembly && $a("no native wasm support detected");

var ab, bb = !1, cb, C, v, db, D, E, G, H, eb;

function fb() {
    var a = ab.buffer;
    k.HEAP8 = C = new Int8Array(a);
    k.HEAP16 = db = new Int16Array(a);
    k.HEAPU8 = v = new Uint8Array(a);
    k.HEAPU16 = D = new Uint16Array(a);
    k.HEAP32 = E = new Int32Array(a);
    k.HEAPU32 = G = new Uint32Array(a);
    k.HEAPF32 = H = new Float32Array(a);
    k.HEAPF64 = eb = new Float64Array(a);
}

var gb = [], hb = [], ib = [], jb = [], kb = [], lb = !1;

function mb() {
    var a = k.preRun.shift();
    gb.unshift(a);
}

var nb = 0, ob = null, pb = null;

function qb() {
    nb++;
    k.monitorRunDependencies && k.monitorRunDependencies(nb);
}

function rb() {
    nb--;
    k.monitorRunDependencies && k.monitorRunDependencies(nb);
    if (0 == nb && (null !== ob && (clearInterval(ob), ob = null), pb)) {
        var a = pb;
        pb = null;
        a();
    }
}

function $a(a) {
    if (k.onAbort) k.onAbort(a);
    a = "Aborted(" + a + ")";
    l(a);
    bb = !0;
    cb = 1;
    a += ". Build with -sASSERTIONS for more info.";
    lb && sb();
    throw new WebAssembly.RuntimeError(a);
}

var tb = a => a.startsWith("data:application/octet-stream;base64,"),
    Wa = a => a.startsWith("file://"),
    ub = "runner.wasm";

if (!tb(ub)) {
    var vb = ub;
    ub = k.locateFile ? k.locateFile(vb, Ra) : Ra + vb;
}

function wb(a) {
    if (a == ub && Za) return new Uint8Array(Za);
    if (Ua) return Ua(a);
    throw "both async and sync fetching of the wasm failed";
}

function xb(a) {
    if (!Za && (Oa || Pa)) {
        if ("function" == typeof fetch && !Wa(a)) {
            return fetch(a, { credentials: "same-origin" }).then(b => {
                if (!b.ok) throw "failed to load wasm binary file at '" + a + "'";
                return b.arrayBuffer();
            }).catch(() => wb(a));
        }
        if (Ta) return new Promise((b, c) => { Ta(a, d => b(new Uint8Array(d)), c); });
    }
    return Promise.resolve().then(() => wb(a));
}

function yb(a, b, c) {
    return xb(a).then(d => WebAssembly.instantiate(d, b)).then(d => d).then(c, d => {
        l(`failed to asynchronously prepare wasm: `);
        $a(d);
    });
}

function zb(a, b) {
    var c = ub;
    Za || "function" != typeof WebAssembly.instantiateStreaming || tb(c) || Wa(c) || Qa || "function" != typeof fetch ? yb(c, a, b) : fetch(c, { credentials: "same-origin" }).then(d => WebAssembly.instantiateStreaming(d, a).then(b, function(e) {
        l(`wasm streaming compile failed: `);
        l("falling back to ArrayBuffer instantiation");
        return yb(c, a, b);
    }));
}

var J, K, Ib = {
    1551632: () => hasJSExceptionHandler(),
    1551697: a => { doJSExceptionHandler(a ? x(v, a) : ""); },
    1551741: () => document.querySelector("canvas").getBoundingClientRect().left,
    1551861: () => document.querySelector("canvas").getBoundingClientRect().top,
    1551980: () => {
        var a = document.querySelector("canvas").getBoundingClientRect();
        return a.right - a.left;
    },
    1552113: () => {
        var a = document.querySelector("canvas").getBoundingClientRect();
        return a.bottom - a.top;
    },
    1552246: (a, b, c, d, e) => { gxc_request_room(a ? x(v, a) : "", b ? x(v, b) : "", c, d ? x(v, d) : "", e ? x(v, e) : ""); },
    1552344: (a, b, c, d) => { gxc_join_room(a ? x(v, a) : "", b ? x(v, b) : "", c ? x(v, c) : "", d ? x(v, d) : ""); },
    1552435: () => {
        var a = document.getElementById("stats-button");
        a && (a.style.visibility = "visible");
        if (a = document.getElementById("log-state-button")) a.style.visibility = "visible";
    },
    1552684: () => {
        var a = document.getElementById("stats-button");
        a && (a.style.visibility = "visible");
        if (a = document.getElementById("log-state-button")) a.style.visibility = "visible";
    },
    1552933: a => {
        var b = document.getElementById("multiplayer-stats");
        b && "visible" == b.style.visibility && (b.innerHTML = a ? x(v, a) : "");
    },
    1553101: a => { "function" == typeof showRollbackMessage && showRollbackMessage(a ? x(v, a) : ""); },
    1553194: () => {
        var a = document.getElementById("stats-button");
        a && (a.style.visibility = "hidden");
        if (a = document.getElementById("share-button")) a.style.visibility = "hidden";
        if (a = document.getElementById("log-state-button")) a.style.visibility = "hidden";
    },
    1553556: (a, b) => { gxc_set_player_status(a, b ? x(v, b) : ""); },
    1553607: a => { gxc_report_status(a ? x(v, a) : ""); },
    1553648: (a, b, c) => { gxc_get_player_info(a ? x(v, a) : "", b ? x(v, b) : "", c ? x(v, c) : ""); },
    1553727: (a, b) => { gxc_set_room_info(a, b); },
    1553758: (a, b, c) => { gxc_get_player_info(a ? x(v, a) : "", b ? x(v, b) : "", c ? x(v, c) : ""); },
    1553837: (a, b, c) => { gxc_receive_chat_message(a ? x(v, a) : "", b, c); },
    1553893: (a, b) => webtransport_set_relay(a ? x(v, a) : "", b),
    1553950: a => { webtransport_destroy(a); },
    1553980: (a, b, c) => { webtransport_send(a, b, c); },
    1554015: (a, b, c) => webtransport_receive(a, b, c),
    1554060: a => { alert(a ? x(v, a) : ""); },
    1554090: a => { alert(a ? x(v, a) : ""); },
    1554119: () => clipboard_has_text(),
    1554167: () => {
        var a = clipboard_get_text(), b = aa(a) + 1, c = m(b);
        t(a, v, c, b + 1);
        return c;
    },
    1554343: a => { clipboard_set_text(a ? x(v, a) : ""); },
    1554386: () => {
        var a = -1;
        window.matchMedia("(orientation:portrait)").matches ? a = 1 : window.matchMedia("(orientation:landscape)").matches && (a = 0);
        return a;
    },
    1554564: a => { window.open(a ? x(v, a) : "", "_blank").focus(); },
    1554619: () => {
        var a = document.querySelector("canvas");
        null != a.Ai && (a.Ai.pause(), console.log("Pausing video player"), a.Ai.removeAttribute("src"), a.Ai.load());
    },
    1554869: (a, b, c) => {
        var d = document.querySelector("canvas");
        if (null != d.Kj) return b = d.Kj.getImageData(0, 0, b, c), b = new Uint8Array(b.data.buffer), C.set(b, a), 1;
        console.log("Not rendering video as context is null");
        return 0;
    },
    1555206: () => {
        var a = document.querySelector("canvas");
        return null != a.Ai ? a.Ai.videoWidth : 0;
    },
    1555353: () => {
        var a = document.querySelector("canvas");
        return null != a.Ai ? a.Ai.videoHeight : 0;
    },
    1555501: () => {
        var a = document.querySelector("canvas");
        if (null != a.Ai) {
            if (a.Ai.paused) return -1;
            if (!a.Ai.ended) return 0;
        }
        return -1;
    },
    1555704: a => {
        var b = document.querySelector("canvas");
        null != b.Ai && (b.Ai.volume = a);
    },
    1555837: a => {
        function b() {
            function h() {
                const q = document.querySelector("canvas").Ai;
                null != q && (q.muted = !1);
            }
            var n = "mousedown", p = "mouseup";
            "ontouchstart" in window && (n = "touchstart", p = "touchend");
            if (window.PointerEvent || window.navigator.pointerEnabled || window.navigator.msPointerEnabled) n = "pointerdown", p = "pointerup";
            document.body.addEventListener(n, h, { once: !0 });
            document.body.addEventListener(p, h, { once: !0 });
        }
        var c = document.querySelector("canvas");
        null == c.Ai ? c.Ai = document.createElement("video") : c.Ai.pause();
        const d = c.Ai;
        a = a ? x(v, a) : "";
        d.muted = !1;
        d.src = a;
        const e = { Rl: k.cwrap("video_playback_ended", "", "") },
            f = { Sl: k.cwrap("video_playback_started", "", "") };
        d.addEventListener("ended", function() { e.Rl(); });
        d.addEventListener("playing", function() { console.log("Video playing event called"); f.Sl(); }, !0);
        const g = () => {
            var h = document.querySelector("canvas");
            null == h.Ri ? (h.Ri = document.createElement("canvas"), h.Ri.style.cssText = "position:fixed; top:1px; left:1px; width:1px; height:1px", h.Ri.width = d.videoWidth, h.Ri.height = d.videoHeight, document.body.appendChild(h.Ri), h.Kj = h.Ri.getContext("2d", {
                alpha: !1,
                Zl: !1,
                powerPreference: "low-power",
                desynchronized: !0,
                preserveDrawingBuffer: !0
            })) : (d.videoWidth != h.Ri.width && (h.Ri.width = d.videoWidth), h.Ri.height != h.Ri.height && (h.Ri.height = d.videoHeight));
            null != h.Ai && null != h.Kj && h.Kj.drawImage(h.Ai, 0, 0);
            null != h.Ai && (null != h.Ai.src ? h.Ai.requestVideoFrameCallback(g) : console.log("stopping video player callback check"));
        };
        d.requestVideoFrameCallback(g);
        d.load();
        a = d.play();
        void 0 !== a && a.then(() => {}).catch(() => {
            console.log("video_open failed. User must interact with the page before video with audio can be played. Attempting to play the video muted");
            d.muted = !0;
            d.play();
            b();
        });
    },
    1558907: () => {
        var a = document.querySelector("canvas");
        null != a.Ai && a.Ai.pause();
    },
    1559038: () => {
        var a = document.querySelector("canvas");
        null != a.Ai && a.Ai.play();
    },
    1559168: a => {
        var b = document.querySelector("canvas");
        null != b.Ai && (b.Ai.loop = .5 < a ? !0 : !1);
    },
    1559361: a => {
        var b = document.querySelector("canvas");
        null != b.Ai && (b.Ai.currentTime = a);
    },
    1559501: () => {
        var a = document.querySelector("canvas");
        return null == a.Ai || isNaN(a.Ai.duration) ? 0 : a.Ai.duration;
    },
    1559696: () => {
        var a = document.querySelector("canvas");
        return null != a.Ai ? a.Ai.currentTime : 0;
    },
    1559848: () => {
        var a = document.querySelector("canvas");
        return null != a.Ai ? a.Ai.ended ? 0 : a.Ai.paused ? 3 : a.Ai.readyState < a.Ai.HAVE_CURRENT_DATA ? 1 : 2 : 0;
    },
    1560368: () => {
        var a = document.querySelector("canvas");
        return null != a.Ai ? a.Ai.loop : 0;
    },
    1560513: () => {
        var a = document.querySelector("canvas");
        return null != a.Ai ? a.Ai.volume : 0;
    },
    1560660: (a, b, c, d) => {
        var e = document.querySelector("canvas");
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
            console.log("CheckMediaRecorder::vp9 supported");
            var f = { mimeType: "video/webm; codecs=vp9" };
        } else MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? (f = { mimeType: "video/webm; codecs=vp8" }, console.log("CheckMediaRecorder::vp8 supported")) : console.log("CheckMediaRecorder::No vp8 or vp9 support");
        e.Hk = e.captureStream(c);
        e.Hk.getVideoTracks().find(g => g.enabled);
        null == e.$i && (e.$i = document.createElement("canvas"), e.$i.style.cssText = "position:fixed; top:1px; left:1px; width:1px; height:1px", e.$i.width = a, e.$i.height = b, document.body.appendChild(e.$i), console.log("Game Canvas width:" + e.width + " height:" + e.height), e.el = e.$i.getContext("2d", {
            alpha: !1,
            desynchronized: !0,
            antialias: !0,
            powerPreference: "low-power",
            preserveDrawingBuffer: !0
        }), e.mj = document.createElement("video"), e.mj.autoplay = !0, e.mj.Wl = !0, e.mj.muted = !0, e.mj.style.cssText = "position:fixed;top:1px;left:1px;width:1px;height:1px", document.body.appendChild(e.mj), e.mj.srcObject = e.Hk, a = e.$i.captureStream(c), 0 < d && (d = da.createMediaStreamDestination().stream.getAudioTracks().find(g => g.enabled), a.addTrack(d)), f = new MediaRecorder(a, f), e.ej = [], f.ondataavailable = function(g) { e.ej.push(g.data); }, e.Gi = f);
        null == e.ck && (e.ck = setInterval(() => e.el.drawImage(e.mj, 0, 0, e.width, e.height, 0, 0, e.$i.width, e.$i.height), 1E3 / c));
        e.Gi && "recording" != e.Gi.state && e.Gi.start();
    },
    1563156: a => {
        var b = document.querySelector("canvas");
        if (b.Gi && ("recording" == b.Gi.state || "paused" == b.Gi.state)) {
            var c = a ? x(v, a) : "";
            b.Gi.onstop = function() {
                var d = new Blob(b.ej, { type: "video/webm" });
                b.ej = [];
                clearInterval(b.ck);
                b.ck = null;
                const e = { sk: k.cwrap("post_video_upload_callback", "", ["string"]) };
                if (c.startsWith("http")) fetch(c, { method: "PUT", body: d }).then(() => { e.sk("upload completed"); }).catch(g => { e.sk("Error uploading: " + g); });
                else if ("" != c) {
                    d = URL.createObjectURL(d);
                    var f = document.createElement("a");
                    document.body.appendChild(f);
                    f.style = "display: none";
                    f.href = d;
                    f.download = c;
                    f.click();
                    window.URL.revokeObjectURL(d);
                    e.sk("filesaved");
                }
            };
            b.Gi.stop();
            console.log("saving chunks to movie");
        }
    },
    1564300: () => {
        var a = document.querySelector("canvas");
        a.Gi && "recording" == a.Gi.state && a.Gi.pause();
    },
    1564470: () => {
        var a = document.querySelector("canvas");
        a.Gi && "paused" == a.Gi.state && a.Gi.resume();
    },
    1564638: (a, b, c, d, e, f) => { triggerAd(a ? x(v, a) : "", b, c, d, e, f); },
    1564691: () => {
        var a = 640;
        "number" == typeof window.innerWidth ? a = window.innerWidth : document.documentElement && document.documentElement.clientWidth ? a = document.documentElement.clientWidth : document.body && document.body.clientWidth && (a = document.body.clientWidth);
        return a;
    },
    1564997: () => {
        var a = 480;
        "number" == typeof window.innerHeight ? a = window.innerHeight : document.documentElement && document.documentElement.clientHeight ? a = document.documentElement.clientHeight : document.body && document.body.clientHeight && (a = document.body.clientHeight);
        return a;
    },
    1565309: (a, b, c, d) => {
        var e = -1;
        if (void 0 != window.oprt) {
            var f = window.oprt.unlockOrientation,
                g = window.oprt.lockPortraitOrientation,
                h = window.oprt.lockLandscapeOrientation;
            a = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0);
            a |= d ? 8 : 0;
            15 != (a & 15) && 0 != a || void 0 == f || "function" != typeof f || (f(), console.log("unlocking all orientations"));
            0 != (a & 5) && void 0 != h && "function" == typeof h ? (h(), console.log("Locking to Landscape"), e = 0) : 0 != (a & 10) && void 0 != g && "function" == typeof g && (g(), console.log("Locking to Portrait"), e = 0);
        }
        return e;
    },
    1566297: a => {
        a ? void 0 != window.oprt && void 0 != window.oprt.enterFullscreen ? (console.log("enterFullscreen"), window.oprt.enterFullscreen()) : (console.log("canvas requesting enterFullscreen"), document.querySelector("canvas").requestFullscreen()) : void 0 != window.oprt && void 0 != window.oprt.exitFullscreen ? (console.log("exitFullscreen"), window.oprt.exitFullscreen()) : (console.log("exitFullscreen via document"), document.exitFullscreen());
    },
    1566825: () => screen.width,
    1566850: () => screen.height,
    1566876: a => { document.title = a ? x(v, a) : ""; },
    1566915: (a, b) => { this.onGameSetWindowSize && onGameSetWindowSize(a, b); },
    1566984: a => { document.querySelector("canvas").style.cursor = a ? x(v, a) : ""; },
    1567083: () => {
        da = new AudioContext();
        document.addEventListener("visibilitychange", ma);
    },
    1567205: () => {
        da.close().then(function() {
            da = null;
            document.removeEventListener("visibilitychange", ma);
        });
    },
    1567364: () => {
        function a() {
            da.resume().then(function() {
                document.body.removeEventListener(b, a);
                document.body.removeEventListener(c, a);
            });
        }
        let b = "mousedown", c = "mouseup";
        "ontouchstart" in window && (b = "touchstart", c = "touchend");
        if (window.PointerEvent || window.navigator.pointerEnabled || window.navigator.msPointerEnabled) b = "pointerdown", c = "pointerup";
        document.body.addEventListener(b, a);
        document.body.addEventListener(c, a);
    },
    1568068: () => { da.suspend(); },
    1568101: () => null != da,
    1568141: () => {
        if (null == da) return 4;
        switch (da.state) {
            case "suspended": return 0;
            case "running": return 1;
            case "closed": return 2;
            case "interrupted": return 3;
        }
    },
    1568335: () => null == da ? 0 : da.currentTime,
    1568413: () => null == da ? 0 : da.sampleRate,
    1568490: () => null == da ? 0 : da.destination.channelCount,
    1568579: (a, b, c, d, e, f) => {
        e = da.createBuffer(b, d, e);
        for (let g = 0; g < b; ++g) {
            const h = e.getChannelData(g);
            for (let n = 0; n < d; ++n) h[n] = Ab(a + c * (g + n * b));
        }
        a = da.createBufferSource();
        a.buffer = e;
        a.connect(da.destination);
        a.start(f);
        return f + e.duration;
    },
    1569225: a => {
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia && navigator.mediaDevices.getUserMedia({ audio: !0 }).then(b => {
            const c = d => {
                d = d.getAudioTracks();
                if (0 < d.length) return d[0].getSettings().channelCount;
            };
            ia = b;
            ja = new AudioContext({ sampleRate: a });
            ja.audioWorklet.addModule("audio-worklet.js").then(() => {
                ka = new AudioWorkletNode(ja, "audio-worklet");
                ka.port.onmessage = e => { fa.push(e.data); };
                ha = new MediaStreamAudioSourceNode(ja, { mediaStream: b });
                const d = c(b);
                1 < d ? (la = new ChannelMergerNode(ja, { numberOfInputs: d }), ha.connect(la), la.connect(ka)) : ha.connect(ka);
                ja.resume();
            }).catch(d => {
                console.error(d);
                ia && ia.getTracks().forEach(e => { e.stop(); });
                la = ha = ka = ia = ja = null;
            });
        }).catch(b => { console.error(b); });
    },
    1571002: () => {
        fa = [];
        ia.getTracks().forEach(a => { a.stop(); });
        ka.port.postMessage(!0);
        ha.disconnect();
        ha = null;
        null != la && (la.disconnect(), la = null);
        ka.disconnect();
        ka = null;
        ja.close().then(() => { ja = null; }).catch(a => { console.error(a); });
    },
    1571594: (a, b, c) => {
        b /= c;
        for (let d = 0; d < b; ++d) {
            const e = fa.shift();
            for (let f = 0; f < c; ++f) Bb(a + 2 * (d * c + f), e[f], "i16");
        }
    },
    1571938: a => fa.length * a,
    1572024: () => null != ha && null != ka ? 1 : 0,
    1572137: () => screen.width,
    1572162: () => screen.height,
    1572188: () => screen.width,
    1572213: () => screen.height,
    1572239: () => {
        var a = document.getElementById("canvas");
        const b = a.style.visibility;
        a.style.visibility = "hidden";
        a.offsetHeight;
        a.style.visibility = b;
    },
    1572477: (a, b) => { g_pWadLoadCallback && g_pWadLoadCallback(a, b); },
    1572537: () => {
        var a = manifestFiles(), b = aa(a) + 1, c = m(b);
        t(a, v, c, b);
        return c;
    },
    1572693: a => __gx_check_cache(a ? x(v, a) : "", !0) ? 1 : 0,
    1572755: (a, b, c, d, e, f, g, h) => { __gx_async_wget2(a ? x(v, a) : "", b ? x(v, b) : "", c ? x(v, c) : "", d, e, f, g, h); },
    1572852: a => { setAddAsyncMethod(a); },
    1572879: (a, b, c, d) => {
        __gx_prepare_cache(c ? x(v, c) : "").then(e => {
            console.log("Prepare cache completed" + JSON.stringify(e));
            k.dynCall("vi", a, [b]);
        }).catch(e => {
            console.log("Prepare cache error " + e);
            k.dynCall("vi", a, [d]);
        });
    },
    1573159: a => __gx_check_cache(a ? x(v, a) : "", !1) ? 1 : 0,
    1573220: (a, b) => { g_pWadLoadCallback && g_pWadLoadCallback(a, b); },
    1573280: a => { window.location.replace(a ? x(v, a) : ""); },
    1573327: () => { this.onFirstFrameRendered && onFirstFrameRendered(); },
    1573390: (a, b) => { this.chrome && this.chrome.runtime && chrome.runtime.sendMessage(a ? x(v, a) : "", { command: b ? x(v, b) : "" }); },
    1573527: (a, b, c, d, e) => {
        function f(h) {
            if (h.hash) {
                var n = 0;
                (new Uint8Array(h.hash)).every(p => {
                    n = n + p & 255;
                    return !0;
                });
                g.fl(n, b);
            }
        }
        const g = { fl: k.cwrap("YYSum", "", ["number", "number"]) };
        this.chrome && this.chrome.runtime && (e = v.subarray(e, e + 20), a = a ? x(v, a) : "", chrome.runtime.sendMessage(c ? x(v, c) : "", {
            command: d ? x(v, d) : "",
            randomString: a,
            hash: e
        }, f));
    },
    1574087: (a, b, c, d, e) => { oa = a; pa = b; qa = c; ra = d; na = e; },
    1574203: (a, b) => {
        a = prompt(a ? x(v, a) : "", b ? x(v, b) : "");
        b = aa(a) + 1;
        var c = m(b);
        t(a, v, c, b + 1);
        return c;
    },
    1574399: a => confirm(a ? x(v, a) : "") ? 1 : 0,
    1574446: (a, b) => {
        a = prompt(a ? x(v, a) : "", b ? x(v, b) : "");
        b = 1;
        a ? b += aa(a) : a = "";
        var c = m(b);
        t(a, v, c, b + 1);
        return c;
    },
    1574677: a => confirm(a ? x(v, a) : "") ? 1 : 0,
    1574724: a => { alert(a ? x(v, a) : ""); },
    
    // Virtual Filesystem Sync Call (Safeguarded against IDBFS/Storage errors)
    1574754: () => {
        try {
            if (typeof Cb === "function") Cb("/_savedata");
            if (window.oprt && window.oprt.gameStorage) {
                Db(GXMFS, "/_savedata");
            } else if (typeof L !== "undefined") {
                Db(L, "/_savedata");
            }
            if (typeof Eb === "function") {
                Eb(!0, function(err) {
                    if (err) console.warn("FS sync failed:", err);
                    if (typeof Fb === "function") Fb("FSSyncCompleted", "void");
                });
            }
        } catch (e) {
            console.warn("Handled save-data filesystem error:", e);
            if (typeof Fb === "function") Fb("FSSyncCompleted", "void");
        }
    },
    1574976: () => { typeof Eb === "function" && Eb(!1, function() {}); },
    1575014: () => { typeof Eb === "function" && Eb(!1, function() {}); },
    1575051: () => { typeof Eb === "function" && Eb(!1, function() {}); },
    1575089: () => "undefined" !== typeof AudioContext || "undefined" !== typeof webkitAudioContext ? !0 : !1,
    1575236: () => "undefined" !== typeof navigator.mediaDevices && "undefined" !== typeof navigator.mediaDevices.getUserMedia || "undefined" !== typeof navigator.webkitGetUserMedia ? !0 : !1,
    1575470: a => {
        "undefined" === typeof k.SDL2 && (k.SDL2 = {});
        var b = k.SDL2;
        a ? b.capture = {} : b.audio = {};
        b.Ii || ("undefined" !== typeof AudioContext ? b.Ii = new AudioContext() : "undefined" !== typeof webkitAudioContext && (b.Ii = new webkitAudioContext()), b.Ii && Gb(b.Ii));
        return void 0 === b.Ii ? -1 : 0;
    },
    1575963: () => k.SDL2.Ii.sampleRate,
    1576031: (a, b, c, d) => {
        function e() {}
        function f(h) {
            void 0 !== g.capture.Hj && (clearTimeout(g.capture.Hj), g.capture.Hj = void 0);
            g.capture.Tj = g.Ii.createMediaStreamSource(h);
            g.capture.Mi = g.Ii.createScriptProcessor(b, a, 1);
            g.capture.Mi.onaudioprocess = function(n) {
                void 0 !== g && void 0 !== g.capture && (n.outputBuffer.getChannelData(0).fill(0), g.capture.gk = n.inputBuffer, Hb("vi", c, [d]));
            };
            g.capture.Tj.connect(g.capture.Mi);
            g.capture.Mi.connect(g.Ii.destination);
            g.capture.stream = h;
        }
        var g = k.SDL2;
        g.capture.Xj = g.Ii.createBuffer(a, b, g.Ii.sampleRate);
        g.capture.Xj.getChannelData(0).fill(0);
        g.capture.Hj = setTimeout(function() {
            g.capture.gk = g.capture.Xj;
            Hb("vi", c, [d]);
        }, b / g.Ii.sampleRate * 1E3);
        void 0 !== navigator.mediaDevices && void 0 !== navigator.mediaDevices.getUserMedia ? navigator.mediaDevices.getUserMedia({
            audio: !0,
            video: !1
        }).then(f).catch(e) : void 0 !== navigator.webkitGetUserMedia && navigator.webkitGetUserMedia({
            audio: !0,
            video: !1
        }, f, e);
    },
    1577683: (a, b, c, d) => {
        var e = k.SDL2;
        e.audio.Mi = e.Ii.createScriptProcessor(b, 0, a);
        e.audio.Mi.onaudioprocess = function(f) {
            void 0 !== e && void 0 !== e.audio && (e.audio.Ok = f.outputBuffer, Hb("vi", c, [d]));
        };
        e.audio.Mi.connect(e.Ii.destination);
    },
    1578093: (a, b) => {
        for (var c = k.SDL2, d = c.capture.gk.numberOfChannels, e = 0; e < d; ++e) {
            var f = c.capture.gk.getChannelData(e);
            if (f.length != b) throw "Web Audio capture buffer length mismatch! Destination size: " + f.length + " samples vs expected " + b + " samples!";
            if (1 == d) for (var g = 0; g < b; ++g) Bb(a + 4 * g, f[g], "float");
            else for (g = 0; g < b; ++g) Bb(a + 4 * (g * d + e), f[g], "float");
        }
    },
    1578698: (a, b) => {
        for (var c = k.SDL2, d = c.audio.Ok.numberOfChannels, e = 0; e < d; ++e) {
            var f = c.audio.Ok.getChannelData(e);
            if (f.length != b) throw "Web Audio output buffer length mismatch! Destination size: " + f.length + " samples vs expected " + b + " samples!";
            for (var g = 0; g < b; ++g) f[g] = H[a + (g * d + e << 2) >> 2];
        }
    },
    1579178: a => {
        var b = k.SDL2;
        if (a) {
            void 0 !== b.capture.Hj && clearTimeout(b.capture.Hj);
            if (void 0 !== b.capture.stream) {
                a = b.capture.stream.getAudioTracks();
                for (var c = 0; c < a.length; c++) b.capture.stream.removeTrack(a[c]);
                b.capture.stream = void 0;
            }
            void 0 !== b.capture.Mi && (b.capture.Mi.onaudioprocess = function() {}, b.capture.Mi.disconnect(), b.capture.Mi = void 0);
            void 0 !== b.capture.Tj && (b.capture.Tj.disconnect(), b.capture.Tj = void 0);
            void 0 !== b.capture.Xj && (b.capture.Xj = void 0);
            b.capture = void 0;
        } else {
            void 0 != b.audio.Mi && (b.audio.Mi.disconnect(), b.audio.Mi = void 0);
            b.audio = void 0;
        }
        void 0 !== b.Ii && void 0 === b.audio && void 0 === b.capture && (b.Ii.close(), b.Ii = void 0);
    }
};