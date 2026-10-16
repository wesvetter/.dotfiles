---
name: bragsheet
description: Build this week's entry for ~/Documents/BRAGSHEET.md by pulling the user's recent activity from GitHub/Graphite, Notion, and Slack, then synthesizing it into impact-framed bullets prepended to the doc. Invoke on "/bragsheet", "update my bragsheet", "what did I do this week", or any request to record weekly accomplishments.
---

<!-- Generated from `claude/skills/bragsheet/SKILL.md`. Do not edit by hand. -->

# Bragsheet

Maintain `~/Documents/BRAGSHEET.md` — a running, reverse-chronological log of
Wes's weekly accomplishments, written as **impact**, not activity. It is raw
material for perf reviews, promo packets, and self-evals, so a bullet earns its
place only if it says what changed and for whom.

Newest week goes at the **top**. Never rewrite or reorder past weeks.

## Identity

These are stable — don't re-derive them:

| System | Handle |
| --- | --- |
| GitHub / Graphite | `wesvetter` (`--author=@me` works) |
| Slack | `U0BCEQF37FV` |
| Notion | `388d872b-594c-81af-9ceb-00021adf0192` (wes.vetter@seenhealth.org) |

Primary repos: `seenhealth/seen-ehr`, `seenhealth/seen-analytics`.

## Steps

### 1. Resolve the week window

Default to the **current** Mon–today (this is normally run on a Friday):

```bash
date '+%Y-%m-%d %A'; date -v-Mon '+%Y-%m-%d'
```

If the user names a week ("last week", "week of 7/27"), use that instead. If
the top entry in `BRAGSHEET.md` already covers the window you resolved, ask
whether to replace it or pick the prior week — don't silently write a duplicate.

### 2. Gather from all three sources in parallel

Fire all of these in one batch; they're independent.

**Code — `collect-github.sh`.** Graphite PRs *are* GitHub PRs, so `gh` is the
cross-repo source of truth (see [Why not the Graphite API](#why-not-the-graphite-api)):

```bash
~/.claude/skills/bragsheet/collect-github.sh <SINCE> <UNTIL>
```

Prints four JSON arrays under `## MERGED`, `## OPEN`, `## CLOSED_UNMERGED`,
`## REVIEWED`. Errors are not swallowed — an empty array means a quiet week,
not a broken query. For a PR whose impact isn't obvious from the title, read the
body and discussion: `gh pr view <n> --repo <owner/repo> --json title,body,comments`.

Add Graphite stack context only when a PR was part of a stack — inside a
Graphite repo, `gt log --stack` shows it. Skip otherwise.

**Slack.** The single richest source is Wes's own daily standup posts in
`#team-tech-only` — they already state yesterday/today in his words:

- `mcp__eng__slack__slack_search_public_and_private` with
  `query: "from:<@U0BCEQF37FV> in:#team-tech-only after:<SINCE-1d>"`, `sort: "timestamp"`
- Then a broader sweep for decisions and unblocking:
  `query: "from:<@U0BCEQF37FV> after:<SINCE-1d>"`, `sort: "timestamp"`, `limit: 20`
  (paginate with the returned cursor if the week was busy)

Slack `after:` is exclusive, so pass the day *before* SINCE. Follow threads worth
quoting with `slack_read_thread`. Weight messages where Wes made a call,
resolved a disagreement, or unblocked someone — skip logistics ("I'm in the
zoom", "running late").

**Notion.** Specs, proposals, and design docs are where the thinking lives:

- `mcp__eng__notion__notion-list-recent-pages` (limit ~25) for what he touched
- `mcp__eng__notion__notion-search` scoped to the week, e.g.
  `filters: {created_date_range: {start_date: "<SINCE>"}}`, seeded with the
  project names surfaced by the PRs and Slack sweep

The `created_by_user_ids` filter is unreliable on the AI-search backend — it
returns other people's pages too. Confirm authorship with `notion-fetch` before
claiming a doc as Wes's, or describe his contribution rather than sole authorship.

### 3. Synthesize

Cluster the raw signal by **project or outcome**, not by source. A PR, its
Notion spec, and the Slack thread where the approach was settled are *one*
bullet, not three.

For each bullet:

- Lead with the outcome, then the mechanism. "Surfaced RAF scores on the
  facesheet so care teams can see risk without leaving Orbit" beats "opened PR
  #14517".
- Name the beneficiary — care teams, the data eng team, a specific person
  unblocked.
- Quantify only what the sources actually support. No invented percentages or
  time savings. If the impact is real but unmeasured, say what it enables.
- Keep evidence links inline (PR, Notion page, Slack permalink) so the claim is
  checkable months later. Copy Slack permalinks verbatim from the search result
  that made the point — don't hand-assemble them from a channel ID you happen to
  have, or the link will silently point at the wrong channel.
- Cut anything you can't tie to an outcome. A short honest week beats a padded one.

Follow the global writing rules: lead with the conclusion, terse dense bullets,
plain words, no filler.

**PHI:** Seen handles PHI. Never write participant names, MRNs, or dates of
birth into the bragsheet, even if they appear in a Notion page or Slack thread.
Resource IDs only, or describe the cohort in aggregate.

### 4. Write it

Create `~/Documents/BRAGSHEET.md` with an `# Bragsheet` H1 if it doesn't exist.
Otherwise insert the new section directly below the H1, above the previous week.

```markdown
## Week of YYYY-MM-DD – YYYY-MM-DD

**TL;DR** — one sentence naming the week's biggest contribution.

### Shipped
- Outcome-first bullet. ([seen-ehr#14506](url))

### In flight
- What's open and what it unlocks. ([seen-ehr#14517](url))

### Decisions & design
- The call made, the tradeoff, why. ([Notion](url), [Slack](url))

### Reviews & unblocking
- Whose work moved because of a review, pairing session, or answer.
```

Drop any section with nothing real in it. Don't pad.

### 5. Report

Print the new section to the user and give the absolute path
`/Users/wes/Documents/BRAGSHEET.md`. Flag anything you inferred rather than
verified, and note sources that came back empty so a gap reads as "quiet week"
rather than "the query silently failed".

## Why not the Graphite API

Graphite's public REST API has no documented PR-listing endpoint. The only live
route found, `POST https://api.graphite.dev/v1/graphite/pull-requests`, rejects
every request body shape tried, and the published OpenAPI spec 404s. Graphite is
built on GitHub's APIs and its PRs are ordinary GitHub PRs, so `gh` returns the
same data with working auth. Use `gt` only for local stack structure. Revisit if
Graphite documents the endpoint.
