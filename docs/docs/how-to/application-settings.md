---
sidebar_position: 9
title: Application Settings
---

# Application settings

There are a few knobs and levers you can twist and pull to change the behavior of the app. These are mostly to make sure that the app doesn't consume ALL of your hard drive space, but there are latitude and longitude under Solar and Lunar timing, which will need to be set in order to enable that feature in your automations.

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/ApplicationSettings.png" alt="Application Settings" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>

## Data Retention

By default, Sproot will keep data for 2 years for your outputs and sensors. This is configurable - if you'd rather keep data forever, or for only a couple of days, you can configure that here. Update to your desired durations and click "Save Settings".

Similarly, Sproot will take nightly backups and, by default, store the last 30 days worth. You can configure this to retain more or fewer backups. These are functionally full database dumps - they're compressed, but these can add up to be a lot of data. Generally speaking, always good to have a recent one or two on hand, especially before upgrading versions.

## Debug Logging

This gets noisy, and can be a lot of unnecessary data getting written to your logs. I'd only recommend turning this on if you're curious, or if you're actually trying to debug something. Otherwise, probably best to leave it off. You can see the extra output in the log stream.

## Solar and Lunar Timing

Latitude and longitude are required to calculate the timings of solar and lunar events. These don't need to be set, but obviously need to if you want to utilize solar and lunar events in your automations.
