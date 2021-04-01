/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/* global vingester */
(function () {
    /*  capture statistics  */
    const captureStats = () => {
        /*  at least once send stats initially  */
        vingester.stat({ fps: 0, memUsed: 0, memAvail: 0 })

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
                    vingester.stat({ fps, memUsed, memAvail })
                }
            }
            requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
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
            dest.channelCountMode = "explicit"
            dest.channelCount = parseInt(vingester.cfg.C)

            /*  create media recorder  */
            const recorder = new MediaRecorder(dest.stream, { mimeType: "audio/webm;codecs=pcm" })
            recorder.addEventListener("dataavailable", async (ev) => {
                if (ev.data.size > 0) {
                    const ab = await ev.data.arrayBuffer()
                    const u8 = new Uint8Array(ab, 0, ab.byteLength)
                    vingester.audioCapture(u8)
                }
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
            const els = document.querySelectorAll("audio, video")
            for (const el of els)
                attach("load", el)

            /*  pure all existing nodes on document unload  */
            window.addEventListener("beforeunload", () => {
                const els = document.querySelectorAll("audio, video")
                for (const el of els)
                    detach("unload", el)
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
    if (vingester.cfg.N && vingester.cfg.C > 0)
        captureAudio()
})()
