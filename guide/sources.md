
Sources
=======

**Vingester** can play arbitrary Web Contents adressable via URLs from
both local (scheme `file:`) and remote (schemes `http:` and `https:`) locations.
A few typical use-cases and their particular sources are explained in more detail here.

Online Conferences 
------------------

### VDO.Ninja

[VDO.Ninja](https://vdo.ninja) (formerly OBS.Ninja) is an awesome WebRTC-based online meeting solution,
especially intended for ingesting one or more participants into
a broadcast production. [VDO.Ninja Trampoline](https://github.com/rse/vdo.ninja-trampoline)
and its [Vingester instance](https://vingester.app/vdon/) provides a convenient
frontend to configure the involved VDO.Ninja sessions. For ingesting a participant
*PersonID* in a room *RoomID* (and with room password *RoomPW*) with 720p24, URLs of the following form should be used:

- Director: `https://vingester.app/vdon/#/`<br/>
  `<RoomID>/<RoomPW>/director/mono/720p/24/none/D`
- Sender: `https://vingester.app/vdon/#/`<br/>
  `<RoomID>/<RoomPW>/sender/mono/720p/24/none/<PersonID>`
- Receiver: `https://vingester.app/vdon/#/`<br/>
  `<RoomID>/<RoomPW>/receiver/mono/720p/24/none/<PersonID>`

An example set of URLs is:

https://vingester.app/vdon/#/sample/sample/director/mono/720p/24/none/D<br/>
https://vingester.app/vdon/#/sample/sample/sender/mono/720p/24/none/P01<br/>
https://vingester.app/vdon/#/sample/sample/receiver/mono/720p/24/none/P01

### Jitsi Meet

[Jitsi](https://jitsi.org/) is a powerful peer-to-peer (P2P) or
Selective Forwarding Unit (SFU), [WebRTC](https://webrtc.org/) based,
browser based, Open Source video conferencing solution. [Jitsi Meet
Trampoline](https://github.com/rse/jitsi-meet-trampoline) and its
[Vingester instance](https://vingester.app/jitsi/) provides a convenient
frontend to configure the involved Jitsi Meet sessions. For ingesting
a participant *PersonID* in a room *RoomID* (and with room password
*RoomPW*) with 720p24, URLs of the following form should be used:

- Sender: `https://vingester.app/jitsi/#/`<br/>
  `<RoomID>/<RoomPW>/sender/mono/720p/24/none/<PersonID>`
- Receiver: `https://vingester.app/jitsi/#/`<br/>
  `<RoomID>/<RoomPW>/receiver/mono/720p/24/none/<PersonID>`

An example set of URLs is:

https://vingester.app/jitsi/#/sample/sample/sender/mono/720p/24/none/P01<br/>
https://vingester.app/jitsi/#/sample/sample/receiver/mono/720p/24/none/P01

Graphics Overlays
-----------------

### HUDS

[Head-Up-Display Server (HUDS)](https://github.com/rse/huds) is a
companion tool from the **Vingester** author for serving one or more
HTML Single-Page Applications (SPA) which act as "Head-Up-Displays
(HUD)" or "Overlays" in video production scenarios. These HUDs can be
ingested by **Vingester**.

One of the more elaborated HUDs for HUD is the
[HUDS-HUD-Training](https://github.com/rse/huds-hud-training/). The
server-side can be started with:

```sh
$ curl -LO https://github.com/rse/huds-hud-training/raw/master/training.yaml
$ vi training.yaml  # edit the configuration
$ npx -p huds -p huds-hud-training huds \
    -a 127.0.0.1 -p 9999 \
    -d training:@huds-hud-training,training.yaml
```

Then the ingest URL for **Vingester** is:

http://127.0.0.1:9999/training/

### NodeCG

[NodeCG](https://www.nodecg.dev/) is similar to HUDS. It is a broadcast
graphics framework and application. It enables you to write complex,
dynamic broadcast graphics using Web technologies. The results can be
ingested by **Vingester**.

NodeCG can be setup liket this:

```sh
$ npx nodecg-cli setup
$ npx nodecg-cli install <bundle-id>
$ npx nodecg-cli start
```

The corresponding URLs are:

`http://localhost:9090/dashboard/`<br/>
`http://localhost:9090/view/<bundle-id>`

### SPX-GC

[SPX-GC](https://www.spxgc.com/) is a graphics controller for
professional live television broadcasts and web streams using HTML
graphics which supports CasparCG templates. Instead of using CasparCG to
playout NDI output, you can also use **Vingester**.

If your SPX-GC instance is running under http://127.0.0.1:5000/,
the ingest URL for **Vingester** is http://127.0.0.1:5000/renderer/ 

### Singular.Live

[Singular.Live](https://singular.live/) is a graphics controller for
professional live television broadcasts and web streams using HTML
graphics. Each Singular.Live content has a *ContentID* and a corresponding *PlayoutID*.
The control and playout URLs are of the form:

`https://app.singular.live/control/<ControlID>`<br/>
`https://app.singular.live/output/<PlayoutID>/Default?aspect=16:9`

An example set of URLs is:

https://app.singular.live/control/00jHgnHzza6VxD2EijAXbP<br/>
https://app.singular.live/output/0P5cMVcFWOuKRQqJT5dT55/Default?aspect=16:9

### LowerThird

[LowerThird](https://github.com/rse/lowerthird/) is a
small companion tool from the **Vingester** author for rendering "lower thirds".
The result can be ingested via **Vingester**. An example usage is:

```sh
$ git clone --depth 1 https://github.com/rse/lowerthird
$ cd lowerthird
$ npm install
$ vi manifest.yaml # edit the configuration
$ npm run convert
```

Then the ingest URL for **Vingester** is:

`file://<path-to-lowerhird>/index.html?scene=<scene-id>`

Graphics Animations
-------------------

### Google Web Designer

[Google Web Designer](https://webdesigner.withgoogle.com/) is
a free cross-platform vector-based multimedia authoring and computer graphics
animation application which output directly in HTML5 format.
These HTML5 exports then can be directly ingested into Vingester.

### Adobe Animate

[Adobe Animate](https://www.adobe.com/products/animate.html) is
a popular commercial cross-platform vector-based multimedia authoring
and computer graphics animation application which can output its results
in HTML5 format. These HTML5 exports then can be directly ingested into
Vingester.

Alternatively, [Adobe After Effects](https://www.adobe.com/products/aftereffects.html) is a
commercial cross-platform popular motion graphics, compositing and
visual effects application, which usually outputs its results as a whole
in video format for direct embedding in a video mixing application.
Alternatively, if you want to use animations based on Adobe After
Effects inside some outer Web Contents (and later ingest this as a
whole again via Vingester), you can check out the Adobe After Effects
plugin [Bodymovin](https://aescripts.com/bodymovin/) and the companion
JavaScript library [Lottie](https://airbnb.design/lottie/).

Video Playouts
--------------

### YouTube

[YouTube](https://www.youtube.com) is the most popular all-purpose video platform. Videos on
YouTube have a unique *VideoID*. You can ingest such a video via
ingest URLs of the form:

`https://www.youtube.com/embed/<VideoID>`<br/>
`?autoplay=1&controls=0&rel=0`

An example ingest URL is:

https://www.youtube.com/embed/BKorP55Aqvg?autoplay=1&controls=0&rel=0

### Vimeo
  
[Vimeo](https://www.vimeo.com) is a popular business video platform. Videos on Vimeo
have a unique *VideoID*. You can ingest such a video via ingest
URLs of the form:

`https://player.vimeo.com/video/<VideoID>?`<br/>
`autoplay=1&background=1&transparent=1&controls=0&quality=1080p`

An example ingest URL is:

https://player.vimeo.com/video/99907545?autoplay=1&background=1&transparent=1&controls=0&quality=1080p

Test Screens
------------

### Vingester Test

In order to quickly test-drive the rendering of Web Content inside
**Vingester**, there is a short Single-Page Application (SPA) under
https://vingester.app/test/ which just shows an animated **Vingester**
logo and some browser details, including the viewport size, the content
visibility state and the NDI tally state. Use it for checking smooth
animations and environment information.

https://vingester.app/test/

### TV Test Pattern

In order to quickly check colors and audio, you can use one of the
standard television test patterns. A possible 4K test pattern with an
ambient sound is:

https://www.youtube.com/embed/5FOPHHD4uzs?autoplay=1&controls=0&rel=0

