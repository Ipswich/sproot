---
sidebar_position: 7
title: Backups
---

# Backups

Sproot automatically makes nightly backups which are saved for 30 days (you can configure this value in `docker-compose.yaml`). Hopefully you'll never need one, but better safe than sorry. These backups can also be useful if you want to copy your setup to a new device, as they contain all of the data for your setup, including historical data. Additionally, you can use backups to transfer your production data to a development instance.

<p style={{ textAlign: 'center' }}>
  <img src="/docs/img/Backups.png" alt="Backups" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>

## Downloading a backup

To download a backup, navigate to `Settings -> System` and expand the `Backups` section. You'll be shown a list of backups named something like `sproot-backup-(year)-(month)-(day)-(hour)-(minute)`. Just click on the backup you want to download, and click `Download`.

## Restoring from a backup

To restore from a backup, navigate to `Settings -> System` and expand the `Backups` section. Towards the bottom of the section, there's an input labeled `Restore`. Click this input, and locate your backup. Once you've located it, click `Upload`. Please note that this process will result in downtime - Sproot will halt and process the backup before restarting.

## Creating a backup

While backups are automatically created nightly, you may want to make an unscheduled one. Navigate to `Settings -> System` and expand the `Backups` section. You'll notice a `Create` button; click this button and Sproot will create a new backup in the background, and update the backup list when its complete.
