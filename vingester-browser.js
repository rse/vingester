/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  require internal modules  */
const os          = require("os")
const fs          = require("fs")
const path        = require("path")
const rimraf      = require("rimraf")

/*  require external modules  */
const electron    = require("electron")
const bluebird    = require("bluebird")

/*  browser abstraction  */
module.exports = class Browser {
    /*  create new browser  */
    constructor (log, id, cfg, control, ffmpeg) {
        this.log             = log
        this.id              = id
        this.cfg             = {}
        this.control         = control
        this.ffmpeg          = ffmpeg
        this.reset()
        this.reconfigure(cfg)
    }

    /*  reset internal state  */
    reset () {
        this.worker          = null
        this.content         = null
        this.subscribed      = false
        this.subscriber      = null
        this.starting        = false
        this.stopping        = false
        this.tally           = "unconnected"
        this.framerateSource = -1
        this.framerateTarget = -1
        this.framerateNow    = -1
        this.framesToSkip    = -1
        this.devToolsEnabled = false
    }

    /*  reconfigure browser  */
    reconfigure (cfg) {
        this.log.info("browser: reconfigure")

        /*  take over configuration  */
        Object.assign(this.cfg, cfg)

        /*  pre-parse configuration strings  */
        this.cfg.w = parseInt(this.cfg.w)
        this.cfg.h = parseInt(this.cfg.h)
        this.cfg.x = parseInt(this.cfg.x)
        this.cfg.y = parseInt(this.cfg.y)
        this.cfg.f = parseInt(this.cfg.f)
        this.cfg.O = parseInt(this.cfg.O)
        this.cfg.o = parseInt(this.cfg.o)
        this.cfg.C = parseInt(this.cfg.C)
        this.cfg.k = parseInt(this.cfg.k)
        this.cfg.z = parseFloat(this.cfg.z)

        /*  recalculate capture framerate  */
        this.recalcCaptureFramerate()

        /*  optionally reconfigure already running worker instance  */
        this.update()

        /*  control devTools window  */
        if (this.content !== null) {
            if (!this.devToolsEnabled && this.cfg.E) {
                this.content.webContents.openDevTools({ mode: "detach", activate: true })
                this.devToolsEnabled = true
                this.control.webContents.send("devtools", { id: this.id, enabled: true })
            }
            else if (this.devToolsEnabled && !this.cfg.E) {
                this.content.webContents.closeDevTools()
                this.devToolsEnabled = false
                this.control.webContents.send("devtools", { id: this.id, enabled: false })
            }
        }
    }

    /*  explicitly allow the content browser windows certain permissions  */
    static prepare () {
        const session = electron.session.fromPartition("vingester-browser-content")
        const allowedPermissions = [ "media", "mediaKeySystem", "geolocation" ]
        session.setPermissionRequestHandler((webContents, permission, callback) => {
            if (allowedPermissions.includes(permission))
                callback(true)
            else
                callback(false)
        })
    }

    /*  recalculate capturing framerate  */
    recalcCaptureFramerate () {
        /*  determine framerate  */
        let framerate = this.framerateTarget
        if (framerate < 0)
            framerate = 0

        /*  optionally adapt framerate  */
        if (this.cfg.D && !this.cfg.N && !this.cfg.P)
            framerate = 0
        else if (this.cfg.N && this.cfg.a) {
            if (this.tally === "unconnected" && !this.cfg.P)
                framerate = 1
            else if (this.tally === "unconnected" && this.cfg.P)
                framerate = 5
            else if (this.tally === "connected")
                framerate = Math.trunc(framerate / 3)
        }

        /*  set capture framerate (if changed)  */
        if (framerate !== this.framerateNow && this.framerateTarget !== -1 && this.framerateSource !== -1) {
            if (this.framerateNow === -1)
                this.log.info(`browser/worker-${this.id}: setting capture framerate to ` +
                    `${framerate}/${this.framerateTarget}/${this.framerateSource} (initially)`)
            else
                this.log.info(`browser/worker-${this.id}: setting capture framerate to ` +
                    `${framerate}/${this.framerateTarget}/${this.framerateSource} (subsequently)`)
            this.framerateNow = framerate
        }
    }

    /*  check whether browser is running  */
    running () {
        return (this.content !== null && this.worker !== null)
    }

    /*  check whether browser has a valid configuration  */
    valid () {
        return (
            (this.cfg.D || this.cfg.N)
            && (!this.cfg.N || (this.cfg.N && (this.cfg.n || this.cfg.m)))
            && this.cfg.t !== ""
            && this.cfg.u !== ""
        )
    }

    /*  start browser  */
    async start () {
        if (this.starting)
            return
        this.starting = true
        this.log.info("browser: start")

        /*  create worker browser window (offscreen only)  */
        const worker = new electron.BrowserWindow({
            offscreen:       true,
            show:            false,
            width:           200,
            height:          200,
            title:           "Vingester Browser Worker",
            webPreferences: {
                devTools:                   (process.env.DEBUG === "2"),
                backgroundThrottling:       false,
                nodeIntegration:            true,
                nodeIntegrationInWorker:    true,
                contextIsolation:           false,
                enableRemoteModule:         false,
                disableDialogs:             true,
                autoplayPolicy:             "no-user-gesture-required",
                spellcheck:                 false,
                additionalArguments:        [ JSON.stringify({
                    ...this.cfg,
                    controlId:  this.control.webContents.id,
                    ffmpeg:     this.ffmpeg,
                    ffmpegCwd:  electron.app.getPath("videos")
                }) ]
            }
        })
        worker.removeMenu()
        if (process.env.DEBUG === "2") {
            setTimeout(() => {
                worker.webContents.openDevTools()
            }, 1000)
        }

        /*  receive worker browser console outputs  */
        worker.webContents.on("console-message", (ev, level, message, line, sourceId) => {
            let method = "debug"
            switch (level) {
                case 0: method = "debug"; break
                case 1: method = "info";  break
                case 2: method = "warn";  break
                case 3: method = "error"; break
            }
            this.log[method](`browser/worker-${this.id}: console: ${message.replace(/\s+/g, " ")}`)
        })

        /*  notify content of tally information  */
        const changeVisibilityState = (state) => {
            if (this.content === null)
                return
            this.content.webContents.executeJavaScript(`
                vingester.visibility(${JSON.stringify(state)});
                document.dispatchEvent(new Event("visibilitychange", {
                    bubbles: false, cancelable: false
                }))
            `)
        }
        const raiseContentEvent = (name, detail) => {
            if (this.content === null)
                return
            this.content.webContents.executeJavaScript(`
                window.dispatchEvent(new CustomEvent("${name}", {
                    bubbles: false, cancelable: false,
                    detail: ${JSON.stringify(detail)}
                }))
            `)
        }
        let activeLast  = null
        let visibleLast = null
        const notifyContent = (tally) => {
            /*  provide original event  */
            raiseContentEvent("vingesterTallyChanged", tally)

            /*  optionally simulate OBS Studio events  */
            if (this.cfg.B) {
                let visible = false  /*  visible on preview/program or any display        */
                let active  = false  /*  visible on preview/program and stream/recording  */
                if (tally === "preview")
                    visible = true
                else if (tally === "program") {
                    visible = true
                    active  = true
                }
                if (visibleLast !== visible) {
                    raiseContentEvent("obsSourceVisibleChanged", { visible })
                    this.log.info(`browser: new OBS DOM VISIBLE state: ${visible}`)
                    visibleLast = visible
                }
                if (activeLast !== active) {
                    changeVisibilityState(active ? "visible" : "hidden")
                    raiseContentEvent("obsSourceActiveChanged", { active })
                    this.log.info(`browser: new OBS DOM ACTIVE state: ${active}`)
                    activeLast = active
                }
            }
        }

        /*  receive worker information  */
        let tallyLast = ""
        worker.webContents.on("ipc-message", (ev, channel, msg) => {
            if (channel === "tally") {
                /*  receive tally status  */
                this.tally = msg.status
                if (this.tally !== tallyLast) {
                    tallyLast = this.tally
                    this.recalcCaptureFramerate()
                    this.update()
                    this.log.info(`browser: new NDI TALLY state: ${this.tally}`)
                    notifyContent(this.tally)
                }
            }
        })

        /*  load content into worker browser window  */
        await new Promise((resolve, reject) => {
            worker.webContents.once("did-fail-load", (ev, code, desc, url, isMainFrame) => {
                ev.preventDefault()
                this.log.info(`browser: worker: failed (code: ${code}, desc: ${desc}, url: ${url}, isMainFrame: ${isMainFrame})`)
                this.control.webContents.send("message", `browser: worker: failed (code: ${code}, desc: ${desc}, url: ${url}, isMainFrame: ${isMainFrame})`)
                resolve(false)
            })
            worker.webContents.once("did-finish-load", (ev) => {
                ev.preventDefault()
                this.log.info("browser: worker: started")
                resolve(true)
            })
            worker.loadURL(`file://${path.join(__dirname, "vingester-browser-worker.html")}`)
        })

        /*  remember worker object  */
        this.worker = worker

        /*  determine window title  */
        const title = (this.cfg.t == null ? "Vingester" : this.cfg.t)

        /*  determine target display of browser window  */
        const point = electron.screen.getCursorScreenPoint()
        let D = electron.screen.getDisplayNearestPoint(point)
        let m
        if (this.cfg.d !== null && (m = this.cfg.d.match(/^([-+]?\d+),([-+]?\d+)$/))) {
            const select = { x: parseInt(m[1]), y: parseInt(m[2]) }
            const d = electron.screen.getPrimaryDisplay()
            const w = d.size.width
            const h = d.size.height
            const point = {
                x: (select.x * w) + (0.5 * w),
                y: (select.y * h) + (0.5 * h)
            }
            D = electron.screen.getDisplayNearestPoint(point)
        }

        /*  determine scale factor of browser window (on its target display)  */
        const factor = D.scaleFactor

        /*  determine width/height of browser window (on its target display)  */
        const width  = Math.round(this.cfg.w / factor)
        const height = Math.round(this.cfg.h / factor)

        /*  determine position of browser window (on its target display)  */
        let pos = {}
        if (this.cfg.x !== null && this.cfg.y !== null) {
            const x = Math.round(D.bounds.x + (this.cfg.x / factor))
            const y = Math.round(D.bounds.y + (this.cfg.y / factor))
            pos = { x, y }
        }

        /*  create browser session  */
        let session = electron.session.fromPartition("vingester-browser-content")
        if (this.cfg.S) {
            const name = `vingester-browser-content-${this.id.toLowerCase()}`
            session = electron.session.fromPartition(`persist:${name}`)
            const allowedPermissions = [ "media", "mediaKeySystem", "geolocation" ]
            session.setPermissionRequestHandler((webContents, permission, callback) => {
                if (allowedPermissions.includes(permission))
                    callback(true)
                else
                    callback(false)
            })
        }

        /*  create content browser window (visible or offscreen)  */
        const opts1 = (this.cfg.D ? {
            ...pos,
            width:           width,
            height:          height,
            resizable:       false,
            movable:         false,
            minimizable:     false,
            maximizable:     false,
            closable:        false,
            useContentSize:  false,
            autoHideMenuBar: true,
            roundedCorners:  false,
            transparent:     true,
            frame:           false,
            ...(this.cfg.c === "transparent" ? { transparent: true } : { backgroundColor: this.cfg.c }),
            hasShadow:       false,
            enableLargerThanScreen: true,
            fullscreenable:  true,
            titleBarStyle:   "hidden",
            thickFrame:      false,
            title:           title
        } : {
            width:           width,
            height:          height,
            useContentSize:  false,
            show:            false
        })
        const opts2 = (this.cfg.D ? {
            offscreen:       false,
            zoomFactor:      this.cfg.z / factor
        } : {
            offscreen:       true,
            zoomFactor:      this.cfg.z
        })
        const content = new electron.BrowserWindow({
            ...opts1,
            webPreferences: {
                ...opts2,
                session:                    session,
                devTools:                   true,
                backgroundThrottling:       false,
                preload:                    path.join(__dirname, "vingester-browser-preload.js"),
                nodeIntegration:            this.cfg.I ? true : false,
                nodeIntegrationInWorker:    this.cfg.I ? true : false,
                contextIsolation:           true,
                enableRemoteModule:         false,
                disableDialogs:             true,
                autoplayPolicy:             "no-user-gesture-required",
                spellcheck:                 false,
                additionalArguments:        [ JSON.stringify({
                    ...this.cfg,
                    controlId: this.control.webContents.id,
                    workerId: this.worker.webContents.id
                }) ]
            }
        })
        if (os.platform() === "darwin")
            content.setWindowButtonVisibility(false)

        /*  support devTools  */
        if (this.cfg.E) {
            this.log.info("browser: open")
            setTimeout(() => {
                content.webContents.openDevTools({ mode: "detach", activate: false })
                this.devToolsEnabled = true
                this.control.webContents.send("devtools", { id: this.id, enabled: true })
            }, 1000)
        }
        content.webContents.on("devtools-opened", (ev) => {
            this.devToolsEnabled = true
            this.control.webContents.send("devtools", { id: this.id, enabled: true })
        })
        content.webContents.on("devtools-closed", (ev) => {
            this.devToolsEnabled = false
            this.control.webContents.send("devtools", { id: this.id, enabled: false })
        })

        /*  determine user-agent identifier  */
        const ua = content.webContents.getUserAgent()
        this.log.info(`browser: content: user-agent: "${ua}"`)

        /*  allow insecure HTTPS connections  */
        content.webContents.session.setCertificateVerifyProc((request, callback) => {
            if (request.hostname === "localhost"
                || request.hostname === "127.0.0.1"
                || request.hostname === "::1"
                || this.cfg.H)
                callback(0)
            else
                callback(-3)
        })

        /*  control audio (for desktop window we unmute, for NDI we mute)  */
        if (this.cfg.D || (this.cfg.N && this.cfg.C === 0))
            content.webContents.setAudioMuted(false)
        else
            content.webContents.setAudioMuted(true)

        /*  force aspect ratio  */
        content.setAspectRatio(this.cfg.w / this.cfg.h)

        /*  force always on top  */
        if (this.cfg.p) {
            /*  show window higher than all regular windows, but still behind
                things like spotlight or the screen saver and allow the window to
                show over a fullscreen window  */
            content.setAlwaysOnTop(true, "pop-up-menu", 1)
            content.setVisibleOnAllWorkspaces(true)
        }
        else {
            content.setAlwaysOnTop(false)
            content.setVisibleOnAllWorkspaces(false)
        }

        /*  capture and send browser frame content  */
        if (this.cfg.D) {
            /*  use Frame subscription where framerate cannot be controlled
                (but which is available also for onscreen rendering)  */
            this.framerateSource = D.displayFrequency
            this.framerateTarget = this.cfg.f
            this.framerateNow    = -1
            this.recalcCaptureFramerate()
            let framesSkipped = 0
            this.subscriber = (image, dirty) => {
                if (this.worker === null || this.worker.isDestroyed())
                    return
                if (framesSkipped++ < this.framesToSkip)
                    return
                framesSkipped = 0
                const buffer = image.getBitmap()
                const size   = image.getSize()
                const ratio  = image.getAspectRatio(factor)
                this.worker.webContents.send("video-capture", buffer, size, ratio, dirty)
            }
        }
        else if (this.cfg.N) {
            /*  use Paint hook where framerate can be controlled
                (but which is available for offscreen rendering only)  */
            this.framerateSource = 240
            this.framerateTarget = this.cfg.f
            this.framerateNow    = -1
            this.recalcCaptureFramerate()
            this.subscriber = (ev, dirty, image) => {
                if (this.worker === null || this.worker.isDestroyed())
                    return
                const buffer = image.getBitmap()
                const size   = image.getSize()
                const ratio  = image.getAspectRatio(factor)
                this.worker.webContents.send("video-capture", buffer, size, ratio, dirty)
            }
        }

        /*  receive content browser console outputs  */
        content.webContents.on("console-message", (ev, level, message, line, sourceId) => {
            /*  log centrally  */
            let method = "debug"
            switch (level) {
                case 0: method = "debug"; break
                case 1: method = "info";  break
                case 2: method = "warn";  break
                case 3: method = "error"; break
            }
            this.log[method](`browser/content-${this.id}: console: ${message.replace(/\s+/g, " ")}`)

            /*  optionally send to control user interface  */
            if (this.control !== null && !this.control.isDestroyed())
                this.control.webContents.send("trace", { level, message, id: this.id })
        })

        /*  ignore any interactions on worker and content browser windows  */
        worker.setMenu(null)
        worker.on("close",              (ev) => { ev.preventDefault() })
        worker.on("minimize",           (ev) => { ev.preventDefault() })
        worker.on("restore",            (ev) => { ev.preventDefault() })
        worker.on("maximize",           (ev) => { ev.preventDefault() })
        worker.on("unmaximize",         (ev) => { ev.preventDefault() })
        worker.on("enter-full-screen",  (ev) => { ev.preventDefault() })
        worker.on("leave-full-screen",  (ev) => { ev.preventDefault() })
        content.setMenu(null)
        content.on("close",             (ev) => { ev.preventDefault() })
        content.on("minimize",          (ev) => { ev.preventDefault() })
        content.on("restore",           (ev) => { ev.preventDefault() })
        content.on("maximize",          (ev) => { ev.preventDefault() })
        content.on("unmaximize",        (ev) => { ev.preventDefault() })
        content.on("enter-full-screen", (ev) => { ev.preventDefault() })
        content.on("leave-full-screen", (ev) => { ev.preventDefault() })

        /*  ignore certain window events  */
        content.on("page-title-updated", (ev) => {
            ev.preventDefault()
        })

        /*  remember window object  */
        this.content = content

        /*  adjust contents  */
        content.webContents.on("dom-ready", async (ev) => {
            /*  load postload script once the DOM is ready  */
            const code = await fs.promises.readFile(
                path.join(__dirname, "vingester-browser-postload.js"),
                { encoding: "utf8" })
            content.webContents.executeJavaScript(code)

            /*  optionally patch content  */
            if (this.cfg.q !== "" || this.cfg.Q !== "") {
                setTimeout(async () => {
                    /*  determine target frame  */
                    const mainFrame = content.webContents.mainFrame
                    let frame
                    if (this.cfg.j === "")
                        frame = mainFrame.top
                    else {
                        const regexp = new RegExp(this.cfg.j)
                        frame = mainFrame.framesInSubtree.find((frame) => regexp.test(frame.url))
                    }
                    if (frame === undefined || frame === null)
                        return

                    /*  patch content  */
                    let script = ""
                    if (this.cfg.q !== "") {
                        let css = this.cfg.q
                        if (this.cfg.g === "file")
                            css = await fs.promises.readFile(css, { encoding: "utf8" })
                        css = css.replace(/[""]/g, "\\\"").replace(/\r?\n/g, "\\n")
                        script += `;(function () {
                            const style = document.createElement("style");
                            style.type = "text/css";
                            style.appendChild(document.createTextNode("${css}"));
                            const head = document.getElementsByTagName("head")[0];
                            head.appendChild(style);
                        })();`
                    }
                    if (this.cfg.Q !== "") {
                        let js = this.cfg.Q
                        if (this.cfg.G === "file")
                            js = await fs.promises.readFile(js, { encoding: "utf8" })
                        script += js
                    }
                    this.log.info("EXEC", script)
                    frame.executeJavaScript(script, true)
                }, this.cfg.k)
            }

            /*  force zoom level (sometimes Chromium keeps old factors if
                just the "zoomFactor" attribute is used)  */
            if (this.cfg.D)
                content.webContents.setZoomFactor(this.cfg.z / factor)
            else
                content.webContents.setZoomFactor(this.cfg.z)

            /*  initially raise events  */
            setTimeout(() => {
                raiseContentEvent("vingesterTallyChanged", "unconnected")
                changeVisibilityState("hidden")
                if (this.cfg.B) {
                    raiseContentEvent("obsSourceActiveChanged",  { active: false })
                    raiseContentEvent("obsSourceVisibleChanged", { visible: false })
                }
            }, 100)
        })

        /*  finally load the Web Content  */
        return new Promise((resolve, reject) => {
            content.webContents.once("did-fail-load", (ev, code, desc, url, isMainFrame) => {
                ev.preventDefault()
                this.log.info(`browser: content: failed (code: ${code}, desc: ${desc}, url: ${url}, isMainFrame: ${isMainFrame})`)
                this.control.webContents.send("message", `browser: content: failed (code: ${code}, desc: ${desc}, url: ${url}, isMainFrame: ${isMainFrame})`)
                this.starting = false
                resolve(isMainFrame ? false : true)
            })
            content.webContents.once("did-finish-load", (ev) => {
                ev.preventDefault()
                this.log.info("browser: content: started")
                this.update()
                this.starting = false
                resolve(true)
            })
            content.loadURL(this.cfg.u)
        })
    }

    /*  update browser (after reconfiguration)  */
    update () {
        this.log.info("browser: update")

        /*  optionally update already running worker browser instance  */
        if (this.worker !== null) {
            this.worker.webContents.send("browser-worker-reconfigure", {
                ...this.cfg,
                controlId: this.control.webContents.id,
                workerId: this.worker.webContents.id
            })
        }

        /*  optionally update already running content browser instance  */
        if (this.content !== null) {
            if (this.cfg.D) {
                if (this.framerateNow <= 0) {
                    if (this.subscribed) {
                        this.log.info("browser: stopping frame capturing (method: frame)")
                        this.framesToSkip = this.framerateSource
                        this.content.webContents.endFrameSubscription()
                        this.subscribed = false
                    }
                }
                else {
                    const framesToSkip = Math.trunc((this.framerateSource / this.framerateNow) - 1)
                    if (this.framesToSkip !== framesToSkip) {
                        this.log.info("browser: changing capturing frame rate to " +
                            `${this.framerateNow} (method: frame)`)
                        this.framesToSkip = framesToSkip
                    }
                    if (!this.subscribed) {
                        this.log.info("browser: starting frame capturing (method: frame)")
                        this.content.webContents.beginFrameSubscription(false, this.subscriber)
                        this.subscribed = true
                    }
                }
            }
            else if (this.cfg.N) {
                if (this.framerateNow <= 0) {
                    if (this.subscribed) {
                        this.log.info("browser: stopping frame capturing (method: paint)")
                        this.content.webContents.stopPainting()
                        this.content.webContents.off("paint", this.subscriber)
                        this.subscribed = false
                    }
                }
                else {
                    if (this.content.webContents.getFrameRate() !== this.framerateNow) {
                        this.log.info("browser: changing capturing frame rate to " +
                            `${this.framerateNow} (method: paint)`)
                        this.content.webContents.setFrameRate(this.framerateNow)
                    }
                    if (!this.subscribed) {
                        this.log.info("browser: starting frame capturing (method: paint)")
                        this.content.webContents.on("paint", this.subscriber)
                        this.content.webContents.startPainting()
                        this.subscribed = true
                    }
                }
            }
        }
    }

    /*  reload browser  */
    reload () {
        this.log.info("browser: reload")
        if (this.content === null)
            throw new Error("still not started")
        this.content.reload()
    }

    /*  stop browser  */
    async stop () {
        /*  stop just once  */
        if (this.stopping)
            return
        this.stopping = true
        this.log.info("browser: stop")

        /*  sanity check situation  */
        if (this.content === null || this.worker === null)
            throw new Error("browser still not started")

        /*  stop frame capturing  */
        if (this.cfg.D) {
            if (this.subscribed) {
                this.content.webContents.endFrameSubscription()
                this.subscribed = false
            }
        }
        else if (this.cfg.N) {
            if (this.subscribed) {
                this.content.webContents.off("paint", this.subscriber)
                this.content.webContents.stopPainting()
                this.subscribed = false
            }
        }

        /*  notify worker and wait until its processVideo/processAudio
            callbacks were at least done one last time  */
        this.worker.webContents.send("browser-worker-stop")
        await new Promise((resolve) => setTimeout(resolve, 200))

        /*  remove all listeners  */
        this.worker.removeAllListeners()
        this.worker.webContents.removeAllListeners()
        this.content.removeAllListeners()
        this.content.webContents.removeAllListeners()

        /*  destroy content and worker browsers the soft way  */
        const p1 = new Promise((resolve) => this.worker.once("closed",  resolve))
        const p2 = new Promise((resolve) => this.content.once("closed", resolve))
        const p3 = new Promise((resolve) => setTimeout(resolve, 1000))
        this.worker.close()
        this.content.close()
        await bluebird.any([ Promise.all([ p1, p2 ]), p3 ])

        /*  destroy content and worker browsers the hard way  */
        if (!this.worker.isDestroyed())
            this.worker.destroy()
        if (!this.content.isDestroyed())
            this.content.destroy()

        /*  reset the internal state  */
        this.reset()
        this.log.info("browser: stopped")
        this.stopping = false
        return true
    }

    /*  clear browser  */
    async clear () {
        if (!this.cfg.S)
            return
        const name = `vingester-browser-content-${this.id.toLowerCase()}`
        const session = electron.session.fromPartition(`persist:${name}`)
        await session.clearCache()
        await session.clearAuthCache()
        await session.clearHostResolverCache()
        await session.clearStorageData()
        await new Promise((resolve, reject) => {
            const p = path.join(electron.app.getPath("userData"), "Partitions", name)
            this.log.info(`browser: clearing session persistance area: "${p}"`)
            rimraf(p, { disableGlob: true }, (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
        return true
    }
}

