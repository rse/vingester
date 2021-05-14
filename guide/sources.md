
Sources
=======

**Vingester** can play arbitrary Web Contents adressable via URLs from
both local (scheme `file:`) and remote (schemes `http:` and `https:`) locations.
A few typical use-cases and their particular sources are explained in more detail here.

Online Conferences 
------------------

### OBS.Ninja

[OBS.Ninja](https://obs.ninja) is an awesome WebRTC-based online meeting solution,
especially intended for ingesting one or more participants into
a broadcast production. [OBS.Ninja Trampoline](https://github.com/rse/obs-ninja-trampoline)
and its [Vingester instance](https://vingester.app/obsn/) provides a convenient
frontend to configure the involved OBS.Ninja sessions. For ingesting a participant
*PersonID* in a room *RoomID* (and with room password *RoomPW*) with 720p24, URLs of the following form should be used:

- Director: `https://vingester.app/obsn/#/`<br/>
  `<RoomID>/<RoomPW>/director/mono/720p/24/none/D`
- Sender: `https://vingester.app/obsn/#/`<br/>
  `<RoomID>/<RoomPW>/sender/mono/720p/24/none/<PersonID>`
- Receiver: `https://vingester.app/obsn/#/`<br/>
  `<RoomID>/<RoomPW>/receiver/mono/720p/24/none/<PersonID>`

An example set of URLs is:

https://vingester.app/obsn/#/sample/sample/director/mono/720p/24/none/D<br/>
https://vingester.app/obsn/#/sample/sample/sender/mono/720p/24/none/P01<br/>
https://vingester.app/obsn/#/sample/sample/receiver/mono/720p/24/none/P01

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

Test Page
---------

### Vingester Test Content

In order to quickly test-drive the rendering of Web Content inside
**Vingester**, there is a short Single-Page Application (SPA) under
https://vingester.app/test/ which just shows an animated **Vingester**
logo and some browser details.

