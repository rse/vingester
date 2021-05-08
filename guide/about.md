
About
=====

Overview
--------

**Vingester** (**V**ideo **ingester**) is a small
[Electron](https://www.electronjs.org/)-based desktop application
for use under Windows, macOS or Linux to run multiple
[Chromium](https://www.chromium.org/)-based Web browser instances and
ingesting their rendered Web Contents as screen/window-captured or
[NDI&reg;](https://www.ndi.tv/)-multicasted or [FFmpeg&trade;](https://ffmpeg.org)-based
video streams for further use in local or remote video mixing applications or
for local recording.

![Vingester Screenshot](_media/screenshot.png)

Motivation
----------

Although not just tied to this particular use case, **Vingester** was originally born for
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

