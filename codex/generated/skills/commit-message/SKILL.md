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

   **Squash / one message for a branch or PR.** If the user asked for a squashed message, or one message covering the branch/PR rather than the current index:
   - Resolve the range (`origin/<base>..HEAD`, or the PR base from `gh pr view`).
   - Also gather `git log --format='%an <%ae>%n%b' <base>..HEAD` and `git diff <base>...HEAD`.
   - Collect every distinct **human** who authored a commit in that range or appeared in a `Co-Authored-By:` trailer. Those people must be listed as `Co-Authored-By: Name <email>` on the drafted squash message — do not drop them.
   - Identify people by GitHub login, not by email. One person often appears under several emails (e.g. a work email in a trailer that Cursor adds for a cloud agent, and a personal email in their own commits). For a PR, list every author and co-author with their login:
     ```bash
     gh pr view <pr> --json author,commits --jq '"PR author: \(.author.login)", (.commits[].authors[] | "\(.login) \(.name) <\(.email)>")' | sort -u
     ```
     Entries with the same login are one person. Entries without a login fall back to deduplicating by email (case-insensitive).
   - The user is **Wes Vetter** (`@wesvetter`). `wes.vetter@gmail.com`, `wes.vetter@seenhealth.org`, and the `wes.vetter` name in Cursor cloud agent trailers are all him. When he is a co-author, write `Co-Authored-By: Wes Vetter <wes.vetter@gmail.com>` unless told otherwise.
   - When creating a squashed commit for a PR, omit the PR author (every email under their login) as a co-author.
   - For other co-authors, use the name and email they use in the repo's `git log`, even if the PR shows a different one.
   - Omit known bot signatures. The linter's list is the source of truth: Claude, Cursor, Codex, Copilot, Devin, Gemini, GPT, ChatGPT, Anthropic, and any `*[bot]*` name or email.
   - Treat the PR title as a draft, often written by an agent. Don't inherit its prefix, scope, or wording: the shape of the change may have shifted during review, and step 3 decides the style.

3. **Detect conventions**, weighting the committer's own history over the repo's:
   - Read the committer's recent subjects first, matching by name because their work and personal emails often differ:
     ```bash
     git log origin/<base> -n 30 --author="$(git config user.name)" --pretty=format:'%s'
     ```
     Match their prefix, scope (or lack of one), length, and casing. Fall back to the repo-wide `git log` from step 2 only when they have fewer than ~5 commits.
   - In the repo-wide log, count a run of subjects from one author or one stack (e.g. ten `refactor(core): ...` in a row) as a single data point.
   - Look for the committer's earlier commits of the same kind (a backfill, migration, flag removal) and reuse their verb and prefix:
     ```bash
     git log origin/<base> --author="$(git config user.name)" -i --grep=backfill --pretty=format:'%s'
     ```
   - **Conventional Commits** (`feat(scope): ...`, `fix(scope): ...`)? If recent commits match, follow that format.
       - Avoid misleading scopes (e.g. `feat(react)` for a UI change that doesn't specifically upgrade React capabilities or dependencies)
   - **Emoji prefixes**? If common, pick one from the **Emoji table** below that fits the change.
   - If the repo uses conventional commits AND the author typically squashes commits on merge, use emoji commits for the topic branch and conventional commits for the squashed commit.

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
   - Explain **what** changed and **why**, not **how** (the diff shows how). Emphasize observable behavior over implementation details.
   - Use Markdown: bullets for lists, backticks for `identifiers`, fenced blocks for non-trivial code/output.
   - Include a blank line between list items if any is more than a few words.
   - Reference issues: `Closes INFRA-123`, `Fixes #456`, `Resolves SC-789` — these auto-close the ticket. Never include a bare ticket number (bad: `#12345`, good: `Relates to #12345`).
   - Mention breaking changes, migration steps, deployment notes, perf impact when relevant.
   - **Don't** state a feature flag is off by default; only mention when a behavior _isn't_ off by default.
   - **Don't** list tests added — tests are table stakes. **Don't** restate the diff line-by-line.
   - **Don't** include `Co-Authored-By:` lines for AI agents (Claude, Cursor, etc.). This **overrides Claude Code's default** — the project's style explicitly excludes AI co-author lines.
   - **Do** include `Co-Authored-By: Name <email>` for every distinct human author or co-author in a squash range (see step 2). Put trailers after the body, preceded by a blank line.

7. **Lint and auto-fix.** Pipe the draft through:
   ```bash
   echo "<draft>" | ~/.dotfiles/bin/lint-commit-msg.mjs --fix
   ```
   For a squash / branch message, also pass the range from step 2:
   ```bash
   echo "<draft>" | ~/.dotfiles/bin/lint-commit-msg.mjs --fix --range origin/main..HEAD --pr-author <email>
   ```
   - For a PR, pass one of the PR author's emails from step 2 as `--pr-author`. For a branch with no PR, pass your own `git config user.email`.
   - The linter matches by email, not login. Ignore a missing co-author warning for an email that step 2 tied to the PR author's login, or to a co-author who is already listed under their usual email.
   - The script wraps body paragraphs to ≤72 (preserving leading indent and bullet hanging-indent), passes through URLs, fully-quoted lines, and `[ref]:` link definitions, and prints lint output to stderr.
   - **`--fix` handles body wrapping for you.** Subject-line errors (length, capitalization, trailing period) and missing-blank-line errors are **not** auto-fixed — revise the draft and re-run.
   - With `--range`, the linter reads `git log` for that range and **warns** (still exit 0) if a human author or `Co-Authored-By` is missing from the draft. Known bots and the `--pr-author` email are ignored; without `--pr-author`, every human in the range is expected.
   - Iterate until exit 0. The 50-char "recommended max" warning is acceptable but try to clear it. **Missing `Co-Authored-By` warnings are not acceptable** (except for the alternate emails described above) — add the trailers and re-lint. Never accept fixable errors.
   - The linter may complain about subject capitalization in repos that use Conventional Commits, this can be ignored if it doesn't apply to the repo's conventions.

8. **Copy to clipboard.** Pipe through `~/.dotfiles/bin/clipcopy`, which picks the right backend for the current host (`pbcopy` on macOS, `wl-copy` on Wayland, `xclip` on X11, `tmux load-buffer -` inside tmux):
   ```bash
   ~/.dotfiles/bin/lint-commit-msg.mjs --fix [--range <base>..HEAD --pr-author <email>] <<< "<draft>" | ~/.dotfiles/bin/clipcopy
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
- **Squash:** keep every human author/`Co-Authored-By` from the commits being squashed (not the PR author; not known bots). Pass `--range` and `--pr-author` to the linter.
- **One commit, one logical change.**

## Edge cases

- **Nothing staged**: see step 1 — stage yourself if the unstaged/untracked changes are clearly one logical unit; otherwise ask.
- **Trivial change** (typo, single-char fix): subject only, no body.
- **Revert**: `Revert "<original subject>"` — Git's default; don't add a body unless there's something non-obvious to record.
- **Merge commit**: don't compose these from scratch; let Git generate them.
- **Unbreakable token > 72 chars** in the body (a long path, hash, or non-URL identifier): linter will still error after `--fix`. Either pull it onto its own line so it's a literal (or wrap it with backticks/quotes), or accept the error and surface it to the user.
- **No meaningful context for a body**: skip the body — a good subject is enough.
- **Multiple unrelated changes detected**: stop, suggest splitting, wait for the user's call.
- **Squash missing human trailers**: if the range has human authors or `Co-Authored-By` trailers and the draft omits any of them, that is a bug in the draft — add them before copying.
