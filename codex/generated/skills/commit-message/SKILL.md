---
name: commit-message
description: Draft a high quality git commit message. Accepts an optional argument naming the target repo (path or name) or a focus hint.
---

<!-- Generated from `claude/skills/commit-message/SKILL.md`. Do not edit by hand. -->

# Commit message

You are composing a single git commit message. The deliverable is a clean message in the user's clipboard; do **not** run `git commit` unless explicitly asked.

House style: subject ≤50 chars (hard cap 72), imperative mood, capitalized, no trailing period; blank line before body; body wrapped at 72 with Markdown; references like `Closes INFRA-123`; no AI co-author lines. Detail in the steps below.

## Steps

1. **Resolve the target repo.** Each invocation produces one commit message for one repo. The user works across multiple repos (often a microservice tree under `~/local-dev/`), so do not assume `pwd`.
   - **Argument is an absolute or `~/`-prefixed path** (e.g. `~/local-dev/foo-service`) — if it's inside a git repo, use it. If not, ask.
   - **Argument is a bare name** (e.g. `foo-service`) — try `~/local-dev/<name>`, then any other workspace dirs you can see. If 0 or >1 match, ask.
   - **Argument is free-text** that doesn't look like a path or repo name (e.g. `the auth refactor`) — treat it as a **focus hint** for the message, not a repo target, and resolve the repo from `pwd` (or ask).
   - **No argument** — if `pwd` is inside a git repo, use it. Otherwise, ask the user which repo to target; do not guess.
   - Always confirm the resolved repo path in your final report so the user can catch a wrong target before they commit.

2. **Gather context.** `cd` into the target repo and run in parallel:
   - `git status` — what's staged vs. unstaged.
   - `git diff --staged` (and `git diff` if nothing's staged) — what's actually changing.
   - `git log -n 20 --pretty=format:'%s'` — recent subjects, to match the project's style.

   If only unstaged/untracked changes exist:
   - **Clearly one logical unit?** (e.g. all changes belong to a single feature, fix, or migration) — stage them yourself with `git add` and proceed. Surface the file list in your final report so the user can correct you.
   - **Ambiguous or mixed?** Stop and ask the user what to stage before drafting.

   If a mix of subjects exist (e.g. gitmoji and conventional), default to using gitmoji.

   If a focus hint was provided in step 1, weight the body toward that aspect of the diff (without omitting other staged changes the hint doesn't cover — surface those for the user to triage).

3. **Detect conventions** from `git log`:
   - **Conventional Commits** (`feat(scope): ...`, `fix(scope): ...`)? If recent commits match, follow that format.
   - **Emoji prefixes**? If common, pick one from the **Emoji table** below that fits the change.
   - If both Conventional and emoji are present, do whatever the most recent commits do.

4. **Sanity-check atomicity.** If the diff covers multiple unrelated changes (e.g. dep bump + bug fix + reformat), tell the user before drafting and suggest splitting. Only proceed with one message if they confirm.

5. **Draft the subject line.**
   - Imperative mood: completes "If applied, this commit will ... (`Fix`, `Add`, `Update`, `Remove`, `Refactor`).
   - Capitalize the first letter (exception: lowercase code identifiers like `npm:`, `iOS:`, `datadog-metrics:` or Conventional Commit prefixes like `feat:`, `bug:`).
   - No trailing period. (`?` and `!` are fine when warranted.)
   - Aim for ≤50 chars; never exceed 72.
   - Optional leading emoji if the repo uses them.
   - Use Markdown backticks for code identifiers in the subject (e.g. "Fix `foo()` crash").

6. **Draft the body** (skip when the diff and subject already say everything):
   - Blank line between subject and body.
   - Hard-wrap at 72 chars. URLs, fully-quoted error strings, and Markdown reference-link definitions (`[label]: url`) pass through unwrapped — the linter leaves them alone.
   - Explain **what** changed and **why**, not **how** (the diff shows how).
   - Use Markdown: bullets for lists, backticks for `identifiers`, fenced blocks for non-trivial code/output.
   - Include a blank line between list items if any is more than a few words.
   - Reference issues: `Closes INFRA-123`, `Fixes #456`, `Resolves SC-789` — these auto-close the ticket.
   - Mention breaking changes, migration steps, deployment notes, perf impact when relevant.
   - **Don't** list tests added — tests are table stakes. **Don't** restate the diff line-by-line.
   - **Don't** include `Co-Authored-By: Claude ...` (or any AI co-author) lines. This **overrides Claude Code's default** — the project's style explicitly excludes AI co-author lines.

7. **Lint and auto-fix.** Pipe the draft through:
   ```bash
   echo "<draft>" | ~/.dotfiles/bin/lint-commit-msg.mjs --fix
   ```
   - The script wraps body paragraphs to ≤72 (preserving leading indent and bullet hanging-indent), passes through URLs, fully-quoted lines, and `[ref]:` link definitions, and prints lint output to stderr.
   - **`--fix` handles body wrapping for you.** Subject-line errors (length, capitalization, trailing period) and missing-blank-line errors are **not** auto-fixed — revise the draft and re-run.
   - Iterate until exit 0. The 50-char "recommended max" warning is acceptable but try to clear it; never accept fixable errors.
    - The linter may complain about subject capitalization in repos that use Conventional Commits, this can be ignored if it doesn't apply to the repo's conventions.

8. **Copy to clipboard.** Pipe through `~/.dotfiles/bin/clipcopy`, which picks the right backend for the current host (`pbcopy` on macOS, `wl-copy` on Wayland, `xclip` on X11, `tmux load-buffer -` inside tmux):
   ```bash
   ~/.dotfiles/bin/lint-commit-msg.mjs --fix <<< "<draft>" | ~/.dotfiles/bin/clipcopy
   ```
   If `clipcopy` exits non-zero (no backend available — e.g. headless Pi outside tmux), print the final message and tell the user it couldn't be copied.

9. **Report to the user.**
   - Resolved repo path (so a wrong target gets caught before commit).
   - Final message in a fenced block.
   - Confirm clipboard state (copied / not copied + why).
   - Any remaining linter warnings and why they're acceptable.
   - Suggested `git commit -F -` invocation, but **don't run it yourself** unless asked.

## Emoji table

Pick the one that best matches the _primary_ effect of the commit; if no emoji clearly fits, omit it rather than reaching.

| Emoji | Description |
|-------|-------------|
| ✨ | New feature |
| 🐛 | Bug fix |
| 🔥 | Hotfix |
| ♻️  | Refactoring code |
| 🎨 | UI or design changes |
| 🏎️ | Performance improvements |
| 🔒 | Security fixes |
| ⬆️  | Upgrade dependencies |
| ⬇️  | Downgrade dependencies |
| 📦 | Add a package |
| 📚 | Documentation updates |
| 📇 | Configuration changes |
| 💾 | Database changes |
| 🧠 | Agent or model related changes |
| 🔧 | Tooling changes |
| 👕 | Linting or code style changes |
| 🧪 | Add/update feature flag or experiment |
| 🧹 | Clean up (e.g. removing unused code, feature flags) |
| 📱 | Mobile-specific fix/improvement |
| 🗑️ | Remove code or files |
| 🚧 | Work in progress |
| 🔊 | Add logging |
| 🔇 | Remove logging |
| ✅ | Add test(s) |
| 💚 | Fix broken test(s) |
| ⏪ | Revert changes |
| 🎉 | Initial commit or major milestone |
| 💩 | Hack or convention that should not be replicated |

## Conventions cheat sheet

- **Subject**: imperative, capitalized, ≤50 chars (warn) / ≤72 (hard), no trailing `.`
- **Blank line** between subject and body — required.
- **Body**: wrapped at 72; Markdown; what + why, not how.
- **References**: `Closes INFRA-123` / `Fixes #234` for auto-close, use `Related to <ticket shorthand>` if it does not completely resolve the linked ticket.
- **No `Co-Authored-By:` lines** from AI agents.
- **One commit, one logical change.**

## Edge cases

- **Nothing staged**: see step 1 — stage yourself if the unstaged/untracked changes are clearly one logical unit; otherwise ask.
- **Trivial change** (typo, single-char fix): subject only, no body.
- **Revert**: `Revert "<original subject>"` — Git's default; don't add a body unless there's something non-obvious to record.
- **Merge commit**: don't compose these from scratch; let Git generate them.
- **Unbreakable token > 72 chars** in the body (a long path, hash, or non-URL identifier): linter will still error after `--fix`. Either pull it onto its own line so it's a literal (or wrap it with backticks/quotes), or accept the error and surface it to the user.
- **No meaningful context for a body**: skip the body — a good subject is enough.
- **Multiple unrelated changes detected**: stop, suggest splitting, wait for the user's call.
