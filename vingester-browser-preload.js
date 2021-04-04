/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

(function () {
    /*  require external modules  */
    const electron    = require("electron")
    const electronLog = require("electron-log")

    /*  parse passed-through browser configuration  */
    const cfg = JSON.parse(process.argv[process.argv.length - 1])

    /*  etablish reasonable logging environment  */
    if (typeof process.env.DEBUG !== "undefined") {
        electronLog.transports.file.level    = "debug"
        electronLog.transports.console.level = "debug"
        electronLog.transports.ipc.level     = "debug"
    }
    else {
        electronLog.transports.file.level    = "info"
        electronLog.transports.console.level = false
        electronLog.transports.ipc.level     = false
    }
    electronLog.transports.remote.level   = false
    electronLog.transports.console.format = "{h}:{i}:{s}.{ms} > [{level}] {scope} {text}"
    electronLog.transports.file.format    = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {scope} {text}"
    const log = electronLog.scope(`browser/content-${cfg.id}`)

    /*  provide global "vingester" environment (for postload)  */
    electron.contextBridge.exposeInMainWorld("vingester", {
        cfg: cfg,
        log (...args) {
            log.info(...args)
        },
        stat (data) {
            electron.ipcRenderer.sendTo(cfg.controlId, "stat", data)
        },
        async audioCapture (data) {
            electron.ipcRenderer.sendTo(cfg.workerId, "audio-capture", data)
        }
    })
})()

