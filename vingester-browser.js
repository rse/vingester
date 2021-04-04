/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  require internal modules  */
const fs          = require("fs")
const path        = require("path")

/*  require external modules  */
const electron    = require("electron")
const bluebird    = require("bluebird")

/*  browser abstraction  */
module.exports = class Browser {
    /*  create new browser  */
    constructor (log, id, cfg, mainWin) {
        this.log             = log
        this.id              = id
        this.cfg             = cfg
        this.cfgParsed       = {}
        this.mainWin         = mainWin
        this.update()
        this.reset()
    }

    /*  reset internal state  */
    reset () {
        this.worker          = null
        this.content         = null
        this.subscribed      = false
        this.subscriber      = null
        this.stopping        = false
    }

    /*  explicitly allow capturing our content browser windows  */
    static prepare () {
        const session = electron.session.fromPartition("vingester-browser-content")
        const allowedPermissions = [
            "audioCapture", "desktopCapture", "pageCapture", "tabCapture", "experimental"
        ]
        session.setPermissionRequestHandler((webContents, permission, callback) => {
            if (allowedPermissions.includes(permission))
                callback(true)
            else
                callback(false)
        })
    }

    /*  reconfigure browser  */
    reconfigure (cfg) {
        this.log.info("browser: reconfigure")
        Object.assign(this.cfg, cfg)
        this.update()
    }

    /*  check whether browser is running  */
    running () {
        return (this.content !== null && this.worker !== null)
    }

    /*  start browser  */
    async start () {
        this.log.info("browser: start")

        /*  create worker browser window (offscreen only)  */
        const debug = (typeof process.env.DEBUG !== "undefined")
        const worker = new electron.BrowserWindow({
            offscreen:       true,
            show:            false,
            width:           200,
            height:          200,
            title:           "Vingester Browser Worker",
            webPreferences: {
                devTools:                   debug,
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
                    ...this.cfgParsed,
                    mainId: this.mainWin.webContents.id
                }) ]
            }
        })
        worker.removeMenu()
        if (debug) {
            setTimeout(() => {
                worker.webContents.openDevTools()
            }, 1000)
        }

        /*  load content into worker browser window  */
        await new Promise((resolve, reject) => {
            worker.webContents.once("did-fail-load", (ev, errorCode, errorDescription) => {
                ev.preventDefault()
                this.log.info("browser: worker: failed")
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

        /*  determine scale factor and width/height  */
        const factor = electron.screen.getPrimaryDisplay().scaleFactor
        const width  = Math.round(this.cfgParsed.w / factor)
        const height = Math.round(this.cfgParsed.h / factor)

        /*  determine display  */
        const point = electron.screen.getCursorScreenPoint()
        let D = electron.screen.getDisplayNearestPoint(point)
        let m
        if (this.cfg.d !== null && (m = this.cfg.d.match(/^([-+]?[01]),([-+]?[01])$/))) {
            const d = electron.screen.getPrimaryDisplay()
            const w = d.size.width
            const h = d.size.height
            const point = {
                x: (w * 0.5) + parseInt(m[1]) * w,
                y: (w * 0.5) + parseInt(m[2]) * h
            }
            D = electron.screen.getDisplayNearestPoint(point)
        }

        /*  determine position  */
        let pos = {}
        if (this.cfg.x !== null && this.cfg.y !== null) {
            const x = Math.round(D.bounds.x + (this.cfgParsed.x / factor))
            const y = Math.round(D.bounds.y + (this.cfgParsed.y / factor))
            pos = { x, y }
        }

        /*  create content browser window (visible or offscreen)  */
        const opts1 = (this.cfg.D ? {
            ...pos,
            width:           width,
            height:          height,
            useContentSize:  false,
            autoHideMenuBar: true,
            frame:           false,
            hasShadow:       false,
            backgroundColor: this.cfg.c,
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
        } : {
            offscreen:       true
        })
        const content = new electron.BrowserWindow({
            ...opts1,
            webPreferences: {
                ...opts2,
                partition:                  "vingester-browser-content",
                devTools:                   (typeof process.env.DEBUG !== "undefined"),
                backgroundThrottling:       false,
                preload:                    path.join(__dirname, "vingester-browser-preload.js"),
                nodeIntegration:            false,
                nodeIntegrationInWorker:    false,
                contextIsolation:           true,
                enableRemoteModule:         false,
                disableDialogs:             true,
                autoplayPolicy:             "no-user-gesture-required",
                spellcheck:                 false,
                zoomFactor:                 1.0 / factor,
                additionalArguments:        [ JSON.stringify({
                    ...this.cfg,
                    ...this.cfgParsed,
                    mainId: this.mainWin.webContents.id,
                    workerId: this.worker.webContents.id
                }) ]
            }
        })

        /*  control audio (for desktop window we unmute, for NDI we mute)  */
        if (this.cfg.D || (this.cfg.N && this.cfgParsed.C === 0))
            content.webContents.setAudioMuted(false)
        else
            content.webContents.setAudioMuted(true)

        /*  force aspect ratio  */
        content.setAspectRatio(this.cfgParsed.w / this.cfgParsed.h)

        /*  force always on top  */
        if (this.cfg.p) {
            /*  show window higher than all regular windows, but still behind
                things like spotlight or the screen saver and allow the window to
                show over a fullscreen window  */
            content.setAlwaysOnTop(true, "floating", 1)
            content.setVisibleOnAllWorkspaces(true)
        }
        else {
            content.setAlwaysOnTop(false)
            content.setVisibleOnAllWorkspaces(false)
        }

        /*  capture and send browser frame content  */
        const framerate = (this.cfg.N ? this.cfgParsed.f : D.displayFrequency)
        if (this.cfg.D) {
            /*  use Frame subscription where framerate cannot be controlled
                (but which is available also for onscreen rendering)  */
            const framesToSkip = Math.trunc((D.displayFrequency / framerate) - 1)
            if (this.cfg.N || this.cfg.P) {
                this.subscriber = (image, dirty) => {
                    if (this.worker === null || this.worker.isDestroyed())
                        return
                    const size   = image.getSize()
                    const ratio  = image.getAspectRatio(factor)
                    const buffer = image.getBitmap()
                    this.worker.webContents.send("video-capture",
                        { size, ratio, buffer, dirty, framesToSkip: framesToSkip })
                }
                content.webContents.beginFrameSubscription(false, this.subscriber)
                this.subscribed = true
            }
        }
        else if (this.cfg.N) {
            /*  use Paint hook where framerate can be controlled
                (but which is available for offscreen rendering only)  */
            this.subscriber = (ev, dirty, image) => {
                if (this.worker === null || this.worker.isDestroyed())
                    return
                const size   = image.getSize()
                const ratio  = image.getAspectRatio(factor)
                const buffer = image.getBitmap()
                this.worker.webContents.send("video-capture",
                    { size, ratio, buffer, dirty, framesToSkip: 0 })
            }
            content.webContents.on("paint", this.subscriber)
            content.webContents.setFrameRate(framerate)
            content.webContents.startPainting()
        }

        /*  receive console outputs  */
        content.webContents.on("console-message", (ev, level, message, line, sourceId) => {
            const trace = { level, message }
            if (this.mainWin !== null && !this.mainWin.isDestroyed())
                this.mainWin.webContents.send("trace", { ...trace, id: this.id })
        })

        /*  react on window events  */
        content.on("close", (ev) => {
            ev.preventDefault()
        })
        content.on("page-title-updated", (ev) => {
            ev.preventDefault()
        })

        /*  provide logging for browser  */
        content.webContents.on("ipc-message", (ev, channel, ...args) => {
        })

        /*  remember window object  */
        this.content = content

        /*  load postload script once the DOM is ready  */
        content.webContents.on("dom-ready", async (ev) => {
            const code = await fs.promises.readFile(
                path.join(__dirname, "vingester-browser-postload.js"),
                { encoding: "utf8" })
            content.webContents.executeJavaScript(code)
        })

        /*  finally load the Web Content  */
        return new Promise((resolve, reject) => {
            content.webContents.once("did-fail-load", (ev, errorCode, errorDescription) => {
                ev.preventDefault()
                this.log.info("browser: content: failed")
                resolve(false)
            })
            content.webContents.once("did-finish-load", (ev) => {
                ev.preventDefault()
                this.log.info("browser: content: started")
                resolve(true)
            })
            content.loadURL(this.cfg.u)
        })
    }

    /*  update browser (after reconfiguration)  */
    update () {
        this.log.info("browser: update")

        /*  pre-parse configuration strings  */
        this.cfgParsed.w = parseInt(this.cfg.w)
        this.cfgParsed.h = parseInt(this.cfg.h)
        this.cfgParsed.x = parseInt(this.cfg.x)
        this.cfgParsed.y = parseInt(this.cfg.y)
        this.cfgParsed.f = parseInt(this.cfg.f)
        this.cfgParsed.O = parseInt(this.cfg.O)
        this.cfgParsed.o = parseInt(this.cfg.o)
        this.cfgParsed.r = parseInt(this.cfg.r)
        this.cfgParsed.C = parseInt(this.cfg.C)

        /*  optionally update already running browser instance  */
        if (this.content !== null) {
            if (this.cfg.D) {
                if (this.subscribed && !this.cfg.P) {
                    this.content.webContents.endFrameSubscription()
                    this.subscribed = false
                }
                else if (!this.subscribed && this.cfg.P) {
                    this.content.webContents.beginFrameSubscription(false, this.subscriber)
                    this.subscribed = true
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

        /*  sanity check situation  */
        if (this.content === null || this.worker === null)
            throw new Error("browser still not started")

        /*  notify worker and wait until its processVideo/processAudio
            callbacks were at least done one last time  */
        this.log.info("browser: stop")
        this.worker.webContents.send("browser-worker-stop")
        await new Promise((resolve) => setTimeout(resolve, 100))

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
        return true
    }
}

