/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  require internal modules  */
const path        = require("path")
const fs          = require("fs")
const process     = require("process")

/*  require external modules  */
const electron    = require("electron")
const electronLog = require("electron-log")
const grandiose   = require("grandiose")
const Store       = require("electron-store")
const debounce    = require("throttle-debounce").debounce
const throttle    = require("throttle-debounce").throttle
const jsYAML      = require("js-yaml")
const UUID        = require("pure-uuid")

/*  require own modules  */
const Browser     = require("./vingester-browser.js")
const Update      = require("./vingester-update.js")
const util        = require("./vingester-util.js")
const pkg         = require("./package.json")

/*  etablish reasonable logging environment  */
if (typeof process.env.DEBUG !== "undefined") {
    electronLog.transports.file.level    = "debug"
    electronLog.transports.console.level = "debug"
    electronLog.transports.ipc.level     = false
}
else {
    electronLog.transports.file.level    = "info"
    electronLog.transports.console.level = false
    electronLog.transports.ipc.level     = false
}
electronLog.transports.remote.level   = false
electronLog.transports.console.format = "{h}:{i}:{s}.{ms} > [{level}] {scope} {text}"
electronLog.transports.file.format    = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {scope} {text}"
const log = electronLog.scope("main")
log.debug(`(find persistent log under ${electronLog.transports.file.getFile()})`)

/*  redirect exception error boxes to the console  */
electron.dialog.showErrorBox = (title, content) => {
    log.info(`UI: exception: ${title}: ${content}`)
}

/*  determine versions  */
const version = {
    vingester: pkg.version,
    electron:  process.versions.electron,
    chromium:  process.versions.chrome,
    v8:        process.versions.v8.replace(/-electron.*$/, ""),
    node:      process.versions.node,
    ndi:       grandiose.version().replace(/^.+\s+/, "")
}
const support = {
    ndi:       grandiose.isSupportedCPU()
}
electron.ipcMain.handle("version", (ev) => { return version })
electron.ipcMain.handle("support", (ev) => { return support })
log.info(`starting Vingester: ${version.vingester}`)
log.info(`using Electron: ${version.electron}`)
log.info(`using Chromium: ${version.chromium}`)
log.info(`using V8: ${version.v8}`)
log.info(`using Node: ${version.node}`)
log.info(`using NDI: ${version.ndi} (supported by CPU: ${support.ndi ? "yes" : "no"})`)

/*  optionally initialize NDI library  */
if (grandiose.isSupportedCPU())
    grandiose.initialize()

/*  initialize store  */
const store = new Store()

/*  optionally and early disable GPU hardware acceleration  */
if (!store.get("gpu")) {
    log.info("disabling GPU hardware acceleration (explicitly configured)")
    electron.app.disableHardwareAcceleration()
}

/*  once electron is ready...  */
electron.app.on("ready", async () => {
    log.info("Electron is now ready")

    /*  establish update process  */
    const update = new Update()

    /*  determine main window position and size  */
    log.info("loading persistant settings")
    const x = store.get("control.x", null)
    const y = store.get("control.y", null)
    const w = store.get("control.w", 840)
    const h = store.get("control.h", 420)
    const pos = (x !== null && y !== null ? { x, y } : {})

    /*  create main window  */
    log.info("creating control user interface")
    const control = new electron.BrowserWindow({
        ...pos,
        show:            false,
        width:           w,
        height:          h,
        minWidth:        840,
        minHeight:       420,
        frame:           false,
        title:           "Vingester",
        backgroundColor: "#333333",
        useContentSize:  false,
        webPreferences: {
            devTools:                   (typeof process.env.DEBUG !== "undefined"),
            nodeIntegration:            true,
            nodeIntegrationInWorker:    true,
            contextIsolation:           false,
            enableRemoteModule:         false,
            disableDialogs:             true,
            autoplayPolicy:             "no-user-gesture-required",
            spellcheck:                 false
        }
    })
    control.removeMenu()
    if (typeof process.env.DEBUG !== "undefined") {
        setTimeout(() => {
            control.webContents.openDevTools()
        }, 1000)
    }

    /*  persist main window position and size  */
    const updateBounds = () => {
        const bounds = control.getBounds()
        store.set("control.x", bounds.x)
        store.set("control.y", bounds.y)
        store.set("control.w", bounds.width)
        store.set("control.h", bounds.height)
    }
    control.on("resize", debounce(1000, () => {
        updateBounds()
    }))
    control.on("move", debounce(1000, () => {
        updateBounds()
    }))

    /*  window control  */
    let minimized  = false
    let maximized  = false
    let fullscreen = false
    control.on("minimize",          () => { minimized  = true  })
    control.on("restore",           () => { minimized  = false })
    control.on("maximize",          () => { maximized  = true  })
    control.on("unmaximize",        () => { maximized  = false })
    control.on("enter-full-screen", () => { fullscreen = true  })
    control.on("leave-full-screen", () => { fullscreen = false })
    electron.ipcMain.handle("window-control", async (ev, action) => {
        if (action === "minimize") {
            if (minimized) {
                control.restore()
                control.focus()
            }
            else
                control.minimize()
        }
        else if (action === "maximize") {
            if (fullscreen)
                control.setFullScreen(false)
            if (maximized)
                control.unmaximize()
            else
                control.maximize()
        }
        else if (action === "fullscreen") {
            if (maximized)
                control.unmaximize()
            if (fullscreen)
                control.setFullScreen(false)
            else
                control.setFullScreen(true)
        }
        else if (action === "standard") {
            if (fullscreen)
                control.setFullScreen(false)
            else if (maximized)
                control.unmaximize()
            control.setSize(820, 420)
        }
        else if (action === "close") {
            if (fullscreen)
                control.setFullScreen(false)
            else if (maximized)
                control.unmaximize()
            setTimeout(() => {
                control.close()
            }, 100)
        }
    })

    /*  provide IPC hooks for store access  */
    log.info("provide IPC hooks for control user interface")
    electron.ipcMain.handle("browsers-load", async (ev) => {
        return store.get("browsers")
    })
    electron.ipcMain.handle("browsers-save", async (ev, browsers) => {
        store.set("browsers", browsers)
    })
    electron.ipcMain.handle("browsers-export", async (ev) => {
        electron.dialog.showSaveDialog({
            title:       "Choose Export File (YAML)",
            properties:  [ "openFile" ],
            filters:     [ { name: "YAML", extensions: [ "yaml" ] } ],
            defaultPath: electron.app.getPath("userData")
        }).then(async (result) => {
            if (result.canceled)
                return
            if (result.filePath) {
                const file = result.filePath
                const browsers = JSON.parse(store.get("browsers")).map((browser) => {
                    delete browser.id
                    return browser
                })
                const yaml = jsYAML.dump(browsers)
                await fs.promises.writeFile(file, yaml, { encoding: "utf8" })
                log.info(`exported browsers configuration (${browsers.length} browser entries)`)
                return true
            }
            return false
        }).catch(() => {
            return false
        })
    })
    electron.ipcMain.handle("browsers-import", async (ev) => {
        return electron.dialog.showOpenDialog({
            title:       "Choose Import File (YAML)",
            properties:  [ "openFile" ],
            filters:     [ { name: "YAML", extensions: [ "yaml" ] } ],
            defaultPath: electron.app.getPath("userData")
        }).then(async (result) => {
            if (result.canceled)
                return
            if (result.filePaths && result.filePaths.length === 1) {
                const file = result.filePaths[0]
                const yaml = await fs.promises.readFile(file, { encoding: "utf8" })
                const browsers = jsYAML.load(yaml).map((browser) => {
                    if (browser.id === undefined)
                        browser.id = new UUID(1).fold(2).map((num) =>
                            num.toString(16).toUpperCase().padStart(2, "0")).join("")
                    return browser
                })
                store.set("browsers", JSON.stringify(browsers))
                log.info(`imported browsers configuration (${browsers.length} browser entries)`)
                return true
            }
            return false
        }).catch(() => {
            return false
        })
    })

    /*  handle update check request from UI  */
    electron.ipcMain.handle("update-check", async () => {
        /*  check whether we are updateable at all  */
        const updateable = await update.updateable()
        control.webContents.send("update-updateable", updateable)

        /*  check for update versions  */
        const versions = await update.check(throttle(1000 / 60, (task, completed) => {
            control.webContents.send("update-progress", { task, completed })
        }))
        setTimeout(() => {
            control.webContents.send("update-progress", null)
        }, 2 * (1000 / 60))
        control.webContents.send("update-versions", versions)
    })

    /*  handle update request from UI  */
    electron.ipcMain.handle("update-to-version", (event, version) => {
        update.update(version, throttle(1000 / 60, (task, completed) => {
            control.webContents.send("update-progress", { task, completed })
        })).catch((err) => {
            control.webContents.send("update-error", err)
            log.error(`update: ERROR: ${err}`)
        })
    })

    /*  cleanup from old update  */
    await update.cleanup()

    /*  at least once prepare the browser abstraction  */
    Browser.prepare()

    /*  provide IPC hooks for browsers control  */
    log.info("provide IPC hooks for browser control")
    const browsers = {}
    const controlBrowser = async (action, id, cfg) => {
        if (action === "add") {
            /*  add browser configuration  */
            browsers[id] = new Browser(log, id, cfg, control)
        }
        else if (action === "mod") {
            /*  modify browser configuration  */
            browsers[id].reconfigure(cfg)
        }
        else if (action === "del") {
            /*  delete browser configuration  */
            if (browsers[id] !== undefined && browsers[id].running())
                browsers[id].stop()
            delete browsers[id]
        }
        else if (action === "start-all") {
            /*  start all browsers  */
            const p = []
            for (const id of Object.keys(browsers))
                if (!browsers[id].running())
                    p.push(controlBrowser("start", id))
            await Promise.all(p)
        }
        else if (action === "reload-all") {
            /*  reload all browsers  */
            const p = []
            for (const id of Object.keys(browsers))
                if (browsers[id].running())
                    p.push(controlBrowser("reload", id))
            await Promise.all(p)
        }
        else if (action === "stop-all") {
            /*  stop all browsers  */
            const p = []
            for (const id of Object.keys(browsers))
                if (browsers[id].running())
                    p.push(controlBrowser("stop", id))
            await Promise.all(p)
        }
        else if (action === "start") {
            /*  start a particular browser  */
            const browser = browsers[id]
            if (browser === undefined)
                throw new Error("invalid browser id")
            if (browser.running())
                throw new Error("browser already running")
            control.webContents.send("browser-start", id)
            const success = await browser.start()
            if (success)
                control.webContents.send("browser-started", id)
            else {
                control.webContents.send("browser-failed", id)
                browser.stop()
            }
        }
        else if (action === "reload") {
            /*  reload a particular browser  */
            const browser = browsers[id]
            if (browser === undefined)
                throw new Error("invalid browser id")
            if (!browser.running())
                throw new Error("browser still not running")
            control.webContents.send("browser-reload", id)
            browser.reload()
            control.webContents.send("browser-reloaded", id)
        }
        else if (action === "stop") {
            /*  stop a particular browser  */
            const browser = browsers[id]
            if (browser === undefined)
                throw new Error("invalid browser id")
            if (!browser.running())
                throw new Error("browser still not running")
            control.webContents.send("browser-stop", id)
            await browser.stop()
            control.webContents.send("browser-stopped", id)
        }
    }
    electron.ipcMain.handle("control", (ev, action, id, browser) => {
        browser = browser !== undefined && browser !== null ? JSON.parse(browser) : undefined
        return controlBrowser(action, id, browser)
    })

    /*  show the window once the DOM was mounted  */
    electron.ipcMain.handle("control-mounted", (ev) => {
        log.info("finally showing user interface")
        control.show()
        control.focus()
    })

    /*  load web content  */
    log.info("loading control user interface")
    control.loadURL(`file://${path.join(__dirname, "vingester-control.html")}`)
    control.webContents.on("did-fail-load", (ev) => {
        electron.app.quit()
    })

    /*  wait until control UI is created  */
    log.info("awaiting control user interface to become ready")
    let controlReady = false
    electron.ipcMain.handle("control-created", (ev) => {
        controlReady = true
    })
    await new Promise((resolve) => {
        const check = () => {
            if (controlReady)
                resolve()
            else
                setTimeout(check, 100)
        }
        setTimeout(check, 100)
    })

    /*  toggle GPU hardware acceleration  */
    log.info("send GPU status and provide IPC hook for GPU status change")
    control.webContents.send("gpu", !!store.get("gpu"))
    electron.ipcMain.handle("gpu", async (ev, gpu) => {
        const choice = electron.dialog.showMessageBoxSync(control, {
            message: `${gpu ? "Enabling" : "Disabling"} GPU hardware acceleration ` +
                "requires an application restart.",
            type: "question",
            buttons: [ "Restart", "Cancel" ],
            cancelId: 1
        })
        if (choice === 1)
            return
        store.set("gpu", gpu)
        control.webContents.send("gpu", gpu)
        electron.app.relaunch()
        electron.app.exit()
    })

    /*  collect metrics  */
    log.info("start usage gathering timer")
    const usages = new util.WeightedAverage(20, 5)
    let timer = setInterval(() => {
        if (timer === null)
            return
        const metrics = electron.app.getAppMetrics()
        let usage = 0
        for (const metric of metrics)
            usage += metric.cpu.percentCPUUsage
        usages.record(usage, (stat) => {
            control.webContents.send("usage", stat.avg)
        })
    }, 100)

    /*  gracefully shutdown application  */
    log.info("hook into control user interface window states")
    control.on("close", async (ev) => {
        log.info("shuting down")
        ev.preventDefault()
        if (timer !== null) {
            clearTimeout(timer)
            timer = null
        }
        await controlBrowser("stop-all", null)
        updateBounds()
        control.destroy()
    })
    electron.app.on("window-all-closed", () => {
        /*  optionally destroy NDI library  */
        if (grandiose.isSupportedCPU())
            grandiose.destroy()

        /*  finally destroy electron  */
        electron.app.quit()
    })
    electron.app.on("will-quit", () => {
        log.info("terminating")
    })

    log.info("up and running")
})

