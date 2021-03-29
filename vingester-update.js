/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external requirements  */
const electron     = require("electron")
const fs           = require("fs")
const os           = require("os")
const path         = require("path")
const AdmZip       = require("adm-zip")
const got          = require("got")
const tmp          = require("tmp")
const dayjs        = require("dayjs")
const mkdirp       = require("mkdirp")
const UpdateHelper = require("update-helper")
const DSIG         = require("dsig")

/*  internal requirements  */
const pjson        = require("./package.json")

/*  export the API  */
module.exports = class Update {
    constructor (options = {}) {
        /*  determine options  */
        this.options = Object.assign({
            urlDist:    "https://github.oscdn.org/rse/vingester/%V/Vingester-%S-x64.zip",
            urlVersion: "https://github.com/rse/vingester/raw/master/VERSION.md"
        }, options)

        /*  determine absolute path to our own application file  */
        this.app = ""
        if (electron.app.isPackaged) {
            if (os.platform() === "win32") {
                /*  under Windows we are a portable app "Vingester.exe"
                    and Electron Builder provides us the direct path to it  */
                this.app = path.resolve(process.env.PORTABLE_EXECUTABLE_FILE)
            }
            else if (os.platform() === "darwin") {
                /*  under macOS we are a regular app "Vingester.app"
                    but we have to step up to the base directory from its
                    actual embedded executable "Contents/MacOS/Vingester"  */
                this.app = path.resolve(path.join(electron.app.getPath("exe"), "..", "..", ".."))
            }
            else if (os.platform() === "linux") {
                /*  under Linux we are an AppImage executable "Vingester"
                    and the AppImage stub provides us the direct path to it  */
                this.app = path.resolve(process.env.APPIMAGE)
            }
        }

        /*  initialize with unknown available versions  */
        this.versions = []

        /*  initialize with unknown target versions  */
        this.versionRunning     = undefined
        this.versionForthcoming = undefined
        this.versionCurrent     = undefined
    }

    /*  check whether we are really updateable  */
    async updateable () {
        if (!electron.app.isPackaged)
            return false
        if (this.app === "")
            return false
        if (!(   (os.platform() === "win32"  && this.app.match(/^(.+)\.exe/))
              || (os.platform() === "darwin" && this.app.match(/^(.+)\.app$/))
              || (os.platform() === "linux"  && this.app.match(/^(.+)$/))     ))
            return false
        const accessible = await fs.promises.access(this.app, fs.constants.W_OK)
            .then(() => true).catch(() => false)
        if (!accessible)
            return false
        return true
    }

    /*  check for available update versions  */
    async check (progress) {
        /*  determine available versions  */
        if (progress)
            progress("download-app-version", 0.0)
        const req = got({
            method:       "GET",
            url:          this.options.urlVersion,
            headers:      { "User-Agent": `${pjson.name}/${pjson.version}` },
            responseType: "text",
            https:        { rejectUnauthorized: false }
        })
        if (progress) {
            req.on("downloadProgress", (p) => {
                let completed = p.total > 0 ? p.transferred / p.total : 0
                if (isNaN(completed))
                    completed = 0
                progress("download-app-version", completed)
            })
        }
        const response = await req
        const md = response.body
        this.versions = []
        md.replace(
            /^\|\s+([0-9]+(?:(?:a|b|rc|\.)[0-9]+)*)\s+\|\s+(\d{4}-\d{2}-\d{2})\s+\|\s+(\S+)\s+\|\s*$/mg,
            (_, version, date, type) => { this.versions.push({ version, date, type }) }
        )
        if (progress)
            progress("download-app-version", 1.0)

        /*  determine running version  */
        this.versionRunning = this.versions.find((v) => v.version === pjson.version)

        /*  determine latest current version  */
        this.versionCurrent = this.versions.find((v) => v.type === "current")
        // this.versionCurrent = { version: "2.0.0", type: "current", date: "2021-12-31" } // FIXME

        /*  determine information about forthcoming version  */
        this.versionForthcoming = this.versions.find((v) => v.type === "forthcoming")

        /*  ensure the forthcoming version is newer or same than the current version  */
        if (this.versionForthcoming && this.versionCurrent) {
            const d1 = dayjs(this.versionForthcoming.date)
            const d2 = dayjs(this.versionCurrent.date)
            if (d1.isBefore(d2))
                this.versionForthcoming = undefined
        }

        /*  return determined versions and whether we are updateable  */
        return {
            running:     this.versionRunning,
            current:     this.versionCurrent,
            forthcoming: this.versionForthcoming
        }
    }

    /*  perform update  */
    async update (version, progress) {
        /*  sanity check situation  */
        const updateable = await this.updateable()
        if (!updateable)
            throw new Error("we are not able to update the application")

        /*  download application distribution ZIP archive  */
        let sys
        if (os.platform() === "win32")
            sys = "win"
        else if (os.platform() === "darwin")
            sys = "mac"
        else if (os.platform() === "linux")
            sys = "lnx"
        let url = this.options.urlDist
            .replace(/%V/g, version)
            .replace(/%S/g, sys)
        if (progress)
            progress("download-app-archive", 0.0)
        let req = got({
            method:       "GET",
            url:          url,
            headers:      { "User-Agent": `${pjson.name}/${pjson.version}` },
            responseType: "buffer",
            https:        { rejectUnauthorized: false }
        })
        if (progress) {
            req.on("downloadProgress", (p) => {
                let completed = p.total > 0 ? p.transferred / p.total : 0
                if (isNaN(completed))
                    completed = 0
                progress("download-app-archive", completed)
            })
        }
        let response = await req
        const payload = response.body
        const tmpfile = tmp.fileSync()
        await fs.promises.writeFile(tmpfile.name, payload, { encoding: null })
        if (progress)
            progress("download-app-archive", 1.0)

        /*  download signature  */
        url = url.replace(/\.zip$/, ".sig")
        if (progress)
            progress("download-app-signature", 0.0)
        req = got({
            method:       "GET",
            url:          url,
            headers:      { "User-Agent": `${pjson.name}/${pjson.version}` },
            responseType: "buffer",
            https:        { rejectUnauthorized: false }
        })
        if (progress) {
            req.on("downloadProgress", (p) => {
                let completed = p.total > 0 ? p.transferred / p.total : 0
                if (isNaN(completed))
                    completed = 0
                progress("download-app-signature", completed)
            })
        }
        response = await req
        const signature = response.body.toString()
        if (progress)
            progress("download-app-signature", 1.0)

        /*  read public key and verify signature
            (throws an exception if not valid)  */
        if (progress)
            progress("verify-app-signature", 0.0)
        const publicKey = await fs.promises.readFile(
            path.join(__dirname, "npm-package.pk"), { encoding: "utf8" })
        await DSIG.verify(payload, signature, publicKey)
        if (progress)
            progress("verify-app-signature", 1.0)

        /*  extract application distribution ZIP archive  */
        if (progress)
            progress("extract-app-archive", 0.0)
        const tmpdir = tmp.dirSync()
        const zip = new AdmZip(tmpfile.name)
        const dirCreated = {}
        const entries = zip.getEntries()
        const isPOSIX = os.platform() !== "win32"
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            if (progress)
                progress("extract-app-archive", i / entries.length)

            /*  determine result file path on filesystem  */
            const filePath = path.join(tmpdir.name, entry.entryName)

            /*  determine directory path and automatically create missing directories  */
            const dirPath = entry.isDirectory ? filePath : path.dirname(filePath)
            if (!dirCreated[dirPath]) {
                const options = {}
                if (isPOSIX)
                    options.mode = fs.constants.S_IRUSR | fs.constants.S_IWUSR | fs.constants.S_IXUSR |
                        fs.constants.S_IRGRP | fs.constants.S_IXGRP | fs.constants.S_IROTH | fs.constants.S_IXOTH
                await mkdirp(dirPath, options)
                dirCreated[dirPath] = true
            }

            /*  create resulting entry  */
            if (((entry.attr >> 28) & 0x0F) === 10) {
                /*  case 1: symbolic link  */
                const target = zip.readFile(entry).toString()
                await fs.promises.symlink(target, filePath, "file")
                if (isPOSIX)
                    await fs.promises.lchmod(filePath, fs.constants.S_IRUSR | fs.constants.S_IWUSR |
                        fs.constants.S_IRGRP | fs.constants.S_IROTH)
            }
            else if (!entry.isDirectory) {
                /*  case 2: regular file  */
                const data = zip.readFile(entry)
                const options = { encoding: null }
                if (isPOSIX) {
                    options.mode = fs.constants.S_IRUSR | fs.constants.S_IWUSR |
                        fs.constants.S_IRGRP | fs.constants.S_IROTH
                    if ((entry.attr >> 16) & fs.constants.S_IXUSR)
                        options.mode |= fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH
                }
                await fs.promises.writeFile(filePath, data, options)
            }
        }
        if (progress)
            progress("extract-app-archive", 1.0)
        tmpfile.removeCallback()

        /*  start background process to update application executable  */
        if (progress)
            progress("update-app-executable", 0.0)

        /*  final sanity check  */
        let from
        if (os.platform() === "win32")
            from = path.join(tmpdir.name, "Vingester.exe")
        else if (os.platform() === "darwin")
            from = path.join(tmpdir.name, "Vingester.app")
        else if (os.platform() === "linux")
            from = path.join(tmpdir.name, "Vingester")
        const accessible = await fs.promises.access(from, fs.constants.F_OK | fs.constants.R_OK)
            .then(() => true).catch(() => false)
        if (!accessible)
            throw new Error("cannot find application executable in distribution content")

        /*  kill/replace/restart ourself  */
        const updateHelper = new UpdateHelper({
            kill:     process.pid,
            wait:     1000,
            rename:   true,
            source:   from,
            target:   this.app,
            [os.platform() === "darwin" ? "open" : "execute"]: this.app,
            cleanup:  [ tmpdir.name ],
            progress: (step, percent) => {
                return progress(step, percent)
            }
        })
        await updateHelper.update()
    }

    /*  perform cleanup  */
    async cleanup () {
        /*  remove old update-helper after update  */
        const updateHelper = new UpdateHelper()
        await updateHelper.cleanup()
    }
}

