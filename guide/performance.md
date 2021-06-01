
Performance
===========

Performance Aspects
-------------------

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

- **Adaptive Framerate**:

  For the "headless" NDI mode, **Vingester** supports a tally light
  based adaptive framerate adjustment. When enabled, the framerate is
  reduced to 1 fps if the video stream is not received by any peer,
  reduced to 1/3 of the target framerate if the video stream is received
  by any peer and set to the target framerate if the video stream is
  part of the preview or program at any receiving peer.

- **Main Capturing Process**:

  Although **Vingester** runs each browser instance in two dedicated
  separate processes (one for the content rendering and one for the
  output encoding), the underlying Electron technology currently allows
  **Vingester** only to capture the Web Contents from within the main
  process. So, in the chain of content rendering, output capturing
  and output encoding, the output capturing is the bottleneck, as it
  cannot use multiple processes. For 1 to 3 browser instances, this
  usually does not matter very much. But if you want to use more browser
  instances, you better should optimize your **Vingester** setup by running
  multiple **Vingester** instances and spread your N browser instances onto
  for instance N/3 **Vingester** instances.

  Suppose you want to ingest 6 VDO.Ninja sessions with **Vingester**. Under
  Windows, create three individual shortcuts to the `Vingester.exe` and
  edit its properties by adding the command-line options `--tag=<name>
  --profile=<dir> --config=<dir>.yaml` where `<name>` is something
  like `VDON-1-2`, `VDON-3-4` and `OSBN-5-6` and `<dir>` is the fully
  qualified filesystem path like `C:\Users\<username>\Desktop\VDON-1-2`,
  `C:\Users\<username>\Desktop\VDON-3-4` and
  `C:\Users\<username>\Desktop\VDON-5-6`. When you now start **Vingester**
  with these shortcuts you get dedicated instances with their own
  configuration and obviously their own main process. In the example, you get 3 **Vingester** instances, each
  handles 2 VDO.Ninja sessions. This way your get 3 instead of just 1
  main processes which perform the output capturing.

Standard Modes
--------------

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

  Vingester: **disabled GPU Hardware Acceleration** + **Headless Mode** + **Adaptive Framerate**<br/>
  OBS Studio: **NDI Source**

  In this mode you intentionally disable GPU Hardware Acceleration
  within **Vingester** and render all the Web Content off-screen in
  "headless" mode, let them be sent out as NDI video multicast streams
  and ingested into OBS Studio through its NDI Source. This combination
  is the most elegant way, but as GPU Hardware Acceleration cannot be
  used it has a somewhat lower overall performance than the previous
  mode of operation.

Golden Rule
-----------

> Remember: in any case of operation modes of **Vingester** and OBS
> Studio, always ensure that the total CPU usage of *a single CPU*
> and the *system as a whole* **never** exceeds about 80-90% or you
> certainly will be faced with quality problems in both audio (clipping,
> lip-unsync) and video (frame loss) streams. Also **Vingester**, in
> a CPU overload situation, will be no longer responsive enough and
> internally queue more data than it is able to send out.

Reference Points
----------------

The following are four reference points for you:

- In **"Frameless"** mode, with **enabled** GPU Hardware Acceleration
  and **disabled** previews, a PC based on a 6-core i5-10600K CPU and
  running under Windows 10 can ingest **9** VDO.Ninja sessions with 720p30
  at about 80% average system load and without performance penalties.

- In **"Frameless"** mode, with **enabled** GPU Hardware Acceleration
  and **disabled** previews, a PC based on a 8-core i7-11700KF CPU and
  running under Windows 10 can ingest **18** VDO.Ninja sessions with 720p30
  at about 40% average system load and without performance penalties.

- In **"Headless"** mode, with **disabled** GPU Hardware Acceleration
  and **disabled** previews, a PC based on a 6-core i5-10600K CPU and
  running under Windows 10 can ingest **4** VDO.Ninja sessions with 720p30
  at about 80% average system load and without performance penalties.

- In **"Headless"** mode, with **disabled** GPU Hardware Acceleration
  and **disabled** previews, a PC based on a 8-core i7-11700KF CPU and
  running under Windows 10 can ingest **8** VDO.Ninja sessions with 720p30
  at about 60% average system load and without performance penalties.

So, while the Headless mode is more flexible than the Frameless mode, it
has just about half the performance. Keep this in mind, please!

Source Framerate
----------------

Finally, for Headless NDI output, ensure that your Web Contents is
really producing at least the Frames-Per-Second (FPS) you requested from
**Vingester**. For instance, compare the following three YouTube videos
as the Web Contents:

- [YouTube Video 24 FPS](https://www.youtube.com/embed/Dfw_5DykRxs?autoplay=1&controls=0&rel=0)
- [YouTube Video 30 FPS](https://www.youtube.com/embed/N6IC80LfrNs?autoplay=1&controls=0&rel=0)
- [YouTube Video 60 FPS](https://www.youtube.com/embed/79ImZE0K7xc?autoplay=1&controls=0&rel=0)

If you tell **Vingester** you want 30 FPS, the first will effectively just
output as a 24 FPS stream (the reason is that the underlying Chromium
rendering engine will dynamically reduce the FPS if the content does not
change as much as the requesting FPS wishes), the second and third will
both output as a 30 FPS stream.

