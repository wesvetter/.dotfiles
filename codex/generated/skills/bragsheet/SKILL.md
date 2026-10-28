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

**Code — `collect-github.sh`.** Graphite PRs *are* GitHub PRs, so `gh` is the cross-repo source of truth (see [Why not the Graphite API](#why-not-the-graphite-api)):

```bash
~/.claude/skills/bragsheet/collect-github.sh <SINCE> <UNTIL>
```

Prints four JSON arrays under `## MERGED`, `## OPEN`, `## CLOSED_UNMERGED`, `## REVIEWED`. Errors are not swallowed — an empty array means a quiet week, not a broken query.

`## MERGED` includes `body` and `release`, so do not open each PR. `body` is the PR body with HTML comments removed, cut at 1,500 characters. `release` is the `seen-ehr` tag whose history contains that merge commit, or null. The tag means the commit is in that release. It does not mean a backfill, flag flip, or script ran when the tag was published. Confirm production runs from Slack or the ticket. Call `gh pr view` only when you need comments or the rest of a truncated body.

Add Graphite stack context only when a PR was part of a stack — inside a Graphite repo, `gt log --stack` shows it. Skip otherwise.

**Slack.** One search covers standups and every other message Wes sent. A second search repeats the same posts.

`slack_search_public_and_private` in the `tech` namespace:

- `filters`: `from:<@U0BCEQF37FV> after:<day before SINCE> before:<day after UNTIL>`
- `keywords`: `[]`
- `natural_language_query`: `""`
- `sort`: `timestamp`, `sort_dir`: `asc`
- `limit`: `20`
- `include_context`: false
- `response_format`: `detailed`

`after:` and `before:` are exclusive. Paginate with the returned cursor until the result says there are no more pages. Use `detailed`: `concise` drops permalinks, and the bragsheet copies permalinks verbatim from the result.

Read a thread with `slack_read_thread` only when the hit is a standup or a decision and the reply count shows the parent is not the whole story. Skip logistics ("I'm in the zoom", "running late", lunch, birthdays). Weight messages where Wes made a call, resolved a disagreement, or unblocked someone.

**Notion.** Ticket status lives on Tech Issues and Projects. Do not call `notion-list-recent-pages`. It lists pages Wes viewed, including older tickets. Do not `notion-search` and then fetch every hit.

Fetch each data source schema once, then query rows:

- Tech Issues: `collection://278017d8-7947-80dd-95ed-000b2e9e51ca`
- Projects: `collection://256017d8-7947-8099-9726-000b076df019`

`notion-fetch` on the `collection://` URL returns the schema and no pages. Then `notion-query-data-sources` in `rows` mode, with `mode`, `data_source_url`, `filter`, and `limit` nested under `data`. Filter `Owner` with `person_contains` and value `{type: "relative", value: "me"}`, and the last-edited date property inside SINCE..UNTIL. Use the date property name from the schema (`Updated` as of 2026-10). `limit` 100. Keep the ID, title, Status, and URL.

`notion-search`'s `created_by_user_ids` filter returns other people's pages. `edited_by_user_ids` works on this workspace and still returns titles only, with no status. Prefer the row query. `Owner` on the row is the authorship check. `notion-fetch` a page only when the outcome is in the body (a project writeup or a spec) and the row is not enough. Fetching every ticket from the query is the slow path.

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
