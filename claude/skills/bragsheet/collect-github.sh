#!/usr/bin/env bash
#
# Collect a week of code activity for the bragsheet.
#
# Graphite PRs are GitHub PRs, so `gh` is the authoritative cross-repo source.
# Prints four JSON arrays, each preceded by a `## <SECTION>` marker.
# MERGED rows also carry `body` (HTML comments removed, cut at 1500 chars)
# and `release` (the seen-ehr tag whose history contains the merge commit,
# or null). The tag means the commit is in that release. It does not mean a
# backfill, flag flip, or script ran when the tag was published.
#
# Usage: collect-github.sh <since YYYY-MM-DD> <until YYYY-MM-DD>
#
# Date ranges are inclusive of the whole final day. Errors are NOT swallowed --
# an empty section means "nothing that week", not "the query broke".

set -euo pipefail

SINCE="${1:?usage: collect-github.sh <since YYYY-MM-DD> <until YYYY-MM-DD>}"
UNTIL="${2:?usage: collect-github.sh <since YYYY-MM-DD> <until YYYY-MM-DD>}"

RANGE="$SINCE..$UNTIL"
FIELDS="number,title,repository,url,state,createdAt,updatedAt,closedAt,labels,commentsCount,isDraft"

section() { printf '\n## %s\n' "$1"; }

# Landed work -- the strongest bragsheet signal.
#
# `gh search` cannot return a body, so each merged PR gets one `gh pr view`.
# seen-ehr releases are assigned by history, not by publish time: a release cut
# a few minutes after a merge often does not contain it. Compare each tag to
# the previous one and credit the merge commit to the first tag that has it.
section MERGED
MERGED_JSON="$(gh search prs --author=@me --merged --merged-at="$RANGE" \
  --limit 50 --json "$FIELDS")"

if [ "$(jq 'length' <<<"$MERGED_JSON")" -eq 0 ]; then
  printf '%s\n' '[]'
else
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  mkdir -p "$WORK/prs" "$WORK/compares"
  printf '%s\n' '{}' >"$WORK/release-map.json"

  pids=()
  while IFS=$'\t' read -r repo num; do
    safe="${repo//\//__}__${num}"
    # One process, so `wait` observes `gh`'s own exit status.
    gh pr view "$num" --repo "$repo" --json body,mergeCommit,mergedAt \
      --jq '. + {id: "'"${repo}#${num}"'"}' >"$WORK/prs/$safe.json" &
    pids+=("$!")
  done < <(jq -r '.[] | "\(.repository.nameWithOwner)\t\(.number)"' <<<"$MERGED_JSON")
  view_status=0
  for pid in "${pids[@]}"; do
    wait "$pid" || view_status=1
  done
  if [ "$view_status" -ne 0 ]; then
    echo "gh pr view failed for a merged PR" >&2
    exit 1
  fi

  # sha -> earliest seen-ehr tag that contains it.
  if jq -e '[.[] | select(.repository.nameWithOwner == "seenhealth/seen-ehr")] | length > 0' \
      >/dev/null <<<"$MERGED_JSON"; then
    gh release list --repo seenhealth/seen-ehr --limit 40 \
      --json tagName,publishedAt,isDraft \
      --jq '[.[] | select(.isDraft | not) | {tag: .tagName, publishedAt}] | sort_by(.publishedAt)' \
      >"$WORK/releases.json"

    # The tag before the first release published on or after SINCE is the base
    # of the first compare. Without it, commits that shipped in that first tag
    # have no window.
    jq --arg since "$SINCE" '
      . as $all
      | ([$all[].publishedAt[:10]] | to_entries | map(select(.value >= $since)) | .[0].key) as $idx
      | if $idx == null then []
        elif $idx == 0 then $all
        else $all[($idx - 1):]
        end
    ' "$WORK/releases.json" >"$WORK/tags.json"

    if [ "$(jq 'length' "$WORK/tags.json")" -ge 2 ]; then
      jq -r '
        . as $a
        | range(1; $a | length) as $i
        | "\($a[$i - 1].tag)\t\($a[$i].tag)"
      ' "$WORK/tags.json" >"$WORK/pairs.tsv"
      pids=()
      while IFS=$'\t' read -r base head; do
        safe_head="${head//\//__}"
        gh api "repos/seenhealth/seen-ehr/compare/${base}...${head}" --jq '{
          tag: "'"$head"'",
          truncated: (.total_commits > (.commits | length)),
          shas: [.commits[].sha]
        }' >"$WORK/compares/${safe_head}.json" &
        pids+=("$!")
      done <"$WORK/pairs.tsv"
      compare_status=0
      for pid in "${pids[@]}"; do
        wait "$pid" || compare_status=1
      done
      if [ "$compare_status" -ne 0 ]; then
        echo "release compare failed" >&2
        exit 1
      fi

      # Oldest window first, so the earliest tag that contains a sha wins.
      jq -s --slurpfile order "$WORK/tags.json" '
        ($order[0] | map(.tag)) as $tags
        | sort_by(.tag as $t | ($tags | index($t)) // 999)
        | reduce .[] as $w ({};
            reduce $w.shas[] as $s (.; if .[$s] then . else .[$s] = $w.tag end))
      ' "$WORK/compares"/*.json >"$WORK/release-map.json"
    fi

    # A compare returns at most 250 commits. A seen-ehr merge still missing
    # gets a direct ancestry check against tags published at or after it.
    while IFS=$'\t' read -r sha merged_at; do
      [ -n "$sha" ] || continue
      if jq -e --arg sha "$sha" 'has($sha)' "$WORK/release-map.json" >/dev/null; then
        continue
      fi
      tag="$(
        jq -r --arg at "$merged_at" '
          [.[] | select(.publishedAt >= $at)] | sort_by(.publishedAt) | .[].tag
        ' "$WORK/tags.json" | while read -r candidate; do
          behind="$(gh api "repos/seenhealth/seen-ehr/compare/${sha}...${candidate}" --jq '.behind_by')"
          if [ "$behind" = "0" ]; then
            printf '%s\n' "$candidate"
            break
          fi
        done
      )"
      if [ -n "$tag" ]; then
        jq --arg sha "$sha" --arg tag "$tag" '. + {($sha): $tag}' \
          "$WORK/release-map.json" >"$WORK/release-map.next"
        mv "$WORK/release-map.next" "$WORK/release-map.json"
      fi
    done < <(
      for f in "$WORK/prs"/seenhealth__seen-ehr__*.json; do
        [ -e "$f" ] || continue
        jq -r '[.mergeCommit.oid // "", .mergedAt // ""] | @tsv' "$f"
      done
    )
  fi

  # Missing a pr-view file is a bug, not an empty body.
  jq -s --slurpfile prs <(jq '.' <<<"$MERGED_JSON") --slurpfile map "$WORK/release-map.json" '
    def preview:
      gsub("<!--[^>]*-->"; "")
      | split("<div")[0]
      | sub("^[[:space:]]+"; "") | sub("[[:space:]]+$"; "");
    (map({key: .id, value: .}) | from_entries) as $views
    | ($map[0] // {}) as $by_sha
    | $prs[0]
    | map(
        . as $pr
        | ($pr.repository.nameWithOwner + "#" + ($pr.number | tostring)) as $id
        | ($views[$id] // error("missing pr view for \($id)")) as $view
        | .body = ((($view.body // "") | preview)[0:1500])
        | .release = (
            if $pr.repository.nameWithOwner != "seenhealth/seen-ehr" then null
            else
              ($view.mergeCommit.oid // null) as $sha
              | ($by_sha[$sha] // null) as $tag
              | if $tag == null then null
                else {
                  tag: $tag,
                  publishedAt: null,
                  url: ("https://github.com/seenhealth/seen-ehr/releases/tag/" + $tag)
                }
                end
            end
          )
      )
  ' "$WORK/prs"/*.json >"$WORK/merged.json"

  if [ -f "$WORK/releases.json" ]; then
    jq --slurpfile rel "$WORK/releases.json" '
      ($rel[0] | map({key: .tag, value: .publishedAt}) | from_entries) as $at
      | map(if .release then .release.publishedAt = $at[.release.tag] else . end)
    ' "$WORK/merged.json" >"$WORK/merged.dated.json"
    mv "$WORK/merged.dated.json" "$WORK/merged.json"
  fi

  jq '.' "$WORK/merged.json"
  rm -rf "$WORK"
  trap - EXIT
fi

# Still open, touched this week: in-flight work worth mentioning.
#
# `updated:` alone has no upper bound, so a backfill for an earlier week pulls in
# everything touched since. Bound it by interval overlap -- the PR existed by
# UNTIL and saw activity at or after SINCE. Deliberately permissive: updatedAt is
# only the LAST touch, so an exact `updatedAt <= UNTIL` test would silently drop a
# PR worked on during the week and again later. A superset is safe (synthesis
# reads each PR anyway); a false negative is invisible.
section OPEN
gh search prs --author=@me --state=open --updated=">=$SINCE" \
  --limit 100 --json "$FIELDS" \
  --jq "[.[] | select(.createdAt[:10] <= \"$UNTIL\")]"

# Closed without merging -- often an abandoned approach or a superseded spike.
# Worth a line only when the decision itself was the contribution.
#
# GitHub's `closed:` qualifier only indexes PRs closed BY MERGING, so pairing it
# with `is:unmerged` is a contradiction that always returns []. Filter on
# `updated:` (which does match unmerged PRs) and narrow to the window here.
section CLOSED_UNMERGED
gh search prs "is:unmerged" --author=@me --state=closed --updated=">=$SINCE" \
  --limit 100 --json "$FIELDS" \
  --jq "[.[] | select(.closedAt[:10] >= \"$SINCE\" and .closedAt[:10] <= \"$UNTIL\")]"

# Review work is invisible in commit history but counts as impact.
#
# Two corrections over a bare `--reviewed-by=@me --updated=">=$SINCE"`:
#   1. Drop self-authored PRs -- GitHub counts a self-review as a review, so your
#      own PRs were landing under a "Reviews & unblocking" heading. Excluded here
#      rather than in the query: a negated `-author:` qualifier silently returns
#      NOTHING when combined with `reviewed-by:`, and `@me` does not resolve
#      inside a raw query string at all (only in gh's own --author flag).
#   2. `updated:` says the PR moved this week, NOT that you reviewed it this week.
#      A long-lived PR you reviewed months ago reappears every time it is touched.
#      So: bound the candidates, then keep only PRs where YOUR review was actually
#      submitted inside the window. One extra API call per candidate.
section REVIEWED
ME="$(gh api user --jq .login)"

REVIEW_CANDIDATES="$(gh search prs --reviewed-by=@me --updated=">=$SINCE" \
  --limit 100 --json "$FIELDS,author" \
  --jq "[.[] | select(.author.login != \"$ME\") | select(.createdAt[:10] <= \"$UNTIL\")]")"

KEEPFILE="$(mktemp)"
trap 'rm -f "$KEEPFILE"' EXIT

printf '%s' "$REVIEW_CANDIDATES" \
  | jq -r '.[] | "\(.repository.nameWithOwner)\t\(.number)"' \
  | while IFS=$'\t' read -r repo num; do
      if [ -n "$(gh api "repos/$repo/pulls/$num/reviews" --paginate \
                   --jq ".[] | select(.user.login == \"$ME\")
                             | select(.submitted_at[:10] >= \"$SINCE\"
                                  and .submitted_at[:10] <= \"$UNTIL\")
                             | .submitted_at")" ]; then
        printf '%s#%s\n' "$repo" "$num" >>"$KEEPFILE"
      fi
    done

# `author` is included in this section on purpose -- "whose work moved because of
# your review" is exactly what the bragsheet asks for. -c to match the compact,
# one-line-per-section shape of the other three.
printf '%s' "$REVIEW_CANDIDATES" | jq -c --rawfile keep "$KEEPFILE" \
  '($keep | split("\n") | map(select(length > 0))) as $k
   | [ .[] | select(("\(.repository.nameWithOwner)#\(.number)") as $id | $k | index($id)) ]'
