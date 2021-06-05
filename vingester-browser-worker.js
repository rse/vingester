/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  require internal modules  */
const os               = require("os")

/*  require external modules  */
const electron         = require("electron")
const grandiose        = require("grandiose")
const pcmconvert       = require("pcm-convert")
const ebml             = require("ebml")
const Opus             = require("@discordjs/opus")

/*  require own modules  */
const util             = require("./vingester-util.js")
const FFmpeg           = require("./vingester-ffmpeg.js")
const vingesterLog     = require("./vingester-log.js")

/*  parse passed-through browser configuration  */
const cfg = JSON.parse(process.argv[process.argv.length - 1])

/*  etablish reasonable logging environment  */
const log = vingesterLog.scope(`browser/worker-${cfg.id}`)

/*  define Worker class  */
class BrowserWorker {
    constructor (log, id, cfg) {
        this.log             = log
        this.id              = id
        this.cfg             = cfg
        this.stopping        = false
        this.timeStart       = (BigInt(Date.now()) * BigInt(1e6) - process.hrtime.bigint())
        this.ndiSender       = null
        this.ndiTimer        = null
        this.ffmpeg          = null
        this.opusEncoder     = null
        this.burst1          = null
        this.burst2          = null
        this.videopps        = null
        this.audiopps        = null
        this.frames          = 0
    }

    /*  reconfigure running worker  */
    reconfigure (cfg) {
        this.cfg = cfg
    }

    /*  return current time in nanoseconds since Unix epoch time as a BigInt  */
    timeNow () {
        return this.timeStart + process.hrtime.bigint()
    }

    /*  start worker  */
    async start () {
        this.log.info("starting")

        /*  determine window title  */
        const title = (this.cfg.t == null ? "Vingester" : this.cfg.t)

        /*  create NDI sender  */
        this.ndiSender = null
        this.ndiTimer  = null
        this.ndiStatus = "unconnected"
        if (this.cfg.N) {
            if (this.cfg.n) {
                this.ndiSender = await grandiose.send({
                    name:       title,
                    clockVideo: false,
                    clockAudio: false
                })
                this.ndiTimer = setInterval(() => {
                    if (this.stopping)
                        return

                    /*  poll NDI for connections and tally status  */
                    const conns = this.ndiSender.connections()
                    const tally = this.ndiSender.tally()

                    /*  determine our Vingester "tally status"  */
                    this.ndiStatus = "unconnected"
                    if      (tally.on_program) this.ndiStatus = "program"
                    else if (tally.on_preview) this.ndiStatus = "preview"
                    else if (conns > 0)        this.ndiStatus = "connected"

                    /*  send tally status  */
                    electron.ipcRenderer.sendTo(this.cfg.controlId, "tally",
                        { status: this.ndiStatus, connections: conns, id: this.id })
                    electron.ipcRenderer.send("tally",
                        { status: this.ndiStatus, connections: conns, id: this.id })
                }, 1 * 500)
            }
            if (this.cfg.m) {
                this.ffmpeg = new FFmpeg({
                    ffmpeg: this.cfg.ffmpeg,
                    cwd:    this.cfg.ffmpegCwd,
                    width:  this.cfg.w,
                    height: this.cfg.h,
                    mode:   this.cfg.R,
                    format: this.cfg.F,
                    fps:    this.cfg.f,
                    asr:    this.cfg.r,
                    ac:     this.cfg.C,
                    args:   this.cfg.M.split(/\s+/),
                    log: (level, msg) => {
                        this.log[level](msg)
                    }
                })
                this.ffmpeg.on("fatal", (msg) => {
                    this.log.error(`FFmpeg fatal error: ${msg}`)
                    electron.ipcRenderer.sendTo(this.cfg.controlId, "message",
                        `FFmpeg fatal error: ${msg}`)
                })
                await this.ffmpeg.start()
            }
        }
        this.burst1   = new util.WeightedAverage(this.cfg.f * 2, this.cfg.f)
        if (this.cfg.f > 0)
            this.burst2   = new util.WeightedAverage(this.cfg.f * 2, this.cfg.f)
        else
            this.burst2   = new util.WeightedAverage(30, 15)
        this.videopps = new util.ActionsPerTime(1000)
        this.audiopps = new util.ActionsPerTime(1000)

        /*  capture and send browser audio stream Chromium provides a
            Webm/Matroska/EBML container with embedded(!) OPUS data,
            so we here first have to decode the EBML container chunks  */
        const ebmlDecoder = new ebml.Decoder()
        ebmlDecoder.on("data", (data) => {
            /*  we receive EBML chunks...  */
            if (data[0] === "tag" && data[1].type === "b" && data[1].name === "SimpleBlock") {
                /*  ...and just process the data chunks containing the OPUS data  */
                this.processAudio(data[1].payload)
            }
        })

        /*  receive audio capture data  */
        electron.ipcRenderer.on("audio-capture", (ev, data) => {
            ebmlDecoder.write(Buffer.from(data.buffer))
        })

        /*  receive video capture data  */
        electron.ipcRenderer.on("video-capture", (ev, data, size, ratio, dirty) => {
            this.processVideo(data, size, ratio, dirty)
        })
        this.log.info("started")
    }

    /*  stop worker  */
    async stop () {
        this.log.info("stopping")
        this.stopping = true

        /*  destroy OPUS encoder  */
        if (this.opusEncoder !== null)
            this.opusEncoder = null

        /*  destroy NDI timer  */
        if (this.ndiTimer !== null) {
            clearTimeout(this.ndiTimer)
            this.ndiTimer = null
        }

        /*  destroy NDI sender  */
        if (this.ndiSender !== null)
            await this.ndiSender.destroy()

        /*  destroy FFmpeg sender  */
        if (this.ffmpeg !== null)
            await this.ffmpeg.stop()

        this.log.info("stopped")
    }

    /*  process a single captured frame  */
    async processVideo (buffer, size, ratio, dirty) {
        if (!(this.cfg.N || this.cfg.P) || this.stopping)
            return

        /*  optionally delay the processing  */
        const offset = this.cfg.O
        if (offset > 0)
            await new Promise((resolve) => setTimeout(resolve, offset))
        if (this.stopping)
            return

        /*  start time-keeping  */
        const t0 = Date.now()

        /*  send preview capture frame  */
        if (this.cfg.P) {
            /*  create nativeImage out of buffer again  */
            let img = electron.nativeImage.createFromBitmap(buffer,
                { width: size.width, height: size.height })

            /*  resize image to small preview  */
            if ((size.width / size.height) >= (160 / 90))
                img = img.resize({ width: 160 })
            else
                img = img.resize({ height: 90 })

            /*  retrieve buffer again  */
            const buffer2 = img.getBitmap()
            const size2   = img.getSize()

            /*  convert from ARGB/BGRA (Electron/Chromium capture output) to RGBA (Web canvas)  */
            if (os.endianness() === "BE")
                util.ImageBufferAdjustment.ARGBtoRGBA(buffer2)
            else
                util.ImageBufferAdjustment.BGRAtoRGBA(buffer2)

            /*  send result to control UI  */
            electron.ipcRenderer.sendTo(this.cfg.controlId, "capture",
                { buffer: buffer2, size: size2, id: this.id })
        }

        /*  send video frame  */
        if (this.cfg.N) {
            if (this.cfg.n) {
                /*  convert from ARGB (Electron/Chromium on big endian CPU)
                    to BGRA (supported input of NDI SDK). On little endian
                    CPU the input is already BGRA.  */
                if (os.endianness() === "BE")
                    util.ImageBufferAdjustment.ARGBtoBGRA(buffer)

                /*  send NDI video frame  */
                const now = this.timeNow()
                const bytesForBGRA = 4
                const frame = {
                    /*  base information  */
                    timecode:           now / BigInt(100),

                    /*  type-specific information  */
                    xres:               size.width,
                    yres:               size.height,
                    frameRateN:         this.cfg.f * 1000,
                    frameRateD:         1000,
                    pictureAspectRatio: ratio,
                    frameFormatType:    grandiose.FORMAT_TYPE_PROGRESSIVE,
                    lineStrideBytes:    size.width * bytesForBGRA,

                    /*  the data itself  */
                    fourCC:             grandiose.FOURCC_BGRA,
                    data:               buffer
                }
                await this.ndiSender.video(frame)
            }
            if (this.cfg.m) {
                /*  keep the BGRA (Electron/Chromium on little endian CPU)
                    or ARGB (Electron/Chromium on big endian CPU) format,
                    as the nativeImage expects it in the native format
                    and correctly handles the RGBA conversion internally  */

                /*  convert buffer into a JPEG (understood by FFmpeg)  */
                const img = electron.nativeImage.createFromBitmap(buffer,
                    { width: size.width, height: size.height })
                const data = img.toJPEG(100)

                /*  send FFmpeg video frame  */
                this.ffmpeg.video(data)
            }
        }

        /*  end time-keeping  */
        const t1 = Date.now()
        this.burst1.record(t1 - t0, (stat) => {
            electron.ipcRenderer.sendTo(this.cfg.controlId, "burst",
                { ...stat, type: "video", id: this.id })
        })

        /*  track packets per second  */
        this.videopps.record((pps) => {
            electron.ipcRenderer.sendTo(this.cfg.controlId, "rate",
                { pps, type: "video", id: this.id })
        })
    }

    /*  process a single captured audio data  */
    async processAudio (buffer) {
        if (!(this.cfg.N) || this.stopping)
            return

        /*  optionally delay the processing  */
        const offset = this.cfg.o
        if (offset > 0)
            await new Promise((resolve) => setTimeout(resolve, offset))
        if (this.stopping)
            return

        /*  start time-keeping  */
        const t0 = Date.now()

        /*  send NDI or FFmpeg audio frame  */
        if (this.cfg.N) {
            /*  determine frame information  */
            const sampleRate = this.cfg.r
            const noChannels = this.cfg.C
            const bytesForFloat32 = 4

            /*  decode raw OPUS packets into raw
                PCM/interleaved/signed-int16/little-endian data  */
            if (this.opusEncoder === null)
                this.opusEncoder = new Opus.OpusEncoder(sampleRate, noChannels)
            buffer = this.opusEncoder.decode(buffer)

            /*  send audio frame  */
            if (this.cfg.n) {
                /*  convert from PCM/signed-16-bit/little-endian data
                    to NDI's "PCM/planar/signed-float32/little-endian  */
                const buffer2 = pcmconvert(buffer, {
                    channels:    noChannels,
                    dtype:       "int16",
                    endianness:  "le",
                    interleaved: true
                }, {
                    dtype:       "float32",
                    endianness:  "le",
                    interleaved: false
                })

                /*  create frame  */
                const now = this.timeNow()
                const frame = {
                    /*  base information  */
                    timecode:           now / BigInt(100),

                    /*  type-specific information  */
                    sampleRate:         sampleRate,
                    noChannels:         noChannels,
                    noSamples:          Math.trunc(buffer2.byteLength / noChannels / bytesForFloat32),
                    channelStrideBytes: Math.trunc(buffer2.byteLength / noChannels),

                    /*  the data itself  */
                    fourCC:             grandiose.FOURCC_FLTp,
                    data:               buffer2
                }
                await this.ndiSender.audio(frame)
            }
            if (this.cfg.m) {
                /*  send FFmpeg audio frame  */
                await this.ffmpeg.audio(buffer)
            }
        }

        /*  end time-keeping  */
        const t1 = Date.now()
        this.burst2.record(t1 - t0, (stat) => {
            electron.ipcRenderer.sendTo(this.cfg.controlId, "burst",
                { ...stat, type: "audio", id: this.id })
        })

        /*  track packets per second  */
        this.audiopps.record((pps) => {
            electron.ipcRenderer.sendTo(this.cfg.controlId, "rate",
                { pps, type: "audio", id: this.id })
        })
    }
}

/*  boot worker  */
const browserWorker = new BrowserWorker(log, cfg.id, cfg)
browserWorker.start()

/*  reconfigure worker  */
electron.ipcRenderer.on("browser-worker-reconfigure", async (ev, cfg) => {
    browserWorker.reconfigure(cfg)
})

/*  shutdown worker  */
electron.ipcRenderer.on("browser-worker-stop", async (ev) => {
    await browserWorker.stop()
    electron.ipcRenderer.send("browser-worker-stopped")
})
