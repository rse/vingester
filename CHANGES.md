
Changes
=======

The following is a detailed list of all changes to **Vingester** in
reverse chronological order (newer first), grouped by the release
versions and prefixed with the kind of change.

- 2.6.6
    - IMPROVEMENT: attach "Vingester/M.N.K" string to user agent identifier
    - CLEANUP: cleaned up handling of zoom factor

- 2.6.5
    - BUGFIX: fix handling of tranparent background for "headless" mode

- 2.6.4
    - UPGRADE: upgrade to Electron 15.1.0
    - UPGRADE: upgrade to Vue 3.2.19
    - UPGRADE: upgrade minor dependencies

- 2.6.3
    - UPGRADE: upgrade to Electron 15.0.0
    - UPGRADE: upgrade minor dependencies
    - IMPROVEMENT: make argument passing to sub-processes more robust

- 2.6.2
    - UPGRADE: downgrade to Electron 13.4.0 as 14.0.{0,1} breaks under Windows 10 (network service crash inside Chromium)

- 2.6.1
    - UPGRADE: upgrade to Electron 14.0.1
    - UPGRADE: upgrade to Vue 3.2.12
    - UPGRADE: upgrade minor dependencies
    - CLEANUP: synchronize console version information with info dialog output

- 2.6.0
    - UPGRADE: upgrade to Electron 14.0.0
    - UPGRADE: upgrade to Vue 3.2.8
    - UPGRADE: upgrade minor dependencies

- 2.5.0
    - IMPROVEMENT: add NDI/Alpha field for disabling/enabling alpha channel support over NDI
    - EXTENSION: support --autostart CLI option for auto-starting all browser instances on start
    - EXTENSION: support --minimize CLI option for starting the control window in minimized state

- 2.4.1
    - UPGRADE: upgrade to Electron 13.1.9
    - UPGRADE: upgrade to NDI SDK 5.0.3
    - UPGRADE: upgrade to Vue 3.2.1
    - UPGRADE: upgrade minor dependencies

- 2.4.0
    - UPGRADE: upgrade to Electron 13.1.7
    - UPGRADE: upgrade to NDI SDK 5.0.0
    - UPGRADE: upgrade minor dependencies

- 2.3.2
    - IMPROVEMENT: provide copy/paste/inspect context menu for frameless content windows
    - IMPROVEMENT: provide copy/paste/inspect context menu for control window
    - UPGRADE: upgrade to Electron 13.1.6
    - UPGRADE: upgrade minor dependencies

- 2.3.1
    - IMPROVEMENT: add Tally Reload option which forces NDI Tally preview/program state to reload the Web contents
    - IMPROVEMENT: keep the up/down buttons on a collapsed browser configuration
    - CLEANUP: move remove button of browser configuration to the last position as it looks more intuitive
    - UPGRADE: upgrade to Electron 13.1.5
    - UPGRADE: upgrade minor dependencies

- 2.3.0
    - BUGFIX: fix --config option handling: configuration entries were added twice on subsequent Vingester runs
    - UPGRADE: upgrade to Electron 13.1.4
    - UPGRADE: finally upgrade to Vue-Tippy 6.0.0-alpha.30 and Vue-Next-Select 2.6.0

- 2.2.9
    - UPGRADE: upgrade to Electron 13.1.3

- 2.2.8
    - BUGFIX: fix size of offscreen browser windows in "headless" mode (where Electron uses the primary display scale factor)
    - BUGFIX: align the default importable configurations to the current export format

- 2.2.7
    - UPGRADE: upgrade to Electron 13.1.2
    - UPGRADE: upgrade to Electron Builder 22.11.7
    - UPGRADE: upgrade to @discord/opus 0.5.3
    - UPGRADE: upgrade minor dependencies

- 2.2.6
    - BUGFIX: try to ensure that in "frameless" mode the windows are really of the intended content size

- 2.2.5
    - BUGFIX: detach/reattach the capturing if the application mutes/unmutes the audio of an audio/video element
    - BUGFIX: fix internal deregistration of audio mute/unmute handlers

- 2.2.4
    - IMPROVEMENT: make FFmpeg handling more robust during start/stop
    - IMPROVEMENT: improve FFmpeg configuration for video-only or audio-only recording/streaming
    - IMPROVEMENT: provide better tooltip hints for video-only or audio-only recording/streaming
    - BUGFIX: correctly calculate the CPU bursts for "headless" audio-only capturing
    - UPGRADE: upgrade to Electron 13.1.1
    - UPGRADE: upgrade minor dependencies

- 2.2.3
    - BUGFIX: the "execa" module has to be a run-time dependency and not just a build-time dependency

- 2.2.2
    - BUGFIX: in "Adaptive" headless mode, never set framerate below at least 5
    - BUGFIX: if "Frame Rate" is set to 0, effectively try to no longer capture the Web contents
    - CLEANUP: factor out logging configuration into own source file
    - CLEANUP: cleanup appearance of header icons
    - UPGRADE: upgrade to Electron 13.1.0
    - UPGRADE: upgrade minor dependencies

- 2.2.1
    - UPGRADE: upgrade to Electron-Builder 22.11.5
    - EXTENSION: add Sample-Jitsi.yaml import configuration for Jitsi Meet sessions
    - CLEANUP: renamed all references of OBS.Ninja to VDO.Ninja to follow its rebranding
    - CLEANUP: small code cleanups

- 2.2.0
    - UPGRADE: upgrade to Electron 13.0.1
    - UPGRADE: upgrade to FFmpeg 4.4.0 (via new @rse/ffmpeg distribution)
    - IMPROVEMENT: show tooltip hint to MPEG-TS/SRT and SRT URL only if FFmpeg supports SRT on platform

- 2.1.3
    - IMPROVEMENT: for the FFmpeg sink, allow also the RTP "Format"
    - CLEANUP: show tally bulp only for NDI-based Headless mode, not for FFmpeg-based Headless mode
    - UPGRADE: upgrade to Electron 12.0.9
    - UPGRADE: upgrade minor dependencies

- 2.1.2
    - BUGFIX: do not initially raise visibility/tally events to not confuse observers with wrong states

- 2.1.1
    - IMPROVEMENT: show the number of NDI receivers in the tally circle in the preview window
    - CLEANUP: enlarge the minimum window size to at least allow a full browser configuration to be shown
    - UPGRADE: upgrade minor dependencies

- 2.1.0
    - IMPROVEMENT: provide a FFmpeg "Mode" (VBR/ABR/CBR) field for better ffmpeg(1) CLI default options
    - CLEANUP: use the same "circled" icons for all browser configuration entry icons

- 2.0.3
    - UPGRADE: upgrade to VueJS 3.0.11
    - BUGFIX: use "npx electron" in "npm start" for portability reasons
    - BUGFIX: the width/height of browsers in Headless mode were incorrectly calculated
    - EXTENSION: add a "Sample-Test.yaml" for a quick test-drive with https://vingester.app/test/

- 2.0.2
    - BUGFIX: correctly display the graphical display icon on added/cloned browser configurations
    - BUGFIX: do not stuble over old Vingester 1.x configurations of the display field

- 2.0.1
    - IMPROVEMENT: provide a more convenient "npm start" task for development
    - IMPROVEMENT: provide an audio device "(none)" for getting rid of audio in Frameless mode
    - IMPROVEMENT: pass video framerate to FFmpeg sink for better quality and dynamically determine default bitrate
    - UPGRADE: upgrade minor dependencies
    - BUGFIX: fix packaging under Windows with Node 16 where cross-zip failed
    - CLEANUP: make ESLint happy and cleanup code

- 2.0.0
    - EXTENSION: add "Trust" (ignore SSL/TLS certs) functionality
    - EXTENSION: add "Node.js API" (enable Node API integration) functionality
    - EXTENSION: add "OBS DOM" (emulate OBS Studio Browser Source DOM) functionality
    - EXTENSION: add "Persist" (persistant browser session) and "Clear" (clear persistance) functionality
    - EXTENSION: add "Collapsed" icon for collapsing/expanding a browser configuration in the user interface
    - EXTENSION: add "DevTools" button to open a Chromium DevTools window for low-level interaction
    - EXTENSION: add "PATCH" section for more elaborate Web Contents patching
    - IMPROVEMENT: documented everything related to Vingester in the new Vingester Guide https://vingester.app/guide/
    - IMPROVEMENT: validate all fields, show errors with red backgrounds and provide defaults on empty entry
    - IMPROVEMENT: improve and update sample configurations
    - IMPROVEMENT: replace the textual display field with a graphical display toggle
    - BUGFIX: apply a workaround for FFmpeg under Linux: fallback to system ffmpeg(1) if embedded FFMpeg crashes
    - BUGFIX: fixed styling of disabled buttons
    - UPGRADE: upgrade to Electron 12.0.7
    - UPGRADE: upgrade minor dependencies

- 1.9.1
    - BUGFIX: once again fix importing of external configurations

- 1.9.0
    - IMPROVEMENT: major control user interface styling overhaul
    - IMPROVEMENT: always copy the sample files to provide fresh ones on startup
    - BUGFIX: fix importing of external configurations

- 1.8.1
    - CLEANUP: use a title for the error message log dialog to be less confusing
    - CLEANUP: center text in most dialog fields where numbers are expected
    - CLEANUP: small style cleanups

- 1.8.0
    - EXTENSION: add zoom level control field for setting the browser zoom level
    - EXTENSION: add CSS style control field for injecting a user style into the browser
    - EXTENSION: add support for FFmpeg-based output recording or streaming
    - IMPROVEMENT: sanitize the browser configurations to be able to load old configurations
    - IMPROVEMENT: provide error modal dialog and use it in case Web Contents does not load
    - BUGFIX: for a "Color" of value "transparent" make a frameless window also really transparent
    - BUGFIX: fixed internal browser stopping by reordering the steps
    - BUGFIX: fixed zoom-level handling for offscreen rendering
    - BUGFIX: correctly reinitialize state of browser on (re)start and reload
    - UPGRADE: upgrade to Electron 12.0.6
    - UPGRADE: upgrade minor dependencies

- 1.7.1
    - IMPROVEMENT: improve performance of preview generation by switching from Jimp to Electron NativeImage
    - IMPROVEMENT: fix NDI video frame generation on big endian CPU based computers
    - UPGRADE: upgrade to Electron 12.0.5
    - BUGFIX: delay initial automatic update check to not fail internally

- 1.7.0
    - IMPROVEMENT: support particular profile with the option "--profile=<id>|<directory>"
    - IMPROVEMENT: support particular auto-imported/exported external configuration with option "--config=<file>"
    - IMPROVEMENT: support optically tagging the user interface with option "--tag=<string>"
    - BUGFIX: correctly initialize the "Info" field for new browser entries
    - UPGRADE: upgrade minor dependencies

- 1.6.1
    - BUGFIX: stop started browser only if it fails in the main frame
    - CLEANUP: somewhat darken the grey parts of the UI
    - CLEANUP: remove security warnings when debugging
    - CLEANUP: remove all listeners when stopping a browser instance

- 1.6.0
    - EXTENSION: provide global hotkey CTRL+ALT+SHIFT+ESCAPE for stopping all browsers as rescue option
    - EXTENSION: provide an "Info" field for attaching arbitrary meta information of the user to a browser
    - EXTENSION: use a dedicated config directory and provide three sample files for importing
    - IMPROVEMENT: pass data between main and renderer threads with less overhead
    - IMPROVEMENT: show a NDI packets/second performance meter
    - IMPROVEMENT: change the export format to be more human readable
    - IMPROVEMENT: improve internal debugging by splitting into three levels
    - IMPROVEMENT: enlarge the preview thumbnail view from 128x72px to 160x90px
    - UPGRADE: upgrade to Electron 12.0.4
    - UPGRADE: upgrade minor dependencies

- 1.5.5
    - BUGFIX: global "start" button now no longer starts invalid browser configurations
    - BUGFIX: use the scale factor of the actually used and not the primary display

- 1.5.4
    - BUGFIX: allow arbitrary displays to be addressed in the Display field (including ones like "+2,0")
    - BUGFIX: correctly calculate the display heights when addressing a display

- 1.5.3
    - IMPROVEMENT: allow browser windows to be really placed on top (even over the dock of macOS)

- 1.5.2
    - BUGFIX: do not allow START button to be pressed if no title is given
    - BUGFIX: treat the audio sample rate as an integer internally
    - IMPROVEMENT: use a better description for the standard audio output device selection
    - IMPROVEMENT: make audio device selection searchable and make selected item more clear
    - CLEANUP: improve form appearance

- 1.5.1
    - BUGFIX: fix update dialog in case of an existing forthcoming version
    - BUGFIX: fixed adaptive FPS handling

- 1.5.0
    - EXTENSION: provide adaptive FPS for NDI based on tally information
    - EXTENSION: allow an individual audio device per frameless browser window
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

#### Legend

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

