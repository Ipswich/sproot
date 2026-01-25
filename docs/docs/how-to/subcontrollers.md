---
sidebar_position: 5
title: Subcontrollers
--- 

# Subcontrollers
While Sproot is easy to deploy on a Raspberry Pi, that means that it generally needs to be located in the same place as the things that it's regulating. Sometimes this is fine: as the host, it'll run in the background even if it loses Wi-Fi for whatever reason. However, it also means that if you've got a shelf on one side of the room and a second shelf across the room, you can't easily connect them to sproot.

Enter subcontrollers. ESP32s are nifty little devices, perfectly suited for this. They can be easily flashed and added to Sproot, enabling control of devices anywhere within reach of the Wi-Fi network and a power source.

## Integrating a New Subcontroller
<p style={{ textAlign: 'center' }}>
  <img src="/img/Subcontrollers.png" alt="Subcontrollers" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
There are a two requirements for this one:
* First, you need a new ESP32 development board.
* Second, you need a computer with a chromium based browser.

Plug your ESP32 into your computer, and navigate to `Settings -> Subcontrollers`. On this page, there's a section on the bottom labeled `ESP32 Flasher`. Click `Flash`, and the browser should ask for you to select a device for it to connect to. Select your ESP32 device, and let it run its magic. There's a terminal window and a progress bar that should provide some details on the current status of it.
* Any issues will display in the terminal window. Notably `Web Serial API not available in this browser`. If you see this, try running it again through Chrome.

Once your device is flashed, you should be able to disconnect it and plug it in to a power source that isn't your laptop. Either way, you'll need to connect it to your Wi-Fi network. When it's powered on, it'll eventually pop up as its own Wi-Fi network with a name of something like `Sproot-esp32-6C6F`. Connect to this network from your Phone, and enter the Wi-Fi credentials for the network Sproot is running on. Once you submit these, it'll spin for a little moment before eventually restarting and connecting to your Wi-Fi network.
* If your subcontroller can't connect to the Wi-Fi network, it'll pop up again as its own access point. Verify and repeat the above steps to get it connected.

Now that your subcontroller is connected to the Wi-Fi network, it should show up on Sproot. Navigate to `Settings -> Subcontrollers`, and click `Connect`. In the pop up that appears, select your device and give it a name, then click `Add Device`.

At this point, you should have a new Subcontroller ready to have sensors and outputs added to it. Those steps are virtually identical to connecting them to the Raspberry Pi. You can find steps for sensors [here](sensors/#integrating-devices) and for outputs [here](outputs/#integrating-devices).