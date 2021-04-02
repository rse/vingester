
<img src="https://raw.githubusercontent.com/rse/vingester/master/vingester-icon.png" width="150" align="right" alt=""/>

[Vingester](https://vingester.app)
==================================

**Ingest Web Contents as Video Streams**

About
-----

**Vingester** (**V**ideo **ingester**) is a small
[Electron](https://www.electronjs.org/)-based desktop application
for use under Windows, macOS or Linux to run multiple
[Chromium](https://www.chromium.org/)-based Web browser instances and
ingesting their rendered Web Contents as screen/window-captured or
[NDI](https://www.ndi.tv/)-multicasted video streams for further use in
video mixing applications.

Motivation
----------

Although not just tied to this particular use case, **Vingester** was born for
and is primarily intended as an essential companion application to [OBS
Studio](https://obsproject.com/) and [OBS.Ninja](https://obs.ninja/),
in order to ingest the video streams of OBS.Ninja meeting participants
into an OBS Studio based video production in an efficient and robust way.

The challenge here is that although OBS.Ninja could be directly running
in a [Browser Source](https://github.com/obsproject/obs-browser) of
OBS Studio, using this approach for more than 2-3 participants usually causes a
dramatical performance drop-down in OBS Studio and as a side-effect
at least regularly destroys the entire audio quality in OBS Studio.
By externally ingesting the video streams of meeting participants
through **Vingester**, this performance degradation in OBS Studio can be
avoided, although the total system load will be not necessarily lower.

Additionally, the **Vingester** approach also better handles packet
losses than OBS Studio (such as guests on poor WiFi connections) and the
Window Capture source of OBS Studio causes lower resource usage than
its Browser Source. Additionally, **Vingester** does not throttle its
browser performance if it is backgrounded like a regular Chrome browser
does. And **Vingester** windows can be pinned to be always on top of
others windows and determine the correct window sizes if the display
uses a high DPI mode.

Sneak Preview
-------------

![Vingester Screenshot](vingester-screenshot.png)

In the screenshot above you can see **Vingester** in action. It is
running two browser instances: one in "frameless" (desktop window) mode
and one in "headless" (NDI stream) mode. In each of them a receiver
instance of OBS.Ninja is running (for demonstration purposes, it is just the
same OBS.Ninja session). The "frameless" window usually is
captured by OBS Studio through a "Screen Capture" or "Window Capture"
source while the "headless" NDI stream usually is directly consumed by
OBS Studio through a ["NDI Source"](https://github.com/Palakis/obs-ndi).

Performance Notice
------------------

Performance is crucial in ingesting rendered Web Content. The following
related aspects should be kept in mind:

- **GPU Hardware Acceleration**:

  Both **Vingester** and OBS Studio use Chromium for the browser
  component in order to render Web Content. Chromium has the possibility
  to leverage from GPU Hardware Acceleration to speed up video decoding
  and similar graphics intensive tasks. When rendering the Web Content
  into a desktop window ("frameless" mode), GPU Hardware Acceleration
  should be *enabled*. But when rendering the Web Content off-screen
  ("headless" mode) GPU Hardware Acceleration should be *disabled*, as
  for off-screen rendering the use of the GPU slows down at least the
  capturing process. Use the "GPU" toggle at the top right corner of
  **Vingester** to enable/disable GPU Hardware Acceleration according to
  your prefered operation mode.

- **Frameless/Headless Rendering**:

  **Vingester** supports both "frameless" (desktop window based) and
  "headless" (NDI network protocol based) modes of operation. The
  "frameless" mode means that **Vingester** lets Chromium render the Web
  Content into a frameless desktop window which then should be externally captured
  by OBS Studio (through its "Screen Capture" or "Window Capture"
  sources). The "headless" mode means that **Vingester** lets Chromium
  render the Web Content off-screen, internally captures the contents
  and sends the results as a video multicast stream via Network Display Interface
  (NDI) protocol to the local network. The "frameless" mode is best
  combined with GPU Hardware Acceleration enabled. The "headless" mode
  is best combined with GPU Hardware Acceleration disabled.

  Also keep in mind that although **Vingester**
  supports both "frameless" and "headless" mode in parallel, using
  this combined mode means that the (usually lower) NDI framerate has
  to be simulated by skipping frames of the (usually higher) desktop
  framerate. As a result, this combined mode can result is less stable
  NDI streams.

- **Content Previewing**:

  **Vingester** supports previewing the rendered Web Content as a small
  thumbnail image (128x72 pixels) in the main **Vingester** control
  window. This is not very useful for the "frameless" mode of operation
  in practice, but can be important for debugging in case of the
  "headless" mode. Nevertheless, use the previewing functionality only
  for debugging purposes, as it also throttles the performance of
  **Vingester**.

- **Screen/Window Capturing**:

  OBS Studio can capture both an entire desktop (Screen Capture source)
  and just a particular window (Window Capture source). Capturing an
  entire desktop is more efficient as it usually leverages from GPU
  Hardware Acceleration within the operating system, but requires a
  large or even spare monitor for displaying the browser windows of
  **Vingester** and an extra cropping step within OBS Studio.

  Capturing just a particular window is less efficient as it usually
  cannot leverage GPU Hardware Acceleration within the operating system,
  but does not require a large or even spare monitor (all browser
  windows even can overlap).

These performance aspects all together mean, you should use only one of
the following modes of operation in practice:

- **Mode 1: "Frameless"**

  Vingester: **enabled GPU Hardware Acceleration** + **Frameless Mode**<br/>
  OBS Studio: **Desktop Capturing Source** + **Cropping Transform**

  In this mode you enable GPU Hardware Acceleration within **Vingester**
  and render the Web Content into dedicated "frameless" desktop
  windows which then are all together "screen captured" by OBS Studio
  and just split into individual videos within OBS Studio through
  multiple cropping transforms. This combination usually has the best
  overall performance as GPU Hardware Acceleration is used both within
  **Vingester** and by the operating system for OBS Studio.

- **Mode 2: "Headless"**

  Vingester: **disabled GPU Hardware Acceleration** + **Headless Mode**<br/>
  OBS Studio: **NDI Source**

  In this mode you intentionally disable GPU Hardware Acceleration
  within **Vingester** and render all the Web Content off-screen in
  "headless" mode, let them be sent out as NDI video multicast streams
  and ingested into OBS Studio through its NDI Source. This combination
  is the most elegant way, but as GPU Hardware Acceleration cannot be
  used it has a somewhat lower overall performance than the previous
  mode of operation.

<b>Remember: in any case of operation modes of **Vingester** and OBS
Studio, always ensure that the total CPU usage of your system never
exceeds about 70-80% or you certainly will be faced with quality
problems in both audio (clipping, lip-unsync) and video (frame loss)
streams.</b>

Alternatives
------------

The following alternatives are known for also ingesting Web Contents
into video production software like OBS Studio. They are not as
powerful as **Vingester**, but could be alternative solutions in case
**Vingester** is not usable or is not wished to be used.

- [DECENT] [OBS-Browser](https://github.com/obsproject/obs-browser):
  This is OBS Studio's built-in "Browser Source". It is a decent
  implementation based on the Chromium Embedded Framework (CEF). The
  drawback (and the original motivation for **Vingester**) is that CPU
  intensive applications like OBS.Ninja, running in a Browser Source,
  can cause OBS Studio to degrade at least audio quality regularly.

- [DECENT] [OBS-Studio](https://obsproject.com) + [OBS-Browser](https://github.com/obsproject/obs-browser) + [OBS-NDI](https://github.com/Palakis/obs-ndi/):
  This is meant seriously: one alternative for ingesting into OBS Studio
  is OBS Studio itself. Obviously, as this does not reduce the overall
  complexity and load, this makes no sense on the same machine, of
  course. But if you run the combination of OBS Studio plus OBS-Browser
  plus OBS-NDI (with its "Dedicated NDI Output" filter) on a separate
  machine, you could use this to ingest Web Content into OBS Studio via
  NDI, too.

- [LIMITED] [Singular Recast for NDI](https://www.singular.live/ndi):
  This is a Windows application providing a similar functionality than
  the **Vingester** "headless" mode by capturing the Web Contents and
  sending it out via NDI. Unfortunately, it does not support multiple
  browser instances and preview functionality and hence its use-cases
  are more limited.

- [LIMITED] [SIENNA WebNDI](http://www.sienna-tv.com/ndi/webndi.html):
  This is an iPad application providing a similar functionality than
  the **Vingester** "headless" mode by capturing the Web Contents and
  sending it out via NDI. Unfortunately, it does not support multiple
  browser instances and hence its use-case are more limited.

- [LIMITED] [ElectronCapture](https://github.com/steveseguin/electroncapture):
  This is a similar but less feature-rich program of the OBS.Ninja
  author. It mainly provides the **Vingester** "frameless" mode, but
  especially no NDI-based "headless" mode. And its multiple browser
  instance support and corresponding window positioning management is
  very simple.

- [LIMITED] [ChromiCast](https://github.com/steveseguin/chomicast):
  This is a similar but less feature-rich program of the OBS.Ninja
  author. It mainly provides the **Vingester** "headless" mode, but
  especially no "frameless" screen-capturing mode. And it is just a
  proof of concept in the early stages of development and hence not
  ready for production.

Copyright & License
-------------------

Copyright &copy; 2021 [Dr. Ralf S. Engelschall](mailto:rse@engelschall.com)<br/>
Licensed under [GPL 3.0](https://spdx.org/licenses/GPL-3.0-only)

