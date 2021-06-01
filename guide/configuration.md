
Configuration
=============

![](_media/configuration.png)

Each browser configuration tile in the **Vingester** user interface contains the following
configuration fields.

Browser
-------

The first group of configuration fields target the browser:

- **Browser / Title**:<br/>
  The title of the browser. For "Frameless" operation, this sets the
  title of the desktop window. For "Headless" operation, this sets
  the name of the NDI&reg; stream. Use a short unique identifier.
  An example is `VDON-P01` (for "VDO.Ninja Person 01").

- **Browser / Info**:<br/>
  The optional information attached to the browser configuration.
  **Vingester** internally does *not* use this information at all.
  It is just for documentation purposes of the user.
  An example is `VDO.Ninja Session, Person No. 1`.

- **Browser / Size**:<br/>
  The width and height in pixels of the browser desktop window (in
  "Frameless" mode) or the off-screen framebuffer (in "Headless" mode).
  Set this to match the video-stream output size. So, if you want to
  stream 720p, use a size of `1280` x `720` pixels. If you want to stream
  1080p, use a size of `1920` x `1080` pixels.

- **Browser / Zoom**:<br/>
  The optical zoom level of the browser. By default it should be kept
  as `1.0`, but use for instance `0.75` to shrink the Web Contents
  by 25%.

- **Browser / Background**:<br/>
  The background color of the browser. Use `transparent` for a fully
  transparent background or `#RRGGBB` for a particular RGB background
  color. For a chroma-key style background, use `#00ff00`.

- **Browser / Trust**:<br/>
  Enable or disable the site trust, i.e., whether the SSL/TLS certificate of the
  site (as specified by **Input / URL**) is trusted. Usually, this should be
  disabled to not enforce the trust and rely on valid certificates. Enable
  it only to especially enfore the trust of your *own* self-signed certificates
  when communicating over `localhost`.

- **Browser / Node-API**:<br/>
  Enable or disable the Electron/Node API integration for the Web
  Contents. Usually, this should be disabled to not give the Web
  Contents access to the local system. Enable it only to especially
  grant access for your *own* applications which require elevated
  privileges.

- **Browser / OBS-DOM**:<br/>
  Enable or disable the OBS Studio Browser Source emulation in the
  Document Object Model (DOM) of the Web Contents. Usually, this should
  only be enabled for applications which explicitly check whether they
  are running under the OBS Studio Browser Source. The most prominent
  example is VDO.Ninja, which this way supports tally light information.

- **Browser / Persist**:<br/>
  Enable or disable the Web Contents session persistence. Enable it
  if you want to keep state across stop/start or reload actions.

Input
-----

The second group of configuration fields target the Web Contents itself:

- **Input / URL**:<br/>
  The URL of the Web Contents to render. Typical examples are
  YouTube URLs like `https://www.youtube.com/embed/BKorP55Aqvg?autoplay=1&controls=0&rel=0`,
  VDO.Ninja (Trampoline) URLs like `https://vingester.app/vdon/#/sample/sample/receiver/mono/720p/24/none/P01`, etc.
  Ensure that the Web Contents does not require any interactions and optimally expands to 100% of the
  browser canvas. See [sources](sources#sources) for details on usual inputs.

Patch
-----

The third group of configuration fields target the Web Contents patching:

- **Patch / Delay**:<br/>
  The delay in milliseconds before patching the Web Contents.

- **Patch / Frame**:<br/>
  The regular expression matching the URL of the Web Contents frame to patch.
  Use an empty string for the main frame.

- **Patch / Style / Type**:<br/>
  Either `inline` for inline CSS code (see **Patch / Style / Code**) or
  `file` for selecting external CSS code (click onto **Patch / Style /
  Code** for selecting the file).

- **Patch / Style / Code**:<br/>
  The CSS code to be injected into the Web Contents for overriding its styles.
  For instance, use `html, body { background: transparent !important; }` to
  force the background of the Web Contents to be transparent.

- **Patch / Script / Type**:<br/>
  Either `inline` for inline JavaScript code (see **Patch / Script / Code**) or
  `file` for selecting external JavaScript code (click onto **Patch / Script /
  Code** for selecting the file).

- **Patch / Script / Code**:<br/>
  The JavaScript code to be injected into the Web Contents for
  manipulating its Document Object Model (DOM). For instance,
  use `for (const el of document.querySelectorAll(".foo .bar"))
  el.parentNode.removeChild(el)` to remove all DOM elements matching the
  CSS selector `.foo .bar`.

Output 1 (Frameless)
--------------------

The forth group of configuration fields target the Frameless output:

- **Output 1 / Frameless**:<br/>
  Enable or disable the "Frameless" mode of operation where the Web
  Contents is running inside an *on-screen* browser instance. The result
  has to be captured externally by, for instance, a Desktop Source
  inside OBS Studio.

- **Output 1 / Video / Position**:<br/>
  The position of the desktop window of the browser instance, relative
  to the top-left corner of the **Output 1 / Video / Display**.

- **Output 1 / Video / Display**:<br/>
  The selection of the display. The display number `0` is always
  the primary display. The other displays are numbered `1`, `2`, etc.

- **Output 1 / Video / Pin**:<br/>
  Enable or disable the pinning of the browser window to the top, i.e.,
  the z-position is higher than other windows. This ensures that no
  other windows overlap it and this way destroy the capturing.

- **Output 1 / Audio / Device**:<br/>
  Set the audio output device. The device usually has to be
  a "virtual output cable" device like [Virtual Audio Cable](https://vac.muzychenko.net/en/)
  or [VB-Cable](https://vb-audio.com/Cable/) under Windows, or
  [Loopback](https://rogueamoeba.com/loopback/) or
  [BlackHole](https://github.com/ExistentialAudio/BlackHole) under macOS.

Output 2 (Headless)
-------------------

The fifth group of configuration fields target the Headless output:

- **Headless**:<br/>
  Enable or disable the "Headless" mode of operation where the Web
  Contents is running inside an *off-screen* browser instance. The
  result is captured internally for forther processing through the
  NDI&reg; and FFmpeg&trade; sinks.

- **Headless / Video / Frame Rate**:<br/>
  The Frames Per Second (FPS) for both capturing and sending the Web
  Contents. Use `24` for Cinema, `25` for PAL, `29.97` for NTSC, `30`
  for Standard or even `60` for 2x Standard. Use `0` for
  an audio-only stream.

- **Headless / Video / Adaptive**:<br/>
  Enable or disable the NDI-Tally-based FPS adaption, i.e., the FPS
  is reduced to 1 if the NDI stream has no connected receivers and no
  preview is enabled, the FPS is reduced to 5 if the NDI stream has no
  connected receivers and the preview is enabled, and the FPS is reduced
  to 1/3 of the **Headless / Video / Frame Rate** if the NDI stream has
  connected receivers but is still *not* in the preview or program at
  one of those connected receivers.

- **Headless / Video / Delay**:<br/>
  The delay of the video frames in milliseconds. Use this if the audio
  is behind the video and hence the video has to wait for the audio to
  be in sync again. Usually this is not needed, as audio processing
  usually is faster than video processing.

- **Headless / Audio / Sample Rate**:<br/>
  The audio sample rate in kilo-hertz (kHz). Only audio sample rates of
  the underlying OPUS codec are supported. Use `8` for very low audio
  quality, use `12` or `16` for medium audio quality, use `24` for a
  good audio quality, and use `48` for the best audio quality.

- **Headless / Audio / Channels**:<br/>
  The number of audio channels. Use `0` to disable the audio stream at
  all (and get a video-only stream), use `1` for a mono audio stream and
  use `2` for a stereo audio stream. Ensure that this matches your Web
  Contents.

- **Headless / Audio / Delay**:<br/>
  The delay of the audio frames in milliseconds. Use this if the video
  is behind the audio and hence the audio has to wait for the video to
  be in sync again. This can be needed, as audio processing usually is
  faster than video processing.

- **Headless / Sink / NDI**:<br/>
  Enable or disable the NDI&reg; sink engine. The sent out NDI
  multicast streams use the **Browser / Title** as their name. Use [NDI
  Studio Monitor](https://www.ndi.tv/tools/), [NDI Virtual Input](https://www.ndi.tv/tools/),
  [OBS Studio](https://obsproject.com) + [OBS-NDI](https://github.com/Palakis/obs-ndi/), or
  [LiveMind Receiver](https://livemind.tv/recorder) for receiving the sent NDI streams.

- **Headless / Sink / FFmpeg**:<br/>
  Enable or disable the FFmpeg&trade; sink engine.
  Use the following two options for controlling FFmpeg's particular operation.

- **Headless / Sink / FFmpeg / (Format)**:<br/>
  The command-line interface (CLI) argument of FFmpeg's `-f` option to
  set the output format. You can select between Matroska (MKV), MPEG-4,
  MPEG-TS, RTP and FLV. Usually, you want to use Matroska for optimized
  local recording, MPEG-4 for alternative local recording, MPEG-TS for
  UDP/SRT-based remote streaming, RTP for RTP-based remote streaming and
  FLV for RTMP-based remote streaming.

- **Headless / Sink / FFmpeg / (Arguments)**:<br/>
  The command-line interface (CLI) arguments of FFmpeg to be appended
  to override the default options, set additional output options
  and to set the output URL. For local recording use an argument
  like `example.mkv` or `example.m4v`. For UDP-based streaming use
  an argument like `udp://10.0.0.1:12345`, `rtp://10.0.0.1:12345`
  or `srt://10.0.0.1:1234?pkt_size=1316` (if supported by FFmpeg on
  underlying platform), and for TCP-based streaming use an argument like
  `rtmp://10.0.0.1:1935/live/example`.

