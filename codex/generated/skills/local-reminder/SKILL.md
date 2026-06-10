---
name: local-reminder
description: Schedule a one-off local macOS push notification that fires after a delay, even if the Claude/Codex session has ended. Invoke when the user says something like "/local-reminder Deploy to production in 15 minutes" or otherwise asks to be reminded/notified at a future time.
---

<!-- Generated from `claude/skills/local-reminder/SKILL.md`. Do not edit by hand. -->

# Local reminder

Schedule a single timed desktop notification on the user's Mac. The work is
done by `~/.dotfiles/bin/local-reminder`, which spawns a **detached** sleeper
(`nohup`, reparented to launchd) so the notification still fires after this
session ends. Your job is to turn the natural-language request into an explicit
delay in seconds plus a clean reminder message, then call the script.

## Steps

1. **Platform.** This is macOS-only. The script gates on `uname` and exits
   early with an error on other platforms, so you don't need to pre-check — but
   if you already know the host isn't macOS, say so and stop rather than
   scheduling something that won't fire.

2. **Parse the request** into two parts:
   - **When** — a relative or absolute time. Convert it to a positive integer
     number of **seconds from now**:
     - Relative ("in 15 minutes", "in 2h", "in 90s") → arithmetic.
     - Absolute ("at 3pm", "at 14:30") → seconds until that clock time today;
       if it's already past, assume tomorrow. Use `date` to compute when
       unsure (note the leading `+` for additive offsets):
       `$(( $(date -v+15M '+%s') - $(date '+%s') ))` is the seconds until 15
       minutes from now.
   - **What** — the reminder text, with the time phrase stripped. For
     "Deploy to production in 15 minutes" the message is "Deploy to
     production" and the delay is 900s.
   - If the request has **no parseable time**, ask the user when to fire it
     rather than guessing.

3. **Schedule it** by calling the script (it's on `PATH` as `local-reminder`,
   or use the absolute path):
   ```bash
   local-reminder --in <SECONDS> --message "<TEXT>" [--title "<TITLE>"] [--sound <NAME>]
   ```
   - `--in` — integer seconds (required, > 0).
   - `--message` — the reminder text (required).
   - `--title` — defaults to `Reminder`; set it when a short label helps
     (e.g. the project name).
   - `--sound` — defaults to `default`; pass a macOS sound name to override.
   - The launcher returns immediately and prints the absolute fire time.

4. **Report** back to the user: confirm the message, the delay, and the
   absolute clock time it will fire (echo what the script printed). Mention
   that it survives the session ending. There is no built-in cancel — to drop
   a pending reminder the user kills the `sleep`/`local-reminder` process
   (`pkill -f local-reminder`).

## Notes

- The script logs scheduled and fired reminders to `~/.cache/local-reminder.log`
  — useful for confirming one actually fired.
- Notifications use `terminal-notifier` when installed (the user has it),
  falling back to `osascript display notification`.
- This is a single, fire-once reminder. For anything recurring or scheduled in
  the cloud, point the user at the `/schedule` or `/loop` skills instead.
