/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  standard requirements  */
const EventEmitter = require("events")

/*  external requirements  */
const execa        = require("execa")
const which        = require("which")

/*  the exported API  */
module.exports = class FFmpeg extends EventEmitter {
    constructor (options = {}) {
        super()

        /*  determine default option values  */
        this.options = Object.assign({}, {
            ffmpeg:     "ffmpeg",
            cwd:        "",
            width:      1280,
            height:     720,
            mode:       "vbr",
            format:     "matroska",
            args:       [],
            fps:        30,
            asr:        48000,
            ac:         2,
            log:        (level, msg) => {}
        }, options)

        /*  initialize state  */
        this.proc       = null
        this.stopping   = false
        this.workaround = false
    }
    async start () {
        /*  cleanup if necessary  */
        if (this.proc !== null && !this.stopping)
            await this.stop()

        /*  helper functions for bitrate calculation and size formatting  */
        const bitrateCalc = () => {
            /*  A general formula with the usual H.264 compression of 1:150 is:
                [width] x [height] x [bpp] x [fps] * [compression-ratio] = [bitrate]  */
            const bitrateH264 = (width, height, bpp, fps) => {
                const bitrate = (width * height * bpp * fps) * (1 / 150)
                return bitrate
            }

            /*  Kush Amerasinghe's "Kush Gauge" formula from
                his "H.264 Primer" (https://issuu.com/konu/docs/h264_primer)
                [width] x [height] x [fps] x [motion-rank] x 0.07 = [bitrate]  */
            const bitrateKush = (width, height, bpp, fps) => {
                const bitrate = width * height * fps * 1 * 0.07
                return bitrate
            }

            /*  Dr. Ralf S. Engelschall's calculation, based on
                the reference bitrate of 4500kbps for 1080p30 and
                aligned to the usual YouTube bitrate expectations  */
            const bitrateRSE = (width, height, bpp, fps) => {
                let bitrate   = 4500 * 1000
                const refSize = 1920 * 1080
                const refFPS  = 30
                const size = width * height
                if (size !== refSize)
                    bitrate *= ((size / refSize) + 0.08)
                if (fps !== refFPS)
                    bitrate *= (fps / refFPS) * 0.75
                return bitrate
            }

            /*  perform a weighted calculation  */
            const bitrate1 = bitrateH264(this.options.width, this.options.height, 12, this.options.fps)
            const bitrate2 = bitrateKush(this.options.width, this.options.height, 12, this.options.fps)
            const bitrate3 = bitrateRSE(this.options.width, this.options.height, 12, this.options.fps)
            let bitrate = (bitrate1 * 1.0 + bitrate2 * 1.0 + bitrate3 * 3.0) / 5.0

            /*  round to 50kpbs  */
            bitrate = (Math.round(bitrate / (50 * 1000))) * (50 * 1000)
            return bitrate
        }
        const sizeFormat = (size) => {
            if (size > 10000)
                return (Math.round(size / 1000) + "k")
            return (size + "")
        }

        /*  determine format specific options  */
        let opts = []
        if (this.options.format === "mp4")
            opts = opts.concat("-movflags",
                "frag_keyframe+omit_tfhd_offset+empty_moov+default_base_moof+faststart")

        /*  determine reasonable default video bitrate  */
        if (this.options.mode === "vbr") {
            /*  Variable Bit Rate (VBR) / Constant Rate Factor (CRF) -- recording  */
            opts = opts.concat(
                "-preset", "medium",
                "-crf", "22")
        }
        else if (this.options.mode === "abr") {
            /*  Adaptive Bit Rate (ABR) -- (recording/)streaming  */
            const bitrate = bitrateCalc()
            opts = opts.concat(
                "-preset", "veryfast",
                "-b:v", sizeFormat(bitrate),
                "-minrate", sizeFormat(bitrate * 0.5),
                "-maxrate", sizeFormat(bitrate * 1.5),
                "-fflags", "flush_packets")
        }
        else if (this.options.mode === "cbr") {
            /*  Constant Bit Rate (CBR) -- streaming  */
            const bitrate = bitrateCalc()
            opts = opts.concat(
                "-preset", "veryfast",
                "-x264-params", "nal-hrd=cbr",
                "-b:v", sizeFormat(bitrate),
                "-minrate", sizeFormat(bitrate),
                "-maxrate", sizeFormat(bitrate),
                "-bufsize", sizeFormat(bitrate * 2),
                "-fflags", "flush_packets")
        }

        /*  determine FFmpeg CLI arguments  */
        const options = [
            /*  top-level options  */
            "-loglevel", "0",

            /*  generic options  */
            "-use_wallclock_as_timestamps", "1",
            "-fflags", "+genpts",

            /*  video input options  */
            ...(this.options.fps > 0 ? [
                "-f", "image2pipe",
                "-framerate", this.options.fps,
                "-pix_fmt", "rgba",
                "-i", "pipe:0"
            ] : []),

            /*  audio input options  */
            ...(this.options.ac > 0 ? [
                "-f", "s16le",
                "-ar", this.options.asr,
                "-ac", this.options.ac,
                "-i", "pipe:3"
            ] : []),

            /*  generic output options  */
            ...(this.options.fps > 0 ? [
                "-map", "0:v:0"
            ] : []),
            ...(this.options.ac > 0 ? [
                "-map", this.options.fps > 0 ? "1:a:0" : "0:a:0"
            ] : []),
            "-threads", "4",
            "-shortest",

            /*  specific output options (defaults)  */
            ...(this.options.fps > 0 ? [
                "-c:v", "h264",
                "-pix_fmt", "yuv420p",
                "-r", this.options.fps,
                ...opts
            ] : [
                "-vn"
            ]),
            ...(this.options.ac > 0 ? [
                "-c:a", "aac"
            ] : [
                "-an"
            ]),
            "-y",

            /*  specific output format  */
            "-f", this.options.format,

            /*  specific output options  */
            ...this.options.args
        ]

        /*  start ffmpeg(1) sub-process  */
        this.options.log("info", `starting FFmpeg process: ${this.options.ffmpeg} ${options.join(" ")} (cwd: ${this.options.cwd})`)
        this.proc = execa(this.options.ffmpeg, options, {
            stdio: [ "pipe", "pipe", "pipe", "pipe" ],
            cwd:   this.options.cwd
        })
        this.proc.stdout.on("data", (line) => {
            if (this.stopping)
                return
            this.options.log("info", `FFmpeg stdout: ${line.toString()}`)
            this.emit("error", `FFmpeg stdout: ${line.toString()}`)
        })
        this.proc.stderr.on("data", (line) => {
            if (this.stopping)
                return
            this.options.log("info", `FFmpeg stderr: ${line.toString()}`)
            this.emit("error", `FFmpeg stderr: ${line.toString()}`)
        })

        /*  process exit of ffmpeg(1) subprocess  */
        this.workaround = false
        this.proc.on("exit", async (code, signal) => {
            if (this.stopping)
                return

            /*  just log the information  */
            this.options.log("error", `FFmpeg exit: code: ${code}, signal: ${signal}`)

            /*  NASTY WORKAROUND: on some Linux platforms (e.g. Ubuntu 20.10) the statically built
                ffmpeg(1) executable (built under Debian AFAIK) unfortunately segfaults, so at
                least once try to use an externally installed "native" ffmpeg(1) of the system  */
            if (code === null && signal === "SIGSEGV" && !this.workaround) {
                this.workaround = true
                const ffmpeg = which.sync("ffmpeg", { nothrow: true })
                if (ffmpeg !== null) {
                    this.options.ffmpeg = ffmpeg
                    await this.stop()
                    this.start()
                }
                else {
                    /*  no chance, we have to tell the user that we need a system-native FFmpeg  */
                    this.emit("fatal", "sorry, the embedded FFmpeg program unfortunately crashes under " +
                        "your particular operating system. Please install a native FFmpeg in your system, " +
                        "ensure that the executable \"ffmpeg\" is in your $PATH and then restart this " +
                        "Vingester application again, please.")
                }
            }
        })
    }
    async video (data) {
        if (this.options.fps > 0 && this.proc !== null && !this.stopping)
            await ((new Promise((resolve) => this.proc.stdio[0].write(data, null, resolve))).catch((err) => null))
    }
    async audio (data) {
        if (this.options.ac > 0 && this.proc !== null && !this.stopping)
            await ((new Promise((resolve) => this.proc.stdio[3].write(data, null, resolve))).catch((err) => null))
    }
    async stop () {
        /*  kill ffmpeg(1) subprocess  */
        if (this.proc !== null && !this.stopping) {
            try {
                /*  stop feeding the input streams  */
                this.options.log("info", "stopping FFmpeg input stream feeding")
                this.stopping = true
                await new Promise((resolve) => setTimeout(resolve, 500))

                /*  close the input streams  */
                this.options.log("info", "closing FFmpeg input streams")
                this.proc.stdio[0].end()
                this.proc.stdio[3].end()
                await new Promise((resolve) => setTimeout(resolve, 500))

                /*  stop sub-process  */
                this.options.log("info", "stopping FFmpeg process")
                this.proc.kill("SIGINT")
                await new Promise((resolve) => setTimeout(resolve, 1000))
                this.proc.kill("SIGTERM", { forceKillAfterTimeout: 2000 })
                await this.proc

                this.proc = null
                this.stopping = false
            }
            catch (err) {
                /*  no-op  */
            }
        }
        return Promise.resolve(true)
    }
}

