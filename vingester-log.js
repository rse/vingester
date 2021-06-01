/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  fetch original Electron-Log API  */
const electronLog = require("electron-log")

/*  determine context  */
const isRenderer =
    (   (   typeof window !== "undefined"
         && typeof window.process === "object"
         && window.process.type === "renderer"   )
     || (   typeof navigator === "object"
         && typeof navigator.userAgent === "string"
         && navigator.userAgent.indexOf("Electron") >= 0))
const isMain =
    !isRenderer
    && (   typeof process !== "undefined"
        && typeof process.versions === "object"
        && process.versions.electron !== undefined )

/*  pre-configure logging environment  */
electronLog.transports.console.format = "{h}:{i}:{s}.{ms} > [{level}] {scope} {text}"
electronLog.transports.file.format    = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {scope} {text}"
electronLog.transports.remote.level   = false
if (isMain) {
    if (typeof process.env.DEBUG !== "undefined") {
        /*  main process, debugging  */
        electronLog.transports.file.level    = "debug"
        electronLog.transports.console.level = "debug"
        electronLog.transports.ipc.level     = false
    }
    else {
        /*  main process, production  */
        electronLog.transports.file.level    = "info"
        electronLog.transports.console.level = false
        electronLog.transports.ipc.level     = false
    }
}
else if (isRenderer) {
    if (typeof process.env.DEBUG !== "undefined") {
        /*  renderer process, debugging  */
        electronLog.transports.file.level    = false
        electronLog.transports.console.level = false
        electronLog.transports.ipc.level     = "debug"
    }
    else {
        /*  renderer process, production  */
        electronLog.transports.file.level    = false
        electronLog.transports.console.level = false
        electronLog.transports.ipc.level     = "info"
    }
}

/*  show initial hint  */
if (isMain)
    electronLog.scope("global").debug(`(persistent log: ${electronLog.transports.file.getFile()})`)

/*  export adjusted Electron-Log API  */
module.exports = electronLog

