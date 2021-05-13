
Visibility
==========

Vingester DOM
-------------

**Vingester**, for *Headless* mode of operation, provides information
about the NDI&reg; "tally" information to the Web Contents via the
*Document Object Model (DOM)* of the browser instance. For this,
**Vingester** raises the custom `vingesterTallyChanged` `CustomEvent`
on the global `window` object to show changes in the NDI&reg; "tally"
information. The event's `detail.tally` property is of type `string` and
reflects the following four NDI&reg; "tally" states:

- `unconnected`: no peer is receiving the NDI&reg; output stream.
- `connected`: one or more peers are receiving the NDI&reg; output stream,
   but the streams are still not in *preview* or *program* at any receiver.
- `preview`: one or more peers are receiving the NDI&reg; output stream and
   at least at one receiver the stream is in the *preview*.
- `program`: one or more peers are receiving the NDI&reg; output stream and
   at least at one receiver the stream is in the *program*.

An example use within the Web Contents (perhaps even by
injecting this code via the configuration [**Patch / Script /
Code**](configuration#Patch)):

```js
if (window.vingester) {
    window.addEventListener("vingesterTallyChanged", (ev) => {
        if (ev.detail.tally === "preview" || event.detail.tally === "program")
            backgroundMusic.play()
        else
            backgroundMusic.pause()
    })
}
```

W3C DOM
-------

**Vingester** provides information about the output video-stream
"visibility" to the Web Contents via the *Document Object Model (DOM)*
of the browser instance. For the *Frameless* mode of operation, this
*visibility* is just "always visible". But for the *Headless* mode of
operation with the NDI&reg; output sink, **Vingester** maps the NDI&reg;
"tally" information (see above) onto this "visibility" in order to inform the Web
Contents about its visibility state.

The *W3C DOM)* already defines a standard
[`document.visibilityState`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState)
read-only property. **Vingester**, by default, uses this property to
reflect the current visibility state of the Web Contents. This string
property contains either `visible` (corresponding to the NDI&reg; "tally" state
"program") or `hidden` (corresponding to all other NDI&reg; "tally" states).
In order to observe changes to the visibility, the
W3C Document Object Model (DOM) defines a standard
[`visibilitychange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
event raised on `document`.

An example use within the Web Contents (perhaps even by
injecting this code via the configuration [**Patch / Script /
Code**](configuration#Patch)).

```js
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible")
        backgroundMusic.play()
    else
        backgroundMusic.pause()
})
```

OBS-Browser DOM
---------------

As one of the most prominent use-cases for **Vingester** is to
externalize Web Contents from *OBS Studio*'s *Browser Source*,
**Vingester** also can simulate the *Document Object Model (DOM)*
extension of the underlying [OBS-Browser](https://github.com/obsproject/obs-browser)
technology (if configuration **Browser / OBS-DOM** is enabled).
This especially allows in the chain of [OBS.Ninja](https://obs.ninja) &rarr; **Vingester** &rarr;
[OBS Studio](https://obsproject.com) to show the "tally" information to the individual participants.

The simulation consists of the definition of the global object
`window.obsstudio` with the following items:

- property `pluginVersion: string` for retrieving the OBS-Browser version (always `0.0.0` for **Vingester**).

- method `getCurrentScene(callback: ({ name: string, width: number, height: number }) => void): void`
  for retrieving the current OBS Studio scene name and dimension.

- method `getStatus(callback: ({ streaming: boolean, recording: false, recordingPaused: false, replaybuffer: false, virtualcam: false }) => void): void`,
  for retrieving the current OBS Studio status (all fields except `streaming` are `false` for **Vingester** and
  field `streaming` always is equal to `document.visibilityState === "visible"`).

- method `saveReplayBuffer(void): void` for
  plain existance reasons (without any functionality in **Vingester**).

The simulation, in addition to the regular W3C DOM visibility information (see above),
consists of the following events emitted on the global object `window`:

- `obsSourceVisibleChanged` `CustomEvent` with a `detail.visible: boolean` property
- `obsSourceActiveChanged` `CustomEvent` with a `detail.active: boolean` property 

A `visible === true` corresponds to the NDI&reg; "tally" states
`preview` and `program` while an `active === true` corresponds to the
NDI&reg; "tally" state `program` only.

```js
if (window.obsstudio) {
    document.addEventListener("obsSourceVisibleChanged", (ev) => {
        if (ev.detail.visible)
            backgroundMusic.play()
        else
            backgroundMusic.pause()
    })
    document.addEventListener("obsSourceActiveChanged", (ev) => {
        if (ev.detail.active)
            backgroundMusic.volume(1.0)
        else
            backgroundMusic.volume(0.5)
    })
}
```

