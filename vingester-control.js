/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021-2022 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  require external modules  */
const electron         = require("electron")
const debounce         = require("throttle-debounce").debounce
const UUID             = require("pure-uuid")
const PerfectScrollbar = require("vue3-perfect-scrollbar").default
const VueTippy         = require("vue-tippy").default
const clone            = require("clone")
const moment           = require("moment")

/*  require internal modules  */
const log              = require("./vingester-log.js").scope("control")
log.info("starting up")

const browserFields = [
    { name: "t", def: "",            valid: /^.+$/ },
    { name: "i", def: "",            valid: /^.*$/ },
    { name: "w", def: "1280",        valid: /^\d+$/ },
    { name: "h", def: "720",         valid: /^\d+$/ },
    { name: "c", def: "transparent", valid: /^(?:transparent|#[\da-fA-F]{3,6})$/ },
    { name: "z", def: "1.0",         valid: /^(?:\d*\.\d+|\d+\.\d*|\d+)$/ },
    { name: "u", def: "",            valid: /^.+$/ },
    { name: "k", def: "0",           valid: /^\d+$/ },
    { name: "j", def: "",            valid: /^.*$/ },
    { name: "q", def: "",            valid: /^.*$/ },
    { name: "Q", def: "",            valid: /^.*$/ },
    { name: "x", def: "0",           valid: /^[+-]?\d+$/ },
    { name: "y", def: "0",           valid: /^[+-]?\d+$/ },
    { name: "A", def: "",            valid: /^.*$/ },
    { name: "f", def: "30",          valid: /^\d+$/ },
    { name: "O", def: "0",           valid: /^\d+$/ },
    { name: "C", def: "2",           valid: /^\d+$/ },
    { name: "o", def: "0",           valid: /^\d+$/ },
    { name: "M", def: "",            valid: /^.*$/ }
]

const app = Vue.createApp({
    data () {
        return {
            browsers:          [],
            running:           {},
            stat:              {},
            rate:              {},
            burst:             {},
            tally:             {},
            trace:             {},
            invalid:           {},
            usage:             0,
            gpu:               false,
            messages:          [],
            version:           {},
            support:           {},
            modal:             "",
            modalAuto:         false,
            modalTimer:        null,
            updateUpdateable:  false,
            updateVersions:    { running: {}, current: {}, forthcoming: {} },
            updateNotify:      "",
            updateNotifyTimer: null,
            updateNotifyBlink: false,
            updateProgress:    0,
            updateError:       null,
            audioDevices:      [],
            tag:               null,
            displays:          []
        }
    },
    computed: {
        nAvailable () {
            return Object.keys(this.browsers).length
        },
        nRunning () {
            return Object.keys(this.running)
                .map((id) => this.running[id] ? 1 : 0)
                .reduce((acc, val) => acc + val, 0)
        }
    },
    async created () {
        log.info("creating")
        await this.updateAudioDevices()
        navigator.mediaDevices.addEventListener("devicechange", () => { this.updateAudioDevices() })
        this.displays = await electron.ipcRenderer.invoke("display-list")
        this.load()
        electron.ipcRenderer.on("tag", (ev, tag) => {
            this.tag = tag
        })
        electron.ipcRenderer.on("load", (ev) => {
            this.load()
        })
        electron.ipcRenderer.on("save", (ev) => {
            this.save()
        })
        electron.ipcRenderer.on("browser-start", (ev, id) => {
            log.info("browser-start", id)
            this.resetState(id)
        })
        electron.ipcRenderer.on("browser-started", (ev, id) => {
            log.info("browser-started", id)
            this.running[id] = true
        })
        electron.ipcRenderer.on("browser-reload", (ev, id) => {
            log.info("browser-reload", id)
            this.resetState(id)
        })
        electron.ipcRenderer.on("browser-reloaded", (ev, id) => {
            log.info("browser-reloaded", id)
            this.running[id] = true
        })
        electron.ipcRenderer.on("browser-stop", (ev, id) => {
            log.info("browser-stop", id)
        })
        electron.ipcRenderer.on("browser-stopped", (ev, id) => {
            log.info("browser-stopped", id)
            this.running[id] = false
        })
        electron.ipcRenderer.on("browser-clear", (ev, id) => {
            log.info("browser-clear", id)
        })
        electron.ipcRenderer.on("browser-cleared", (ev, id) => {
            log.info("browser-cleared", id)
        })
        electron.ipcRenderer.on("devtools", (ev, { id, enabled }) => {
            const browser = this.browsers.find((b) => b.id === id)
            browser.E = enabled
        })
        electron.ipcRenderer.on("message", (ev, text) => {
            const time = moment().format("YYYY-MM-DD HH:mm:ss")
            if (this.messages.length >= 5)
                this.messages.shift()
            this.messages.push({ time, text })
            this.modalToggle("messages", true, true)
            this.$nextTick(() => {
                const table = this.$refs["message-table"]
                if (table !== null)
                    table.scrollTop = table.scrollHeight
            })
        })
        electron.ipcRenderer.on("stat", (ev, stat) => {
            this.stat[stat.id] = stat
        })
        electron.ipcRenderer.on("display-update", (ev, displays) => {
            this.displays = displays
            for (const browser of this.browsers)
                this.validateState(browser)
            this.renderDisplayIcons()
        })
        electron.ipcRenderer.on("rate", (ev, rate) => {
            if (this.rate[rate.id] === undefined)
                this.rate[rate.id] = { video: 0, audio: 0 }
            this.rate[rate.id][rate.type] = rate.pps
        })
        electron.ipcRenderer.on("trace", (ev, trace) => {
            if (trace.level === 2)
                this.trace[trace.id].warning++
            else if (trace.level === 3)
                this.trace[trace.id].error++
            let level = "UNKNOWN"
            switch (trace.level) {
                case 0: level = "DEBUG";   break
                case 1: level = "INFO";    break
                case 2: level = "WARNING"; break
                case 3: level = "ERROR";   break
            }
            if (this.trace[trace.id].messages.length > 20)
                this.trace[trace.id].messages.shift()
            this.trace[trace.id].messages.push({ level, message: trace.message })
            this.$nextTick(() => {
                const console = this.$refs[`console-${trace.id}`]
                if (console !== null)
                    console.scrollTop = console.scrollHeight
            })
        })
        electron.ipcRenderer.on("usage", (ev, usage) => {
            this.usage = usage
        })
        electron.ipcRenderer.on("burst", (ev, stat) => {
            if (this.burst[stat.id] === undefined)
                this.burst[stat.id] = { video: {}, audio: {} }
            this.burst[stat.id][stat.type] = stat
        })
        electron.ipcRenderer.on("tally", (ev, msg) => {
            this.tally[msg.id] = { status: msg.status, connections: msg.connections }
        })
        electron.ipcRenderer.on("capture", async (ev, capture) => {
            const canvas = this.$refs[`canvas-${capture.id}`]
            const ctx = canvas.getContext("2d")
            const arr    = new Uint8ClampedArray(capture.buffer)
            const pixels = new ImageData(arr, capture.size.width, capture.size.height)
            const bitmap = await createImageBitmap(pixels)
            ctx.clearRect(0, 0, 160, 90)
            if ((capture.size.width / capture.size.height) >= (160 / 90))
                ctx.drawImage(bitmap, 0, Math.trunc((90 - capture.size.height) / 2))
            else
                ctx.drawImage(bitmap, Math.trunc((160 - capture.size.width) / 2), 0)
        })
        electron.ipcRenderer.on("gpu", (ev, gpu) => {
            this.gpu = gpu
        })
        electron.ipcRenderer.on("update-updateable", (ev, updateable) => {
            this.updateUpdateable = updateable
        })
        electron.ipcRenderer.on("update-versions", (ev, versions) => {
            this.updateVersions.running     = versions.running     ? versions.running     : {}
            this.updateVersions.current     = versions.current     ? versions.current     : {}
            this.updateVersions.forthcoming = versions.forthcoming ? versions.forthcoming : {}
            if (!(     this.updateVersions.running
                    && this.updateVersions.running.version
                    && ((      this.updateVersions.current
                            && this.updateVersions.current.version
                            && this.updateVersions.running.version === this.updateVersions.current.version)
                        || (   this.updateVersions.forthcoming
                            && this.updateVersions.forthcoming.version
                            && this.updateVersions.running.version === this.updateVersions.forthcoming.version)))) {
                if (this.updateVersions.running.type === "deprecated")
                    this.updateNotify = "hard"
                else
                    this.updateNotify = "soft"
            }
            else
                this.updateNotify = ""
            if (this.updateNotify !== "" && this.updateNotifyTimer === null)
                this.updateNotifyTimer = setInterval(() => {
                    this.updateNotifyBlink = !this.updateNotifyBlink
                }, this.updateNotify === "soft" ? 1200 : 300)
            else if (this.updateNotify === "" && this.updateTimer !== null) {
                clearTimeout(this.updateNotifyTimer)
                this.updateNotifyTimer = null
                this.updateNotifyBlink = false
            }
        })
        electron.ipcRenderer.on("update-progress", (ev, progress) => {
            this.updateProgress = progress
        })
        electron.ipcRenderer.on("update-error", (ev, error) => {
            this.updateProgress = null
            this.updateError    = error.toString()
            setTimeout(() => {
                this.updateProgress = null
                this.updateError    = null
            }, 5000)
        })
        this.version = await electron.ipcRenderer.invoke("version")
        this.support = await electron.ipcRenderer.invoke("support")
        log.info("created")
        electron.ipcRenderer.invoke("control-created")
    },
    mounted () {
        electron.ipcRenderer.invoke("control-mounted")
        setTimeout(() => {
            this.updateCheck()
        }, 2000)
    },
    methods: {
        renderDisplayIcons () {
            this.$nextTick(async () => {
                /*  determine maximum width/height  */
                let h1 = 0
                let h2 = 0
                let w1 = 0
                let w2 = 0
                for (const d of this.displays) {
                    if (d.x < 0 && -d.x > w1)
                        w1 = -d.x
                    else if (d.x >= 0 && (d.x + d.w) > w2)
                        w2 = (d.x + d.w)
                    if (d.y < 0 && -d.y > h1)
                        h1 = -d.y
                    else if (d.y >= 0 && (d.y + d.h) > h2)
                        h2 = (d.y + d.h)
                }

                /*  iterate over all browser...  */
                for (const browser of this.browsers) {
                    /*  ...and displays  */
                    for (const display of this.displays) {
                        const canvas = this.$refs[`display-icon-${browser.id}-${display.num}`]
                        if (canvas === null)
                            continue

                        /*  determine canvas size/ratio  */
                        const W = w1 + w2
                        const H = h1 + h2
                        const R = W / H

                        /*  determine canvas scaling (down to fit 28x16)  */
                        let w
                        if (R >= 1.0) w = 28
                        else          w = 16 * R
                        const scale = w / W

                        /*  render the screen blocks onto the canvas  */
                        canvas.width  = Math.round(W * scale)
                        canvas.height = Math.round(H * scale)
                        const ctx = canvas.getContext("2d")
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        for (const d of this.displays) {
                            ctx.fillStyle = (d.num === display.num ? "#ffffff80" : "#30303080")
                            ctx.fillRect(
                                Math.round((w1 + d.x) * scale),
                                Math.round((h1 + d.y) * scale),
                                Math.round(d.w * scale),
                                Math.round(d.h * scale)
                            )
                        }
                    }
                }
            })
        },
        validateState (browser) {
            for (const field of browserFields) {
                if (browser[field.name] === "")
                    browser[field.name] = field.def
                if (!(browser[field.name].match(field.valid)))
                    this.invalid[browser.id][field.name] = true
                else
                    delete this.invalid[browser.id][field.name]
            }
            if (typeof browser.d !== "number")
                browser.d = 0
            if (browser.d >= this.displays.length)
                browser.d = (this.displays.length - 1)
            if (   (browser.D || browser.N)
                && (!browser.N || (browser.N && (browser.n || browser.m)))
                && browser.t !== "" && browser.u !== "")
                delete this.invalid[browser.id]["GLOBAL"]
             else
                this.invalid[browser.id]["GLOBAL"] = true
        },
        resetState (id) {
            this.running[id] = false
            this.stat[id] = { fps: 0, memUsed: 0, memAvail: 0 }
            this.burst[id] = {
                video: { avg: 0, min: 0, max: 0, tmin: 0, tmax: 0 },
                audio: { avg: 0, min: 0, max: 0, tmin: 0, tmax: 0 }
            }
            this.tally[id] = { status: "unconnected", connections: 0 }
            this.trace[id] = { warning: 0, error: 0, messages: [] }
            this.invalid[id] = {}
        },
        deleteState (id) {
            delete this.running[id]
            delete this.stat[id]
            delete this.burst[id]
            delete this.tally[id]
            delete this.trace[id]
            delete this.invalid[id]
        },
        async load () {
            const browsers = await electron.ipcRenderer.invoke("browsers-load")
            await electron.ipcRenderer.invoke("control", "prune")
            for (const browser of browsers) {
                await electron.ipcRenderer.invoke("control", "add", browser.id, browser)
                this.resetState(browser.id)
                this.validateState(browser)
            }
            this.browsers = browsers
            this.renderDisplayIcons()
        },
        save: debounce(1000, async function () {
            await electron.ipcRenderer.invoke("browsers-save", clone(this.browsers))
        }),
        async exportBrowsers () {
            await electron.ipcRenderer.invoke("browsers-export")
        },
        async importBrowsers () {
            await electron.ipcRenderer.invoke("browsers-import")
            this.load()
        },
        async addBrowser () {
            const id = new UUID(1).fold(2).map((num) =>
                num.toString(16).toUpperCase().padStart(2, "0")).join("")
            let browser = { id }
            browser = await electron.ipcRenderer.invoke("browser-sanitize", browser)
            this.browsers.push(browser)
            this.resetState(id)
            this.validateState(browser)
            this.renderDisplayIcons()
            this.save()
            await electron.ipcRenderer.invoke("control", "add", browser.id, browser)
        },
        async modBrowser (browser) {
            await electron.ipcRenderer.invoke("control", "mod", browser.id, browser)
        },
        async moveBrowser (browser, direction) {
            if (this.running[browser.id])
                return
            const i = this.browsers.findIndex((b) => b.id === browser.id)
            if (direction === "up") {
                if (i === 0)
                    return
                this.browsers.splice(i, 1)
                this.browsers.splice(i - 1, 0, browser)
                this.save()
            }
            else if (direction === "down") {
                if (i === this.browsers.length - 1)
                    return
                this.browsers.splice(i, 1)
                this.browsers.splice(i + 1, 0, browser)
                this.save()
            }
        },
        async cloneBrowser (browserTemplate) {
            const id = new UUID(1).fold(2).map((num) =>
                num.toString(16).toUpperCase().padStart(2, "0")).join("")
            const browser = { ...browserTemplate, id }
            this.browsers.push(browser)
            this.resetState(id)
            this.validateState(browser)
            this.renderDisplayIcons()
            this.save()
            await electron.ipcRenderer.invoke("control", "add", browser.id, browser)
        },
        async delBrowser (browser) {
            if (this.running[browser.id])
                return
            this.browsers = this.browsers.filter((b) => b.id !== browser.id)
            this.deleteState(browser.id)
            this.save()
            await electron.ipcRenderer.invoke("control", "del", browser.id)
        },
        async control (action, id) {
            const browser = id !== null ? this.browsers.find((b) => b.id === id) : null
            if (   (action === "start-all"  && (this.nAvailable === 0 || this.nAvailable === this.nRunning))
                || (action === "reload-all" && this.nRunning === 0)
                || (action === "stop-all"   && this.nRunning === 0))
                return
            if (   (action === "start"  &&  this.running[id])
                || (action === "reload" && !this.running[id])
                || (action === "stop"   && !this.running[id])
                || (action === "clear"  &&  this.running[id]))
                return
            if (action === "start" && browser !== undefined && Object.keys(this.invalid[browser.id]).length > 0)
                return
            await electron.ipcRenderer.invoke("control", action, id)
        },
        toggle (browser, field, options) {
            if (field !== "P" && field !== "T" && field !== "E" && field !== "_" && this.running[browser.id])
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
        changed: debounce(500, function (browser) {
            this.validateState(browser)
            this.modBrowser(clone(browser))
            this.save()
        }),
        toggleGPU () {
            electron.ipcRenderer.invoke("gpu", !this.gpu)
        },
        windowControl (action) {
            electron.ipcRenderer.invoke("window-control", action)
        },
        modalToggle (id, force = false, auto = false) {
            this.modalAuto = false
            if (this.modal === id && !force)
                this.modal = ""
            else {
                this.modal = id
                if (auto && !this.modalAuto) {
                    this.modalAuto = true
                    if (this.modalTimer !== null)
                        clearTimeout(this.modalTimer)
                    this.modalTimer = setTimeout(() => {
                        if (this.modalAuto) {
                            this.modalAuto = false
                            this.modal = ""
                        }
                    }, 5000)
                }
            }
        },
        updateCheck () {
            electron.ipcRenderer.invoke("update-check")
        },
        updateToVersion (version) {
            electron.ipcRenderer.invoke("update-to-version", version)
        },
        openURL (ev) {
            ev.preventDefault()
            const url = ev.target.getAttribute("href")
            electron.shell.openExternal(url)
        },
        async updateAudioDevices () {
            const devices = await navigator.mediaDevices.enumerateDevices()
            this.audioDevices = devices
                .filter((device) => device.kind === "audiooutput")
                .map((device) => { return device.label })
                .concat("(none)")
        },
        changeOption (browser, field, value) {
            this.changed(browser)
        },
        async clickCode (browser, field1, field2) {
            if (browser[field1] === "file") {
                const file = await electron.ipcRenderer.invoke("select-file")
                if (file !== null)
                    browser[field2] = file
                else
                    browser[field2] = ""
            }
            this.changed(browser)
        }
    }
})
app.use(PerfectScrollbar)
app.use(VueTippy, {
    defaultProps: {
        allowHTML: true,
        placement: "right",
        theme: "translucent",
        delay: [ 600, 50 ]
    }
})
app.component("vue-select", VueNextSelect)
app.mount("body")

