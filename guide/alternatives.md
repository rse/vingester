
Alternatives
============

The following alternative products are known for also ingesting Web
Contents into video production software like **OBS Studio**. They are
not as powerful as **Vingester**, but could be alternative solutions in
case **Vingester** is not usable or is not wished to be used.

Decent Alternatives
-------------------

- [OBS-Browser](https://github.com/obsproject/obs-browser):
  This is OBS Studio's built-in "Browser Source". It is
  a decent implementation based on the Chromium Embedded
  Framework (CEF). The drawback (and the original motivation
  for **Vingester**) is that CPU intensive applications like
  OBS.Ninja, running in a Browser Source, can cause OBS Studio to
  degrade at least audio quality regularly. The major drawback of
  [OBS-Browser](https://github.com/obsproject/obs-browser) is that its
  Chromium Embedded Framework (CEF) and this way its contained Chromium
  engine is not the latest one.

- [OBS-Studio](https://obsproject.com) +
  [OBS-Browser](https://github.com/obsproject/obs-browser) +
  [OBS-NDI](https://github.com/Palakis/obs-ndi/): This is meant seriously:
  one alternative for ingesting into OBS Studio is OBS Studio itself.
  Obviously, as this does not reduce the overall complexity and load,
  this makes no sense on the same machine, of course. But if you run
  the combination of OBS Studio plus OBS-Browser plus OBS-NDI (with its
  "Dedicated NDI Output" filter) on a separate machine, you could use
  this to ingest Web Content into OBS Studio via NDI, too. The major
  drawback of [OBS-Browser](https://github.com/obsproject/obs-browser)
  is that its Chromium Embedded Framework (CEF) and this way its
  contained Chromium engine is not the latest one.

Limited Alternatives
--------------------

- [Singular Recast for NDI](https://www.singular.live/ndi):
  This is a Windows application providing a similar functionality than
  the **Vingester** "headless" mode by capturing the Web Contents and
  sending it out via NDI. Unfortunately, it does not support multiple
  browser instances and preview functionality and hence its use-cases
  are more limited.

- [SIENNA WebNDI](http://www.sienna-tv.com/ndi/webndi.html):
  This is an iPad application providing a similar functionality than
  the **Vingester** "headless" mode by capturing the Web Contents and
  sending it out via NDI. Unfortunately, it does not support multiple
  browser instances and hence its use-case are more limited.

- [ElectronCapture](https://github.com/steveseguin/electroncapture):
  This is a similar but less feature-rich program of the OBS.Ninja
  author. It mainly provides the **Vingester** "frameless" mode, but
  especially no NDI-based "headless" mode. And its multiple browser
  instance support and corresponding window positioning management is
  very simple.

- [ChromiCast](https://github.com/steveseguin/chomicast):
  This is a similar but less feature-rich program of the OBS.Ninja
  author. It mainly provides the **Vingester** "headless" mode, but
  especially no "frameless" screen-capturing mode. And it is just a
  proof of concept in the early stages of development and hence not
  ready for production.

