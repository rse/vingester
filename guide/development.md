
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
process model of a *main* process and multiple *renderer*
(`BrowserWindow`) processes. There is a single renderer process for
the control user interface of **Vingester** itself plus two renderer
processes (one for the Frameless or Headless browser, and one for a
video-stream capturing worker) for each started browser instance.

The separated processes for each browser and the further splitting
between content and worker allows **Vingester** to leverage from
multi-core CPUs. Unfortunately, the limiting factor in this architecture
currently still is the *main* process where all video-streams have to be
passed through.

```nomnoml
#fill: #ffffff; #f0f0f0; #e0e0e0
#stroke: #333333
#font: Source Sans Pro
#fontSize: 12
#lineWidth: 1
#spacing: 20
#padding: 0
#edges: rounded

[<frame> Vingester|
    [main]<->[<frame> <<BrowserWindow>> Control|
        [control]<->[<actor> actor]
    ]
    [main]<->[browser]
    [browser]<->[<frame> <<BrowserWindow>> Content|
         [<reference> content]->[browser-preload]
         [content]<-[browser-postload]
    ]
    [browser]<->[<frame> <<BrowserWindow>> Worker|
         [browser-worker]
    ]
    [main]->[ffmpeg]
    [main]->[update]
    [main]->[util]
    [browser]->[util]
]
```

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

To build **Vingester** from scratch without packaging,
perform the following steps:

```sh
git clone https://github.com/rse/vingester
cd vingester
npm install
```

To run **Vingester** without packaging and in an automatic
"restart-on-code-change" mode, perform the following step:

```sh
npm start
```

In this mode, just edit the source files in parallel. On each
write, **Vingester** is automatically restarted within a second.

