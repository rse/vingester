
Changes
=======

- 1.1.2
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

