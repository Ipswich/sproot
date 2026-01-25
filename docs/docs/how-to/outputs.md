---
sidebar_position: 3
title: Outputs
---

# Outputs

What is an environmental management platform if it can't impact the environment? Sproot connects to multiple different types of outputs, enabling switching of most electronics. Additionally, it can also generate and modulate PWM signals, enabling you to control the intensity of devices that support this functionality.

Currently, Sproot integrates with two different outputs:

- PCA9685 breakout boards (through I2C)
- TP-Link Smart plugs (EP40, HS300, KP400, etc.)

This gives you the flexibility to directly control relays and PWM signals of all sizes through a PCA9685 and some clever wiring, but also to remotely connect to a range of readily available TP-Link smart plugs.

## Integrating Devices

### PCA9685

To add a PCA9685 to your Raspberry Pi, it's recommended to pick up a breakout board. I'm not an electrical engineer by any stretch, so this is a quick way to get up and running without needing to be too concerned about circuitry. Simply note the I2C address of the board, and connect the relevant pins between the devices.

- If you're using this for PWM control, it's _highly_ recommended to do so through an intermediate circuit. Optoisolators are your friends here; they let you control external signals and voltages safely without letting anything get back to your PCA9685 or Raspberry Pi. PC817's are great.

These are effectively the same instructions for integrating with a [subcontroller](subcontrollers).

### TP-Link Smart Plugs

You'll need to go through setting up your TP-Link Smart Plug through the Kasa Home App so that it's connected and visible on the network. From there, Sproot should be able to see it, so long as your networking rules allow this.

## Adding or Editing a Device

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/OutputSettings.png" alt="Output Settings" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
  <img src="/docs/img/OutputSettingsNew.png" alt="New Output" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
Once you've got your outputs integrated, navigate to `Settings -> Outputs`. 
* To add a new device, click the big `Add New` button, and a pop up will appear that you can configure your output in. Once you've configured it, click `Add Output` to save your changes.
* To edit an existing device, click the `Edit` icon next to the device's name.

#### Name

This is the display name for this output.

#### Color

This determines the color of the output's line on charts, and its label's color. Purely cosmetic, but helps distinguish outputs from each other.

#### Model

This determines some of the other settings of the output, but ultimately tells Sproot how it needs to communicate with this device.

#### Automation Timeout

This value determines how frequently automations should be triggered. Think of it as sort of a minimum time between evaluations. Something like an LED light might be totally fine being turned on and off with seconds in between. Other devices like a heater might not handle that so well. This tells Sproot "If an automation was triggered within the last `n seconds`, don't try to do anything to it until this timeout has passed."

#### Group

This organizes grouped devices into a common display category. Think "Zone". If you've got two shelves with different conditions, you might want them grouped together to keep things organized.

- You can manage groups by clicking the big `Manage Device Groups` button under the `Add New` button. These groups are also shared with Sensors.

#### Model Specific Settings

Some models have settings that are specific to that device. TP-Link Smart Plugs are Wi-Fi enabled, whereas PCA9685s are hardwired - both require different identifiers to know which device Sproot is controlling.

Additionally, some models are PWM capable (PCA9685s). If your model is PWM capable, you'll be able to set this device as PWM-able here.

- Some devices require inverted PWM (100% PWM is off). If this applies to the device you're configuring you can set this value as well.

#### PCA9685

All I2C devices require an address. PCA9685s are typically `0x40` by default, though you can chain up to like 64 of them if you need to. As mentioned above in [integrating devices](#pca9685), you'll want to note the address of your device when you connect it.

Additionally, as PCA9685's have 16 pins, you'll also need to note the pin you're connecting to. These are indexed from 0-15.

#### ESP32 PCA9685

Basically the same as the PCA9685s above, but with the added `Host` field. This corresponds to what subcontroller this PCA9685 is connected to.

#### TP-Link Smart Plugs

Sproot will automatically scan the network for TP-Link devices it can connect to. Discovered devices will show up under `Plug ID`, with whatever their name was configured as in the Kasa App as the display name here.

## Viewing and Controlling Your Outputs

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/OutputStates.png" alt="Output States" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
Navigate to the `Output States` page from the nav bar.

### Chart

This chart displays the history of each output. You can change the time range by clicking on the different control segments below the chart.

- Please note that data points are every 5 minutes. Depending on the number of outputs you have configured and the selected time range, this can be a significant amount of data to process and render.

### Output Table

This table contains each output you have configured, grouped according to their configurations. It also lets you control the state of the output.

- Virtually everything in this table is reorderable. If there's a more significant group, or a more significant output, drag it to the top!
- If you collapse or expand a group, it'll automatically hide or show its data on the chart. Display only the data you care about!

If you expand an output, you'll be greeted by a toggleable control for `Manual` and `Automatic` and some information about the current state of the output next to it.

- When set to `Manual`, Sproot will override any automations with the values you have set in the neighboring control.
- When set to `Automatic`, Sproot will keep this output in sync with any automations that you have configured for it. The neighboring control will display the current state of the output.

Automations still run in the background, even if an output is in `Manual`. This ensures that Sproot never "loses state" just because you were controlling things.
