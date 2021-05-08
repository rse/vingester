
Configuration
=============

![](_media/configuration.png)

Each browser configuration tile in the **Vingester** user interface contains the following
configuration fields:

Browser
-------

- **Browser / Title**:
- **Browser / Info**:
- **Browser / Size**:
- **Browser / Zoom**:
- **Browser / Background**:

Input
-----

- **Input / URL**:
- **Input / Style**:

Trust
-----

- **Trust / XXX**:
- **Trust / XXX**:

Output 1 (Frameless)
--------------------

- **Output 1 / Frameless**:
- **Output 1 / Video / Position**:
- **Output 1 / Video / Display**:
- **Output 1 / Video / Pin**:
- **Output 1 / Audio / Device**:

Output 2 (Headless)
-------------------

- **Headless**:<br/>
  Enable or disable the "Headless" mode of operation where the Web
  Contents is running inside an off-screen browser instance. The result
  is captured for forther processing through NDI&reg; or FFmpeg&trade;
  sinks.

- **Headless / Video / Frame Rate**:<br/>
- **Headless / Video / Adaptive**:<br/>
- **Headless / Video / Delay**:<br/>
- **Headless / Audio / Sample Rate**:<br/>
- **Headless / Audio / Channels**:<br/>
- **Headless / Audio / Delay**:<br/>

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
  set the output format. You can select between `matroska` (MKV), `mp4`
  (MPEG-4), `mpegts` (MPEG-TS), `flv` (Flash/FLV). Usually, you want to
  use `matroska` for optimized local recording, `mp4` for alternative
  local recording, `mpegts` for UDP-based remote streaming and `flv` for
  RTMP-based remote streaming.

- **Headless / Sink / FFmpeg / (Arguments)**:<br/>
  The command-line interface (CLI) arguments of FFmpeg to be appended to
  override the default options, set additional output options and to set
  the output URL. For local recording use an argument like `example.mkv`.
  For UDP-based streaming use an argument like `udp://10.0.0.1:12345`
  and for RTMP-based streaming use an argument like `rtmp://10.0.0.1:1935/live/example`.

