---
sidebar_position: 3
title: Features
---

# Features

Sproot has a range of features to make keeping plants alive easy and effortless. Whether its just creeping on your microgreens from across the room, or keeping your greenhouse the right temperature in the winter, Sproot has the bases covered.

## Sensors and Monitoring

Observability is critical in plant care. There's an old adage that goes something like "the best fertilizer is the farmer's footsteps." While Sproot is no replacement for that, having the ability to monitor the status of your environment is a great way to ensure that you can be there when you need to be.

## Outputs and actions

Beyond observability, sometimes there are actions that need to be taken in order to keep homeostasis. Sproot has functionality for controlling anything with a wire, and can generate or modulate PWM signals as well if your devices require more than just on/off functionality.

## Automate your environment

The core purpose of Sproot is to programatically manage an environment for plants. At the heart of this is a robust automation system, that lets you use and combine a wide range of events as triggers:

- Sensor values
- Other outputs
- Time
- Date ranges
- Weekdays
- Months

## Subcontrollers for distant control

Sometimes it isn't feasible to have your environment immediately next to your Raspberry Pi. To that end, Sproot integrates with ESP32s to offer remote control over Wi-Fi. Easily flash new ESP32s from the interface, or push updates to existing devices.

## Camera, livestream, and timelapse

Sometimes having eyes on the situation is more valuable than having raw measurements from the environment. Sproot can integrate with the Raspberry Pi camera to give you a live view of what's happening at the moment. Additionally, it'll bundle your images up for easy download and timelapse generation.

## Scheduled backups

Raspberry Pis are awesome, but SD Cards aren't necessarily the most stable of storage media. Sproot regularly creates database backups so you can easily download and save both your configuration and data if you ever need to migrate or recreate your instance.
