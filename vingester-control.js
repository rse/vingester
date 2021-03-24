/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

const electron = require("electron")
const log      = require("electron-log")
const debounce = require("throttle-debounce").debounce
const UUID     = require("pure-uuid")

log.info("UI")
Vue.createApp({
    data () {
        return {
            browsers: [],
            running:  {},
            stat:     {},
            burst:    {},
            usage:    0,
            gpu:      false,
            info:     false,
            version:  {}
        }
    },
    async created () {
        log.info("created")
        this.load()
        electron.ipcRenderer.on("browser-start", (ev, id) => {
            log.info("browser-start", id)
        })
        electron.ipcRenderer.on("browser-started", (ev, id) => {
            log.info("browser-started", id)
            this.running[id] = true
        })
        electron.ipcRenderer.on("browser-reload", (ev, id) => {
            log.info("browser-reload", id)
        })
        electron.ipcRenderer.on("browser-reloaded", (ev, id) => {
            log.info("browser-reloaded", id)
        })
        electron.ipcRenderer.on("browser-stop", (ev, id) => {
            log.info("browser-stop", id)
        })
        electron.ipcRenderer.on("browser-stopped", (ev, id) => {
            log.info("browser-stopped", id)
            this.running[id] = false
        })
        electron.ipcRenderer.on("stat", (ev, stat) => {
            this.stat[stat.id] = stat
        })
        electron.ipcRenderer.on("usage", (ev, usage) => {
            this.usage = usage
        })
        electron.ipcRenderer.on("burst", (ev, stat) => {
            this.burst[stat.id] = stat
        })
        electron.ipcRenderer.on("capture", async (ev, capture) => {
            const canvas = this.$refs[`canvas-${capture.id}`]
            const ctx = canvas.getContext("2d")
            const arr    = new Uint8ClampedArray(capture.buffer)
            const pixels = new ImageData(arr, capture.size.width, capture.size.height)
            const bitmap = await createImageBitmap(pixels)
            ctx.drawImage(bitmap, 0, 0)
        })
        electron.ipcRenderer.on("gpu", (ev, gpu) => {
            this.gpu = gpu
        })
        this.version = await electron.ipcRenderer.invoke("version")
        electron.ipcRenderer.invoke("control-created")
    },
    methods: {
        async load () {
            let browsers = await electron.ipcRenderer.invoke("browsers-load")
            if (browsers === undefined)
                browsers = "[]"
            this.browsers = JSON.parse(browsers)
            for (const browser of this.browsers) {
                await electron.ipcRenderer.invoke("control", "add", browser.id, JSON.stringify(browser))
                this.running[browser.id] = false
                this.stat[browser.id] = { fps: 0, memUsed: 0, memAvail: 0 }
                this.burst[browser.id] = { avg: 0, min: 0, max: 0, tmin: 0, tmax: 0 }
            }
        },
        save: debounce(1000, async function () {
            const browsers = JSON.stringify(this.browsers)
            await electron.ipcRenderer.invoke("browsers-save", browsers)
        }),
        async exportBrowsers () {
            await electron.ipcRenderer.invoke("browsers-export")
        },
        async importBrowsers () {
            if (await electron.ipcRenderer.invoke("browsers-import"))
                this.load()
        },
        async addBrowser () {
            const id = new UUID(1).format("std")
            const browser = {
                id,
                t: "Sample", w: "1280", h: "720", c: "#00ff00",
                u: "",
                D: true, d: "", x: "0", y: "0", p: false,
                N: false, f: "30",
                P: false
            }
            this.browsers.push(browser)
            this.running[id] = false
            this.stat[id] = { fps: 0, memUsed: 0, memAvail: 0 }
            this.burst[browser.id] = { avg: 0, min: 0, max: 0, tmin: 0, tmax: 0 }
            this.save()
            await electron.ipcRenderer.invoke("control", "add", browser.id, JSON.stringify(browser))
        },
        async modBrowser (browser) {
            await electron.ipcRenderer.invoke("control", "mod", browser.id, JSON.stringify(browser))
        },
        async delBrowser (browser) {
            if (this.running[browser.id])
                return
            this.browsers = this.browsers.filter((b) => b.id !== browser.id)
            delete this.running[browser.id]
            delete this.stat[browser.id]
            delete this.burst[browser.id]
            this.save()
            await electron.ipcRenderer.invoke("control", "del", browser.id)
        },
        async control (action, id) {
            if (   (action === "start"  &&  this.running[id])
                || (action === "reload" && !this.running[id])
                || (action === "stop"   && !this.running[id]))
                return
            const browser = this.browsers.find((b) => b.id === id)
            if (action === "start" && browser !== undefined && !browser.D && !browser.N)
                return
            await electron.ipcRenderer.invoke("control", action, id)
        },
        toggle (browser, field, options) {
            if (field !== "P" && this.running[browser.id])
                return
            const val = browser[field]
            let i = 0
            while (i < options.length)
                if (options[i++] === val)
                    break
            if (i === options.length)
                i = 0
            browser[field] = options[i]
            this.changed(browser)
        },
        changed (browser) {
            this.modBrowser(browser)
            this.save()
        },
        toggleGPU () {
            electron.ipcRenderer.invoke("gpu", !this.gpu)
        }
    }
}).mount("body")

