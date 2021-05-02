/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

const os     = require("os")
const fs     = require("fs")
const mkdirp = require("mkdirp")

if (process.argv[2] === "prolog") {
    /*  prolog: actions before npm-install-fetch  */
    mkdirp.sync("vingester-ffmpeg.d", { mode: 0o755 })
}
else if (process.argv[2] === "epilog") {
    /*  epilog: actions after NPM-install-fetch  */
    if (os.platform() === "darwin" || os.platform() === "linux")
        fs.chmodSync("vingester-ffmpeg.d/ffmpeg", 0o755)
    else if (os.platform() === "win32")
        fs.chmodSync("vingester-ffmpeg.d/ffmpeg.exe", 0o755)
}

