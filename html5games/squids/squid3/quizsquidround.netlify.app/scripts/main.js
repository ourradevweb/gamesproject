'use strict';
window.DOMHandler = class {
    constructor(f, a) {
        this._iRuntime = f;
        this._componentId = a;
        this._hasTickCallback = !1;
        this._tickCallback = () => this.Tick()
    }
    Attach() {}
    PostToRuntime(f, a, c, d) {
        this._iRuntime.PostToRuntimeComponent(this._componentId, f, a, c, d)
    }
    PostToRuntimeAsync(f, a, c, d) {
        return this._iRuntime.PostToRuntimeComponentAsync(this._componentId, f, a, c, d)
    }
    _PostToRuntimeMaybeSync(f, a, c) {
        this._iRuntime.UsesWorker() ? this.PostToRuntime(f, a, c) : this._iRuntime._GetLocalRuntime()._OnMessageFromDOM({
            type: "event",
            component: this._componentId,
            handler: f,
            dispatchOpts: c || null,
            data: a,
            responseId: null
        })
    }
    AddRuntimeMessageHandler(f, a) {
        this._iRuntime.AddRuntimeComponentMessageHandler(this._componentId, f, a)
    }
    AddRuntimeMessageHandlers(f) {
        for (const [a, c] of f) this.AddRuntimeMessageHandler(a, c)
    }
    GetRuntimeInterface() {
        return this._iRuntime
    }
    GetComponentID() {
        return this._componentId
    }
    _StartTicking() {
        this._hasTickCallback || (this._iRuntime._AddRAFCallback(this._tickCallback), this._hasTickCallback = !0)
    }
    _StopTicking() {
        this._hasTickCallback &&
            (this._iRuntime._RemoveRAFCallback(this._tickCallback), this._hasTickCallback = !1)
    }
    Tick() {}
};
window.RateLimiter = class {
    constructor(f, a) {
        this._callback = f;
        this._interval = a;
        this._timerId = -1;
        this._lastCallTime = -Infinity;
        this._timerCallFunc = () => this._OnTimer();
        this._canRunImmediate = this._ignoreReset = !1
    }
    SetCanRunImmediate(f) {
        this._canRunImmediate = !!f
    }
    Call() {
        if (-1 === this._timerId) {
            var f = Date.now(),
                a = f - this._lastCallTime,
                c = this._interval;
            a >= c && this._canRunImmediate ? (this._lastCallTime = f, this._RunCallback()) : this._timerId = self.setTimeout(this._timerCallFunc, Math.max(c - a, 4))
        }
    }
    _RunCallback() {
        this._ignoreReset = !0;
        this._callback();
        this._ignoreReset = !1
    }
    Reset() {
        this._ignoreReset || (this._CancelTimer(), this._lastCallTime = Date.now())
    }
    _OnTimer() {
        this._timerId = -1;
        this._lastCallTime = Date.now();
        this._RunCallback()
    }
    _CancelTimer() {
        -1 !== this._timerId && (self.clearTimeout(this._timerId), this._timerId = -1)
    }
    Release() {
        this._CancelTimer();
        this._timerCallFunc = this._callback = null
    }
};
"use strict";
window.DOMElementHandler = class extends self.DOMHandler {
    constructor(f, a) {
        super(f, a);
        this._elementMap = new Map;
        this._autoAttach = !0;
        this.AddRuntimeMessageHandlers([
            ["create", c => this._OnCreate(c)],
            ["destroy", c => this._OnDestroy(c)],
            ["set-visible", c => this._OnSetVisible(c)],
            ["update-position", c => this._OnUpdatePosition(c)],
            ["update-state", c => this._OnUpdateState(c)],
            ["focus", c => this._OnSetFocus(c)],
            ["set-css-style", c => this._OnSetCssStyle(c)],
            ["set-attribute", c => this._OnSetAttribute(c)],
            ["remove-attribute",
                c => this._OnRemoveAttribute(c)
            ]
        ]);
        this.AddDOMElementMessageHandler("get-element", c => c)
    }
    SetAutoAttach(f) {
        this._autoAttach = !!f
    }
    AddDOMElementMessageHandler(f, a) {
        this.AddRuntimeMessageHandler(f, c => {
            const d = this._elementMap.get(c.elementId);
            return a(d, c)
        })
    }
    _OnCreate(f) {
        const a = f.elementId,
            c = this.CreateElement(a, f);
        this._elementMap.set(a, c);
        c.style.boxSizing = "border-box";
        f.isVisible || (c.style.display = "none");
        f = this._GetFocusElement(c);
        f.addEventListener("focus", d => this._OnFocus(a));
        f.addEventListener("blur",
            d => this._OnBlur(a));
        this._autoAttach && document.body.appendChild(c)
    }
    CreateElement(f, a) {
        throw Error("required override");
    }
    DestroyElement(f) {}
    _OnDestroy(f) {
        f = f.elementId;
        const a = this._elementMap.get(f);
        this.DestroyElement(a);
        this._autoAttach && a.parentElement.removeChild(a);
        this._elementMap.delete(f)
    }
    PostToRuntimeElement(f, a, c) {
        c || (c = {});
        c.elementId = a;
        this.PostToRuntime(f, c)
    }
    _PostToRuntimeElementMaybeSync(f, a, c) {
        c || (c = {});
        c.elementId = a;
        this._PostToRuntimeMaybeSync(f, c)
    }
    _OnSetVisible(f) {
        this._autoAttach &&
            (this._elementMap.get(f.elementId).style.display = f.isVisible ? "" : "none")
    }
    _OnUpdatePosition(f) {
        if (this._autoAttach) {
            var a = this._elementMap.get(f.elementId);
            a.style.left = f.left + "px";
            a.style.top = f.top + "px";
            a.style.width = f.width + "px";
            a.style.height = f.height + "px";
            f = f.fontSize;
            null !== f && (a.style.fontSize = f + "em")
        }
    }
    _OnUpdateState(f) {
        const a = this._elementMap.get(f.elementId);
        this.UpdateState(a, f)
    }
    UpdateState(f, a) {
        throw Error("required override");
    }
    _GetFocusElement(f) {
        return f
    }
    _OnFocus(f) {
        this.PostToRuntimeElement("elem-focused",
            f)
    }
    _OnBlur(f) {
        this.PostToRuntimeElement("elem-blurred", f)
    }
    _OnSetFocus(f) {
        const a = this._GetFocusElement(this._elementMap.get(f.elementId));
        f.focus ? a.focus() : a.blur()
    }
    _OnSetCssStyle(f) {
        this._elementMap.get(f.elementId).style[f.prop] = f.val
    }
    _OnSetAttribute(f) {
        this._elementMap.get(f.elementId).setAttribute(f.name, f.val)
    }
    _OnRemoveAttribute(f) {
        this._elementMap.get(f.elementId).removeAttribute(f.name)
    }
    GetElementById(f) {
        return this._elementMap.get(f)
    }
};
"use strict"; {
    const f = /(iphone|ipod|ipad|macos|macintosh|mac os x)/i.test(navigator.userAgent);
    let a = 0;

    function c(e) {
        const b = document.createElement("script");
        b.async = !1;
        b.type = "module";
        return e.isStringSrc ? new Promise(h => {
            const k = "c3_resolve_" + a;
            ++a;
            self[k] = h;
            b.textContent = e.str + `\n\nself["${k}"]();`;
            document.head.appendChild(b)
        }) : new Promise((h, k) => {
            b.onload = h;
            b.onerror = k;
            b.src = e;
            document.head.appendChild(b)
        })
    }
    let d = !1,
        g = !1;

    function m() {
        if (!d) {
            try {
                new Worker("blob://", {
                    get type() {
                        g = !0
                    }
                })
            } catch (e) {}
            d = !0
        }
        return g
    }
    let n = new Audio;
    const v = {
        "audio/webm; codecs=opus": !!n.canPlayType("audio/webm; codecs=opus"),
        "audio/ogg; codecs=opus": !!n.canPlayType("audio/ogg; codecs=opus"),
        "audio/webm; codecs=vorbis": !!n.canPlayType("audio/webm; codecs=vorbis"),
        "audio/ogg; codecs=vorbis": !!n.canPlayType("audio/ogg; codecs=vorbis"),
        "audio/mp4": !!n.canPlayType("audio/mp4"),
        "audio/mpeg": !!n.canPlayType("audio/mpeg")
    };
    n = null;
    async function y(e) {
        e = await z(e);
        return (new TextDecoder("utf-8")).decode(e)
    }

    function z(e) {
        return new Promise((b,
            h) => {
            const k = new FileReader;
            k.onload = l => b(l.target.result);
            k.onerror = l => h(l);
            k.readAsArrayBuffer(e)
        })
    }
    const t = [];
    let u = 0;
    window.RealFile = window.File;
    const A = [],
        C = new Map,
        D = new Map;
    let x = 0;
    const E = [];
    self.runOnStartup = function(e) {
        if ("function" !== typeof e) throw Error("runOnStartup called without a function");
        E.push(e)
    };
    const F = new Set(["cordova", "playable-ad", "instant-games"]);

    function H(e) {
        return F.has(e)
    }
    let G = !1;
    window.RuntimeInterface = class e {
        constructor(b) {
            this._useWorker = b.useWorker;
            this._messageChannelPort =
                null;
            this._baseUrl = "";
            this._scriptFolder = b.scriptFolder;
            this._workerScriptURLs = {};
            this._localRuntime = this._worker = null;
            this._domHandlers = [];
            this._jobScheduler = this._canvas = this._runtimeDomHandler = null;
            this._rafId = -1;
            this._rafFunc = () => this._OnRAFCallback();
            this._rafCallbacks = [];
            this._exportType = b.exportType;
            this._isFileProtocol = "file" === location.protocol.substr(0, 4);
            !this._useWorker || "undefined" !== typeof OffscreenCanvas && navigator.userActivation && m() || (this._useWorker = !1);
            if ("playable-ad" === this._exportType ||
                "instant-games" === this._exportType) this._useWorker = !1;
            if ("cordova" === this._exportType && this._useWorker)
                if (/android/i.test(navigator.userAgent)) {
                    const h = /Chrome\/(\d+)/i.exec(navigator.userAgent);
                    h && 90 <= parseInt(h[1], 10) || (this._useWorker = !1)
                } else this._useWorker = !1;
            this._localFileStrings = this._localFileBlobs = null;
            "html5" !== this._exportType && "playable-ad" !== this._exportType || !this._isFileProtocol || alert("Exported games won't work until you upload them. (When running on the file: protocol, browsers block many features from working for security reasons.)");
            "html5" !== this._exportType || window.isSecureContext || console.warn("[Construct 3] Warning: the browser indicates this is not a secure context. Some features may be unavailable. Use secure (HTTPS) hosting to ensure all features are available.");
            this.AddRuntimeComponentMessageHandler("runtime", "cordova-fetch-local-file", h => this._OnCordovaFetchLocalFile(h));
            this.AddRuntimeComponentMessageHandler("runtime", "create-job-worker", h => this._OnCreateJobWorker(h));
            "cordova" === this._exportType ? document.addEventListener("deviceready",
                () => this._Init(b)) : this._Init(b)
        }
        Release() {
            this._CancelAnimationFrame();
            this._messageChannelPort && (this._messageChannelPort = this._messageChannelPort.onmessage = null);
            this._worker && (this._worker.terminate(), this._worker = null);
            this._localRuntime && (this._localRuntime.Release(), this._localRuntime = null);
            this._canvas && (this._canvas.parentElement.removeChild(this._canvas), this._canvas = null)
        }
        GetCanvas() {
            return this._canvas
        }
        GetBaseURL() {
            return this._baseUrl
        }
        UsesWorker() {
            return this._useWorker
        }
        GetExportType() {
            return this._exportType
        }
        IsFileProtocol() {
            return this._isFileProtocol
        }
        GetScriptFolder() {
            return this._scriptFolder
        }
        IsiOSCordova() {
            return f &&
                "cordova" === this._exportType
        }
        IsiOSWebView() {
            const b = navigator.userAgent;
            return f && H(this._exportType) || navigator.standalone || /crios\/|fxios\/|edgios\//i.test(b)
        }
        async _Init(b) {
            "macos-wkwebview" === this._exportType && this._SendWrapperMessage({
                type: "ready"
            });
            if ("playable-ad" === this._exportType) {
                this._localFileBlobs = self.c3_base64files;
                this._localFileStrings = {};
                await this._ConvertDataUrisToBlobs();
                for (let k = 0, l = b.engineScripts.length; k < l; ++k) {
                    var h = b.engineScripts[k].toLowerCase();
                    this._localFileStrings.hasOwnProperty(h) ?
                        b.engineScripts[k] = {
                            isStringSrc: !0,
                            str: this._localFileStrings[h]
                        } : this._localFileBlobs.hasOwnProperty(h) && (b.engineScripts[k] = URL.createObjectURL(this._localFileBlobs[h]))
                }
            }
            b.baseUrl ? this._baseUrl = b.baseUrl : (h = location.origin, this._baseUrl = ("null" === h ? "file:///" : h) + location.pathname, h = this._baseUrl.lastIndexOf("/"), -1 !== h && (this._baseUrl = this._baseUrl.substr(0, h + 1)));
            b.workerScripts && (this._workerScriptURLs = b.workerScripts);
            h = new MessageChannel;
            this._messageChannelPort = h.port1;
            this._messageChannelPort.onmessage =
                k => this._OnMessageFromRuntime(k.data);
            window.c3_addPortMessageHandler && window.c3_addPortMessageHandler(k => this._OnMessageFromDebugger(k));
            this._jobScheduler = new self.JobSchedulerDOM(this);
            await this._jobScheduler.Init();
            "object" === typeof window.StatusBar && window.StatusBar.hide();
            "object" === typeof window.AndroidFullScreen && window.AndroidFullScreen.immersiveMode();
            this._useWorker ? await this._InitWorker(b, h.port2) : await this._InitDOM(b, h.port2)
        }
        _GetWorkerURL(b) {
            b = this._workerScriptURLs.hasOwnProperty(b) ?
                this._workerScriptURLs[b] : b.endsWith("/workermain.js") && this._workerScriptURLs.hasOwnProperty("workermain.js") ? this._workerScriptURLs["workermain.js"] : "playable-ad" === this._exportType && this._localFileBlobs.hasOwnProperty(b.toLowerCase()) ? this._localFileBlobs[b.toLowerCase()] : b;
            b instanceof Blob && (b = URL.createObjectURL(b));
            return b
        }
        async CreateWorker(b, h, k) {
            if (b.startsWith("blob:")) return new Worker(b, k);
            if ("cordova" === this._exportType && this._isFileProtocol) return b = await this.CordovaFetchLocalFileAsArrayBuffer(k.isC3MainWorker ?
                b : this._scriptFolder + b), b = new Blob([b], {
                type: "application/javascript"
            }), new Worker(URL.createObjectURL(b), k);
            b = new URL(b, h);
            if (location.origin !== b.origin) {
                b = await fetch(b);
                if (!b.ok) throw Error("failed to fetch worker script");
                b = await b.blob();
                return new Worker(URL.createObjectURL(b), k)
            }
            return new Worker(b, k)
        }
        _GetWindowInnerWidth() {
            return Math.max(window.innerWidth, 1)
        }
        _GetWindowInnerHeight() {
            return Math.max(window.innerHeight, 1)
        }
        _GetCommonRuntimeOptions(b) {
            return {
                baseUrl: this._baseUrl,
                windowInnerWidth: this._GetWindowInnerWidth(),
                windowInnerHeight: this._GetWindowInnerHeight(),
                devicePixelRatio: window.devicePixelRatio,
                isFullscreen: e.IsDocumentFullscreen(),
                projectData: b.projectData,
                previewImageBlobs: window.cr_previewImageBlobs || this._localFileBlobs,
                previewProjectFileBlobs: window.cr_previewProjectFileBlobs,
                previewProjectFileSWUrls: window.cr_previewProjectFiles,
                swClientId: window.cr_swClientId || "",
                exportType: b.exportType,
                isDebug: -1 < self.location.search.indexOf("debug"),
                ife: !!self.ife,
                jobScheduler: this._jobScheduler.GetPortData(),
                supportedAudioFormats: v,
                opusWasmScriptUrl: window.cr_opusWasmScriptUrl || this._scriptFolder + "opus.wasm.js",
                opusWasmBinaryUrl: window.cr_opusWasmBinaryUrl || this._scriptFolder + "opus.wasm.wasm",
                isFileProtocol: this._isFileProtocol,
                isiOSCordova: this.IsiOSCordova(),
                isiOSWebView: this.IsiOSWebView(),
                isFBInstantAvailable: "undefined" !== typeof self.FBInstant
            }
        }
        async _InitWorker(b, h) {
            var k = this._GetWorkerURL(b.workerMainUrl);
            this._worker = await this.CreateWorker(k, this._baseUrl, {
                type: "module",
                name: "Runtime",
                isC3MainWorker: !0
            });
            this._canvas = document.createElement("canvas");
            this._canvas.style.display = "none";
            k = this._canvas.transferControlToOffscreen();
            document.body.appendChild(this._canvas);
            window.c3canvas = this._canvas;
            let l = b.workerDependencyScripts || [],
                q = b.engineScripts;
            l = await Promise.all(l.map(p => this._MaybeGetCordovaScriptURL(p)));
            q = await Promise.all(q.map(p => this._MaybeGetCordovaScriptURL(p)));
            if ("cordova" === this._exportType)
                for (let p = 0, r = b.projectScripts.length; p < r; ++p) {
                    const w = b.projectScripts[p],
                        B = w[0];
                    if (B === b.mainProjectScript ||
                        "scriptsInEvents.js" === B || B.endsWith("/scriptsInEvents.js")) w[1] = await this._MaybeGetCordovaScriptURL(B)
                }
            this._worker.postMessage(Object.assign(this._GetCommonRuntimeOptions(b), {
                type: "init-runtime",
                isInWorker: !0,
                messagePort: h,
                canvas: k,
                workerDependencyScripts: l,
                engineScripts: q,
                projectScripts: b.projectScripts,
                mainProjectScript: b.mainProjectScript,
                projectScriptsStatus: self.C3_ProjectScriptsStatus
            }), [h, k, ...this._jobScheduler.GetPortTransferables()]);
            this._domHandlers = A.map(p => new p(this));
            this._FindRuntimeDOMHandler();
            self.c3_callFunction = (p, r) => this._runtimeDomHandler._InvokeFunctionFromJS(p, r);
            "preview" === this._exportType && (self.goToLastErrorScript = () => this.PostToRuntimeComponent("runtime", "go-to-last-error-script"))
        }
        async _InitDOM(b, h) {
            this._canvas = document.createElement("canvas");
            this._canvas.style.display = "none";
            document.body.appendChild(this._canvas);
            window.c3canvas = this._canvas;
            this._domHandlers = A.map(p => new p(this));
            this._FindRuntimeDOMHandler();
            var k = b.engineScripts.map(p => "string" === typeof p ? (new URL(p,
                this._baseUrl)).toString() : p);
            Array.isArray(b.workerDependencyScripts) && k.unshift(...b.workerDependencyScripts);
            k = await Promise.all(k.map(p => this._MaybeGetCordovaScriptURL(p)));
            await Promise.all(k.map(p => c(p)));
            k = self.C3_ProjectScriptsStatus;
            const l = b.mainProjectScript,
                q = b.projectScripts;
            for (let [p, r] of q)
                if (r || (r = p), p === l) try {
                    r = await this._MaybeGetCordovaScriptURL(r), await c(r), "preview" !== this._exportType || k[p] || this._ReportProjectMainScriptError(p, "main script did not run to completion")
                } catch (w) {
                    this._ReportProjectMainScriptError(p,
                        w)
                } else if ("scriptsInEvents.js" === p || p.endsWith("/scriptsInEvents.js")) r = await this._MaybeGetCordovaScriptURL(r), await c(r);
            "preview" === this._exportType && "object" !== typeof self.C3.ScriptsInEvents ? (this._RemoveLoadingMessage(), console.error("[C3 runtime] Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax."), alert("Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax.")) : (b = Object.assign(this._GetCommonRuntimeOptions(b), {
                isInWorker: !1,
                messagePort: h,
                canvas: this._canvas,
                runOnStartupFunctions: E
            }), this._OnBeforeCreateRuntime(), this._localRuntime = self.C3_CreateRuntime(b), await self.C3_InitRuntime(this._localRuntime, b))
        }
        _ReportProjectMainScriptError(b, h) {
            this._RemoveLoadingMessage();
            console.error(`[Preview] Failed to load project main script (${b}): `, h);
            alert(`Failed to load project main script (${b}). Check all your JavaScript code has valid syntax. Press F12 and check the console for error details.`)
        }
        _OnBeforeCreateRuntime() {
            this._RemoveLoadingMessage()
        }
        _RemoveLoadingMessage() {
            const b =
                window.cr_previewLoadingElem;
            b && (b.parentElement.removeChild(b), window.cr_previewLoadingElem = null)
        }
        async _OnCreateJobWorker(b) {
            b = await this._jobScheduler._CreateJobWorker();
            return {
                outputPort: b,
                transferables: [b]
            }
        }
        _GetLocalRuntime() {
            if (this._useWorker) throw Error("not available in worker mode");
            return this._localRuntime
        }
        PostToRuntimeComponent(b, h, k, l, q) {
            this._messageChannelPort.postMessage({
                type: "event",
                component: b,
                handler: h,
                dispatchOpts: l || null,
                data: k,
                responseId: null
            }, q)
        }
        PostToRuntimeComponentAsync(b,
            h, k, l, q) {
            const p = x++,
                r = new Promise((w, B) => {
                    D.set(p, {
                        resolve: w,
                        reject: B
                    })
                });
            this._messageChannelPort.postMessage({
                type: "event",
                component: b,
                handler: h,
                dispatchOpts: l || null,
                data: k,
                responseId: p
            }, q);
            return r
        }["_OnMessageFromRuntime"](b) {
            const h = b.type;
            if ("event" === h) return this._OnEventFromRuntime(b);
            if ("result" === h) this._OnResultFromRuntime(b);
            else if ("runtime-ready" === h) this._OnRuntimeReady();
            else if ("alert-error" === h) this._RemoveLoadingMessage(), alert(b.message);
            else if ("creating-runtime" === h) this._OnBeforeCreateRuntime();
            else throw Error(`unknown message '${h}'`);
        }
        _OnEventFromRuntime(b) {
            const h = b.component,
                k = b.handler,
                l = b.data,
                q = b.responseId;
            if (b = C.get(h))
                if (b = b.get(k)) {
                    var p = null;
                    try {
                        p = b(l)
                    } catch (r) {
                        console.error(`Exception in '${h}' handler '${k}':`, r);
                        null !== q && this._PostResultToRuntime(q, !1, "" + r);
                        return
                    }
                    if (null === q) return p;
                    p && p.then ? p.then(r => this._PostResultToRuntime(q, !0, r)).catch(r => {
                        console.error(`Rejection from '${h}' handler '${k}':`, r);
                        this._PostResultToRuntime(q, !1, "" + r)
                    }) : this._PostResultToRuntime(q, !0, p)
                } else console.warn(`[DOM] No handler '${k}' for component '${h}'`);
            else console.warn(`[DOM] No event handlers for component '${h}'`)
        }
        _PostResultToRuntime(b, h, k) {
            let l;
            k && k.transferables && (l = k.transferables);
            this._messageChannelPort.postMessage({
                type: "result",
                responseId: b,
                isOk: h,
                result: k
            }, l)
        }
        _OnResultFromRuntime(b) {
            const h = b.responseId,
                k = b.isOk;
            b = b.result;
            const l = D.get(h);
            k ? l.resolve(b) : l.reject(b);
            D.delete(h)
        }
        AddRuntimeComponentMessageHandler(b, h, k) {
            let l = C.get(b);
            l || (l = new Map, C.set(b, l));
            if (l.has(h)) throw Error(`[DOM] Component '${b}' already has handler '${h}'`);
            l.set(h, k)
        }
        static AddDOMHandlerClass(b) {
            if (A.includes(b)) throw Error("DOM handler already added");
            A.push(b)
        }
        _FindRuntimeDOMHandler() {
            for (const b of this._domHandlers)
                if ("runtime" === b.GetComponentID()) {
                    this._runtimeDomHandler = b;
                    return
                }
            throw Error("cannot find runtime DOM handler");
        }
        _OnMessageFromDebugger(b) {
            this.PostToRuntimeComponent("debugger", "message", b)
        }
        _OnRuntimeReady() {
            for (const b of this._domHandlers) b.Attach()
        }
        static IsDocumentFullscreen() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement ||
                document.mozFullScreenElement || G)
        }
        static _SetWrapperIsFullscreenFlag(b) {
            G = !!b
        }
        async GetRemotePreviewStatusInfo() {
            return await this.PostToRuntimeComponentAsync("runtime", "get-remote-preview-status-info")
        }
        _AddRAFCallback(b) {
            this._rafCallbacks.push(b);
            this._RequestAnimationFrame()
        }
        _RemoveRAFCallback(b) {
            b = this._rafCallbacks.indexOf(b);
            if (-1 === b) throw Error("invalid callback");
            this._rafCallbacks.splice(b, 1);
            this._rafCallbacks.length || this._CancelAnimationFrame()
        }
        _RequestAnimationFrame() {
            -1 === this._rafId &&
                this._rafCallbacks.length && (this._rafId = requestAnimationFrame(this._rafFunc))
        }
        _CancelAnimationFrame() {
            -1 !== this._rafId && (cancelAnimationFrame(this._rafId), this._rafId = -1)
        }
        _OnRAFCallback() {
            this._rafId = -1;
            for (const b of this._rafCallbacks) b();
            this._RequestAnimationFrame()
        }
        TryPlayMedia(b) {
            this._runtimeDomHandler.TryPlayMedia(b)
        }
        RemovePendingPlay(b) {
            this._runtimeDomHandler.RemovePendingPlay(b)
        }
        _PlayPendingMedia() {
            this._runtimeDomHandler._PlayPendingMedia()
        }
        SetSilent(b) {
            this._runtimeDomHandler.SetSilent(b)
        }
        IsAudioFormatSupported(b) {
            return !!v[b]
        }
        async _WasmDecodeWebMOpus(b) {
            b =
                await this.PostToRuntimeComponentAsync("runtime", "opus-decode", {
                    arrayBuffer: b
                }, null, [b]);
            return new Float32Array(b)
        }
        IsAbsoluteURL(b) {
            return /^(?:[a-z\-]+:)?\/\//.test(b) || "data:" === b.substr(0, 5) || "blob:" === b.substr(0, 5)
        }
        IsRelativeURL(b) {
            return !this.IsAbsoluteURL(b)
        }
        async _MaybeGetCordovaScriptURL(b) {
            return "cordova" === this._exportType && (b.startsWith("file:") || this._isFileProtocol && this.IsRelativeURL(b)) ? (b.startsWith(this._baseUrl) && (b = b.substr(this._baseUrl.length)), b = await this.CordovaFetchLocalFileAsArrayBuffer(b),
                b = new Blob([b], {
                    type: "application/javascript"
                }), URL.createObjectURL(b)) : b
        }
        async _OnCordovaFetchLocalFile(b) {
            const h = b.filename;
            switch (b.as) {
                case "text":
                    return await this.CordovaFetchLocalFileAsText(h);
                case "buffer":
                    return await this.CordovaFetchLocalFileAsArrayBuffer(h);
                default:
                    throw Error("unsupported type");
            }
        }
        _GetPermissionAPI() {
            const b = window.cordova && window.cordova.plugins && window.cordova.plugins.permissions;
            if ("object" !== typeof b) throw Error("Permission API is not loaded");
            return b
        }
        _MapPermissionID(b,
            h) {
            b = b[h];
            if ("string" !== typeof b) throw Error("Invalid permission name");
            return b
        }
        _HasPermission(b) {
            const h = this._GetPermissionAPI();
            return new Promise((k, l) => h.checkPermission(this._MapPermissionID(h, b), q => k(!!q.hasPermission), l))
        }
        _RequestPermission(b) {
            const h = this._GetPermissionAPI();
            return new Promise((k, l) => h.requestPermission(this._MapPermissionID(h, b), q => k(!!q.hasPermission), l))
        }
        async RequestPermissions(b) {
            if ("cordova" !== this.GetExportType() || this.IsiOSCordova()) return !0;
            for (const h of b)
                if (!await this._HasPermission(h) &&
                    !1 === await this._RequestPermission(h)) return !1;
            return !0
        }
        async RequirePermissions(...b) {
            if (!1 === await this.RequestPermissions(b)) throw Error("Permission not granted");
        }
        CordovaFetchLocalFile(b) {
            const h = window.cordova.file.applicationDirectory + "www/" + b.toLowerCase();
            return new Promise((k, l) => {
                window.resolveLocalFileSystemURL(h, q => {
                    q.file(k, l)
                }, l)
            })
        }
        async CordovaFetchLocalFileAsText(b) {
            b = await this.CordovaFetchLocalFile(b);
            return await y(b)
        }
        _CordovaMaybeStartNextArrayBufferRead() {
            if (t.length && !(8 <= u)) {
                u++;
                var b = t.shift();
                this._CordovaDoFetchLocalFileAsAsArrayBuffer(b.filename, b.successCallback, b.errorCallback)
            }
        }
        CordovaFetchLocalFileAsArrayBuffer(b) {
            return new Promise((h, k) => {
                t.push({
                    filename: b,
                    successCallback: l => {
                        u--;
                        this._CordovaMaybeStartNextArrayBufferRead();
                        h(l)
                    },
                    errorCallback: l => {
                        u--;
                        this._CordovaMaybeStartNextArrayBufferRead();
                        k(l)
                    }
                });
                this._CordovaMaybeStartNextArrayBufferRead()
            })
        }
        async _CordovaDoFetchLocalFileAsAsArrayBuffer(b, h, k) {
            try {
                const l = await this.CordovaFetchLocalFile(b),
                    q = await z(l);
                h(q)
            } catch (l) {
                k(l)
            }
        }
        _SendWrapperMessage(b) {
            if ("windows-webview2" === this._exportType) window.chrome.webview.postMessage(JSON.stringify(b));
            else if ("macos-wkwebview" === this._exportType) window.webkit.messageHandlers.C3Wrapper.postMessage(JSON.stringify(b));
            else throw Error("cannot send wrapper message");
        }
        async _ConvertDataUrisToBlobs() {
            const b = [];
            for (const [h, k] of Object.entries(this._localFileBlobs)) b.push(this._ConvertDataUriToBlobs(h, k));
            await Promise.all(b)
        }
        async _ConvertDataUriToBlobs(b, h) {
            if ("object" ===
                typeof h) this._localFileBlobs[b] = new Blob([h.str], {
                type: h.type
            }), this._localFileStrings[b] = h.str;
            else {
                let k = await this._FetchDataUri(h);
                k || (k = this._DataURIToBinaryBlobSync(h));
                this._localFileBlobs[b] = k
            }
        }
        async _FetchDataUri(b) {
            try {
                return await (await fetch(b)).blob()
            } catch (h) {
                return console.warn("Failed to fetch a data: URI. Falling back to a slower workaround. This is probably because the Content Security Policy unnecessarily blocked it. Allow data: URIs in your CSP to avoid this.", h), null
            }
        }
        _DataURIToBinaryBlobSync(b) {
            b =
                this._ParseDataURI(b);
            return this._BinaryStringToBlob(b.data, b.mime_type)
        }
        _ParseDataURI(b) {
            var h = b.indexOf(",");
            if (0 > h) throw new URIError("expected comma in data: uri");
            var k = b.substring(5, h);
            b = b.substring(h + 1);
            h = k.split(";");
            k = h[0] || "";
            const l = h[2];
            b = "base64" === h[1] || "base64" === l ? atob(b) : decodeURIComponent(b);
            return {
                mime_type: k,
                data: b
            }
        }
        _BinaryStringToBlob(b, h) {
            var k = b.length;
            let l = k >> 2,
                q = new Uint8Array(k),
                p = new Uint32Array(q.buffer, 0, l),
                r, w;
            for (w = r = 0; r < l; ++r) p[r] = b.charCodeAt(w++) | b.charCodeAt(w++) <<
                8 | b.charCodeAt(w++) << 16 | b.charCodeAt(w++) << 24;
            for (k &= 3; k--;) q[w] = b.charCodeAt(w), ++w;
            return new Blob([q], {
                type: h
            })
        }
    }
}
"use strict"; {
    const f = self.RuntimeInterface;

    function a(e) {
        return e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents || e.originalEvent && e.originalEvent.sourceCapabilities && e.originalEvent.sourceCapabilities.firesTouchEvents
    }
    const c = new Map([
            ["OSLeft", "MetaLeft"],
            ["OSRight", "MetaRight"]
        ]),
        d = {
            dispatchRuntimeEvent: !0,
            dispatchUserScriptEvent: !0
        },
        g = {
            dispatchUserScriptEvent: !0
        },
        m = {
            dispatchRuntimeEvent: !0
        };

    function n(e) {
        return new Promise((b, h) => {
            const k = document.createElement("link");
            k.onload = () => b(k);
            k.onerror =
                l => h(l);
            k.rel = "stylesheet";
            k.href = e;
            document.head.appendChild(k)
        })
    }

    function v(e) {
        return new Promise((b, h) => {
            const k = new Image;
            k.onload = () => b(k);
            k.onerror = l => h(l);
            k.src = e
        })
    }
    async function y(e) {
        e = URL.createObjectURL(e);
        try {
            return await v(e)
        } finally {
            URL.revokeObjectURL(e)
        }
    }

    function z(e) {
        return new Promise((b, h) => {
            let k = new FileReader;
            k.onload = l => b(l.target.result);
            k.onerror = l => h(l);
            k.readAsText(e)
        })
    }
    async function t(e, b, h) {
        if (!/firefox/i.test(navigator.userAgent)) return await y(e);
        var k = await z(e);
        k =
            (new DOMParser).parseFromString(k, "image/svg+xml");
        const l = k.documentElement;
        if (l.hasAttribute("width") && l.hasAttribute("height")) {
            const q = l.getAttribute("width"),
                p = l.getAttribute("height");
            if (!q.includes("%") && !p.includes("%")) return await y(e)
        }
        l.setAttribute("width", b + "px");
        l.setAttribute("height", h + "px");
        k = (new XMLSerializer).serializeToString(k);
        e = new Blob([k], {
            type: "image/svg+xml"
        });
        return await y(e)
    }

    function u(e) {
        do {
            if (e.parentNode && e.hasAttribute("contenteditable")) return !0;
            e = e.parentNode
        } while (e);
        return !1
    }
    const A = new Set(["input", "textarea", "datalist", "select"]);

    function C(e) {
        return A.has(e.tagName.toLowerCase()) || u(e)
    }
    const D = new Set(["canvas", "body", "html"]);

    function x(e) {
        const b = e.target.tagName.toLowerCase();
        D.has(b) && e.preventDefault()
    }

    function E(e) {
        (e.metaKey || e.ctrlKey) && e.preventDefault()
    }
    self.C3_GetSvgImageSize = async function(e) {
        e = await y(e);
        if (0 < e.width && 0 < e.height) return [e.width, e.height]; {
            e.style.position = "absolute";
            e.style.left = "0px";
            e.style.top = "0px";
            e.style.visibility = "hidden";
            document.body.appendChild(e);
            const b = e.getBoundingClientRect();
            document.body.removeChild(e);
            return [b.width, b.height]
        }
    };
    self.C3_RasterSvgImageBlob = async function(e, b, h, k, l) {
        e = await t(e, b, h);
        const q = document.createElement("canvas");
        q.width = k;
        q.height = l;
        q.getContext("2d").drawImage(e, 0, 0, b, h);
        return q
    };
    let F = !1;
    document.addEventListener("pause", () => F = !0);
    document.addEventListener("resume", () => F = !1);

    function H() {
        try {
            return window.parent && window.parent.document.hasFocus()
        } catch (e) {
            return !1
        }
    }

    function G() {
        const e =
            document.activeElement;
        if (!e) return !1;
        const b = e.tagName.toLowerCase(),
            h = new Set("email number password search tel text url".split(" "));
        return "textarea" === b ? !0 : "input" === b ? h.has(e.type.toLowerCase() || "text") : u(e)
    }
    f.AddDOMHandlerClass(class extends self.DOMHandler {
        constructor(e) {
            super(e, "runtime");
            this._isFirstSizeUpdate = !0;
            this._simulatedResizeTimerId = -1;
            this._targetOrientation = "any";
            this._attachedDeviceMotionEvent = this._attachedDeviceOrientationEvent = !1;
            this._lastPointerRawUpdateEvent = this._pointerRawUpdateRateLimiter =
                this._debugHighlightElem = null;
            this._pointerRawMovementY = this._pointerRawMovementX = 0;
            e.AddRuntimeComponentMessageHandler("canvas", "update-size", k => this._OnUpdateCanvasSize(k));
            e.AddRuntimeComponentMessageHandler("runtime", "invoke-download", k => this._OnInvokeDownload(k));
            e.AddRuntimeComponentMessageHandler("runtime", "raster-svg-image", k => this._OnRasterSvgImage(k));
            e.AddRuntimeComponentMessageHandler("runtime", "get-svg-image-size", k => this._OnGetSvgImageSize(k));
            e.AddRuntimeComponentMessageHandler("runtime",
                "set-target-orientation", k => this._OnSetTargetOrientation(k));
            e.AddRuntimeComponentMessageHandler("runtime", "register-sw", () => this._OnRegisterSW());
            e.AddRuntimeComponentMessageHandler("runtime", "post-to-debugger", k => this._OnPostToDebugger(k));
            e.AddRuntimeComponentMessageHandler("runtime", "go-to-script", k => this._OnPostToDebugger(k));
            e.AddRuntimeComponentMessageHandler("runtime", "before-start-ticking", () => this._OnBeforeStartTicking());
            e.AddRuntimeComponentMessageHandler("runtime", "debug-highlight", k =>
                this._OnDebugHighlight(k));
            e.AddRuntimeComponentMessageHandler("runtime", "enable-device-orientation", () => this._AttachDeviceOrientationEvent());
            e.AddRuntimeComponentMessageHandler("runtime", "enable-device-motion", () => this._AttachDeviceMotionEvent());
            e.AddRuntimeComponentMessageHandler("runtime", "add-stylesheet", k => this._OnAddStylesheet(k));
            e.AddRuntimeComponentMessageHandler("runtime", "alert", k => this._OnAlert(k));
            e.AddRuntimeComponentMessageHandler("runtime", "hide-cordova-splash", () => this._OnHideCordovaSplash());
            const b = new Set(["input", "textarea", "datalist"]);
            window.addEventListener("contextmenu", k => {
                const l = k.target,
                    q = l.tagName.toLowerCase();
                b.has(q) || u(l) || k.preventDefault()
            });
            const h = e.GetCanvas();
            window.addEventListener("selectstart", x);
            window.addEventListener("gesturehold", x);
            h.addEventListener("selectstart", x);
            h.addEventListener("gesturehold", x);
            window.addEventListener("touchstart", x, {
                passive: !1
            });
            "undefined" !== typeof PointerEvent ? (window.addEventListener("pointerdown", x, {
                passive: !1
            }), h.addEventListener("pointerdown",
                x)) : h.addEventListener("touchstart", x);
            this._mousePointerLastButtons = 0;
            window.addEventListener("mousedown", k => {
                1 === k.button && k.preventDefault()
            });
            window.addEventListener("mousewheel", E, {
                passive: !1
            });
            window.addEventListener("wheel", E, {
                passive: !1
            });
            window.addEventListener("resize", () => this._OnWindowResize());
            window.addEventListener("fullscreenchange", () => this._OnFullscreenChange());
            window.addEventListener("webkitfullscreenchange", () => this._OnFullscreenChange());
            window.addEventListener("mozfullscreenchange",
                () => this._OnFullscreenChange());
            window.addEventListener("fullscreenerror", k => this._OnFullscreenError(k));
            window.addEventListener("webkitfullscreenerror", k => this._OnFullscreenError(k));
            window.addEventListener("mozfullscreenerror", k => this._OnFullscreenError(k));
            e.IsiOSWebView() && window.addEventListener("focusout", () => {
                G() || (document.scrollingElement.scrollTop = 0)
            });
            self.C3WrapperOnMessage = k => this._OnWrapperMessage(k);
            this._mediaPendingPlay = new Set;
            this._mediaRemovedPendingPlay = new WeakSet;
            this._isSilent = !1
        }
        _OnBeforeStartTicking() {
            "cordova" === this._iRuntime.GetExportType() ? (document.addEventListener("pause", () => this._OnVisibilityChange(!0)), document.addEventListener("resume", () => this._OnVisibilityChange(!1))) : document.addEventListener("visibilitychange", () => this._OnVisibilityChange(document.hidden));
            return {
                isSuspended: !(!document.hidden && !F)
            }
        }
        Attach() {
            window.addEventListener("focus", () => this._PostRuntimeEvent("window-focus"));
            window.addEventListener("blur", () => {
                this._PostRuntimeEvent("window-blur", {
                    parentHasFocus: H()
                });
                this._mousePointerLastButtons = 0
            });
            window.addEventListener("focusin", b => {
                C(b.target) && this._PostRuntimeEvent("keyboard-blur")
            });
            window.addEventListener("keydown", b => this._OnKeyEvent("keydown", b));
            window.addEventListener("keyup", b => this._OnKeyEvent("keyup", b));
            window.addEventListener("dblclick", b => this._OnMouseEvent("dblclick", b, d));
            window.addEventListener("wheel", b => this._OnMouseWheelEvent("wheel", b));
            "undefined" !== typeof PointerEvent ? (window.addEventListener("pointerdown", b => {
                this._HandlePointerDownFocus(b);
                this._OnPointerEvent("pointerdown", b)
            }), this._iRuntime.UsesWorker() && "undefined" !== typeof window.onpointerrawupdate && self === self.top ? (this._pointerRawUpdateRateLimiter = new self.RateLimiter(() => this._DoSendPointerRawUpdate(), 5), this._pointerRawUpdateRateLimiter.SetCanRunImmediate(!0), window.addEventListener("pointerrawupdate", b => this._OnPointerRawUpdate(b))) : window.addEventListener("pointermove", b => this._OnPointerEvent("pointermove", b)), window.addEventListener("pointerup",
                b => this._OnPointerEvent("pointerup", b)), window.addEventListener("pointercancel", b => this._OnPointerEvent("pointercancel", b))) : (window.addEventListener("mousedown", b => {
                this._HandlePointerDownFocus(b);
                this._OnMouseEventAsPointer("pointerdown", b)
            }), window.addEventListener("mousemove", b => this._OnMouseEventAsPointer("pointermove", b)), window.addEventListener("mouseup", b => this._OnMouseEventAsPointer("pointerup", b)), window.addEventListener("touchstart", b => {
                this._HandlePointerDownFocus(b);
                this._OnTouchEvent("pointerdown",
                    b)
            }), window.addEventListener("touchmove", b => this._OnTouchEvent("pointermove", b)), window.addEventListener("touchend", b => this._OnTouchEvent("pointerup", b)), window.addEventListener("touchcancel", b => this._OnTouchEvent("pointercancel", b)));
            const e = () => this._PlayPendingMedia();
            window.addEventListener("pointerup", e, !0);
            window.addEventListener("touchend", e, !0);
            window.addEventListener("click", e, !0);
            window.addEventListener("keydown", e, !0);
            window.addEventListener("gamepadconnected", e, !0)
        }
        _PostRuntimeEvent(e,
            b) {
            this.PostToRuntime(e, b || null, m)
        }
        _GetWindowInnerWidth() {
            return this._iRuntime._GetWindowInnerWidth()
        }
        _GetWindowInnerHeight() {
            return this._iRuntime._GetWindowInnerHeight()
        }
        _OnWindowResize() {
            const e = this._GetWindowInnerWidth(),
                b = this._GetWindowInnerHeight();
            this._PostRuntimeEvent("window-resize", {
                innerWidth: e,
                innerHeight: b,
                devicePixelRatio: window.devicePixelRatio,
                isFullscreen: f.IsDocumentFullscreen()
            });
            this._iRuntime.IsiOSWebView() && (-1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId),
                this._OnSimulatedResize(e, b, 0))
        }
        _ScheduleSimulatedResize(e, b, h) {
            -1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId);
            this._simulatedResizeTimerId = setTimeout(() => this._OnSimulatedResize(e, b, h), 48)
        }
        _OnSimulatedResize(e, b, h) {
            const k = this._GetWindowInnerWidth(),
                l = this._GetWindowInnerHeight();
            this._simulatedResizeTimerId = -1;
            k != e || l != b ? this._PostRuntimeEvent("window-resize", {
                    innerWidth: k,
                    innerHeight: l,
                    devicePixelRatio: window.devicePixelRatio,
                    isFullscreen: f.IsDocumentFullscreen()
                }) :
                10 > h && this._ScheduleSimulatedResize(k, l, h + 1)
        }
        _OnSetTargetOrientation(e) {
            this._targetOrientation = e.targetOrientation
        }
        _TrySetTargetOrientation() {
            const e = this._targetOrientation;
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock(e).catch(b => console.warn("[Construct 3] Failed to lock orientation: ", b));
            else try {
                let b = !1;
                screen.lockOrientation ? b = screen.lockOrientation(e) : screen.webkitLockOrientation ? b = screen.webkitLockOrientation(e) : screen.mozLockOrientation ? b = screen.mozLockOrientation(e) :
                    screen.msLockOrientation && (b = screen.msLockOrientation(e));
                b || console.warn("[Construct 3] Failed to lock orientation")
            } catch (b) {
                console.warn("[Construct 3] Failed to lock orientation: ", b)
            }
        }
        _OnFullscreenChange() {
            const e = f.IsDocumentFullscreen();
            e && "any" !== this._targetOrientation && this._TrySetTargetOrientation();
            this.PostToRuntime("fullscreenchange", {
                isFullscreen: e,
                innerWidth: this._GetWindowInnerWidth(),
                innerHeight: this._GetWindowInnerHeight()
            })
        }
        _OnFullscreenError(e) {
            console.warn("[Construct 3] Fullscreen request failed: ",
                e);
            this.PostToRuntime("fullscreenerror", {
                isFullscreen: f.IsDocumentFullscreen(),
                innerWidth: this._GetWindowInnerWidth(),
                innerHeight: this._GetWindowInnerHeight()
            })
        }
        _OnVisibilityChange(e) {
            e ? this._iRuntime._CancelAnimationFrame() : this._iRuntime._RequestAnimationFrame();
            this.PostToRuntime("visibilitychange", {
                hidden: e
            })
        }
        _OnKeyEvent(e, b) {
            "Backspace" === b.key && x(b);
            const h = c.get(b.code) || b.code;
            this._PostToRuntimeMaybeSync(e, {
                code: h,
                key: b.key,
                which: b.which,
                repeat: b.repeat,
                altKey: b.altKey,
                ctrlKey: b.ctrlKey,
                metaKey: b.metaKey,
                shiftKey: b.shiftKey,
                timeStamp: b.timeStamp
            }, d)
        }
        _OnMouseWheelEvent(e, b) {
            this.PostToRuntime(e, {
                clientX: b.clientX,
                clientY: b.clientY,
                pageX: b.pageX,
                pageY: b.pageY,
                deltaX: b.deltaX,
                deltaY: b.deltaY,
                deltaZ: b.deltaZ,
                deltaMode: b.deltaMode,
                timeStamp: b.timeStamp
            }, d)
        }
        _OnMouseEvent(e, b, h) {
            a(b) || this._PostToRuntimeMaybeSync(e, {
                button: b.button,
                buttons: b.buttons,
                clientX: b.clientX,
                clientY: b.clientY,
                pageX: b.pageX,
                pageY: b.pageY,
                movementX: b.movementX || 0,
                movementY: b.movementY || 0,
                timeStamp: b.timeStamp
            }, h)
        }
        _OnMouseEventAsPointer(e,
            b) {
            if (!a(b)) {
                var h = this._mousePointerLastButtons;
                "pointerdown" === e && 0 !== h ? e = "pointermove" : "pointerup" === e && 0 !== b.buttons && (e = "pointermove");
                this._PostToRuntimeMaybeSync(e, {
                    pointerId: 1,
                    pointerType: "mouse",
                    button: b.button,
                    buttons: b.buttons,
                    lastButtons: h,
                    clientX: b.clientX,
                    clientY: b.clientY,
                    pageX: b.pageX,
                    pageY: b.pageY,
                    movementX: b.movementX || 0,
                    movementY: b.movementY || 0,
                    width: 0,
                    height: 0,
                    pressure: 0,
                    tangentialPressure: 0,
                    tiltX: 0,
                    tiltY: 0,
                    twist: 0,
                    timeStamp: b.timeStamp
                }, d);
                this._mousePointerLastButtons = b.buttons;
                this._OnMouseEvent(b.type, b, g)
            }
        }
        _OnPointerEvent(e, b) {
            this._pointerRawUpdateRateLimiter && "pointermove" !== e && this._pointerRawUpdateRateLimiter.Reset();
            var h = 0;
            "mouse" === b.pointerType && (h = this._mousePointerLastButtons);
            this._PostToRuntimeMaybeSync(e, {
                pointerId: b.pointerId,
                pointerType: b.pointerType,
                button: b.button,
                buttons: b.buttons,
                lastButtons: h,
                clientX: b.clientX,
                clientY: b.clientY,
                pageX: b.pageX,
                pageY: b.pageY,
                movementX: (b.movementX || 0) + this._pointerRawMovementX,
                movementY: (b.movementY || 0) + this._pointerRawMovementY,
                width: b.width || 0,
                height: b.height || 0,
                pressure: b.pressure || 0,
                tangentialPressure: b.tangentialPressure || 0,
                tiltX: b.tiltX || 0,
                tiltY: b.tiltY || 0,
                twist: b.twist || 0,
                timeStamp: b.timeStamp
            }, d);
            this._pointerRawMovementY = this._pointerRawMovementX = 0;
            "mouse" === b.pointerType && (h = "mousemove", "pointerdown" === e ? h = "mousedown" : "pointerup" === e && (h = "mouseup"), this._OnMouseEvent(h, b, g), this._mousePointerLastButtons = b.buttons)
        }
        _OnPointerRawUpdate(e) {
            this._lastPointerRawUpdateEvent && (this._pointerRawMovementX += this._lastPointerRawUpdateEvent.movementX ||
                0, this._pointerRawMovementY += this._lastPointerRawUpdateEvent.movementY || 0);
            this._lastPointerRawUpdateEvent = e;
            this._pointerRawUpdateRateLimiter.Call()
        }
        _DoSendPointerRawUpdate() {
            this._OnPointerEvent("pointermove", this._lastPointerRawUpdateEvent);
            this._lastPointerRawUpdateEvent = null
        }
        _OnTouchEvent(e, b) {
            for (let h = 0, k = b.changedTouches.length; h < k; ++h) {
                const l = b.changedTouches[h];
                this._PostToRuntimeMaybeSync(e, {
                    pointerId: l.identifier,
                    pointerType: "touch",
                    button: 0,
                    buttons: 0,
                    lastButtons: 0,
                    clientX: l.clientX,
                    clientY: l.clientY,
                    pageX: l.pageX,
                    pageY: l.pageY,
                    movementX: b.movementX || 0,
                    movementY: b.movementY || 0,
                    width: 2 * (l.radiusX || l.webkitRadiusX || 0),
                    height: 2 * (l.radiusY || l.webkitRadiusY || 0),
                    pressure: l.force || l.webkitForce || 0,
                    tangentialPressure: 0,
                    tiltX: 0,
                    tiltY: 0,
                    twist: l.rotationAngle || 0,
                    timeStamp: b.timeStamp
                }, d)
            }
        }
        _HandlePointerDownFocus(e) {
            window !== window.top && window.focus();
            this._IsElementCanvasOrDocument(e.target) && document.activeElement && !this._IsElementCanvasOrDocument(document.activeElement) && document.activeElement.blur()
        }
        _IsElementCanvasOrDocument(e) {
            return !e ||
                e === document || e === window || e === document.body || "canvas" === e.tagName.toLowerCase()
        }
        _AttachDeviceOrientationEvent() {
            this._attachedDeviceOrientationEvent || (this._attachedDeviceOrientationEvent = !0, window.addEventListener("deviceorientation", e => this._OnDeviceOrientation(e)), window.addEventListener("deviceorientationabsolute", e => this._OnDeviceOrientationAbsolute(e)))
        }
        _AttachDeviceMotionEvent() {
            this._attachedDeviceMotionEvent || (this._attachedDeviceMotionEvent = !0, window.addEventListener("devicemotion", e => this._OnDeviceMotion(e)))
        }
        _OnDeviceOrientation(e) {
            this.PostToRuntime("deviceorientation", {
                absolute: !!e.absolute,
                alpha: e.alpha || 0,
                beta: e.beta || 0,
                gamma: e.gamma || 0,
                timeStamp: e.timeStamp,
                webkitCompassHeading: e.webkitCompassHeading,
                webkitCompassAccuracy: e.webkitCompassAccuracy
            }, d)
        }
        _OnDeviceOrientationAbsolute(e) {
            this.PostToRuntime("deviceorientationabsolute", {
                absolute: !!e.absolute,
                alpha: e.alpha || 0,
                beta: e.beta || 0,
                gamma: e.gamma || 0,
                timeStamp: e.timeStamp
            }, d)
        }
        _OnDeviceMotion(e) {
            let b = null;
            var h = e.acceleration;
            h && (b = {
                x: h.x || 0,
                y: h.y || 0,
                z: h.z || 0
            });
            h = null;
            var k = e.accelerationIncludingGravity;
            k && (h = {
                x: k.x || 0,
                y: k.y || 0,
                z: k.z || 0
            });
            k = null;
            const l = e.rotationRate;
            l && (k = {
                alpha: l.alpha || 0,
                beta: l.beta || 0,
                gamma: l.gamma || 0
            });
            this.PostToRuntime("devicemotion", {
                acceleration: b,
                accelerationIncludingGravity: h,
                rotationRate: k,
                interval: e.interval,
                timeStamp: e.timeStamp
            }, d)
        }
        _OnUpdateCanvasSize(e) {
            const b = this.GetRuntimeInterface().GetCanvas();
            b.style.width = e.styleWidth + "px";
            b.style.height = e.styleHeight + "px";
            b.style.marginLeft = e.marginLeft + "px";
            b.style.marginTop = e.marginTop + "px";
            this._isFirstSizeUpdate && (b.style.display =
                "", this._isFirstSizeUpdate = !1)
        }
        _OnInvokeDownload(e) {
            const b = e.url;
            e = e.filename;
            const h = document.createElement("a"),
                k = document.body;
            h.textContent = e;
            h.href = b;
            h.download = e;
            k.appendChild(h);
            h.click();
            k.removeChild(h)
        }
        async _OnRasterSvgImage(e) {
            var b = e.imageBitmapOpts;
            e = await self.C3_RasterSvgImageBlob(e.blob, e.imageWidth, e.imageHeight, e.surfaceWidth, e.surfaceHeight);
            b = b ? await createImageBitmap(e, b) : await createImageBitmap(e);
            return {
                imageBitmap: b,
                transferables: [b]
            }
        }
        async _OnGetSvgImageSize(e) {
            return await self.C3_GetSvgImageSize(e.blob)
        }
        async _OnAddStylesheet(e) {
            await n(e.url)
        }
        _PlayPendingMedia() {
            var e = [...this._mediaPendingPlay];
            this._mediaPendingPlay.clear();
            if (!this._isSilent)
                for (const b of e)(e = b.play()) && e.catch(h => {
                    this._mediaRemovedPendingPlay.has(b) || this._mediaPendingPlay.add(b)
                })
        }
        TryPlayMedia(e) {
            if ("function" !== typeof e.play) throw Error("missing play function");
            this._mediaRemovedPendingPlay.delete(e);
            let b;
            try {
                b = e.play()
            } catch (h) {
                this._mediaPendingPlay.add(e);
                return
            }
            b && b.catch(h => {
                this._mediaRemovedPendingPlay.has(e) || this._mediaPendingPlay.add(e)
            })
        }
        RemovePendingPlay(e) {
            this._mediaPendingPlay.delete(e);
            this._mediaRemovedPendingPlay.add(e)
        }
        SetSilent(e) {
            this._isSilent = !!e
        }
        _OnHideCordovaSplash() {
            navigator.splashscreen && navigator.splashscreen.hide && navigator.splashscreen.hide()
        }
        _OnDebugHighlight(e) {
            if (e.show) {
                this._debugHighlightElem || (this._debugHighlightElem = document.createElement("div"), this._debugHighlightElem.id = "inspectOutline", document.body.appendChild(this._debugHighlightElem));
                var b = this._debugHighlightElem;
                b.style.display = "";
                b.style.left = e.left - 1 + "px";
                b.style.top = e.top - 1 + "px";
                b.style.width =
                    e.width + 2 + "px";
                b.style.height = e.height + 2 + "px";
                b.textContent = e.name
            } else this._debugHighlightElem && (this._debugHighlightElem.style.display = "none")
        }
        _OnRegisterSW() {
            window.C3_RegisterSW && window.C3_RegisterSW()
        }
        _OnPostToDebugger(e) {
            window.c3_postToMessagePort && (e.from = "runtime", window.c3_postToMessagePort(e))
        }
        _InvokeFunctionFromJS(e, b) {
            return this.PostToRuntimeAsync("js-invoke-function", {
                name: e,
                params: b
            })
        }
        _OnAlert(e) {
            alert(e.message)
        }
        _OnWrapperMessage(e) {
            "entered-fullscreen" === e ? (f._SetWrapperIsFullscreenFlag(!0),
                this._OnFullscreenChange()) : "exited-fullscreen" === e ? (f._SetWrapperIsFullscreenFlag(!1), this._OnFullscreenChange()) : console.warn("Unknown wrapper message: ", e)
        }
    })
}
"use strict";
self.JobSchedulerDOM = class {
    constructor(f) {
        this._runtimeInterface = f;
        this._baseUrl = f.GetBaseURL();
        "preview" === f.GetExportType() ? this._baseUrl += "workers/" : this._baseUrl += f.GetScriptFolder();
        this._maxNumWorkers = Math.min(navigator.hardwareConcurrency || 2, 16);
        this._dispatchWorker = null;
        this._jobWorkers = [];
        this._outputPort = this._inputPort = null
    }
    async Init() {
        if (this._hasInitialised) throw Error("already initialised");
        this._hasInitialised = !0;
        var f = this._runtimeInterface._GetWorkerURL("dispatchworker.js");
        this._dispatchWorker =
            await this._runtimeInterface.CreateWorker(f, this._baseUrl, {
                name: "DispatchWorker"
            });
        f = new MessageChannel;
        this._inputPort = f.port1;
        this._dispatchWorker.postMessage({
            type: "_init",
            "in-port": f.port2
        }, [f.port2]);
        this._outputPort = await this._CreateJobWorker()
    }
    async _CreateJobWorker() {
        const f = this._jobWorkers.length;
        var a = this._runtimeInterface._GetWorkerURL("jobworker.js");
        a = await this._runtimeInterface.CreateWorker(a, this._baseUrl, {
            name: "JobWorker" + f
        });
        const c = new MessageChannel,
            d = new MessageChannel;
        this._dispatchWorker.postMessage({
            type: "_addJobWorker",
            port: c.port1
        }, [c.port1]);
        a.postMessage({
            type: "init",
            number: f,
            "dispatch-port": c.port2,
            "output-port": d.port2
        }, [c.port2, d.port2]);
        this._jobWorkers.push(a);
        return d.port1
    }
    GetPortData() {
        return {
            inputPort: this._inputPort,
            outputPort: this._outputPort,
            maxNumWorkers: this._maxNumWorkers
        }
    }
    GetPortTransferables() {
        return [this._inputPort, this._outputPort]
    }
};
"use strict";
window.C3_IsSupported && (window.c3_runtimeInterface = new self.RuntimeInterface({
    useWorker: !0,
    workerMainUrl: "workermain.js",
    engineScripts: ["scripts/c3runtime.js"],
    projectScripts: [],
    mainProjectScript: "",
    scriptFolder: "scripts/",
    workerDependencyScripts: ["xmldom.js", "xpath.js"],
    exportType: "html5"
}));
"use strict";
self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
    constructor(f) {
        super(f, "touch");
        this.AddRuntimeMessageHandler("request-permission", a => this._OnRequestPermission(a))
    }
    async _OnRequestPermission(f) {
        f = f.type;
        let a = !0;
        0 === f ? a = await this._RequestOrientationPermission() : 1 === f && (a = await this._RequestMotionPermission());
        this.PostToRuntime("permission-result", {
            type: f,
            result: a
        })
    }
    async _RequestOrientationPermission() {
        if (!self.DeviceOrientationEvent || !self.DeviceOrientationEvent.requestPermission) return !0;
        try {
            return "granted" === await self.DeviceOrientationEvent.requestPermission()
        } catch (f) {
            return console.warn("[Touch] Failed to request orientation permission: ", f), !1
        }
    }
    async _RequestMotionPermission() {
        if (!self.DeviceMotionEvent || !self.DeviceMotionEvent.requestPermission) return !0;
        try {
            return "granted" === await self.DeviceMotionEvent.requestPermission()
        } catch (f) {
            return console.warn("[Touch] Failed to request motion permission: ", f), !1
        }
    }
});
"use strict"; {
    const f = 180 / Math.PI;
    self.AudioDOMHandler = class extends self.DOMHandler {
        constructor(a) {
            super(a, "audio");
            this._destinationNode = this._audioContext = null;
            this._hasAttachedUnblockEvents = this._hasUnblocked = !1;
            this._unblockFunc = () => this._UnblockAudioContext();
            this._audioBuffers = [];
            this._audioInstances = [];
            this._lastAudioInstance = null;
            this._lastPlayedTag = "";
            this._lastTickCount = -1;
            this._pendingTags = new Map;
            this._masterVolume = 1;
            this._isSilent = !1;
            this._timeScaleMode = 0;
            this._timeScale = 1;
            this._gameTime = 0;
            this._panningModel =
                "HRTF";
            this._distanceModel = "inverse";
            this._refDistance = 600;
            this._maxDistance = 1E4;
            this._rolloffFactor = 1;
            this._hasAnySoftwareDecodedMusic = this._playMusicAsSound = !1;
            this._supportsWebMOpus = this._iRuntime.IsAudioFormatSupported("audio/webm; codecs=opus");
            this._effects = new Map;
            this._analysers = new Set;
            this._isPendingPostFxState = !1;
            this._microphoneTag = "";
            this._microphoneSource = null;
            self.C3Audio_OnMicrophoneStream = (c, d) => this._OnMicrophoneStream(c, d);
            this._destMediaStreamNode = null;
            self.C3Audio_GetOutputStream =
                () => this._OnGetOutputStream();
            self.C3Audio_DOMInterface = this;
            this.AddRuntimeMessageHandlers([
                ["create-audio-context", c => this._CreateAudioContext(c)],
                ["play", c => this._Play(c)],
                ["stop", c => this._Stop(c)],
                ["stop-all", () => this._StopAll()],
                ["set-paused", c => this._SetPaused(c)],
                ["set-volume", c => this._SetVolume(c)],
                ["fade-volume", c => this._FadeVolume(c)],
                ["set-master-volume", c => this._SetMasterVolume(c)],
                ["set-muted", c => this._SetMuted(c)],
                ["set-silent", c => this._SetSilent(c)],
                ["set-looping", c => this._SetLooping(c)],
                ["set-playback-rate", c => this._SetPlaybackRate(c)],
                ["seek", c => this._Seek(c)],
                ["preload", c => this._Preload(c)],
                ["unload", c => this._Unload(c)],
                ["unload-all", () => this._UnloadAll()],
                ["set-suspended", c => this._SetSuspended(c)],
                ["add-effect", c => this._AddEffect(c)],
                ["set-effect-param", c => this._SetEffectParam(c)],
                ["remove-effects", c => this._RemoveEffects(c)],
                ["tick", c => this._OnTick(c)],
                ["load-state", c => this._OnLoadState(c)]
            ])
        }
        async _CreateAudioContext(a) {
            a.isiOSCordova && (this._playMusicAsSound = !0);
            this._timeScaleMode =
                a.timeScaleMode;
            this._panningModel = ["equalpower", "HRTF", "soundfield"][a.panningModel];
            this._distanceModel = ["linear", "inverse", "exponential"][a.distanceModel];
            this._refDistance = a.refDistance;
            this._maxDistance = a.maxDistance;
            this._rolloffFactor = a.rolloffFactor;
            var c = {
                latencyHint: a.latencyHint
            };
            this.SupportsWebMOpus() || (c.sampleRate = 48E3);
            if ("undefined" !== typeof AudioContext) this._audioContext = new AudioContext(c);
            else if ("undefined" !== typeof webkitAudioContext) this._audioContext = new webkitAudioContext(c);
            else throw Error("Web Audio API not supported");
            this._AttachUnblockEvents();
            this._audioContext.onstatechange = () => {
                "running" !== this._audioContext.state && this._AttachUnblockEvents()
            };
            this._destinationNode = this._audioContext.createGain();
            this._destinationNode.connect(this._audioContext.destination);
            c = a.listenerPos;
            this._audioContext.listener.setPosition(c[0], c[1], c[2]);
            this._audioContext.listener.setOrientation(0, 0, 1, 0, -1, 0);
            self.C3_GetAudioContextCurrentTime = () => this.GetAudioCurrentTime();
            try {
                await Promise.all(a.preloadList.map(d =>
                    this._GetAudioBuffer(d.originalUrl, d.url, d.type, !1)))
            } catch (d) {
                console.error("[Construct 3] Preloading sounds failed: ", d)
            }
            return {
                sampleRate: this._audioContext.sampleRate
            }
        }
        _AttachUnblockEvents() {
            this._hasAttachedUnblockEvents || (this._hasUnblocked = !1, window.addEventListener("pointerup", this._unblockFunc, !0), window.addEventListener("touchend", this._unblockFunc, !0), window.addEventListener("click", this._unblockFunc, !0), window.addEventListener("keydown", this._unblockFunc, !0), this._hasAttachedUnblockEvents = !0)
        }
        _DetachUnblockEvents() {
            this._hasAttachedUnblockEvents && (this._hasUnblocked = !0, window.removeEventListener("pointerup", this._unblockFunc, !0), window.removeEventListener("touchend", this._unblockFunc, !0), window.removeEventListener("click", this._unblockFunc, !0), window.removeEventListener("keydown", this._unblockFunc, !0), this._hasAttachedUnblockEvents = !1)
        }
        _UnblockAudioContext() {
            if (!this._hasUnblocked) {
                var a = this._audioContext;
                "suspended" === a.state && a.resume && a.resume();
                var c = a.createBuffer(1, 220, 22050),
                    d = a.createBufferSource();
                d.buffer = c;
                d.connect(a.destination);
                d.start(0);
                "running" === a.state && this._DetachUnblockEvents()
            }
        }
        GetAudioContext() {
            return this._audioContext
        }
        GetAudioCurrentTime() {
            return this._audioContext.currentTime
        }
        GetDestinationNode() {
            return this._destinationNode
        }
        GetDestinationForTag(a) {
            return (a = this._effects.get(a.toLowerCase())) ? a[0].GetInputNode() : this.GetDestinationNode()
        }
        AddEffectForTag(a, c) {
            a = a.toLowerCase();
            let d = this._effects.get(a);
            d || (d = [], this._effects.set(a, d));
            c._SetIndex(d.length);
            c._SetTag(a);
            d.push(c);
            this._ReconnectEffects(a)
        }
        _ReconnectEffects(a) {
            let c = this.GetDestinationNode();
            const d = this._effects.get(a);
            if (d && d.length) {
                c = d[0].GetInputNode();
                for (let g = 0, m = d.length; g < m; ++g) {
                    const n = d[g];
                    g + 1 === m ? n.ConnectTo(this.GetDestinationNode()) : n.ConnectTo(d[g + 1].GetInputNode())
                }
            }
            for (const g of this.audioInstancesByTag(a)) g.Reconnect(c);
            this._microphoneSource && this._microphoneTag === a && (this._microphoneSource.disconnect(), this._microphoneSource.connect(c))
        }
        GetMasterVolume() {
            return this._masterVolume
        }
        IsSilent() {
            return this._isSilent
        }
        GetTimeScaleMode() {
            return this._timeScaleMode
        }
        GetTimeScale() {
            return this._timeScale
        }
        GetGameTime() {
            return this._gameTime
        }
        IsPlayMusicAsSound() {
            return this._playMusicAsSound
        }
        SupportsWebMOpus() {
            return this._supportsWebMOpus
        }
        _SetHasAnySoftwareDecodedMusic() {
            this._hasAnySoftwareDecodedMusic = !0
        }
        GetPanningModel() {
            return this._panningModel
        }
        GetDistanceModel() {
            return this._distanceModel
        }
        GetReferenceDistance() {
            return this._refDistance
        }
        GetMaxDistance() {
            return this._maxDistance
        }
        GetRolloffFactor() {
            return this._rolloffFactor
        }
        DecodeAudioData(a, c) {
            return c ? this._iRuntime._WasmDecodeWebMOpus(a).then(d => {
                const g = this._audioContext.createBuffer(1, d.length, 48E3);
                g.getChannelData(0).set(d);
                return g
            }) : new Promise((d, g) => {
                this._audioContext.decodeAudioData(a, d, g)
            })
        }
        TryPlayMedia(a) {
            this._iRuntime.TryPlayMedia(a)
        }
        RemovePendingPlay(a) {
            this._iRuntime.RemovePendingPlay(a)
        }
        ReleaseInstancesForBuffer(a) {
            let c =
                0;
            for (let d = 0, g = this._audioInstances.length; d < g; ++d) {
                const m = this._audioInstances[d];
                this._audioInstances[c] = m;
                m.GetBuffer() === a ? m.Release() : ++c
            }
            this._audioInstances.length = c
        }
        ReleaseAllMusicBuffers() {
            let a = 0;
            for (let c = 0, d = this._audioBuffers.length; c < d; ++c) {
                const g = this._audioBuffers[c];
                this._audioBuffers[a] = g;
                g.IsMusic() ? g.Release() : ++a
            }
            this._audioBuffers.length = a
        }* audioInstancesByTag(a) {
            if (a)
                for (const c of this._audioInstances) self.AudioDOMHandler.EqualsNoCase(c.GetTag(), a) && (yield c);
            else this._lastAudioInstance &&
                !this._lastAudioInstance.HasEnded() && (yield this._lastAudioInstance)
        }
        async _GetAudioBuffer(a, c, d, g, m) {
            for (const n of this._audioBuffers)
                if (n.GetUrl() === c) return await n.Load(), n;
            if (m) return null;
            g && (this._playMusicAsSound || this._hasAnySoftwareDecodedMusic) && this.ReleaseAllMusicBuffers();
            a = self.C3AudioBuffer.Create(this, a, c, d, g);
            this._audioBuffers.push(a);
            await a.Load();
            return a
        }
        async _GetAudioInstance(a, c, d, g, m) {
            for (const n of this._audioInstances)
                if (n.GetUrl() === c && (n.CanBeRecycled() || m)) return n.SetTag(g),
                    n;
            a = (await this._GetAudioBuffer(a, c, d, m)).CreateInstance(g);
            this._audioInstances.push(a);
            return a
        }
        _AddPendingTag(a) {
            let c = this._pendingTags.get(a);
            if (!c) {
                let d = null;
                c = {
                    pendingCount: 0,
                    promise: new Promise(g => d = g),
                    resolve: d
                };
                this._pendingTags.set(a, c)
            }
            c.pendingCount++
        }
        _RemovePendingTag(a) {
            const c = this._pendingTags.get(a);
            if (!c) throw Error("expected pending tag");
            c.pendingCount--;
            0 === c.pendingCount && (c.resolve(), this._pendingTags.delete(a))
        }
        TagReady(a) {
            a || (a = this._lastPlayedTag);
            return (a = this._pendingTags.get(a)) ?
                a.promise : Promise.resolve()
        }
        _MaybeStartTicking() {
            if (0 < this._analysers.size) this._StartTicking();
            else
                for (const a of this._audioInstances)
                    if (a.IsActive()) {
                        this._StartTicking();
                        break
                    }
        }
        Tick() {
            for (var a of this._analysers) a.Tick();
            a = this.GetAudioCurrentTime();
            for (var c of this._audioInstances) c.Tick(a);
            c = this._audioInstances.filter(d => d.IsActive()).map(d => d.GetState());
            this.PostToRuntime("state", {
                tickCount: this._lastTickCount,
                audioInstances: c,
                analysers: [...this._analysers].map(d => d.GetData())
            });
            0 === c.length &&
                0 === this._analysers.size && this._StopTicking()
        }
        PostTrigger(a, c, d) {
            this.PostToRuntime("trigger", {
                type: a,
                tag: c,
                aiid: d
            })
        }
        async _Play(a) {
            const c = a.originalUrl,
                d = a.url,
                g = a.type,
                m = a.isMusic,
                n = a.tag,
                v = a.isLooping,
                y = a.vol,
                z = a.pos,
                t = a.panning;
            let u = a.off;
            0 < u && !a.trueClock && (this._audioContext.getOutputTimestamp ? (a = this._audioContext.getOutputTimestamp(), u = u - a.performanceTime / 1E3 + a.contextTime) : u = u - performance.now() / 1E3 + this._audioContext.currentTime);
            this._lastPlayedTag = n;
            this._AddPendingTag(n);
            try {
                this._lastAudioInstance =
                    await this._GetAudioInstance(c, d, g, n, m), t ? (this._lastAudioInstance.SetPannerEnabled(!0), this._lastAudioInstance.SetPan(t.x, t.y, t.angle, t.innerAngle, t.outerAngle, t.outerGain), t.hasOwnProperty("uid") && this._lastAudioInstance.SetUID(t.uid)) : this._lastAudioInstance.SetPannerEnabled(!1), this._lastAudioInstance.Play(v, y, z, u)
            } catch (A) {
                console.error("[Construct 3] Audio: error starting playback: ", A);
                return
            } finally {
                this._RemovePendingTag(n)
            }
            this._StartTicking()
        }
        _Stop(a) {
            a = a.tag;
            for (const c of this.audioInstancesByTag(a)) c.Stop()
        }
        _StopAll() {
            for (const a of this._audioInstances) a.Stop()
        }
        _SetPaused(a) {
            const c =
                a.tag;
            a = a.paused;
            for (const d of this.audioInstancesByTag(c)) a ? d.Pause() : d.Resume();
            this._MaybeStartTicking()
        }
        _SetVolume(a) {
            const c = a.tag;
            a = a.vol;
            for (const d of this.audioInstancesByTag(c)) d.SetVolume(a)
        }
        async _FadeVolume(a) {
            const c = a.tag,
                d = a.vol,
                g = a.duration;
            a = a.stopOnEnd;
            await this.TagReady(c);
            for (const m of this.audioInstancesByTag(c)) m.FadeVolume(d, g, a);
            this._MaybeStartTicking()
        }
        _SetMasterVolume(a) {
            this._masterVolume = a.vol;
            for (const c of this._audioInstances) c._UpdateVolume()
        }
        _SetMuted(a) {
            const c =
                a.tag;
            a = a.isMuted;
            for (const d of this.audioInstancesByTag(c)) d.SetMuted(a)
        }
        _SetSilent(a) {
            this._isSilent = a.isSilent;
            this._iRuntime.SetSilent(this._isSilent);
            for (const c of this._audioInstances) c._UpdateMuted()
        }
        _SetLooping(a) {
            const c = a.tag;
            a = a.isLooping;
            for (const d of this.audioInstancesByTag(c)) d.SetLooping(a)
        }
        async _SetPlaybackRate(a) {
            const c = a.tag;
            a = a.rate;
            await this.TagReady(c);
            for (const d of this.audioInstancesByTag(c)) d.SetPlaybackRate(a)
        }
        async _Seek(a) {
            const c = a.tag;
            a = a.pos;
            await this.TagReady(c);
            for (const d of this.audioInstancesByTag(c)) d.Seek(a)
        }
        async _Preload(a) {
            const c = a.originalUrl,
                d = a.url,
                g = a.type;
            a = a.isMusic;
            try {
                await this._GetAudioInstance(c, d, g, "", a)
            } catch (m) {
                console.error("[Construct 3] Audio: error preloading: ", m)
            }
        }
        async _Unload(a) {
            if (a = await this._GetAudioBuffer("", a.url, a.type, a.isMusic, !0)) a.Release(), a = this._audioBuffers.indexOf(a), -1 !== a && this._audioBuffers.splice(a, 1)
        }
        _UnloadAll() {
            for (const a of this._audioBuffers) a.Release();
            this._audioBuffers.length = 0
        }
        _SetSuspended(a) {
            a =
                a.isSuspended;
            !a && this._audioContext.resume && this._audioContext.resume();
            for (const c of this._audioInstances) c.SetSuspended(a);
            a && this._audioContext.suspend && this._audioContext.suspend()
        }
        _OnTick(a) {
            this._timeScale = a.timeScale;
            this._gameTime = a.gameTime;
            this._lastTickCount = a.tickCount;
            if (0 !== this._timeScaleMode)
                for (var c of this._audioInstances) c._UpdatePlaybackRate();
            (c = a.listenerPos) && this._audioContext.listener.setPosition(c[0], c[1], c[2]);
            for (const d of a.instPans) {
                a = d.uid;
                for (const g of this._audioInstances) g.GetUID() ===
                    a && g.SetPanXYA(d.x, d.y, d.angle)
            }
        }
        async _AddEffect(a) {
            var c = a.type;
            const d = a.tag;
            var g = a.params;
            if ("filter" === c) g = new self.C3AudioFilterFX(this, ...g);
            else if ("delay" === c) g = new self.C3AudioDelayFX(this, ...g);
            else if ("convolution" === c) {
                c = null;
                try {
                    c = await this._GetAudioBuffer(a.bufferOriginalUrl, a.bufferUrl, a.bufferType, !1)
                } catch (m) {
                    console.log("[Construct 3] Audio: error loading convolution: ", m);
                    return
                }
                g = new self.C3AudioConvolveFX(this, c.GetAudioBuffer(), ...g);
                g._SetBufferInfo(a.bufferOriginalUrl, a.bufferUrl,
                    a.bufferType)
            } else if ("flanger" === c) g = new self.C3AudioFlangerFX(this, ...g);
            else if ("phaser" === c) g = new self.C3AudioPhaserFX(this, ...g);
            else if ("gain" === c) g = new self.C3AudioGainFX(this, ...g);
            else if ("tremolo" === c) g = new self.C3AudioTremoloFX(this, ...g);
            else if ("ringmod" === c) g = new self.C3AudioRingModFX(this, ...g);
            else if ("distortion" === c) g = new self.C3AudioDistortionFX(this, ...g);
            else if ("compressor" === c) g = new self.C3AudioCompressorFX(this, ...g);
            else if ("analyser" === c) g = new self.C3AudioAnalyserFX(this,
                ...g);
            else throw Error("invalid effect type");
            this.AddEffectForTag(d, g);
            this._PostUpdatedFxState()
        }
        _SetEffectParam(a) {
            const c = a.index,
                d = a.param,
                g = a.value,
                m = a.ramp,
                n = a.time;
            a = this._effects.get(a.tag);
            !a || 0 > c || c >= a.length || (a[c].SetParam(d, g, m, n), this._PostUpdatedFxState())
        }
        _RemoveEffects(a) {
            a = a.tag.toLowerCase();
            const c = this._effects.get(a);
            if (c && c.length) {
                for (const d of c) d.Release();
                this._effects.delete(a);
                this._ReconnectEffects(a)
            }
        }
        _AddAnalyser(a) {
            this._analysers.add(a);
            this._MaybeStartTicking()
        }
        _RemoveAnalyser(a) {
            this._analysers.delete(a)
        }
        _PostUpdatedFxState() {
            this._isPendingPostFxState ||
                (this._isPendingPostFxState = !0, Promise.resolve().then(() => this._DoPostUpdatedFxState()))
        }
        _DoPostUpdatedFxState() {
            const a = {};
            for (const [c, d] of this._effects) a[c] = d.map(g => g.GetState());
            this.PostToRuntime("fxstate", {
                fxstate: a
            });
            this._isPendingPostFxState = !1
        }
        async _OnLoadState(a) {
            const c = a.saveLoadMode;
            if (3 !== c)
                for (var d of this._audioInstances) d.IsMusic() && 1 === c || (d.IsMusic() || 2 !== c) && d.Stop();
            for (const g of this._effects.values())
                for (const m of g) m.Release();
            this._effects.clear();
            this._timeScale = a.timeScale;
            this._gameTime = a.gameTime;
            d = a.listenerPos;
            this._audioContext.listener.setPosition(d[0], d[1], d[2]);
            this._isSilent = a.isSilent;
            this._iRuntime.SetSilent(this._isSilent);
            this._masterVolume = a.masterVolume;
            d = [];
            for (const g of Object.values(a.effects)) d.push(Promise.all(g.map(m => this._AddEffect(m))));
            await Promise.all(d);
            await Promise.all(a.playing.map(g => this._LoadAudioInstance(g, c)));
            this._MaybeStartTicking()
        }
        async _LoadAudioInstance(a, c) {
            if (3 !== c) {
                var d = a.bufferOriginalUrl,
                    g = a.bufferUrl,
                    m = a.bufferType,
                    n = a.isMusic,
                    v = a.tag,
                    y = a.isLooping,
                    z = a.volume,
                    t = a.playbackTime;
                if (!n || 1 !== c)
                    if (n || 2 !== c) {
                        c = null;
                        try {
                            c = await this._GetAudioInstance(d, g, m, v, n)
                        } catch (u) {
                            console.error("[Construct 3] Audio: error loading audio state: ", u);
                            return
                        }
                        c.LoadPanState(a.pan);
                        c.Play(y, z, t, 0);
                        a.isPlaying || c.Pause();
                        c._LoadAdditionalState(a)
                    }
            }
        }
        _OnMicrophoneStream(a, c) {
            this._microphoneSource && this._microphoneSource.disconnect();
            this._microphoneTag = c.toLowerCase();
            this._microphoneSource = this._audioContext.createMediaStreamSource(a);
            this._microphoneSource.connect(this.GetDestinationForTag(this._microphoneTag))
        }
        _OnGetOutputStream() {
            this._destMediaStreamNode || (this._destMediaStreamNode = this._audioContext.createMediaStreamDestination(), this._destinationNode.connect(this._destMediaStreamNode));
            return this._destMediaStreamNode.stream
        }
        static EqualsNoCase(a, c) {
            return a.length !== c.length ? !1 : a === c ? !0 : a.toLowerCase() === c.toLowerCase()
        }
        static ToDegrees(a) {
            return a * f
        }
        static DbToLinearNoCap(a) {
            return Math.pow(10, a / 20)
        }
        static DbToLinear(a) {
            return Math.max(Math.min(self.AudioDOMHandler.DbToLinearNoCap(a),
                1), 0)
        }
        static LinearToDbNoCap(a) {
            return Math.log(a) / Math.log(10) * 20
        }
        static LinearToDb(a) {
            return self.AudioDOMHandler.LinearToDbNoCap(Math.max(Math.min(a, 1), 0))
        }
        static e4(a, c) {
            return 1 - Math.exp(-c * a)
        }
    };
    self.RuntimeInterface.AddDOMHandlerClass(self.AudioDOMHandler)
}
"use strict";
self.C3AudioBuffer = class {
    constructor(f, a, c, d, g) {
        this._audioDomHandler = f;
        this._originalUrl = a;
        this._url = c;
        this._type = d;
        this._isMusic = g;
        this._api = "";
        this._loadState = "not-loaded";
        this._loadPromise = null
    }
    Release() {
        this._loadState = "not-loaded";
        this._loadPromise = this._audioDomHandler = null
    }
    static Create(f, a, c, d, g) {
        const m = "audio/webm; codecs=opus" === d && !f.SupportsWebMOpus();
        g && m && f._SetHasAnySoftwareDecodedMusic();
        return !g || f.IsPlayMusicAsSound() || m ? new self.C3WebAudioBuffer(f, a, c, d, g, m) : new self.C3Html5AudioBuffer(f,
            a, c, d, g)
    }
    CreateInstance(f) {
        return "html5" === this._api ? new self.C3Html5AudioInstance(this._audioDomHandler, this, f) : new self.C3WebAudioInstance(this._audioDomHandler, this, f)
    }
    _Load() {}
    Load() {
        this._loadPromise || (this._loadPromise = this._Load());
        return this._loadPromise
    }
    IsLoaded() {}
    IsLoadedAndDecoded() {}
    HasFailedToLoad() {
        return "failed" === this._loadState
    }
    GetAudioContext() {
        return this._audioDomHandler.GetAudioContext()
    }
    GetApi() {
        return this._api
    }
    GetOriginalUrl() {
        return this._originalUrl
    }
    GetUrl() {
        return this._url
    }
    GetContentType() {
        return this._type
    }
    IsMusic() {
        return this._isMusic
    }
    GetDuration() {}
};
"use strict";
self.C3Html5AudioBuffer = class extends self.C3AudioBuffer {
    constructor(f, a, c, d, g) {
        super(f, a, c, d, g);
        this._api = "html5";
        this._audioElem = new Audio;
        this._audioElem.crossOrigin = "anonymous";
        this._audioElem.autoplay = !1;
        this._audioElem.preload = "auto";
        this._loadReject = this._loadResolve = null;
        this._reachedCanPlayThrough = !1;
        this._audioElem.addEventListener("canplaythrough", () => this._reachedCanPlayThrough = !0);
        this._outNode = this.GetAudioContext().createGain();
        this._mediaSourceNode = null;
        this._audioElem.addEventListener("canplay", () => {
            this._loadResolve && (this._loadState = "loaded", this._loadResolve(), this._loadReject = this._loadResolve = null);
            !this._mediaSourceNode && this._audioElem && (this._mediaSourceNode = this.GetAudioContext().createMediaElementSource(this._audioElem), this._mediaSourceNode.connect(this._outNode))
        });
        this.onended = null;
        this._audioElem.addEventListener("ended", () => {
            if (this.onended) this.onended()
        });
        this._audioElem.addEventListener("error", m => this._OnError(m))
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this);
        this._outNode.disconnect();
        this._outNode = null;
        this._mediaSourceNode.disconnect();
        this._mediaSourceNode = null;
        this._audioElem && !this._audioElem.paused && this._audioElem.pause();
        this._audioElem = this.onended = null;
        super.Release()
    }
    _Load() {
        this._loadState = "loading";
        return new Promise((f, a) => {
            this._loadResolve = f;
            this._loadReject = a;
            this._audioElem.src = this._url
        })
    }
    _OnError(f) {
        console.error(`[Construct 3] Audio '${this._url}' error: `, f);
        this._loadReject && (this._loadState = "failed", this._loadReject(f), this._loadReject =
            this._loadResolve = null)
    }
    IsLoaded() {
        const f = 4 <= this._audioElem.readyState;
        f && (this._reachedCanPlayThrough = !0);
        return f || this._reachedCanPlayThrough
    }
    IsLoadedAndDecoded() {
        return this.IsLoaded()
    }
    GetAudioElement() {
        return this._audioElem
    }
    GetOutputNode() {
        return this._outNode
    }
    GetDuration() {
        return this._audioElem.duration
    }
};
"use strict";
self.C3WebAudioBuffer = class extends self.C3AudioBuffer {
    constructor(f, a, c, d, g, m) {
        super(f, a, c, d, g);
        this._api = "webaudio";
        this._audioBuffer = this._audioData = null;
        this._needsSoftwareDecode = !!m
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this);
        this._audioBuffer = this._audioData = null;
        super.Release()
    }
    async _Fetch() {
        if (this._audioData) return this._audioData;
        var f = this._audioDomHandler.GetRuntimeInterface();
        if ("cordova" === f.GetExportType() && f.IsRelativeURL(this._url) && f.IsFileProtocol()) this._audioData =
            await f.CordovaFetchLocalFileAsArrayBuffer(this._url);
        else {
            f = await fetch(this._url);
            if (!f.ok) throw Error(`error fetching audio data: ${f.status} ${f.statusText}`);
            this._audioData = await f.arrayBuffer()
        }
    }
    async _Decode() {
        if (this._audioBuffer) return this._audioBuffer;
        this._audioBuffer = await this._audioDomHandler.DecodeAudioData(this._audioData, this._needsSoftwareDecode);
        this._audioData = null
    }
    async _Load() {
        try {
            this._loadState = "loading", await this._Fetch(), await this._Decode(), this._loadState = "loaded"
        } catch (f) {
            this._loadState =
                "failed", console.error(`[Construct 3] Failed to load audio '${this._url}': `, f)
        }
    }
    IsLoaded() {
        return !(!this._audioData && !this._audioBuffer)
    }
    IsLoadedAndDecoded() {
        return !!this._audioBuffer
    }
    GetAudioBuffer() {
        return this._audioBuffer
    }
    GetDuration() {
        return this._audioBuffer ? this._audioBuffer.duration : 0
    }
};
"use strict"; {
    let f = 0;
    self.C3AudioInstance = class {
        constructor(a, c, d) {
            this._audioDomHandler = a;
            this._buffer = c;
            this._tag = d;
            this._aiId = f++;
            this._gainNode = this.GetAudioContext().createGain();
            this._gainNode.connect(this.GetDestinationNode());
            this._pannerNode = null;
            this._isPannerEnabled = !1;
            this._pannerPosition = [0, 0, 0];
            this._pannerOrientation = [0, 0, 0];
            this._isStopped = !0;
            this._isLooping = this._resumeMe = this._isPaused = !1;
            this._volume = 1;
            this._isMuted = !1;
            this._playbackRate = 1;
            a = this._audioDomHandler.GetTimeScaleMode();
            this._isTimescaled =
                1 === a && !this.IsMusic() || 2 === a;
            this._fadeEndTime = this._instUid = -1;
            this._stopOnFadeEnd = !1
        }
        Release() {
            this._buffer = this._audioDomHandler = null;
            this._pannerNode && (this._pannerNode.disconnect(), this._pannerNode = null);
            this._gainNode.disconnect();
            this._gainNode = null
        }
        GetAudioContext() {
            return this._audioDomHandler.GetAudioContext()
        }
        GetDestinationNode() {
            return this._audioDomHandler.GetDestinationForTag(this._tag)
        }
        GetMasterVolume() {
            return this._audioDomHandler.GetMasterVolume()
        }
        GetCurrentTime() {
            return this._isTimescaled ?
                this._audioDomHandler.GetGameTime() : performance.now() / 1E3
        }
        GetOriginalUrl() {
            return this._buffer.GetOriginalUrl()
        }
        GetUrl() {
            return this._buffer.GetUrl()
        }
        GetContentType() {
            return this._buffer.GetContentType()
        }
        GetBuffer() {
            return this._buffer
        }
        IsMusic() {
            return this._buffer.IsMusic()
        }
        SetTag(a) {
            this._tag = a
        }
        GetTag() {
            return this._tag
        }
        GetAiId() {
            return this._aiId
        }
        HasEnded() {}
        CanBeRecycled() {}
        IsPlaying() {
            return !this._isStopped && !this._isPaused && !this.HasEnded()
        }
        IsActive() {
            return !this._isStopped && !this.HasEnded()
        }
        GetPlaybackTime() {}
        GetDuration(a) {
            let c =
                this._buffer.GetDuration();
            a && (c /= this._playbackRate || .001);
            return c
        }
        Play(a, c, d, g) {}
        Stop() {}
        Pause() {}
        IsPaused() {
            return this._isPaused
        }
        Resume() {}
        SetVolume(a) {
            this._volume = a;
            this._gainNode.gain.cancelScheduledValues(0);
            this._fadeEndTime = -1;
            this._gainNode.gain.value = this.GetOverallVolume()
        }
        FadeVolume(a, c, d) {
            if (!this.IsMuted()) {
                a *= this.GetMasterVolume();
                var g = this._gainNode.gain;
                g.cancelScheduledValues(0);
                var m = this._audioDomHandler.GetAudioCurrentTime();
                c = m + c;
                g.setValueAtTime(g.value, m);
                g.linearRampToValueAtTime(a,
                    c);
                this._volume = a;
                this._fadeEndTime = c;
                this._stopOnFadeEnd = d
            }
        }
        _UpdateVolume() {
            this.SetVolume(this._volume)
        }
        Tick(a) {
            -1 !== this._fadeEndTime && a >= this._fadeEndTime && (this._fadeEndTime = -1, this._stopOnFadeEnd && this.Stop(), this._audioDomHandler.PostTrigger("fade-ended", this._tag, this._aiId))
        }
        GetOverallVolume() {
            const a = this._volume * this.GetMasterVolume();
            return isFinite(a) ? a : 0
        }
        SetMuted(a) {
            a = !!a;
            this._isMuted !== a && (this._isMuted = a, this._UpdateMuted())
        }
        IsMuted() {
            return this._isMuted
        }
        IsSilent() {
            return this._audioDomHandler.IsSilent()
        }
        _UpdateMuted() {}
        SetLooping(a) {}
        IsLooping() {
            return this._isLooping
        }
        SetPlaybackRate(a) {
            this._playbackRate !==
                a && (this._playbackRate = a, this._UpdatePlaybackRate())
        }
        _UpdatePlaybackRate() {}
        GetPlaybackRate() {
            return this._playbackRate
        }
        Seek(a) {}
        SetSuspended(a) {}
        SetPannerEnabled(a) {
            a = !!a;
            this._isPannerEnabled !== a && ((this._isPannerEnabled = a) ? (this._pannerNode || (this._pannerNode = this.GetAudioContext().createPanner(), this._pannerNode.panningModel = this._audioDomHandler.GetPanningModel(), this._pannerNode.distanceModel = this._audioDomHandler.GetDistanceModel(), this._pannerNode.refDistance = this._audioDomHandler.GetReferenceDistance(),
                this._pannerNode.maxDistance = this._audioDomHandler.GetMaxDistance(), this._pannerNode.rolloffFactor = this._audioDomHandler.GetRolloffFactor()), this._gainNode.disconnect(), this._gainNode.connect(this._pannerNode), this._pannerNode.connect(this.GetDestinationNode())) : (this._pannerNode.disconnect(), this._gainNode.disconnect(), this._gainNode.connect(this.GetDestinationNode())))
        }
        SetPan(a, c, d, g, m, n) {
            this._isPannerEnabled && (this.SetPanXYA(a, c, d), a = self.AudioDOMHandler.ToDegrees, this._pannerNode.coneInnerAngle =
                a(g), this._pannerNode.coneOuterAngle = a(m), this._pannerNode.coneOuterGain = n)
        }
        SetPanXYA(a, c, d) {
            this._isPannerEnabled && (this._pannerPosition[0] = a, this._pannerPosition[1] = c, this._pannerPosition[2] = 0, this._pannerOrientation[0] = Math.cos(d), this._pannerOrientation[1] = Math.sin(d), this._pannerOrientation[2] = 0, this._pannerNode.setPosition(...this._pannerPosition), this._pannerNode.setOrientation(...this._pannerOrientation))
        }
        SetUID(a) {
            this._instUid = a
        }
        GetUID() {
            return this._instUid
        }
        GetResumePosition() {}
        Reconnect(a) {
            const c =
                this._pannerNode || this._gainNode;
            c.disconnect();
            c.connect(a)
        }
        GetState() {
            return {
                aiid: this.GetAiId(),
                tag: this._tag,
                duration: this.GetDuration(),
                volume: this._volume,
                isPlaying: this.IsPlaying(),
                playbackTime: this.GetPlaybackTime(),
                playbackRate: this.GetPlaybackRate(),
                uid: this._instUid,
                bufferOriginalUrl: this.GetOriginalUrl(),
                bufferUrl: "",
                bufferType: this.GetContentType(),
                isMusic: this.IsMusic(),
                isLooping: this.IsLooping(),
                isMuted: this.IsMuted(),
                resumePosition: this.GetResumePosition(),
                pan: this.GetPanState()
            }
        }
        _LoadAdditionalState(a) {
            this.SetPlaybackRate(a.playbackRate);
            this.SetMuted(a.isMuted)
        }
        GetPanState() {
            if (!this._pannerNode) return null;
            const a = this._pannerNode;
            return {
                pos: this._pannerPosition,
                orient: this._pannerOrientation,
                cia: a.coneInnerAngle,
                coa: a.coneOuterAngle,
                cog: a.coneOuterGain,
                uid: this._instUid
            }
        }
        LoadPanState(a) {
            if (a) {
                this.SetPannerEnabled(!0);
                a = this._pannerNode;
                var c = a.pos;
                this._pannerPosition[0] = c[0];
                this._pannerPosition[1] = c[1];
                this._pannerPosition[2] = c[2];
                c = a.orient;
                this._pannerOrientation[0] = c[0];
                this._pannerOrientation[1] = c[1];
                this._pannerOrientation[2] =
                    c[2];
                a.setPosition(...this._pannerPosition);
                a.setOrientation(...this._pannerOrientation);
                a.coneInnerAngle = a.cia;
                a.coneOuterAngle = a.coa;
                a.coneOuterGain = a.cog;
                this._instUid = a.uid
            } else this.SetPannerEnabled(!1)
        }
    }
}
"use strict";
self.C3Html5AudioInstance = class extends self.C3AudioInstance {
    constructor(f, a, c) {
        super(f, a, c);
        this._buffer.GetOutputNode().connect(this._gainNode);
        this._buffer.onended = () => this._OnEnded()
    }
    Release() {
        this.Stop();
        this._buffer.GetOutputNode().disconnect();
        super.Release()
    }
    GetAudioElement() {
        return this._buffer.GetAudioElement()
    }
    _OnEnded() {
        this._isStopped = !0;
        this._instUid = -1;
        this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId)
    }
    HasEnded() {
        return this.GetAudioElement().ended
    }
    CanBeRecycled() {
        return this._isStopped ?
            !0 : this.HasEnded()
    }
    GetPlaybackTime() {
        let f = this.GetAudioElement().currentTime;
        this._isLooping || (f = Math.min(f, this.GetDuration()));
        return f
    }
    Play(f, a, c, d) {
        d = this.GetAudioElement();
        1 !== d.playbackRate && (d.playbackRate = 1);
        d.loop !== f && (d.loop = f);
        this.SetVolume(a);
        d.muted && (d.muted = !1);
        if (d.currentTime !== c) try {
            d.currentTime = c
        } catch (g) {
            console.warn(`[Construct 3] Exception seeking audio '${this._buffer.GetUrl()}' to position '${c}': `, g)
        }
        this._audioDomHandler.TryPlayMedia(d);
        this._isPaused = this._isStopped = !1;
        this._isLooping = f;
        this._playbackRate = 1
    }
    Stop() {
        const f = this.GetAudioElement();
        f.paused || f.pause();
        this._audioDomHandler.RemovePendingPlay(f);
        this._isStopped = !0;
        this._isPaused = !1;
        this._instUid = -1
    }
    Pause() {
        if (!(this._isPaused || this._isStopped || this.HasEnded())) {
            var f = this.GetAudioElement();
            f.paused || f.pause();
            this._audioDomHandler.RemovePendingPlay(f);
            this._isPaused = !0
        }
    }
    Resume() {
        !this._isPaused || this._isStopped || this.HasEnded() || (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()), this._isPaused = !1)
    }
    _UpdateMuted() {
        this.GetAudioElement().muted = this._isMuted || this.IsSilent()
    }
    SetLooping(f) {
        f = !!f;
        this._isLooping !== f && (this._isLooping = f, this.GetAudioElement().loop = f)
    }
    _UpdatePlaybackRate() {
        let f = this._playbackRate;
        this._isTimescaled && (f *= this._audioDomHandler.GetTimeScale());
        try {
            this.GetAudioElement().playbackRate = f
        } catch (a) {
            console.warn(`[Construct 3] Unable to set playback rate '${f}':`, a)
        }
    }
    Seek(f) {
        if (!this._isStopped && !this.HasEnded()) try {
            this.GetAudioElement().currentTime = f
        } catch (a) {
            console.warn(`[Construct 3] Error seeking audio to '${f}': `,
                a)
        }
    }
    GetResumePosition() {
        return this.GetPlaybackTime()
    }
    SetSuspended(f) {
        f ? this.IsPlaying() ? (this.GetAudioElement().pause(), this._resumeMe = !0) : this._resumeMe = !1 : this._resumeMe && (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()), this._resumeMe = !1)
    }
};
"use strict";
self.C3WebAudioInstance = class extends self.C3AudioInstance {
    constructor(f, a, c) {
        super(f, a, c);
        this._bufferSource = null;
        this._onended_handler = d => this._OnEnded(d);
        this._hasPlaybackEnded = !0;
        this._activeSource = null;
        this._resumePosition = this._playFromSeekPos = this._playStartTime = 0;
        this._muteVol = 1
    }
    Release() {
        this.Stop();
        this._ReleaseBufferSource();
        this._onended_handler = null;
        super.Release()
    }
    _ReleaseBufferSource() {
        this._bufferSource && this._bufferSource.disconnect();
        this._activeSource = this._bufferSource = null
    }
    _OnEnded(f) {
        this._isPaused ||
            this._resumeMe || f.target !== this._activeSource || (this._isStopped = this._hasPlaybackEnded = !0, this._instUid = -1, this._ReleaseBufferSource(), this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId))
    }
    HasEnded() {
        return !this._isStopped && this._bufferSource && this._bufferSource.loop || this._isPaused ? !1 : this._hasPlaybackEnded
    }
    CanBeRecycled() {
        return !this._bufferSource || this._isStopped ? !0 : this.HasEnded()
    }
    GetPlaybackTime() {
        let f;
        f = this._isPaused ? this._resumePosition : this._playFromSeekPos + (this.GetCurrentTime() -
            this._playStartTime) * this._playbackRate;
        this._isLooping || (f = Math.min(f, this.GetDuration()));
        return f
    }
    Play(f, a, c, d) {
        this._muteVol = 1;
        this.SetVolume(a);
        this._ReleaseBufferSource();
        this._bufferSource = this.GetAudioContext().createBufferSource();
        this._bufferSource.buffer = this._buffer.GetAudioBuffer();
        this._bufferSource.connect(this._gainNode);
        this._activeSource = this._bufferSource;
        this._bufferSource.onended = this._onended_handler;
        this._bufferSource.loop = f;
        this._bufferSource.start(d, c);
        this._isPaused = this._isStopped =
            this._hasPlaybackEnded = !1;
        this._isLooping = f;
        this._playbackRate = 1;
        this._playStartTime = this.GetCurrentTime();
        this._playFromSeekPos = c
    }
    Stop() {
        if (this._bufferSource) try {
            this._bufferSource.stop(0)
        } catch (f) {}
        this._isStopped = !0;
        this._isPaused = !1;
        this._instUid = -1
    }
    Pause() {
        this._isPaused || this._isStopped || this.HasEnded() || (this._resumePosition = this.GetPlaybackTime(), this._isLooping && (this._resumePosition %= this.GetDuration()), this._isPaused = !0, this._bufferSource.stop(0))
    }
    Resume() {
        !this._isPaused || this._isStopped ||
            this.HasEnded() || (this._ReleaseBufferSource(), this._bufferSource = this.GetAudioContext().createBufferSource(), this._bufferSource.buffer = this._buffer.GetAudioBuffer(), this._bufferSource.connect(this._gainNode), this._activeSource = this._bufferSource, this._bufferSource.onended = this._onended_handler, this._bufferSource.loop = this._isLooping, this._UpdateVolume(), this._UpdatePlaybackRate(), this._bufferSource.start(0, this._resumePosition), this._playStartTime = this.GetCurrentTime(), this._playFromSeekPos = this._resumePosition,
                this._isPaused = !1)
    }
    GetOverallVolume() {
        return super.GetOverallVolume() * this._muteVol
    }
    _UpdateMuted() {
        this._muteVol = this._isMuted || this.IsSilent() ? 0 : 1;
        this._UpdateVolume()
    }
    SetLooping(f) {
        f = !!f;
        this._isLooping !== f && (this._isLooping = f, this._bufferSource && (this._bufferSource.loop = f))
    }
    _UpdatePlaybackRate() {
        let f = this._playbackRate;
        this._isTimescaled && (f *= this._audioDomHandler.GetTimeScale());
        this._bufferSource && (this._bufferSource.playbackRate.value = f)
    }
    Seek(f) {
        this._isStopped || this.HasEnded() || (this._isPaused ?
            this._resumePosition = f : (this.Pause(), this._resumePosition = f, this.Resume()))
    }
    GetResumePosition() {
        return this._resumePosition
    }
    SetSuspended(f) {
        f ? this.IsPlaying() ? (this._resumeMe = !0, this._resumePosition = this.GetPlaybackTime(), this._isLooping && (this._resumePosition %= this.GetDuration()), this._bufferSource.stop(0)) : this._resumeMe = !1 : this._resumeMe && (this._ReleaseBufferSource(), this._bufferSource = this.GetAudioContext().createBufferSource(), this._bufferSource.buffer = this._buffer.GetAudioBuffer(), this._bufferSource.connect(this._gainNode),
            this._activeSource = this._bufferSource, this._bufferSource.onended = this._onended_handler, this._bufferSource.loop = this._isLooping, this._UpdateVolume(), this._UpdatePlaybackRate(), this._bufferSource.start(0, this._resumePosition), this._playStartTime = this.GetCurrentTime(), this._playFromSeekPos = this._resumePosition, this._resumeMe = !1)
    }
    _LoadAdditionalState(f) {
        super._LoadAdditionalState(f);
        this._resumePosition = f.resumePosition
    }
};
"use strict"; {
    class f {
        constructor(a) {
            this._audioDomHandler = a;
            this._audioContext = a.GetAudioContext();
            this._index = -1;
            this._type = this._tag = "";
            this._params = null
        }
        Release() {
            this._audioContext = null
        }
        _SetIndex(a) {
            this._index = a
        }
        GetIndex() {
            return this._index
        }
        _SetTag(a) {
            this._tag = a
        }
        GetTag() {
            return this._tag
        }
        CreateGain() {
            return this._audioContext.createGain()
        }
        GetInputNode() {}
        ConnectTo(a) {}
        SetAudioParam(a, c, d, g) {
            a.cancelScheduledValues(0);
            if (0 === g) a.value = c;
            else {
                var m = this._audioContext.currentTime;
                g += m;
                switch (d) {
                    case 0:
                        a.setValueAtTime(c,
                            g);
                        break;
                    case 1:
                        a.setValueAtTime(a.value, m);
                        a.linearRampToValueAtTime(c, g);
                        break;
                    case 2:
                        a.setValueAtTime(a.value, m), a.exponentialRampToValueAtTime(c, g)
                }
            }
        }
        GetState() {
            return {
                type: this._type,
                tag: this._tag,
                params: this._params
            }
        }
    }
    self.C3AudioFilterFX = class extends f {
        constructor(a, c, d, g, m, n, v) {
            super(a);
            this._type = "filter";
            this._params = [c, d, g, m, n, v];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = v;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - v;
            this._filterNode =
                this._audioContext.createBiquadFilter();
            this._filterNode.type = c;
            this._filterNode.frequency.value = d;
            this._filterNode.detune.value = g;
            this._filterNode.Q.value = m;
            this._filterNode.gain.vlaue = n;
            this._inputNode.connect(this._filterNode);
            this._inputNode.connect(this._dryNode);
            this._filterNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._filterNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, c, d, g) {
            switch (a) {
                case 0:
                    c = Math.max(Math.min(c / 100, 1), 0);
                    this._params[5] = c;
                    this.SetAudioParam(this._wetNode.gain, c, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - c, d, g);
                    break;
                case 1:
                    this._params[1] = c;
                    this.SetAudioParam(this._filterNode.frequency, c, d, g);
                    break;
                case 2:
                    this._params[2] = c;
                    this.SetAudioParam(this._filterNode.detune, c, d, g);
                    break;
                case 3:
                    this._params[3] = c;
                    this.SetAudioParam(this._filterNode.Q,
                        c, d, g);
                    break;
                case 4:
                    this._params[4] = c, this.SetAudioParam(this._filterNode.gain, c, d, g)
            }
        }
    };
    self.C3AudioDelayFX = class extends f {
        constructor(a, c, d, g) {
            super(a);
            this._type = "delay";
            this._params = [c, d, g];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = g;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - g;
            this._mainNode = this.CreateGain();
            this._delayNode = this._audioContext.createDelay(c);
            this._delayNode.delayTime.value = c;
            this._delayGainNode = this.CreateGain();
            this._delayGainNode.gain.value = d;
            this._inputNode.connect(this._mainNode);
            this._inputNode.connect(this._dryNode);
            this._mainNode.connect(this._wetNode);
            this._mainNode.connect(this._delayNode);
            this._delayNode.connect(this._delayGainNode);
            this._delayGainNode.connect(this._mainNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            this._mainNode.disconnect();
            this._delayNode.disconnect();
            this._delayGainNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, c, d, g) {
            const m = self.AudioDOMHandler.DbToLinear;
            switch (a) {
                case 0:
                    c = Math.max(Math.min(c / 100, 1), 0);
                    this._params[2] = c;
                    this.SetAudioParam(this._wetNode.gain, c, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - c, d, g);
                    break;
                case 4:
                    this._params[1] = m(c);
                    this.SetAudioParam(this._delayGainNode.gain, m(c), d, g);
                    break;
                case 5:
                    this._params[0] = c, this.SetAudioParam(this._delayNode.delayTime, c, d, g)
            }
        }
    };
    self.C3AudioConvolveFX = class extends f {
        constructor(a, c, d, g) {
            super(a);
            this._type = "convolution";
            this._params = [d, g];
            this._bufferType = this._bufferUrl = this._bufferOriginalUrl = "";
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = g;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - g;
            this._convolveNode = this._audioContext.createConvolver();
            this._convolveNode.normalize = d;
            this._convolveNode.buffer = c;
            this._inputNode.connect(this._convolveNode);
            this._inputNode.connect(this._dryNode);
            this._convolveNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._convolveNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, c, d, g) {
            switch (a) {
                case 0:
                    c = Math.max(Math.min(c / 100, 1), 0), this._params[1] = c, this.SetAudioParam(this._wetNode.gain, c, d, g), this.SetAudioParam(this._dryNode.gain,
                        1 - c, d, g)
            }
        }
        _SetBufferInfo(a, c, d) {
            this._bufferOriginalUrl = a;
            this._bufferUrl = c;
            this._bufferType = d
        }
        GetState() {
            const a = super.GetState();
            a.bufferOriginalUrl = this._bufferOriginalUrl;
            a.bufferUrl = "";
            a.bufferType = this._bufferType;
            return a
        }
    };
    self.C3AudioFlangerFX = class extends f {
        constructor(a, c, d, g, m, n) {
            super(a);
            this._type = "flanger";
            this._params = [c, d, g, m, n];
            this._inputNode = this.CreateGain();
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - n / 2;
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value =
                n / 2;
            this._feedbackNode = this.CreateGain();
            this._feedbackNode.gain.value = m;
            this._delayNode = this._audioContext.createDelay(c + d);
            this._delayNode.delayTime.value = c;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = g;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = d;
            this._inputNode.connect(this._delayNode);
            this._inputNode.connect(this._dryNode);
            this._delayNode.connect(this._wetNode);
            this._delayNode.connect(this._feedbackNode);
            this._feedbackNode.connect(this._delayNode);
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._delayNode.delayTime);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._inputNode.disconnect();
            this._delayNode.disconnect();
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._dryNode.disconnect();
            this._wetNode.disconnect();
            this._feedbackNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a,
            c, d, g) {
            switch (a) {
                case 0:
                    c = Math.max(Math.min(c / 100, 1), 0);
                    this._params[4] = c;
                    this.SetAudioParam(this._wetNode.gain, c / 2, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - c / 2, d, g);
                    break;
                case 6:
                    this._params[1] = c / 1E3;
                    this.SetAudioParam(this._oscGainNode.gain, c / 1E3, d, g);
                    break;
                case 7:
                    this._params[2] = c;
                    this.SetAudioParam(this._oscNode.frequency, c, d, g);
                    break;
                case 8:
                    this._params[3] = c / 100, this.SetAudioParam(this._feedbackNode.gain, c / 100, d, g)
            }
        }
    };
    self.C3AudioPhaserFX = class extends f {
        constructor(a, c, d, g, m, n, v) {
            super(a);
            this._type = "phaser";
            this._params = [c, d, g, m, n, v];
            this._inputNode = this.CreateGain();
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - v / 2;
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = v / 2;
            this._filterNode = this._audioContext.createBiquadFilter();
            this._filterNode.type = "allpass";
            this._filterNode.frequency.value = c;
            this._filterNode.detune.value = d;
            this._filterNode.Q.value = g;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = n;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = m;
            this._inputNode.connect(this._filterNode);
            this._inputNode.connect(this._dryNode);
            this._filterNode.connect(this._wetNode);
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._filterNode.frequency);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._inputNode.disconnect();
            this._filterNode.disconnect();
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._dryNode.disconnect();
            this._wetNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, c, d, g) {
            switch (a) {
                case 0:
                    c = Math.max(Math.min(c / 100, 1), 0);
                    this._params[5] = c;
                    this.SetAudioParam(this._wetNode.gain, c / 2, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - c / 2, d, g);
                    break;
                case 1:
                    this._params[0] = c;
                    this.SetAudioParam(this._filterNode.frequency, c, d, g);
                    break;
                case 2:
                    this._params[1] = c;
                    this.SetAudioParam(this._filterNode.detune, c, d, g);
                    break;
                case 3:
                    this._params[2] = c;
                    this.SetAudioParam(this._filterNode.Q,
                        c, d, g);
                    break;
                case 6:
                    this._params[3] = c;
                    this.SetAudioParam(this._oscGainNode.gain, c, d, g);
                    break;
                case 7:
                    this._params[4] = c, this.SetAudioParam(this._oscNode.frequency, c, d, g)
            }
        }
    };
    self.C3AudioGainFX = class extends f {
        constructor(a, c) {
            super(a);
            this._type = "gain";
            this._params = [c];
            this._node = this.CreateGain();
            this._node.gain.value = c
        }
        Release() {
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, c, d, g) {
            const m = self.AudioDOMHandler.DbToLinear;
            switch (a) {
                case 4:
                    this._params[0] = m(c), this.SetAudioParam(this._node.gain, m(c), d, g)
            }
        }
    };
    self.C3AudioTremoloFX = class extends f {
        constructor(a, c, d) {
            super(a);
            this._type = "tremolo";
            this._params = [c, d];
            this._node = this.CreateGain();
            this._node.gain.value = 1 - d / 2;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = c;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = d / 2;
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._node.gain);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, c, d, g) {
            switch (a) {
                case 0:
                    c = Math.max(Math.min(c / 100, 1), 0);
                    this._params[1] = c;
                    this.SetAudioParam(this._node.gain, 1 - c / 2, d, g);
                    this.SetAudioParam(this._oscGainNode.gain, c / 2, d, g);
                    break;
                case 7:
                    this._params[0] = c, this.SetAudioParam(this._oscNode.frequency, c, d, g)
            }
        }
    };
    self.C3AudioRingModFX = class extends f {
        constructor(a,
            c, d) {
            super(a);
            this._type = "ringmod";
            this._params = [c, d];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = d;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - d;
            this._ringNode = this.CreateGain();
            this._ringNode.gain.value = 0;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = c;
            this._oscNode.connect(this._ringNode.gain);
            this._oscNode.start(0);
            this._inputNode.connect(this._ringNode);
            this._inputNode.connect(this._dryNode);
            this._ringNode.connect(this._wetNode)
        }
        Release() {
            this._oscNode.stop(0);
            this._oscNode.disconnect();
            this._ringNode.disconnect();
            this._inputNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, c, d, g) {
            switch (a) {
                case 0:
                    c = Math.max(Math.min(c / 100, 1), 0);
                    this._params[1] = c;
                    this.SetAudioParam(this._wetNode.gain, c, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - c, d, g);
                    break;
                case 7:
                    this._params[0] =
                        c, this.SetAudioParam(this._oscNode.frequency, c, d, g)
            }
        }
    };
    self.C3AudioDistortionFX = class extends f {
        constructor(a, c, d, g, m, n) {
            super(a);
            this._type = "distortion";
            this._params = [c, d, g, m, n];
            this._inputNode = this.CreateGain();
            this._preGain = this.CreateGain();
            this._postGain = this.CreateGain();
            this._SetDrive(g, m);
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = n;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - n;
            this._waveShaper = this._audioContext.createWaveShaper();
            this._curve = new Float32Array(65536);
            this._GenerateColortouchCurve(c, d);
            this._waveShaper.curve = this._curve;
            this._inputNode.connect(this._preGain);
            this._inputNode.connect(this._dryNode);
            this._preGain.connect(this._waveShaper);
            this._waveShaper.connect(this._postGain);
            this._postGain.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._preGain.disconnect();
            this._waveShaper.disconnect();
            this._postGain.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        _SetDrive(a, c) {
            .01 > a && (a = .01);
            this._preGain.gain.value =
                a;
            this._postGain.gain.value = Math.pow(1 / a, .6) * c
        }
        _GenerateColortouchCurve(a, c) {
            for (let d = 0; 32768 > d; ++d) {
                let g = d / 32768;
                g = this._Shape(g, a, c);
                this._curve[32768 + d] = g;
                this._curve[32768 - d - 1] = -g
            }
        }
        _Shape(a, c, d) {
            d = 1.05 * d * c - c;
            const g = 0 > a ? -1 : 1;
            a = 0 > a ? -a : a;
            return (a < c ? a : c + d * self.AudioDOMHandler.e4(a - c, 1 / d)) * g
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, c, d, g) {
            switch (a) {
                case 0:
                    c = Math.max(Math.min(c /
                        100, 1), 0), this._params[4] = c, this.SetAudioParam(this._wetNode.gain, c, d, g), this.SetAudioParam(this._dryNode.gain, 1 - c, d, g)
            }
        }
    };
    self.C3AudioCompressorFX = class extends f {
        constructor(a, c, d, g, m, n) {
            super(a);
            this._type = "compressor";
            this._params = [c, d, g, m, n];
            this._node = this._audioContext.createDynamicsCompressor();
            this._node.threshold.value = c;
            this._node.knee.value = d;
            this._node.ratio.value = g;
            this._node.attack.value = m;
            this._node.release.value = n
        }
        Release() {
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, c, d, g) {}
    };
    self.C3AudioAnalyserFX = class extends f {
        constructor(a, c, d) {
            super(a);
            this._type = "analyser";
            this._params = [c, d];
            this._node = this._audioContext.createAnalyser();
            this._node.fftSize = c;
            this._node.smoothingTimeConstant = d;
            this._freqBins = new Float32Array(this._node.frequencyBinCount);
            this._signal = new Uint8Array(c);
            this._rms = this._peak = 0;
            this._audioDomHandler._AddAnalyser(this)
        }
        Release() {
            this._audioDomHandler._RemoveAnalyser(this);
            this._node.disconnect();
            super.Release()
        }
        Tick() {
            this._node.getFloatFrequencyData(this._freqBins);
            this._node.getByteTimeDomainData(this._signal);
            const a = this._node.fftSize;
            let c = this._peak = 0;
            for (var d = 0; d < a; ++d) {
                let g = (this._signal[d] - 128) / 128;
                0 > g && (g = -g);
                this._peak < g && (this._peak = g);
                c += g * g
            }
            d = self.AudioDOMHandler.LinearToDb;
            this._peak = d(this._peak);
            this._rms = d(Math.sqrt(c / a))
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, c, d, g) {}
        GetData() {
            return {
                tag: this.GetTag(),
                index: this.GetIndex(),
                peak: this._peak,
                rms: this._rms,
                binCount: this._node.frequencyBinCount,
                freqBins: this._freqBins
            }
        }
    }
};