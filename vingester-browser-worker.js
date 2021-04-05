/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  require internal modules  */
const os               = require("os")

/*  require external modules  */
const electron         = require("electron")
const electronLog      = require("electron-log")
const grandiose        = require("grandiose")
const Jimp             = require("jimp")
const pcmconvert       = require("pcm-convert")
const ebml             = require("ebml")
const Opus             = require("@discordjs/opus")

/*  require own modules  */
const util             = require("./vingester-util.js")

/*  parse passed-through browser configuration  */
const cfg = JSON.parse(process.argv[process.argv.length - 1])

/*  etablish reasonable logging environment  */
if (typeof process.env.DEBUG !== "undefined") {
    electronLog.transports.file.level    = false
    electronLog.transports.console.level = false
    electronLog.transports.ipc.level     = "debug"
}
else {
    electronLog.transports.file.level    = false
    electronLog.transports.console.level = false
    electronLog.transports.ipc.level     = "info"
}
electronLog.transports.remote.level   = false
electronLog.transports.console.format = "{h}:{i}:{s}.{ms} > [{level}] {scope} {text}"
electronLog.transports.file.format    = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {scope} {text}"
const log = electronLog.scope(`browser/worker-${cfg.id}`)

/*  define Worker class  */
class BrowserWorker {
    constructor (log, id, cfg) {
        this.log             = log
        this.id              = id
        this.cfg             = cfg
        this.stopping        = false
        this.timeStart       = (BigInt(Date.now()) * BigInt(1e6) - process.hrtime.bigint())
        this.ndiSender       = null
        this.opusEncoder     = null
        this.burst1          = null
        this.burst2          = null
        this.frames          = 0
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
        this.ndiSender = (this.cfg.N ? await grandiose.send({
            name:       title,
            clockVideo: false,
            clockAudio: false
        }) : null)
        this.burst1 = new util.WeightedAverage(this.cfg.f * 2, this.cfg.f)
        this.burst2 = new util.WeightedAverage(this.cfg.f * 2, this.cfg.f)

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
        electron.ipcRenderer.on("video-capture", (ev, data) => {
            this.processVideo(data)
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

        /*  destroy NDI sender  */
        if (this.ndiSender !== null)
            await this.ndiSender.destroy()
        this.log.info("stopped")
    }

    /*  process a single captured frame  */
    async processVideo ({ size, ratio, buffer, dirty, framesToSkip }) {
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
            electron.ipcRenderer.sendTo(this.cfg.controlId, "capture", {
                buffer: img.bitmap.data,
                size: {
                    width:  img.bitmap.width,
                    height: img.bitmap.height
                },
                id: this.id
            })
        }

        /*  send NDI video frame  */
        if (this.cfg.N) {
            if (this.frames++ > framesToSkip) {
                this.frames = 0
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
        }

        /*  end time-keeping  */
        const t1 = Date.now()
        this.burst1.record(t1 - t0, (stat) => {
            electron.ipcRenderer.sendTo(this.cfg.controlId, "burst",
                { ...stat, type: "video", id: this.id })
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

        /*  send NDI audio frame  */
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

            /*  convert from PCM/signed-16-bit/little-endian data
                to NDI's "PCM/planar/signed-float32/little-endian  */
            buffer = pcmconvert(buffer, {
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
                noSamples:          Math.trunc(buffer.byteLength / noChannels / bytesForFloat32),
                channelStrideBytes: Math.trunc(buffer.byteLength / noChannels),

                /*  the data itself  */
                fourCC:             grandiose.FOURCC_FLTp,
                data:               buffer
            }
            await this.ndiSender.audio(frame)
        }

        /*  end time-keeping  */
        const t1 = Date.now()
        this.burst2.record(t1 - t0, (stat) => {
            electron.ipcRenderer.sendTo(this.cfg.controlId, "burst",
                { ...stat, type: "audio", id: this.id })
        })
    }
}

/*  boot worker  */
const browserWorker = new BrowserWorker(log, cfg.id, cfg)
browserWorker.start()

/*  shutdown worker  */
electron.ipcRenderer.on("browser-worker-stop", async (ev) => {
    await browserWorker.stop()
    electron.ipcRenderer.send("browser-worker-stopped")
})
