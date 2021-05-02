/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  standard requirements  */
const EventEmitter = require("events")

/*  external requirements  */
const execa        = require("execa")

/*  the exported API  */
module.exports = class FFmpeg extends EventEmitter {
    constructor (options = {}) {
        super()

        /*  determine default option values  */
        this.options = Object.assign({}, {
            ffmpeg:     "ffmpeg",
            cwd:        "",
            format:     "matroska",
            args:       [],
            asr:        48000,
            ac:         2,
            log:        (level, msg) => {}
        }, options)

        /*  initialize state  */
        this.proc       = null
    }
    async start () {
        /*  cleanup if necessary  */
        if (this.proc !== null)
            await this.stop()

        /*  start ffmpeg(1) sub-process  */
        const options = [
            /*  top-level options  */
            "-loglevel", "0",

            /*  generic options  */
            "-use_wallclock_as_timestamps", "1",
            "-fflags", "+genpts",

            /*  video input options  */
            "-f", "image2pipe",
            "-pix_fmt", "rgba",
            "-i", "pipe:0",

            /*  audio input options  */
            "-f", "s16le",
            "-ar", this.options.asr,
            "-ac", this.options.ac,
            "-i", "pipe:3",
            // "-filter_complex", "aresample=async=10000",

            /*  generic output options  */
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-threads", "4",
            "-shortest",

            /*  specific output options (defaults)  */
            "-c:v", "h264",
            "-c:a", "aac",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-movflags", "frag_keyframe+omit_tfhd_offset+empty_moov+default_base_moof+faststart",
            "-fflags", "flush_packets",
            "-y",

            /*  specific output format  */
            "-f", this.options.format,

            /*  specific output options  */
            ...this.options.args
        ]
        this.options.log("info", `starting FFmpeg process: ${this.options.ffmpeg} ${options.join(" ")} (cwd: ${this.options.cwd})`)
        this.proc = execa(this.options.ffmpeg, options, {
            stdio: [ "pipe", "pipe", "pipe", "pipe" ],
            cwd:   this.options.cwd
        })
        this.proc.stdout.on("data", (line) => {
            this.options.log("info", `FFmpeg stdout: ${line.toString()}`)
            this.emit("error", `FFmpeg stdout: ${line.toString()}`)
        })
        this.proc.stderr.on("data", (line) => {
            this.options.log("info", `FFmpeg stderr: ${line.toString()}`)
            this.emit("error", `FFmpeg stderr: ${line.toString()}`)
        })
    }
    async video (data) {
        if (this.proc !== null)
            await new Promise((resolve) => this.proc.stdio[0].write(data, null, resolve))
    }
    async audio (data) {
        if (this.proc !== null)
            await new Promise((resolve) => this.proc.stdio[3].write(data, null, resolve))
    }
    async end () {
        if (this.proc !== null) {
            this.options.log("info", "closing FFmpeg video and audio input")
            await new Promise((resolve) => this.proc.stdio[0].end(resolve))
            await new Promise((resolve) => this.proc.stdio[3].end(resolve))
        }
    }
    async stop () {
        /*  kill ffmpeg(1) subprocess  */
        if (this.proc !== null) {
            this.options.log("info", "ending FFmpeg input stream")
            await this.end()
            this.options.log("info", "stopping FFmpeg process")
            this.proc.kill("SIGTERM", { forceKillAfterTimeout: 2 * 1000 })
            try {
                await this.proc
            }
            catch (err) {
                /*  no-op  */
            }
            this.proc = null
        }
        return Promise.resolve(true)
    }
}

