---
sidebar_position: 6
title: Camera
---

# Camera

Sometimes sensors and raw metrics can only get you so far. Maybe you're just curious about your plants and want to sneak a peak to see if your microgreens have greened up a bit since coming out of the dark. Maybe you want to see watch your strawberry leaves bob in the breeze of the fans. Or maybe you're worried your cat has parked itself in the middle of your shelf under the warm artificial sun.

Sproot can integrate with a Raspberry Pi Camera Module for capturing images, livestreaming video, and archiving images together for timelapse generation. To get started, you'll need to have the module connected to and enabled on your Raspberry Pi.

## Camera Settings

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/CameraSettings.png" alt="Camera Settings" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>

### Enabling the camera

First, you'll need to make sure you have a Raspberry Pi Camera Module working on your Raspberry Pi. Once that's working, navigate to `Settings -> Camera` and turn the `Enable Camera` slider to on. You can also change the name of the camera if you want. Once this is done, click `Update` at the bottom and you should see `Live View` appear in the nav bar.

- To disable the camera, just turn move the `Enable Camera` slider to off and click `Update`.

Sproot takes an image once a minute at the highest resolution reported by the camera. However, the video quality is set to `1280x960 @ 30fps` to limit bandwidth and processor usage.

### Timelapses

You'll need to have your camera enabled before you can enable timelapses. Navigate to `Settings -> Camera` and turn the `Enable Timelapse` slider to on. This will enable the rest of the form, which you can use to configure your timelapse options. Once you've configured those, click `Update` to save your changes.

#### Timelapse Interval

This setting determines how frequently Sproot will add an image to be archived into the timelapse.

- If you want more frames per second in a video, you'll want to increase this value.

#### Start and End Times

These settings determine when Sproot will add images to be archived. New image archives will be automatically generated at the specified `End Time`.

#### Image Retention Limits

These settings effectively determine how many images will go into an archive (at most). Depending on your camera's resolution, these files can take up quite a bit of space. For reference, the Pi Camera 2 images are around 1MB. If you're taking images every 5 minutes for 8 hours a day, that's about 96MB a day.

- You can check how much storage space your device has and how big your timelapses are by looking here:
  - [System](system-status/#system)
  - [Timelapse](system-status/#timelapse)

## Managing your Timelapes

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/LiveView.png" alt="Live View" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
Navigate to the `Live View` tab from the navbar. Below the view port of your lovely camera, you'll find a section labeled `Timelapse Archive`. You can download your archive by simply clicking `Download`. Additionally, if you want to manually regenerate the archive, click the `Regenerate` button.

- Generating archives is a slow, performance intensive operation. Things may be sluggish while this is happening. If you're curious about how long it takes, you can view stats by following the instructions [here](system-status/#timelapse).
