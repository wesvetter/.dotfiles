#!/bin/sh
set -eu

export DEBIAN_FRONTEND=noninteractive

timestamp() {
  date '+%Y-%m-%d %H:%M:%S %Z'
}

log() {
  echo "[$(timestamp)] $*"
}

STEP_NAME=""
COMPLETED=0

on_exit() {
  rc=$?
  if [ "$rc" -ne 0 ]; then
    if [ -n "$STEP_NAME" ]; then
      log "Maintenance aborted during: $STEP_NAME (exit code $rc)"
    else
      log "Maintenance aborted before completion (exit code $rc)"
    fi
  elif [ "$COMPLETED" -ne 1 ]; then
    log "Maintenance exited cleanly without reaching the completion marker"
  fi
}

trap on_exit EXIT

run_step() {
  STEP_NAME="$1"
  shift

  log "Starting: $STEP_NAME"
  "$@"
  log "Completed: $STEP_NAME"
  STEP_NAME=""
}

log "Starting weekly package maintenance"

run_step "apt-get update" /usr/bin/apt-get update
run_step "apt-get -y upgrade" /usr/bin/apt-get -y upgrade
run_step "apt-get -y autoremove" /usr/bin/apt-get -y autoremove
run_step "apt-get autoclean" /usr/bin/apt-get autoclean

if [ -f /var/run/reboot-required ]; then
  log "Reboot required; scheduling restart in 5 minutes"
  STEP_NAME="shutdown -r +5"
  /usr/sbin/shutdown -r +5 "Automatic reboot after weekly updates"
  log "Shutdown command accepted"
  STEP_NAME=""
else
  log "Reboot not required; maintenance complete"
fi

COMPLETED=1
log "Weekly package maintenance finished"
