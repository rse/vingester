/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021-2022 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  require internal modules  */
const path        = require("path")
const fs          = require("fs")
const process     = require("process")

/*  require external modules  */
const electron    = require("electron")
const contextMenu = require("electron-context-menu")
const grandiose   = require("grandiose")
const Store       = require("electron-store")
const debounce    = require("throttle-debounce").debounce
const throttle    = require("throttle-debounce").throttle
const jsYAML      = require("js-yaml")
const UUID        = require("pure-uuid")
const HAPI        = require("hapi")
const HAPIHeader  = require("hapi-plugin-header")
const Boom        = require("@hapi/boom")
const moment      = require("moment")
const mkdirp      = require("mkdirp")
const FFmpeg      = require("@rse/ffmpeg")

/*  require own modules  */
const Browser     = require("./vingester-browser.js")
const Update      = require("./vingester-update.js")
const util        = require("./vingester-util.js")
const log         = require("./vingester-log.js").scope("main")
const pkg         = require("./package.json")

/*  get rid of unnecessary security warnings when debugging  */
if (typeof process.env.DEBUG !== "undefined") {
    delete process.env.ELECTRON_ENABLE_SECURITY_WARNINGS
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true
}

/*  redirect exception error boxes to the console  */
electron.dialog.showErrorBox = (title, content) => {
    log.info(`UI: exception: ${title}: ${content}`)
}

/*  determine versions and supported features  */
const version = {
    vingester: pkg.version,
    electron:  process.versions.electron,
    chromium:  process.versions.chrome,
    v8:        process.versions.v8.replace(/-electron.*$/, ""),
    node:      process.versions.node,
    ndi:       grandiose.version().replace(/^.+\s+/, ""),
    ffmpeg:    FFmpeg.info.version,
    vuejs:     pkg.dependencies.vue
}
const support = {
    ndi:       grandiose.isSupportedCPU(),
    srt:       FFmpeg.info.protocols?.srt?.input === true
}
electron.ipcMain.handle("version", (ev) => { return version })
electron.ipcMain.handle("support", (ev) => { return support })
log.info(`starting Vingester: ${version.vingester}`)
log.info(`using Electron: ${version.electron}`)
log.info(`using Chromium: ${version.chromium}`)
log.info(`using V8: ${version.v8}`)
log.info(`using Node.js: ${version.node}`)
log.info(`using NDI: ${version.ndi} (supported by CPU: ${support.ndi ? "yes" : "no"})`)
log.info(`using FFmpeg: ${version.ffmpeg}`)
log.info(`using Vue: ${version.vuejs}`)

/*  support particular profiles  */
if (electron.app.commandLine.hasSwitch("profile")) {
    const profile = electron.app.commandLine.getSwitchValue("profile")
    let userData = electron.app.getPath("userData")
    if (profile.match(/^[a-zA-Z][a-zA-Z0-9-]+$/))
        userData += `-${profile}`
    else
        userData = path.resolve(process.cwd(), profile)
    electron.app.setPath("userData", userData)
    log.info(`using profile: "${userData}" [custom]`)
}
else {
    const userData = electron.app.getPath("userData")
    log.info(`using profile: "${userData}" [default]`)
}

/*  support configuration auto-import/export  */
let configFile = null
if (electron.app.commandLine.hasSwitch("config")) {
    configFile = electron.app.commandLine.getSwitchValue("config")
    log.info(`using auto-import/export configuration: "${configFile}"`)
}

/*  support user interface tagging  */
let tag = null
if (electron.app.commandLine.hasSwitch("tag")) {
    tag = electron.app.commandLine.getSwitchValue("tag")
    log.info(`using user interface tag: "${tag}"`)
}

/*  support initial user interface minimization  */
let initiallyMinimized = false
if (electron.app.commandLine.hasSwitch("minimize"))
    initiallyMinimized = true

/*  support browser instances auto-start  */
let autostart = false
if (electron.app.commandLine.hasSwitch("autostart"))
    autostart = true

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

    /*  ensure that the configuration export/import area exists
        and that the sample configurations are provided  */
    const pathExists = (p) =>
        fs.promises.access(p, fs.constants.F_OK).then(() => true).catch(() => false)
    const userData = electron.app.getPath("userData")
    const appPath  = electron.app.getAppPath()
    const cfgDir = path.join(userData, "Configurations")
    if (!(await pathExists(cfgDir)))
        await mkdirp(cfgDir, { mode: 0o755 })
    const sampleConfigs = [
        { iname: "cfg-sample-test.yaml",   ename: "Sample-Test.yaml" },
        { iname: "cfg-sample-expert.yaml", ename: "Sample-Expert.yaml" },
        { iname: "cfg-sample-fps.yaml",    ename: "Sample-FPS.yaml" },
        { iname: "cfg-sample-vdon.yaml",   ename: "Sample-VDON.yaml" },
        { iname: "cfg-sample-jitsi.yaml",  ename: "Sample-Jitsi.yaml" }
    ]
    for (const sampleConfig of sampleConfigs) {
        const iname = path.join(appPath, sampleConfig.iname)
        const ename = path.join(cfgDir,  sampleConfig.ename)
        await fs.promises.copyFile(iname, ename)
    }
    await fs.promises.unlink(path.join(cfgDir, "Sample-OBSN.yaml")).catch(() => true)

    /*  determine main window position and size  */
    log.info("loading persistant settings")
    const x = store.get("control.x", null)
    const y = store.get("control.y", null)
    const w = store.get("control.w", 840)
    const h = store.get("control.h", 575)
    const pos = (x !== null && y !== null ? { x, y } : {})

    /*  create main window  */
    log.info("creating control user interface")
    const control = new electron.BrowserWindow({
        ...pos,
        show:            false,
        width:           w,
        height:          h,
        minWidth:        840,
        minHeight:       575,
        frame:           false,
        title:           "Vingester",
        backgroundColor: "#333333",
        useContentSize:  false,
        webPreferences: {
            devTools:                   (process.env.DEBUG === "2"),
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
    contextMenu({
        window: control,
        showLookUpSelection:  false,
        showSearchWithGoogle: false,
        showCopyImage:        false,
        showCopyImageAddress: true,
        showSaveImage:        false,
        showSaveImageAs:      false,
        showSaveLinkAs:       false,
        showInspectElement:   (process.env.DEBUG === "2"),
        showServices:         false,
        labels: {
            inspect:          "Inspect in DevTools"
        }
    })
    if (process.env.DEBUG === "2") {
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

    /*  configure application menu  */
    const openURL = (url) =>
        async () => { await electron.shell.openExternal(url) }
    const menuTemplate = [
        {
            label: electron.app.name,
            submenu: [
                { role: "about" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideothers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" }
            ]
        }, {
            label: "Edit",
            submenu: [
                { role: "cut" },
                { role: "copy" },
                { role: "paste" }
            ]
        }, {
            role: "window",
            submenu: [
                { role: "minimize" },
                { role: "zoom" },
                { role: "togglefullscreen" },
                { role: "front" }
            ]
        }, {
            role: "help",
            submenu: [
                { label: "More about Vingester", click: openURL("https://vingester.app") }
            ]
        }
    ]
    const menu = electron.Menu.buildFromTemplate(menuTemplate)
    electron.Menu.setApplicationMenu(menu)

    /*  provide IPC hooks for store access  */
    log.info("provide IPC hooks for control user interface")
    const fields = [
        { iname: "t", itype: "string",  def: "",            etype: "string",  ename: "BrowserTitle" },
        { iname: "i", itype: "string",  def: "",            etype: "string",  ename: "BrowserInfo" },
        { iname: "w", itype: "string",  def: "1280",        etype: "number",  ename: "BrowserWidth" },
        { iname: "h", itype: "string",  def: "720",         etype: "number",  ename: "BrowserHeight" },
        { iname: "c", itype: "string",  def: "transparent", etype: "string",  ename: "BrowserColor" },
        { iname: "z", itype: "string",  def: "1.0",         etype: "number",  ename: "BrowserZoom" },
        { iname: "H", itype: "boolean", def: false,         etype: "boolean", ename: "BrowserTrust" },
        { iname: "I", itype: "boolean", def: false,         etype: "boolean", ename: "BrowserNodeAPI" },
        { iname: "B", itype: "boolean", def: false,         etype: "boolean", ename: "BrowserOBSDOM" },
        { iname: "S", itype: "boolean", def: false,         etype: "boolean", ename: "BrowserPersist" },
        { iname: "u", itype: "string",  def: "",            etype: "string",  ename: "InputURL" },
        { iname: "k", itype: "string",  def: "0",           etype: "number",  ename: "PatchDelay" },
        { iname: "j", itype: "string",  def: "",            etype: "string",  ename: "PatchFrame" },
        { iname: "g", itype: "string",  def: "inline",      etype: "string",  ename: "PatchStyleType" },
        { iname: "q", itype: "string",  def: "",            etype: "string",  ename: "PatchStyleCode" },
        { iname: "G", itype: "string",  def: "inline",      etype: "string",  ename: "PatchScriptType" },
        { iname: "Q", itype: "string",  def: "",            etype: "string",  ename: "PatchScriptCode" },
        { iname: "D", itype: "boolean", def: true,          etype: "boolean", ename: "Output1Enabled" },
        { iname: "x", itype: "string",  def: "0",           etype: "number",  ename: "Output1VideoPositionX" },
        { iname: "y", itype: "string",  def: "0",           etype: "number",  ename: "Output1VideoPositionY" },
        { iname: "d", itype: "number",  def: 0,             etype: "number",  ename: "Output1VideoDisplay" },
        { iname: "p", itype: "boolean", def: false,         etype: "boolean", ename: "Output1VideoPinTop" },
        { iname: "A", itype: "string",  def: "",            etype: "string",  ename: "Output1AudioDevice" },
        { iname: "N", itype: "boolean", def: false,         etype: "boolean", ename: "Output2Enabled" },
        { iname: "f", itype: "string",  def: "30",          etype: "number",  ename: "Output2VideoFrameRate" },
        { iname: "a", itype: "boolean", def: false,         etype: "boolean", ename: "Output2VideoAdaptive" },
        { iname: "O", itype: "string",  def: "0",           etype: "number",  ename: "Output2VideoDelay" },
        { iname: "r", itype: "number",  def: 48000,         etype: "number",  ename: "Output2AudioSampleRate" },
        { iname: "C", itype: "string",  def: "2",           etype: "number",  ename: "Output2AudioChannels" },
        { iname: "o", itype: "string",  def: "0",           etype: "number",  ename: "Output2AudioDelay" },
        { iname: "n", itype: "boolean", def: true,          etype: "boolean", ename: "Output2SinkNDIEnabled" },
        { iname: "v", itype: "boolean", def: true,          etype: "boolean", ename: "Output2SinkNDIAlpha" },
        { iname: "l", itype: "boolean", def: false,         etype: "boolean", ename: "Output2SinkNDITallyReload" },
        { iname: "m", itype: "boolean", def: false,         etype: "boolean", ename: "Output2SinkFFmpegEnabled" },
        { iname: "R", itype: "string",  def: "vbr",         etype: "string",  ename: "Output2SinkFFmpegMode" },
        { iname: "F", itype: "string",  def: "matroska",    etype: "string",  ename: "Output2SinkFFmpegFormat" },
        { iname: "M", itype: "string",  def: "",            etype: "string",  ename: "Output2SinkFFmpegOptions" },
        { iname: "P", itype: "boolean", def: false,         etype: "boolean", ename: "PreviewEnabled" },
        { iname: "T", itype: "boolean", def: false,         etype: "boolean", ename: "ConsoleEnabled" },
        { iname: "E", itype: "boolean", def: false,         etype: "boolean", ename: "DevToolsEnabled" },
        { iname: "_", itype: "boolean", def: false,         etype: "boolean", ename: "Collapsed" }
    ]
    const sanitizeConfig = (browser) => {
        let changed = 0
        for (const field of fields) {
            if (browser[field.iname] === undefined) {
                browser[field.iname] = field.def
                changed++
            }
        }
        for (const attr of Object.keys(browser)) {
            if (attr === "id")
                continue
            if (!fields.find((field) => field.iname === attr)) {
                delete browser[attr]
                changed++
            }
        }
        return changed
    }
    const saveConfigs = (browsers) => {
        browsers = JSON.stringify(browsers)
        store.set("browsers", browsers)
    }
    const loadConfigs = () => {
        let changed = 0
        let browsers = store.get("browsers")
        if (browsers !== undefined)
            browsers = JSON.parse(browsers)
        else {
            browsers = []
            changed++
        }
        for (const browser of browsers)
            changed += sanitizeConfig(browser)
        if (changed > 0)
            saveConfigs(browsers)
        return browsers
    }
    electron.ipcMain.handle("browsers-load", async (ev) => {
        return loadConfigs()
    })
    electron.ipcMain.handle("browsers-save", async (ev, browsers) => {
        saveConfigs(browsers)
    })
    electron.ipcMain.handle("browser-sanitize", async (ev, browser) => {
        sanitizeConfig(browser)
        return browser
    })
    const exportConfig = async (file) => {
        let browsers = loadConfigs()
        browsers = browsers.map((browser) => {
            delete browser.id
            return browser
        })
        let yaml =
           "%YAML 1.2\n" +
           "##\n" +
           "##  Vingester Configuration\n" +
           `##  Version: Vingester ${version.vingester}\n` +
           `##  Date:    ${moment().format("YYYY-MM-DD HH:mm")}\n` +
           "##\n" +
           "\n" +
           "---\n" +
           "\n"
        for (const browser of browsers) {
            let line = 1
            for (const field of fields) {
                yaml += (line++ === 1 ? "-   " : "    ")
                let value = browser[field.iname]
                if (field.etype === "boolean" && typeof value !== "boolean")
                    value = Boolean(value)
                else if (field.etype === "number" && typeof value !== "number")
                    value = Number(value)
                else if (field.etype === "string" && typeof value !== "string")
                    value = String(value)
                value = jsYAML.dump(value, {
                    forceQuotes: true,
                    quotingType: "\"",
                    condenseFlow: true,
                    lineWidth: -1,
                    indent: 0
                })
                value = value.replace(/\r?\n$/, "")
                yaml += `${(field.ename + ":").padEnd(30, " ")} ${value}\n`
            }
            yaml += "\n"
        }
        await fs.promises.writeFile(file, yaml, { encoding: "utf8" })
        log.info(`exported browsers configuration (${browsers.length} browser entries)`)
    }
    const importConfig = async (file) => {
        const yaml = await fs.promises.readFile(file, { encoding: "utf8" })
        let browsers = null
        try {
            browsers = jsYAML.load(yaml)
        }
        catch (ex) {
            log.info(`importing browsers configuration failed: ${ex}`)
            return false
        }
        if (browsers === null)
            browsers = []
        for (const browser of browsers) {
            if (browser.id === undefined)
                browser.id = new UUID(1).fold(2).map((num) =>
                    num.toString(16).toUpperCase().padStart(2, "0")).join("")
            for (const field of fields) {
                let value = browser[field.ename]
                if (value === undefined)
                    continue
                if (field.itype === "boolean" && typeof value !== "boolean")
                    value = Boolean(value)
                else if (field.itype === "number" && typeof value !== "number")
                    value = Number(value)
                else if (field.itype === "string" && typeof value !== "string")
                    value = String(value)
                delete browser[field.ename]
                browser[field.iname] = value
            }
            sanitizeConfig(browser)
        }
        saveConfigs(browsers)
        log.info(`imported browsers configuration (${browsers.length} browser entries)`)
    }
    electron.ipcMain.handle("browsers-export", async (ev) => {
        electron.dialog.showSaveDialog({
            title:       "Choose Export File (YAML)",
            properties:  [ "openFile" ],
            filters:     [ { name: "YAML", extensions: [ "yaml" ] } ],
            defaultPath: cfgDir
        }).then(async (result) => {
            if (result.canceled)
                return
            if (result.filePath) {
                await exportConfig(result.filePath)
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
            defaultPath: cfgDir
        }).then(async (result) => {
            if (result.canceled)
                return
            if (result.filePaths && result.filePaths.length === 1) {
                await importConfig(result.filePaths[0])
                return true
            }
            return false
        }).catch(() => {
            return false
        })
    })

    /*  handle file selection  */
    electron.ipcMain.handle("select-file", async (ev) => {
        return electron.dialog.showOpenDialog({
            title:       "Choose File",
            properties:  [ "openFile" ]
        }).then(async (result) => {
            if (result.canceled)
                return null
            if (result.filePaths && result.filePaths.length === 1)
                return result.filePaths[0]
            return null
        }).catch(() => {
            return null
        })
    })

    /*  handle display information determination  */
    let displays = []
    const displaysDetermine = () => {
        displays = util.AvailableDisplays.determine(electron)
        control.webContents.send("display-update", displays)
    }
    displaysDetermine()
    electron.screen.on("display-added",           () => { displaysDetermine() })
    electron.screen.on("display-removed",         () => { displaysDetermine() })
    electron.screen.on("display-metrics-changed", () => { displaysDetermine() })
    electron.ipcMain.handle("display-list", async (ev) => {
        return displays
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
        if (action === "prune") {
            for (const id of Object.keys(browsers)) {
                if (browsers[id].running())
                    browsers[id].stop()
                delete browsers[id]
            }
        }
        else if (action === "add") {
            /*  add browser configuration  */
            browsers[id] = new Browser(log, id, cfg, control, FFmpeg.binary)
        }
        else if (action === "mod") {
            /*  modify browser configuration  */
            browsers[id].reconfigure(cfg)
        }
        else if (action === "del") {
            /*  delete browser configuration  */
            if (browsers[id] !== undefined && browsers[id].running())
                await controlBrowser("stop", id)
            delete browsers[id]
        }
        else if (action === "start-all") {
            /*  start all browsers  */
            const p = []
            for (const id of Object.keys(browsers))
                if (!browsers[id].running() && browsers[id].valid())
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
            if (!browser.valid())
                throw new Error("browser configuration not valid")
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
        else if (action === "clear") {
            /*  clear a particular browser  */
            const browser = browsers[id]
            if (browser === undefined)
                throw new Error("invalid browser id")
            if (browser.running())
                throw new Error("browser still running")
            control.webContents.send("browser-clear", id)
            await browser.clear()
            control.webContents.send("browser-cleared", id)
        }
    }
    electron.ipcMain.handle("control", (ev, action, id, browser) => {
        return controlBrowser(action, id, browser)
    })

    /*  show the window once the DOM was mounted  */
    electron.ipcMain.handle("control-mounted", (ev) => {
        /*  bring user interface into final state   */
        if (initiallyMinimized) {
            log.info("bring user interface into final state (minimized)")
            control.minimize()
        }
        else {
            log.info("bring user interface into final state (shown and focused)")
            control.show()
            control.focus()
        }

        /*  optionally auto-start browser instances
            (requires some delay to give browser instances a chance to be loaded)  */
        if (autostart) {
            setTimeout(() => {
                log.info("auto-start all browser instances")
                controlBrowser("start-all")
            }, 2000)
        }
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

    /*  send parameters  */
    if (tag !== null)
        control.webContents.send("tag", tag)

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

    /*  toggle API  */
    const API = class {
        constructor () {
            this.hapi = null
        }
        async configure (cfg) {
            this.enabled = cfg.enabled ?? false
            this.addr    = cfg.addr    ?? "127.0.0.1"
            this.port    = cfg.port    ?? "7211"
            if (this.enabled && !this.hapi)
                this.start()
            else if (!this.enabled && this.hapi)
                this.stop()
        }
        async start () {
            log.info("start API")
            this.hapi = new HAPI.server({
                host:  this.addr,
                port:  parseInt(this.port),
                debug: false
            })
            await this.hapi.register({
                plugin: HAPIHeader,
                options: { Server: `${pkg.name}/${pkg.version}` }
            })
            this.hapi.events.on("response", (request) => {
                const msg =
                    `remote=${request.info.remoteAddress}, ` +
                    `method=${request.method.toUpperCase()}, ` +
                    `url=${request.url.pathname}, ` +
                    `protocol=HTTP/${request.raw.req.httpVersion}, ` +
                    `response=${request.response?.statusCode ?? "<unknown>"}`
                log.info(`API: request: ${msg}`)
            })
            this.hapi.events.on("log", (ev, tags) => {
                if (tags.error) {
                    const err = ev.error
                    if (err instanceof Error)
                        log.error(`API: log: ${err.message}`)
                    else
                        log.error(`API: log: ${err}`)
                }
            })
            this.hapi.events.on({ name: "request", channels: [ "error" ] }, (req, ev, tags) => {
                if (ev.error instanceof Error)
                    log.error(`API: request-error: ${ev.error.message}`)
                else
                    log.error(`API: request-error: ${ev.error}`)
            })
            this.hapi.route({
                method:   "GET",
                path:     "/{browser}/{command}",
                handler: async (req, h) => {
                    const { browser, command } = req.params
                    if (browser === "all") {
                        if (command === "start")
                            await controlBrowser("start-all")
                                .catch((err) => { throw new Boom.expectationFailed(err.message) })
                        else if (command === "reload")
                            await controlBrowser("reload-all")
                                .catch((err) => { throw new Boom.expectationFailed(err.message) })
                        else if (command === "stop")
                            await controlBrowser("stop-all")
                                .catch((err) => { throw new Boom.expectationFailed(err.message) })
                        else
                            throw new Boom.badRequest("invalid command")
                    }
                    else {
                        let id = Object.keys(browsers).find((id) => browsers[id].cfg.t === browser)
                        if (id === undefined)
                            throw new Boom.notFound("invalid browser title/name")
                        if (command === "start")
                            await controlBrowser("start", id)
                                .catch((err) => { throw new Boom.expectationFailed(err.message) })
                        else if (command === "reload")
                            await controlBrowser("reload", id)
                                .catch((err) => { throw new Boom.expectationFailed(err.message) })
                        else if (command === "stop")
                            await controlBrowser("stop", id)
                                .catch((err) => { throw new Boom.expectationFailed(err.message) })
                        else if (command === "clear")
                            await controlBrowser("clear", id)
                                .catch((err) => { throw new Boom.expectationFailed(err.message) })
                        else
                            throw new Boom.badRequest("invalid command")
                    }
                    return h.response("OK").code(200)
                }
            })
            this.hapi.route({
                method:   [ "GET", "POST" ],
                path:     "/{any*}",
                handler: async (req, h) => {
                    throw new Boom.notFound("resource not found")
                }
            })
            await this.hapi.start()
        }
        async stop () {
            log.info("stop API")
            await this.hapi.stop().catch(() => {})
            this.hapi = null
        }
    }
    log.info("create API")
    const api = new API()
    api.configure({
        enabled: store.get("api.enabled"),
        addr:    store.get("api.addr"),
        port:    store.get("api.port")
    })
    log.info("send API status and provide IPC hook for API status change")
    control.webContents.send("api", {
        enabled: api.enabled,
        addr:    api.addr,
        port:    api.port
    })
    electron.ipcMain.handle("api", async (ev, cfg) => {
        store.set("api.enabled", cfg.enabled)
        store.set("api.addr",    cfg.addr)
        store.set("api.port",    cfg.port)
        api.configure({
            enabled: cfg.enabled,
            addr:    cfg.addr,
            port:    cfg.port
        })
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

    /*  register some global shortcuts  */
    electron.globalShortcut.register("Control+Alt+Shift+Escape", () => {
        log.info("catched global hotkey for stopping all browsers")
        controlBrowser("stop-all")
    })

    /*  optionally auto-import configuration  */
    if (configFile !== null) {
        if (await pathExists(configFile)) {
            log.info(`loading auto-import/export configuration: "${configFile}"`)
            await importConfig(configFile)
            control.webContents.send("load")
        }
        else
            log.warn(`auto-import/export configuration not found: "${configFile}"`)
    }

    /*  gracefully shutdown application  */
    log.info("hook into control user interface window states")
    control.on("close", async (ev) => {
        log.info("shutting down")
        ev.preventDefault()

        /*  stop timer  */
        if (timer !== null) {
            clearTimeout(timer)
            timer = null
        }

        /*  stop all browsers  */
        await controlBrowser("stop-all", null)

        /*  stop API  */
        if (API.started)
            await API.stop()

        /*  optionally auto-export configuration  */
        if (configFile !== null) {
            control.webContents.send("save")
            await new Promise((resolve) => setTimeout(resolve, 500))
            await exportConfig(configFile)
        }

        /*  save window bounds  */
        updateBounds()

        /*  destroy control user interface  */
        control.destroy()
    })
    electron.app.on("window-all-closed", () => {
        /*  optionally destroy NDI library  */
        if (grandiose.isSupportedCPU())
            grandiose.destroy()

        /*  finally destroy electron  */
        electron.app.quit()
    })
    for (const signal of [ "SIGINT", "SIGTERM" ]) {
        process.on(signal, () => {
            /*  optionally destroy NDI library  */
            if (grandiose.isSupportedCPU())
                grandiose.destroy()

            /*  finally destroy electron  */
            electron.app.quit()
        })
    }
    electron.app.on("will-quit", () => {
        log.info("terminating")
    })

    log.info("up and running")
})

