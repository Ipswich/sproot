---
sidebar_position: 8
title: System Status
---

# System Status

Not much actionable here, but always a good thing to know about. If you're ever curious about how Sproot is performing, you can checkout the system's status by navigating to `Settings -> System` and expanding the `Status` section.

Additionally, if you need to restart sproot, there's a big ol' `Restart` button at the bottom of this page.

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/SystemStatus.png" alt="System Status" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>

## Process

This section contains some common metrics for processes, that mostly relate to performance and volatile resource usage.

- Uptime
- Memory Usage
- Heap Usage
- CPU Usage

## System

This section contains information about the storage state of the device. Unless you're seriously low on storage, not a big deal.

- Total Disk Size
- Free Disk Size

## Database

This section contains some stats about the database. Most of these aren't relevant and are primarily surfaced just for debugging purposes. Unless any of these numbers look way too huge, also not a big deal.

- Database Size
- Connections Free
- Connections Used
- Pending Acquires
- Pending Creates

## Timelapse

This section contains details for the attached camera and its features.

- Image Count
- Archive Size
- Generation Duration
