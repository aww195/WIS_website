#!/usr/bin/env bash
# NFR-9 repository hygiene gate.
#
# This repository is public and its history is permanent, so these checks
# run BEFORE a commit rather than as a cleanup pass afterwards. A hit is
# not a warning — the commit does not get made.
#
# Run against the working tree:   bash scripts/preflight.sh
# Run against full history:       bash scripts/preflight.sh --history
#
# Exits 0 when clean, 1 on any hit.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

EXCLUDE=':!scripts/preflight.sh'
FAIL=0
MODE="${1:-tree}"

# Patterns. Grouped so a failure message says which class of thing leaked.
# The literal strings are those WO-1 found in the wild; extend as needed.
PAT_BRAND='acquisition ?labs|acqlabs|acqlab'
# Infrastructure identifiers by SHAPE, not by value (NFR-9.2, WO-6 §1): a
# 12-digit account number (bare, or inside an ARN), CloudFront distribution/
# function/OAC ids (E + 13 base-36), IAM access keys. API Gateway endpoint
# hosts are deliberately not matched — they are public URLs, not account
# identifiers (WO-5 H-4). The gate no longer carries the ids it guards.
PAT_IDS='arn:aws:[a-z0-9-]*:[a-z0-9-]*:[0-9]{12}:|\b[0-9]{12}\b|\bE[A-Z0-9]{13}\b|AKIA[0-9A-Z]{16}'
PAT_PEOPLE='navy\.mil|schumacher|orosz|hubzone|susan wright|smw@|georgetown\.edu|aww45@'
PAT_STALE='chief information officer|wright intel services|in work([^a-z]|$)'

# The one place the predecessor brand is permitted: a factual employer line
# in Greg Culkowski's own bio (SRS C-3, WO-4 H-4). That file is excluded
# from the brand scan only; every other scan still covers it.
BRAND_ALLOW=':!src/pages/people/greg-culkowski.astro'

# Commits whose diff is known to trip a scan and has been ruled acceptable.
# Each entry: <full sha>  <one-line reason>. The history scan excludes these
# commits' diffs; the exception is visible here rather than silent.
HISTORY_ACCEPTED=(
  "ec9a0b98eae127800f61ccc13d76a2ee1a84113f  M3 preflight carried the account and distribution ids as literal patterns; owner accepted the historical exposure (WO-6 §1), history not rewritten"
)

scan() {
  local label="$1" pattern="$2" flags="$3" extra="${4:-}"
  local out
  if [ "$MODE" = "--history" ]; then
    # The pathspec matters: without it the diff includes this file, and the
    # gate flags its own pattern definitions. `git log -p` accepts a
    # pathspec, so scope the diff rather than filtering the output.
    # Author/committer identity is scanned too (--format=fuller), so a
    # retired address in the metadata is caught as well as in the diff.
    # Every reachable commit except the accepted ones, each shown with its
    # full metadata and diff.
    local accepted
    accepted=$(printf '%s\n' "${HISTORY_ACCEPTED[@]}" | cut -d' ' -f1)
    out=$(git rev-list --all | grep -v -x -F "$accepted" | xargs git show --format=fuller -p -- . "$EXCLUDE" $extra | grep -n -E $flags -- "$pattern" || true)
  else
    out=$(git grep -n $flags -E "$pattern" -- . "$EXCLUDE" $extra || true)
  fi
  if [ -n "$out" ]; then
    echo "FAIL  $label"
    echo "$out" | head -20
    echo
    FAIL=1
  else
    echo "ok    $label"
  fi
}

echo "NFR-9 preflight  (mode: $MODE)"
echo "----------------------------------------"
scan "predecessor brand"        "$PAT_BRAND"  "-i" "$BRAND_ALLOW"
scan "infrastructure identifiers" "$PAT_IDS"  ""
scan "third-party / removed people" "$PAT_PEOPLE" "-i"
scan "stale titles and names"   "$PAT_STALE"  "-i"

# Files that must never be tracked, regardless of content.
# .env.example is the committed placeholder template (WO-5 §3.2); every
# other .env* is forbidden.
BADFILES=$(git ls-files | grep -E '(^|/)\.env|(^|/)credentials$|\.pem$|\.bsdesign$|(^|/)\.aws/' | grep -v -E '(^|/)\.env\.example$' || true)
if [ -n "$BADFILES" ]; then
  echo "FAIL  forbidden files tracked"
  echo "$BADFILES"
  FAIL=1
else
  echo "ok    no forbidden files tracked"
fi

echo "----------------------------------------"
if [ "$FAIL" -eq 0 ]; then
  echo "PASS — safe to commit"
else
  echo "BLOCKED — fix the hits above; do not commit"
fi
exit "$FAIL"
