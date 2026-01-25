---
sidebar_position: 2
title: Sensors
--- 

# Sensors
What is an environmental management platform if it can't observe the environment? Sproot connects to a multiple of different types of sensors, enabling you to monitor most relevant conditions.

Currently, Sproot integrates with these sensors:
* BME280 (Temperature, Humidity, Pressure)
* DS18B20 (Temperature)
* ADS1115 (Analog Voltage)
* Capacitive Moisture Sensors (Soil Moisture)

## Integrating Devices

### I2C Devices
* BME280
* ADS1115
* Capacitive Moisture Sensors

To add an I2C device, simply note the I2C device of the sensor and connect the relevant pins between the devices.

### OneWire Devices
* DS18B20

Since these are discoverable, you'll only need to wire the relevant pins between the devices and you should be set. Sproot will automatically detect and add these as they are discovered. You'll probably want to update the name, color, and maybe group.

## Adding or Editing a Device
<p style={{ textAlign: 'center' }}>
  <img src="/img/SensorSettings.png" alt="Sensor Settings" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
  <img src="/img/SensorSettingsNew.png" alt="New Sensor" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
Once you've got your sensors integrated, navigate to `Settings -> Sensors`

* To add a new device, click the big `Add New` button, and a pop up will appear that you can configure your sensor in. Once you've configured it, click `Add Sensor` to save your changes.
* To edit an existing device, click the `Edit` icon next to the device's name.

#### Name
This is the display name for this sensor.

#### Color
This determines the color of the sensor's line on charts, and its label's color. Purely cosmetic, but helps distinguish sensors from each other.

#### Model
This determines some of the other settings of the sensor, but ultimately tells Sproot how it needs to communicate with this device. 

#### Group
This organizes grouped devices into a common display category. Think "Zone". If you've got two shelves with different conditions, you might want them grouped together to keep things organized.
* You can manage groups by clicking the big `Manage Device Groups` button under the `Add New` button. These groups are also shared with Outputs.

#### Model Specific Settings
All of these devices require an address, but some may also require a pin. As ADS1115 (and Capacitive Moisture Sensor, by extension) is an I2C expander board, to reference the connected device you'll need to specify the pin the actual sensor is connected to.

## Viewing Your Sensor Data
<p style={{ textAlign: 'center' }}>
  <img src="/img/SensorData.png" alt="Sensor Data" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
Navigate to the `Sensor Data` page for the relevant measurement type from the nav bar. 

### Chart
This chart displays the history of each sensor. You can change the time range by clicking on the different control segments below the chart.
* Please note that data points are every 5 minutes. Depending on the number of sensors you have configured and the selected time range, this can be a significant amount of data to process and render.

Temperature sensors can also be toggled to display in °C or °F

### Sensor Table
This table contains each sensor you have configured, grouped according to their configurations. 
* Virtually everything in this table is reorderable. If there's a more significant group, or a more significant sensor, drag it to the top!
* If you collapse or expand a group, it'll automatically hide or show its data on the chart. Display only the data you care about!
* You can also hide or show individual sensor data by adjusting the toggle switch in the same row as the sensor.