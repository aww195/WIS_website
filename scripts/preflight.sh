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
PAT_IDS='171983134978|EV2AKZVPAD9JV|Z0109871|Z0216997|AKIA[0-9A-Z]{16}|e7najo7a4b'
PAT_PEOPLE='navy\.mil|schumacher|orosz|hubzone|susan wright|smw@|georgetown\.edu|aww45@'
PAT_STALE='chief information officer|wright intel services|in work([^a-z]|$)'

# The one place the predecessor brand is permitted: a factual employer line
# in Greg Culkowski's own bio (SRS C-3, WO-4 H-4). That file is excluded
# from the brand scan only; every other scan still covers it.
BRAND_ALLOW=':!src/pages/people/greg-culkowski.astro'

scan() {
  local label="$1" pattern="$2" flags="$3" extra="${4:-}"
  local out
  if [ "$MODE" = "--history" ]; then
    # The pathspec matters: without it the diff includes this file, and the
    # gate flags its own pattern definitions. `git log -p` accepts a
    # pathspec, so scope the diff rather than filtering the output.
    # Author/committer identity is scanned too (--format=fuller), so a
    # retired address in the metadata is caught as well as in the diff.
    out=$(git log -p --all --format=fuller -- . "$EXCLUDE" $extra | grep -n -E $flags -- "$pattern" || true)
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
BADFILES=$(git ls-files | grep -E '(^|/)\.env|(^|/)credentials$|\.pem$|\.bsdesign$|(^|/)\.aws/' || true)
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
