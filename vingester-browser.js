/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  require internal modules  */
const os          = require("os")
const fs          = require("fs")
const path        = require("path")

/*  require external modules  */
const electron    = require("electron")
const grandiose   = require("grandiose")
const Jimp        = require("jimp")
const pcmconvert  = require("pcm-convert")
const ebml        = require("ebml")

/*  require own modules  */
const util        = require("./vingester-util.js")

/*  browser abstraction  */
module.exports = class Browser {
    /*  create new browser  */
    constructor (log, id, cfg, mainWin) {
        this.log             = log
        this.id              = id
        this.cfg             = cfg
        this.mainWin         = mainWin
        this.reset()
    }

    /*  reset internal state  */
    reset () {
        this.win             = null
        this.subscribed      = false
        this.ndiSender       = null
        this.ndiFramesToSkip = 0
        this.frames          = 0
        this.burst           = null
        this.factor          = 1.0
        this.framerate       = 30
        this.stopping        = false
        this.ebmlDecoder     = null
        this.timeStart       = (BigInt(Date.now()) * BigInt(1e6) - process.hrtime.bigint())
    }

    /*  return current time in nanoseconds since Unix epoch time as a BigInt  */
    timeNow () {
        return this.timeStart + process.hrtime.bigint()
    }

    /*  explicitly allow capturing our browser windows  */
    static prepare () {
        const session = electron.session.fromPartition("vingester-browser")
        const allowedPermissions = [ "audioCapture", "desktopCapture", "pageCapture", "tabCapture", "experimental" ]
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
        return (this.win !== null)
    }

    /*  start browser  */
    async start () {
        this.log.info("browser: start")

        /*  determine window title  */
        const title = (this.cfg.t == null ? "Vingester" : this.cfg.t)

        /*  determine scale factor and width/height  */
        this.factor = electron.screen.getPrimaryDisplay().scaleFactor
        const width  = Math.round(parseInt(this.cfg.w) / this.factor)
        const height = Math.round(parseInt(this.cfg.h) / this.factor)

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
            const x = Math.round(D.bounds.x + (parseInt(this.cfg.x) / this.factor))
            const y = Math.round(D.bounds.y + (parseInt(this.cfg.y) / this.factor))
            pos = { x, y }
        }

        /*  create new browser window  */
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
        const win = new electron.BrowserWindow({
            ...opts1,
            webPreferences: {
                ...opts2,
                partition:                  "vingester-browser",
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
                zoomFactor:                 1.0 / this.factor,
                additionalArguments:        [ JSON.stringify(this.cfg) ]
            }
        })

        /*  force aspect ratio  */
        win.setAspectRatio(parseInt(this.cfg.w) / parseInt(this.cfg.h))

        /*  force always on top  */
        if (this.cfg.p) {
            /*  show window higher than all regular windows, but still behind
                things like spotlight or the screen saver and allow the window to
                show over a fullscreen window  */
            win.setAlwaysOnTop(true, "floating", 1)
            win.setVisibleOnAllWorkspaces(true)
        }
        else {
            win.setAlwaysOnTop(false)
            win.setVisibleOnAllWorkspaces(false)
        }

        /*  capture and send browser frame content  */
        this.framerate = (this.cfg.N ? parseInt(this.cfg.f) : D.displayFrequency)
        this.ndiSender = (this.cfg.N ? await grandiose.send({
            name:       title,
            clockVideo: false,
            clockAudio: false
        }) : null)
        this.burst = new util.WeightedAverage(this.framerate, this.framerate / 2)
        if (this.cfg.D) {
            /*  use Frame subscription where framerate cannot be controlled
                (but which is available also for onscreen rendering)  */
            this.ndiFramesToSkip = Math.trunc((D.displayFrequency / this.framerate) - 1)
            if (this.cfg.N || this.cfg.P) {
                win.webContents.beginFrameSubscription(false, (image, dirty) => {
                    return this.processFrame(image, dirty)
                })
                this.subscribed = true
            }
        }
        else if (this.cfg.N) {
            /*  use Paint hook where framerate can be controlled
                (but which is available for offscreen rendering only)  */
            this.ndiFramesToSkip = 0
            win.webContents.on("paint", (ev, dirty, image) => {
                return this.processFrame(image, dirty)
            })
            win.webContents.setFrameRate(this.framerate)
            win.webContents.startPainting()
        }

        /*  capture and send browser audio stream
            Chromium provides a Webm/Matroska/EBML container with
            embedded(!) "interleaved PCM float32 little-endian" data,
            so we here first have to decode the EBML container chunks  */
        this.ebmlDecoder = new ebml.Decoder()
        this.ebmlDecoder.on("data", (chunk) => {
            this.processAudio(chunk)
        })

        /*  receive statistics and audio capture data  */
        win.webContents.on("ipc-message", (ev, channel, msg) => {
            if (channel === "stat" && this.mainWin !== null && !this.mainWin.isDestroyed())
                this.mainWin.webContents.send("stat", { ...msg, id: this.id })
            else if (channel === "audio-capture")
                this.ebmlDecoder.write(Buffer.from(msg.buffer))
        })

        /*  receive console outputs  */
        win.webContents.on("console-message", (ev, level, message, line, sourceId) => {
            const trace = { level, message }
            if (this.mainWin !== null && !this.mainWin.isDestroyed())
                this.mainWin.webContents.send("trace", { ...trace, id: this.id })
        })

        /*  react on window events  */
        win.on("close", (ev) => {
            ev.preventDefault()
        })
        win.on("page-title-updated", (ev) => {
            ev.preventDefault()
        })

        /*  remember window object  */
        this.win = win

        win.webContents.on("dom-ready", async (ev) => {
            const code = await fs.promises.readFile(
                path.join(__dirname, "vingester-browser-postload.js"),
                { encoding: "utf8" })
            win.webContents.executeJavaScript(code)
        })

        /*  finally load the Web Content  */
        return new Promise((resolve, reject) => {
            win.webContents.once("did-fail-load", (ev, errorCode, errorDescription) => {
                ev.preventDefault()
                this.log.info("browser: failed")
                resolve(false)
            })
            win.webContents.once("did-finish-load", (ev) => {
                ev.preventDefault()
                this.log.info("browser: started")
                resolve(true)
            })
            win.loadURL(this.cfg.u)
        })
    }

    /*  update browser (after reconfiguration)  */
    update () {
        this.log.info("browser: update")
        if (this.win !== null) {
            if (this.cfg.D) {
                if (this.subscribed && !this.cfg.P) {
                    this.win.webContents.endFrameSubscription()
                    this.subscribed = false
                }
                else if (!this.subscribed && this.cfg.P) {
                    this.win.webContents.beginFrameSubscription(false, (image, dirty) => {
                        return this.processFrame(image, dirty)
                    })
                    this.subscribed = true
                }
            }
        }
    }

    /*  process a single captured frame  */
    async processFrame (image, dirty) {
        if (!(this.cfg.N || this.cfg.P) || this.stopping)
            return
        const t0 = Date.now()

        /*  fetch image  */
        const size   = image.getSize()
        const buffer = image.getBitmap()

        /*  send preview capture frame  */
        if (this.cfg.P) {
            const img = await new Promise((resolve, reject) => {
                new Jimp({ data: buffer, width: size.width, height: size.height }, (err, image) => {
                    if (err)
                        reject(err)
                    else
                        resolve(image)
                })
            })
            img.resize(128, 72, Jimp.RESIZE_BILINEAR)
            if (os.endianness() === "LE") {
                /*  convert from BGRA (chrome "paint") to RGBA (canvas) if necessary  */
                img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
                    const B = this.bitmap.data[idx]
                    this.bitmap.data[idx] = this.bitmap.data[idx + 2]
                    this.bitmap.data[idx + 2] = B
                })
            }
            this.mainWin.webContents.send("capture", {
                buffer: img.bitmap.data,
                size: {
                    width: img.bitmap.width,
                    height: img.bitmap.height
                },
                id: this.id
            })
        }

        /*  send NDI video frame  */
        if (this.cfg.N) {
            if (this.frames++ > this.ndiFramesToSkip) {
                this.frames = 0
                const now = this.timeNow()
                const frame = {
                    /*  base information  */
                    type:               "video",
                    timecode:           now / BigInt(100),

                    /*  type-specific information  */
                    xres:               size.width,
                    yres:               size.height,
                    frameRateN:         this.framerate * 1000,
                    frameRateD:         1000,
                    pictureAspectRatio: image.getAspectRatio(this.factor),
                    frameFormatType:    grandiose.FORMAT_TYPE_PROGRESSIVE,
                    lineStrideBytes:    size.width * 4,

                    /*  the data itself  */
                    fourCC:             grandiose.FOURCC_BGRA,
                    data:               buffer
                }
                await this.ndiSender.video(frame)
            }
        }

        /*  record processing time  */
        const t1 = Date.now()
        this.burst.record(t1 - t0, (stat) => {
            this.mainWin.webContents.send("burst", { ...stat, id: this.id })
        })
    }

    /*  process a single captured audio data  */
    async processAudio (data) {
        if (!(this.cfg.N) || this.stopping)
            return

        /*  we here receive EBML chunks  */
        if (data[0] === "tag" && data[1].type === "b" && data[1].name === "SimpleBlock") {
            /*  and just extract the data chunks containing the PCM data  */
            let buffer = data[1].payload

            /*  send NDI audio frame  */
            if (this.cfg.N) {
                /*  optionally delay the processing  */
                const offset = parseInt(this.cfg.o)
                if (offset > 0)
                    await new Promise((resolve) => setTimeout(resolve, offset))

                /*  determine frame information  */
                const sampleRate = parseInt(this.cfg.r)
                const noChannels = parseInt(this.cfg.C)

                /*  optionally convert data from Chromium's "interleaved PCM float32 little-endian"
                    to NDI's "planar PCM float32 little-endian" format  */
                if (noChannels > 1) {
                    buffer = pcmconvert(buffer, {
                        channels:    noChannels,
                        dtype:       "float32",
                        endianness:  "le",
                        interleaved: true
                    }, {
                        dtype:       "float32",
                        endianness:  "le",
                        interleaved: false
                    })
                }

                /*  create frame  */
                const now = this.timeNow()
                const frame = {
                    /*  base information  */
                    type:               "audio",
                    timecode:           now / BigInt(100),

                    /*  type-specific information  */
                    sampleRate:         sampleRate,
                    noChannels:         noChannels,
                    noSamples:          Math.trunc(buffer.byteLength / noChannels / 4),
                    channelStrideBytes: Math.trunc(buffer.byteLength / noChannels),

                    /*  the data itself  */
                    fourCC:             grandiose.FOURCC_FLTp,
                    data:               Buffer.from(buffer.buffer)
                }
                await this.ndiSender.audio(frame)
            }
        }
    }

    /*  reload browser  */
    reload () {
        this.log.info("browser: reload")
        if (this.win === null)
            throw new Error("still not started")
        this.win.reload()
    }

    /*  stop browser  */
    async stop () {
        if (this.stopping)
            return
        if (this.win === null)
            throw new Error("still not started")

        /*  set flag and wait until processFrame is at least done one last time  */
        this.log.info("browser: stop")
        this.stopping = true
        await new Promise((resolve) => {
            setTimeout(() => { resolve() }, 50)
        })

        /*  destroy NDI sender  */
        if (this.ndiSender !== null)
            await this.ndiSender.destroy()

        /*  destroy browser  */
        this.win.close()
        await new Promise((resolve) => {
            setTimeout(() => {
                if (!this.win.isDestroyed())
                    this.win.destroy()
                resolve()
            }, 1000)
        })

        /*  reset the internal state  */
        this.reset()
        this.log.info("browser: stopped")
    }
}

