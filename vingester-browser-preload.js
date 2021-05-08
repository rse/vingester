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
    const log = electronLog.scope(`browser/content-${cfg.id}`)

    /*  provide global Vingester environment (for postload)  */
    let visibility = cfg.D ? "visible" : "hidden"
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
        },
        visibility (state) {
            if (state !== undefined)
                visibility = state
            return visibility
        }
    })

    /*  provide optional global OBS Studio Browser Source environment (simulated, for content)  */
    if (cfg.B) {
        electron.contextBridge.exposeInMainWorld("obsstudio", {
            pluginVersion: "0.0.0",
            getCurrentScene (callback) {
                /*  map the browser title and size onto a simulated OBS Studio scene  */
                callback({
                    name:   this.cfg.t,
                    width:  this.cfg.w,
                    height: this.cfg.h
                })
            },
            getStatus (callback) {
                /*  pretent OBS Studio is streaming if the content is visible anywhere  */
                callback({
                    streaming:       visibility === "visible",
                    recording:       false,
                    recordingPaused: false,
                    replaybuffer:    false,
                    virtualcam:      false
                })
            },
            saveReplayBuffer () {
                /*  no-op  */
            }
        })
    }
})()

