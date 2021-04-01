/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

(function () {
    const electron = require("electron")

    /*  provide global "vingester" environment (for postload)  */
    electron.contextBridge.exposeInMainWorld("vingester", {
        cfg: JSON.parse(process.argv[process.argv.length - 1]),
        log (...args) {
            electron.ipcRenderer.invoke("postload-log", ...args)
        },
        stat (data) {
            electron.ipcRenderer.send("stat", data)
        },
        async audioCapture (data) {
            electron.ipcRenderer.send("audio-capture", data)
        }
    })
})()

