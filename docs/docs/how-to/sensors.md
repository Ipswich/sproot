---
sidebar_position: 2
title: Sensors
---

# Sensors

What is an environmental management platform if it can't observe the environment? Sproot connects to a multiple of different types of sensors, enabling you to monitor most relevant conditions.

Currently, Sproot integrates with these sensors:

- BME280 (Temperature, Humidity, Pressure)
- DS18B20 (Temperature)
- ADS1115 (Analog Voltage)
- Capacitive Moisture Sensors (Soil Moisture)

## Integrating Devices

### I2C Devices

- BME280
- ADS1115
- Capacitive Moisture Sensors

To add an I2C device, simply note the I2C device of the sensor and connect the relevant pins between the devices.

### OneWire Devices

- DS18B20

Since these are discoverable, you'll only need to wire the relevant pins between the devices and you should be set. Sproot will automatically detect and add these as they are discovered. You'll probably want to update the name, color, and maybe zone.

## Adding or Editing a Device

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/SensorSettings.png" alt="Sensor Settings" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
  <img src="/docs/img/SensorSettingsNew.png" alt="New Sensor" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
Once you've got your sensors integrated, navigate to `Settings -> Sensors`

- To add a new device, click the big `Add Sensor` button, and a pop up will appear that you can configure your sensor in. Once you've configured it, click `Add Sensor` to save your changes.
- To edit an existing device, click the `Edit` icon next to the device's name.

#### Name

This is the display name for this sensor.

#### Color

This determines the color of the sensor's line on charts, and its label's color. Purely cosmetic, but helps distinguish sensors from each other.

#### Model

This determines some of the other settings of the sensor, but ultimately tells Sproot how it needs to communicate with this device.

#### Zone

This organizes zoned devices into a common display category. Think "Zone". If you've got two shelves with different conditions, you might want them zoned together to keep things organized.

- You can manage zones by clicking the big `Manage Zones` button by the `Add Sensor` button. These zones are also shared with Outputs.

#### Model Specific Settings

All of these devices require an address, but some may also require a pin. As ADS1115 (and Capacitive Moisture Sensor, by extension) is an I2C expander board, to reference the connected device you'll need to specify the pin the actual sensor is connected to.

## Viewing Your Sensor Data

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/SensorData.png" alt="Sensor Data" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
Navigate to the `Sensor Data` page for the relevant measurement type from the nav bar.

### Chart Settings

The chart displays the history of each sensor. Below the chart is a settings panel with several controls. Please note that these _will_ let you be dumb - if you ask for 6 months of 1 minute raw data, buckle up.

#### Time Range

Select a preset time window using the segmented control: **6 Hours**, **12 Hours**, **1 Day**, **3 Days**, or **1 Week**. Choose **Custom** to open a date range picker where you can select any start and end date.

#### Statistic (Aggregate)

Determines how multiple data points within each resolution bucket are combined into a single value. Available options:

| Option            | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| Average           | The mean value across all data points in the bucket          |
| Minimum           | The lowest value in the bucket                               |
| Maximum           | The highest value in the bucket                              |
| Last in interval  | The most recent value in the bucket                          |
| First in interval | The earliest value in the bucket                             |
| Sum               | The total of all values in the bucket                        |
| Count             | The number of data points in the bucket                      |
| Std. Dev.         | The standard deviation of values in the bucket               |
| Percentile        | The value at the specified percentile rank within the bucket |

When the resolution is set to **1 minute** (raw data), this selector shows "Raw" and is disabled since individual data points don't have any aggregation.

#### Resolution (Downsample)

Controls the time bucket size for chart data points. Available options:

| Option     | Description                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Auto       | Automatically selects resolution based on time range: 5 minutes for ≤72 hours, 1 hour for ≤1 week, 1 day beyond that |
| 1 minute   | One data point per minute                                                                                            |
| 5 minutes  | One data point every 5 minutes                                                                                       |
| 15 minutes | One data point every 15 minutes                                                                                      |
| 30 minutes | One data point every 30 minutes                                                                                      |
| 1 hour     | One data point per hour                                                                                              |
| 6 hours    | One data point every 6 hours                                                                                         |
| 1 day      | One data point per day                                                                                               |
| Custom...  | Opens a custom resolution editor with a numeric input and unit selector (minutes, hours, or days)                    |

#### Percentile

Visible only when the **Percentile** aggregate is selected. Enter a value between 1 and 99.9 (default: 95) to compute the corresponding percentile rank. For example, the 95th percentile shows a value below which 95% of the data in each bucket falls.

#### Show Stat Lines

A toggle button that overlays reference lines on the chart showing the overall **Average** (red), **Minimum** (blue), and **Maximum** (green) across the displayed time range. This provides a quick visual benchmark for comparing individual sensor readings against the full dataset.

#### Alternate Units (Temperature Only)

For temperature sensors, a switch toggles between Celsius and Fahrenheit. This affects both the chart display and the table values.

### Sensor Table

This table contains each sensor you have configured, grouped according to their device zones.

- Virtually everything in this table is reorderable. If there's a more significant zone, or a more significant sensor, drag it to the top!
- If you collapse or expand a zone, it'll automatically hide or show its data on the chart. Display only the data you care about!
- Each sensor row has a toggle switch to show or hide that individual sensor's line on the chart.
- Sensor order is persisted per reading type, as is zone order and per-zone sensor order.
