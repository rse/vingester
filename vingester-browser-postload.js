/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/* global vingester */
(function () {
    /*  capture statistics  */
    const captureStats = () => {
        /*  determine actual frames per second  */
        let FPS = 0
        const FPSwa = []
        for (let i = 0; i < 60; i++)
            FPSwa[i] = 0
        let last = null
        const animate = (now) => {
            if (last === null)
                last = now
            else {
                const delta = now - last
                const fps = 1000 / delta
                last = now
                FPSwa.pop()
                FPSwa.unshift(fps)
                let avg = 0
                let div = 0
                for (let i = 0; i < FPSwa.length; i++) {
                    const k = FPSwa.length - i
                    avg += FPSwa[i] * k
                    div += k
                }
                avg /= div
                FPS = Math.round(avg)
            }
            requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)

        /*  determine current memory usage  */
        let memUsed  = 0
        let memAvail = 0
        setInterval(() => {
            memUsed  = performance.memory.usedJSHeapSize  / (1024 * 1024)
            memAvail = performance.memory.jsHeapSizeLimit / (1024 * 1024)
        }, 1000)

        /*  regularly send statistics  */
        vingester.stat({ id: vingester.cfg.id, fps: FPS, memUsed, memAvail })
        setInterval(() => {
            vingester.stat({ id: vingester.cfg.id, fps: FPS, memUsed, memAvail })
        }, 500)
    }

    /*  capture audio from the DOM audio/video elements  */
    const captureAudio = () => {
        try {
            /*  create offline audio context  */
            const ac = new AudioContext({
                latencyHint: "interactive",
                sampleRate:  parseInt(vingester.cfg.r)
            })

            /*  create a stereo audio destination  */
            const dest = ac.createMediaStreamDestination()
            dest.channelCount          = parseInt(vingester.cfg.C)
            dest.channelCountMode      = "explicit"
            dest.channelInterpretation = "speakers"

            /*  create media recorder to create an WebM/OPUS stream as the output.
                NOTICE: we could use the Chromium-supported "audio/webm; codecs=\"pcm\"" here
                and receive lossless PCM/interleaved/signed-float32/little-endian and then during
                later processing completely avoid the lossy OPUS to lossless PCM decoding.
                Unfortunately, the MediaEncoder in Chromium (at least until version 90) causes
                noticable distortions in the audio output for lossless PCM encoding while for its
                standard OPUS encoding it does not. So, we intentionally have to stay with OPUS here,
                even if it causes extra decoding performance and theoretically (but not noticable)
                is also a lossy intermediate step.  */
            const recorder = new MediaRecorder(dest.stream, {
                mimeType: "audio/webm; codecs=\"opus\""
            })
            recorder.addEventListener("dataavailable", async (ev) => {
                const ab = await ev.data.arrayBuffer()
                const u8 = new Uint8Array(ab, 0, ab.byteLength)
                vingester.audioCapture(u8)
            })

            /*  internal state  */
            let attached = 0
            const nodes  = new Map()
            const tracks = new Map()

            /*  attach/detach a particular node  */
            const trackAdd = (when, track) => {
                if (track.kind !== "audio")
                    return
                if (!tracks.has(track)) {
                    vingester.log(`on ${when} capture ${track.readyState} audio track`)
                    const source = ac.createMediaStreamSource(new MediaStream([ track ]))
                    source.connect(dest)
                    tracks.set(track, source)
                    attached++
                    if (attached === 1)
                        recorder.start(Math.trunc(1000 / parseInt(vingester.cfg.f)))
                }
            }
            const trackRemove = (when, track) => {
                if (track.kind !== "audio")
                    return
                if (tracks.has(track)) {
                    vingester.log(`on ${when} uncapture ${track.readyState} audio track`)
                    const source = tracks.get(track)
                    source.disconnect(dest)
                    tracks.delete(track)
                    attached--
                    if (attached === 0)
                        recorder.stop()
                }
            }
            const onAddTrack    = (ev) => { trackAdd("listener", ev.track) }
            const onRemoveTrack = (ev) => { trackRemove("listener", ev.track) }
            const attach = (when, node) => {
                if (!nodes.has(node)) {
                    vingester.log(`on ${when} attach to ${node.tagName}`)
                    const stream = node.captureStream()
                    const audiotracks = stream.getAudioTracks()
                    for (let i = 0; i < audiotracks.length; i++)
                        trackAdd(when, audiotracks[i])
                    stream.addEventListener("addtrack",    onAddTrack)
                    stream.addEventListener("removetrack", onRemoveTrack)
                    nodes.set(node, stream)
                }
            }
            const detach = (when, node) => {
                if (nodes.has(node)) {
                    vingester.log(`on ${when} detach from ${node.tagName} node`)
                    const stream = nodes.get(node)
                    stream.removeEventListener("addtrack",    onAddTrack)
                    stream.removeEventListener("removetrack", onRemoveTrack)
                    const audiotracks = stream.getAudioTracks()
                    for (let i = 0; i < audiotracks.length; i++)
                        trackRemove(when, audiotracks[i])
                    nodes.delete(node)
                }
            }

            /*  attach to later added/removed nodes  */
            const body = document.body
            const observer = new MutationObserver((mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === "childList") {
                        for (const node of mutation.addedNodes)
                            if (node instanceof HTMLMediaElement)
                                attach("mutation", node)
                        for (const node of mutation.removedNodes)
                            if (node instanceof HTMLMediaElement)
                                detach("mutation", node)
                    }
                }
            })
            observer.observe(body, { attributes: false, childList: true, subtree: true })

            /*  attach to initially existing nodes  */
            vingester.log("loading")
            const els = document.querySelectorAll("audio, video")
            for (const el of els)
                attach("load", el)
            vingester.log("loaded")

            /*  pure all existing nodes on document unload  */
            window.addEventListener("beforeunload", () => {
                vingester.log("unloading")
                const els = document.querySelectorAll("audio, video")
                for (const el of els)
                    detach("unload", el)
                vingester.log("unloaded")
            }, { capture: true })
        }
        catch (ex) {
            vingester.log("EXCEPTION:", ex)
        }
    }

    /*  always capture statistics  */
    captureStats()

    /*  optionally capture audio
        (just for requested NDI output and more than zero audio channels)  */
    if (vingester.cfg.N && parseInt(vingester.cfg.C) > 0)
        captureAudio()
})()
