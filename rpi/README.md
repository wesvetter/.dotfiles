# Raspberry Pi Setup Notes

## Bootstrap

Initial machine setup is handled by:

- `~/.dotfiles/rpi/bootstrap.sh`
- `~/.dotfiles/rpi/apt_installs.sh`

Run the bootstrap script on a fresh Raspberry Pi OS install:

```bash
bash ~/.dotfiles/rpi/bootstrap.sh
```

## Weekly OS Updates

This Pi is configured to install OS package updates every Sunday at
`2:00 AM` with a root cron job.

Cron file:

- `/etc/cron.d/pi-weekly-updates`

Installed schedule:

```cron
0 2 * * 0 root /usr/local/bin/pi-weekly-update.sh >> /var/log/pi-weekly-update.log 2>&1
```

Update script:

- `/usr/local/bin/pi-weekly-update.sh`

The script runs:

- `apt-get update`
- `apt-get -y upgrade`
- `apt-get -y autoremove`
- `apt-get autoclean`

## Reboot Behavior

The update script reboots only when Debian indicates a reboot is
required after updates.

It checks:

- `/var/run/reboot-required`

If that file exists, the script schedules:

```bash
shutdown -r +5 "Automatic reboot after weekly updates"
```

That means a required reboot should happen at about `2:05 AM`.

## Logging

Weekly maintenance logs are written to:

- `/var/log/pi-weekly-update.log`

The log explicitly records:

- when maintenance starts
- whether a reboot was required
- whether reboot was skipped

Useful checks:

```bash
sudo cat /etc/cron.d/pi-weekly-updates
sudo cat /usr/local/bin/pi-weekly-update.sh
sudo tail -n 50 /var/log/pi-weekly-update.log
```
