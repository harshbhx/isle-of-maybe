#!/usr/bin/env bash
# Creates labels, milestones and one GitHub issue per task row in docs/07-TASKS.md
# (rows are generated from specs/*/tasks.md). Safe to re-run: existing issues are skipped.
# Usage (repo root): bash tools/create-issues.sh            DRY_RUN=1 to print only
set -euo pipefail

TASKS="docs/07-TASKS.md"
[ -f "$TASKS" ] || { echo "Run from the repo root ($TASKS not found)"; exit 1; }
DRY="${DRY_RUN:-0}"
run() { if [ "$DRY" = "1" ]; then printf '+'; printf ' %q' "$@"; echo; else "$@"; fi; }
trim() { printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }

REPO="${REPO:-harshbhx/isle-of-maybe}"

label() { run gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; }
label P0 B60205 "Ships or we don't submit"
label P1 FBCA04 "Makes it win"
label P2 C5DEF5 "Only if time is left"
label owner:harsh 5319E7 "Needs Harsh"
label owner:agent 0E8A16 "Coding agent"
label task 1D76DB "Task from a spec"
label spec 0052CC "Spec change"
label bug D73A4A "Doesn't match the spec"
label cut 000000 "Cut at the cut line"
label chore C2E0C6 "Tooling and housekeeping"
label docs 0075CA "Documentation"
for s in 01-island-engine 02-hunt 03-bury-and-chart 04-daily-cycle 05-community 06-client-shell 07-launch; do
  label "spec:$s" BFD4F2 "specs/$s"
done

# Milestones (title must match the headings in 07-TASKS.md after "## ")
declare -A DUE=( [M0]="2026-12-01T18:29:59Z" [M1]="2026-12-02T18:29:59Z" [M2]="2026-12-03T18:29:59Z" [M3]="2026-12-06T18:29:59Z" [M4]="2026-12-17T01:59:59Z" )
existing_ms="$( [ "$DRY" = "1" ] && echo "" || gh api "repos/$REPO/milestones?state=all&per_page=100" -q '.[].title' )"
grep -E '^## M[0-9] ' "$TASKS" | sed 's/^## //' | while read -r title; do
  key="${title%% *}"
  if ! grep -qxF "$title" <<<"$existing_ms"; then
    run gh api "repos/$REPO/milestones" -f title="$title" -f due_on="${DUE[$key]}" >/dev/null
  fi
done

existing_issues="$( [ "$DRY" = "1" ] && echo "" || gh api "repos/$REPO/issues?state=all&per_page=100" --paginate -q '.[].title' )"
ms_number() { [ "$DRY" = "1" ] && { echo 0; return; }; gh api "repos/$REPO/milestones?state=all&per_page=100" -q ".[] | select(.title == \"$1\") | .number"; }
milestone=""
ms_num=""
while IFS= read -r line; do
  if [[ "$line" =~ ^##\ (M[0-9].*)$ ]]; then milestone="${BASH_REMATCH[1]}"; ms_num="$(ms_number "$milestone")"; continue; fi
  [[ "$line" =~ ^\|\ T[0-9]+b?\ \| ]] || continue
  IFS='|' read -r _ id title owner pri est spec reqs notes _ <<<"$line"
  id="$(trim "$id")"; title="$(trim "$title")"; owner="$(trim "$owner")"; pri="$(trim "$pri")"
  est="$(trim "$est")"; spec="$(trim "$spec")"; reqs="$(trim "$reqs")"; notes="$(trim "$notes")"
  if grep -qE "^$id " <<<"$existing_issues"; then echo "skip $id (exists)"; continue; fi
  case "$owner" in *H*) olabel="owner:harsh" ;; *) olabel="owner:agent" ;; esac
  body="$(printf '**Spec:** [`specs/%s`](../blob/main/specs/%s/requirements.md) · [design](../blob/main/specs/%s/design.md) · [tasks](../blob/main/specs/%s/tasks.md)\n\n**Requirements (acceptance criteria):** %s\n\n**Estimate:** %s · **Owner:** %s\n\n%s\n\n---\nDefinition of done: AGENTS.md §5. The PR must say `Closes #<this issue>` and list the requirement IDs.' \
    "$spec" "$spec" "$spec" "$spec" "$reqs" "$est" "$owner" "${notes:+**Notes:** $notes}")"
  run gh api "repos/$REPO/issues" -f title="$id $title" -f body="$body" -F milestone="$ms_num" \
    -f "labels[]=task" -f "labels[]=$pri" -f "labels[]=$olabel" -f "labels[]=spec:$spec" -q '"#\(.number) \(.title)"'
done < "$TASKS"
echo "Done."
