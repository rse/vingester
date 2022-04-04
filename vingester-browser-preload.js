/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021-2022 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

(function () {
    /*  parse passed-through browser configuration  */
    let cfg = {}
    for (let i = process.argv.length - 1; i >= 0; i--) {
        let m
        if ((m = process.argv[i].match(/^vingester-cfg-(.+)$/)) !== null) {
            cfg = JSON.parse(decodeURIComponent(escape(atob(m[1]))))
            break
        }
    }

    /*  require external modules  */
    const electron     = require("electron")
    const log          = require("./vingester-log.js").scope(`browser/content-${cfg.id}`)

    /*  provide global Vingester environment (for postload)  */
    let visibility = cfg.D ? "visible" : "hidden"
    electron.contextBridge.exposeInMainWorld("vingester", {
        cfg,
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

