/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

(() => {
    const electron = require("electron")

    /*  at least once send stats initially  */
    electron.ipcRenderer.send("stat", { fps: 0, memUsed: 0, memAvail: 0 })

    /*  once per animation frame (usually 60 times per second)
        determine and send statistic information  */
    let last = null
    let n = 0
    const animate = function () {
        if (last === null)
            last = performance.now()
        else {
            /*  determine frames per second  */
            const now = performance.now()
            const delta = now - last
            const fps = 1000 / delta
            last = now

            /*  determine memory usage  */
            const memory   = performance.memory
            const memUsed  = memory.usedJSHeapSize  / (1024 * 1024)
            const memAvail = memory.jsHeapSizeLimit / (1024 * 1024)

            /*  send 2-4 times per second only  */
            if (n++ > 15) {
                n = 0
                electron.ipcRenderer.send("stat", { fps, memUsed, memAvail })
            }
        }
        requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
})()

