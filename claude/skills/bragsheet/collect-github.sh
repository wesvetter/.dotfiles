#!/usr/bin/env bash
#
# Collect a week of code activity for the bragsheet.
#
# Graphite PRs are GitHub PRs, so `gh` is the authoritative cross-repo source.
# Prints four JSON arrays, each preceded by a `## <SECTION>` marker.
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
section MERGED
gh search prs --author=@me --merged --merged-at="$RANGE" \
  --limit 50 --json "$FIELDS"

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
