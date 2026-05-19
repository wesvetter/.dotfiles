# Raspberry Pi Setup Notes

## Bootstrap

Initial machine setup is handled by:

- `~/.dotfiles/rpi/bootstrap.sh`
- `~/.dotfiles/rpi/apt_installs.sh`
- `~/.dotfiles/rpi/pi-weekly-update.sh`
- `~/.dotfiles/rpi/pi-weekly-updates.cron`

Run the bootstrap script on a fresh Raspberry Pi OS install:

```bash
bash ~/.dotfiles/rpi/bootstrap.sh
```

## Weekly OS Updates

This Pi is configured to install OS package updates every Sunday at
`2:00 AM` with a root cron job.

Cron file:

- Tracked source: `~/.dotfiles/rpi/pi-weekly-updates.cron`
- Installed file: `/etc/cron.d/pi-weekly-updates`

Installed schedule:

```cron
0 2 * * 0 root /usr/local/bin/pi-weekly-update.sh >> /var/log/pi-weekly-update.log 2>&1
```

Update script:

- Tracked source: `~/.dotfiles/rpi/pi-weekly-update.sh`
- Installed file: `/usr/local/bin/pi-weekly-update.sh`

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
## Logging

Weekly maintenance logs are written to:

- `/var/log/pi-weekly-update.log`

The log explicitly records:

- when maintenance starts
- when each `apt-get` step starts and finishes
- whether a reboot was required
- whether reboot was skipped
- whether the script exited early and during which step

Useful checks:

```bash
sudo cat /etc/cron.d/pi-weekly-updates
sudo cat /usr/local/bin/pi-weekly-update.sh
sudo tail -n 50 /var/log/pi-weekly-update.log
sudo grep -n "Starting weekly package maintenance\|Starting:\|Completed:\|Reboot required\|Reboot not required\|Maintenance aborted" /var/log/pi-weekly-update.log
```
