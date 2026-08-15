---
sidebar_position: 7
title: Camera
---

# Camera

Sometimes sensors and raw metrics can only get you so far. Maybe you're just curious about your plants and want to sneak a peak to see if your microgreens have greened up a bit since coming out of the dark. Maybe you want to see watch your strawberry leaves bob in the breeze of the fans. Or maybe you're worried your cat has parked itself in the middle of your shelf under the warm artificial sun.

Sproot can integrate with a Raspberry Pi Camera Module (and other web cameras) for capturing images, livestreaming video, and archiving images together for timelapse generation. To get started, you'll need to have a web camera with endpoints for capturing and returning an image, and for streaming mjpeg. There's one built into Sproot - just uncomment out the camera service inside of the docker-compose.yaml file. You can connect to from Sproot with your device's IP address.

## Camera Settings

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/CameraSettings.png" alt="Camera Settings" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>

### Enabling the camera

First, you'll need to make sure you have a Raspberry Pi Camera Module working on your Raspberry Pi. Once that's working, navigate to `Settings -> System` and look for the `Camera Settings` accordion. Update the endpoints with your configuration, turn the `Enable Camera` slider to on, and save your settings. You can also change the name of the camera if you want. Once this is done, click `Save` at the top and you should see `Live View` appear in the nav bar. You can configure additional cameras if you want.

- To disable the camera, just turn move the `Enable Camera` slider to off and click `Save`. To fully remove a camera, click `Delete`.

Sproot takes an image once a minute. The default service uses a video quality of `1280x960 @ 30fps` to limit bandwidth and processor usage.

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

There's also a button labeled `Delete All Images` that will delete all of your existing timelapse images. This is useful if you want to start fresh for a new timelapse.

## Managing your Timelapse

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/LiveView.png" alt="Live View" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
Navigate to the `Live View` tab from the navbar. There will be a dropdown where you can navigate between any cameras you've configured. Below the view port of your lovely camera, you'll find a section labeled `Timelapse Archive`. You can download your archive by simply clicking `Download`. Additionally, if you want to manually regenerate the archive, click the `Regenerate` button.

- Generating archives is a slow, performance intensive operation. Things may be sluggish while this is happening. If you're curious about how long it takes, you can view stats by following the instructions [here](system-status/#timelapse).
