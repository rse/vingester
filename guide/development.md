
Development
===========

Open Source
-----------

**Vingester** is Open Source Software (OSS), copyright &copy;
2021 by [Dr. Ralf S. Engelschall](mailto:rse@engelschall.com),
and licensed under [GNU General Public License (GPL) 3.0
only](https://spdx.org/licenses/GPL-3.0-only). Its homepage is
[Vingester.app](https://vingester.app) and its source code can be found
in its central [Github repository](https://github.com/rse/vingeste).
In case of any particular issues with **Vingester**, a new *public*
[Github Issue Request](https://github.com/rse/vingester/issues/new/choose) can be opened in the
[Github Issue Tracker](https://github.com/rse/vingester/issues).
A Pull Request can be made on Github in order to contribute
changes to **Vingester** under the GPL license conditions.

Software Technology Stack
-------------------------

**Vingester** is based on awesome Open Source Software (OSS) technologies. The full
list of technologies **Vingester** depends on can be found in the
[package.json](https://github.com/rse/vingester/blob/master/package.json)
file of the **Vingester** source code. The major software technologies
**Vingester** depends on are:

- [Electron&reg;](https://www.electronjs.org) runtime environment
- [Node.js&reg;](https://nodejs.org) runtime environment
- [Chromium&reg;](https://www.chromium.org) rendering engine
- [V8](https://v8.dev) JavaScript execution environment
- [NDI&reg;](https://ndi.tv) video-streaming library
- [FFmpeg](https://ffmpeg.org) video-streaming tool
- [VueJS](https://vuejs.org) user interface rendering engine
- [TypoPRO](https://typopro.org) user interface font collection
- [FontAwesome](https://fontawesome.com) user interface icon collection

Software Architecture
---------------------

**Vingester** uses an architecture, directly based on the Electron
process model of a *main* process and multiple *renderer* processes.
There is a single renderer process for the control user interface of
**Vingester** itself plus two renderer processes (one for the Frameless
or Headless browser, and one for a video-stream capturing worker) for
each started browser instance. The limiting factor in this architecture
unfortunately currently is the main process where all video-streams
have to be passed through.

Software Development
--------------------

In order to develop on **Vingester** you need one of the following
development environments:

- Windows 10,
  [Node.js&reg;](https://nodejs.org),
  [Git](https://git-scm.com/).

- macOS,
  [Node.js&reg;](https://nodejs.org),
  [Git](https://git-scm.com/).

- Ubuntu GNU/Linux,
  [Node.js&reg;](https://nodejs.org),
  [Git](https://git-scm.com/).

To build **Vingester** from scratch and then run it without packaging,
perform the following steps:

```sh
git clone https://github.com/rse/vingester
cd vingester
npm install
npm start
```

