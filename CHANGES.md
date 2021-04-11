
Changes
=======

- 1.5.0
    - IMPROVEMENT: allow an individual audio device per frameless browser window
    - IMPROVEMENT: better align the user interface elements of browsers
    - IMPROVEMENT: increase console output by one additional line and provide button to toggle
    - IMPROVEMENT: use default values for missing fields when loading browser configurations
    - IMPROVEMENT: use vue-next-select for optically pleasant (enough) dropdowns

- 1.4.5
    - BUGFIX: fix packaging under Linux where Electron ASAR unpacking has to be explicitly configured

- 1.4.4
    - BUGFIX: allow preview to be enabled after start

- 1.4.3
    - BUGFIX: prevent browsers from starting twice when pressing START too quickly twice
    - IMPROVEMENT: remove also remaining window "traffic light" buttons on hover (under macOS)

- 1.4.2
    - BUGFIX: support frameless and headless mode in parallel again
    - BUGFIX: fix names of Web Contents permissions which are allowed
    - UPGRADE: upgraded some dependencies

- 1.4.1
    - IMPROVEMENT: use a custom menu under macOS to get rid of standard menu
    - EXTENSION: allow a browser entry to be duplicated/cloned

- 1.4.0
    - IMPROVEMENT: add tally light for NDI streaming
    - IMPROVEMENT: for "frameless" mode, also get rid of the standard window buttons under macOS
    - BUGFIX: "START" button no longer can be pressed if no outputs are enabled
    - BUGFIX: ignore interactions like CMD+Q on worker and content browser windows to correctly shutdown
    - UPGRADE: upgraded some dependencies

- 1.3.0
    - IMPROVEMENT: move NDI video/audio encoding from main process to dedicated per-browser processes
    - IMPROVEMENT: directly communicate between processes instead of relaying via main process
    - IMPROVEMENT: improve FPS calculation in browsers
    - IMPROVEMENT: parallelize start/reload/stop of all browsers
    - IMPROVEMENT: better logging by using mainly IPC mechanism and catching also worker console
    - IMPROVEMENT: fix preview better into the canvas
    - IMPROVEMENT: detect if NDI does not support current CPU
    - EXTENSION: add buttons to move browser entries
    - CLEANUP: use more consistent debug logging

- 1.2.0
    - IMPROVEMENT: from internal PCM-only to OPUS/PCM processing to get rid of audio distortions
    - EXTENSION: allow NDI video frames to be delayed similar to the audio sample set
    - CLEANUP: visually provide a border at the end of all browsers
    - IMPROVEMENT: allow 0 audio channels for NDI (for virtual audio cable usage)
    - IMPROVEMENT: show audio processing CPU bursts, too

- 1.1.1
    - CLEANUP: cleanup source code

- 1.1.0
    - EXTENSION: capture audio and ingest into NDI output-stream

- 1.0.1
    - BUGFIX: fix linking of Grandiose NDI SDK binding under Linux
    - BUGFIX: fix linking of Grandiose NDI SDK binding under macOS
    - CLEANUP: cleanup code

- 1.0.0
    - EXTENSION: activated update functionality
    - CLEANUP: cleanup update functionality

- 0.9.9
    - EXTENSION: added update functionality (still disabled)
    - IMPROVEMENT: move info/about dialog into an own sub-dialog
    - CLEANUP: factor out code into own modules
    - CLEANUP: cleanup packaging list
    - CLEANUP: cleanup browser abstraction

- 0.9.8
    - BUGFIX: fixed NDI sender destruction
    - BUGFIX: fixed browser instance destruction

- 0.9.7
    - IMPROVEMENT: open UI only once the DOM is ready to not flicker on startup
    - CLEANUP: cleanup source code through linting

- 0.9.6
    - EXTENSION: add tooltips for all user interface elements for documentation

- 0.9.5
    - IMPROVEMENT: improve optical appearance of user interface

- 0.9.4
    - IMPROVEMENT: switch to a frameless window and improve scrolling

- 0.9.3
    - BUGFIX: fixed big in font loading
    - UPGRADE: upgrade minor dependencies

- 0.9.2
    - EXTENSION: provide console tracing for Web Content
    - IMPROVEMENT: extend the documentation
    - IMPROVEMENT: improve optical appearance
    - BUGFIX: fixed distribution by keeping TypoPRO Overlock font 
    - REFACTORING: switch from plain CSS to LESS
    - CLEANUP: cleanup source code

- 0.9.1
    - UPGRADE: upgrade to Electron 12.0.2

- 0.9.0
    - EXTENSION: initial release

Legend
------

- change scope:
    - MAJOR:        major ...
    - MINOR:        minor ...

- change consequences:
    - SECURITY:     security relevant ...
    - INCOMPATIBLE: incompatible ...

- change types:
    - UPGRADE:      upgraded   dependencies
    - EXTENSION:    new        functionality
    - IMPROVEMENT:  improved   functionality or appearance
    - BUGFIX:       fixed      functionality or appearance
    - REFACTORING:  refactored functionality or appearance
    - CLEANUP:      cleaned up functionality or appearance

