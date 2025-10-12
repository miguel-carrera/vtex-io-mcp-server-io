#!/usr/bin/env bash
# install-from-manifest.sh
# Uses manifest.json from the current working directory, verifies VTEX context after workspace switch,
# installs the app defined in the manifest, and prints a summary.

set -euo pipefail

# --- colors ---
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
RESET="\033[0m"

MANIFEST_PATH="./manifest.json"
REQUIRED_PHRASES=(
  "Logged into odpstage as"
  "at production workspace master"
)

# --- helpers ---
fail() { echo -e "${RED}✖ $1${RESET}" >&2; exit 1; }
ok()   { echo -e "${GREEN}✔ $1${RESET}"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

run() {
  if "$@"; then
    ok "$*"
  else
    fail "$*"
  fi
}

verify_whoami_contains_all() {
  local output
  output="$(vtex whoami 2>&1 || true)"
  for phrase in "${REQUIRED_PHRASES[@]}"; do
    if grep -Fiq "$phrase" <<<"$output"; then
      : # silent success
    else
      fail "Account switch to odpstage not successful"
    fi
  done
  WHOAMI_OUTPUT="$output"
}

# --- prerequisites ---
require_cmd vtex
require_cmd jq
[[ -f "$MANIFEST_PATH" ]] || fail "manifest.json not found in current directory: $(pwd)"

# --- parse manifest ---
VENDOR=$(jq -r '.vendor // empty'  "$MANIFEST_PATH")
APP_NAME=$(jq -r '.name // empty'   "$MANIFEST_PATH")
VERSION=$(jq -r '.version // empty' "$MANIFEST_PATH")
[[ -n "$VENDOR" && -n "$APP_NAME" && -n "$VERSION" ]] || fail "vendor, name, or version missing in manifest.json"

APP_SPEC="${VENDOR}.${APP_NAME}@${VERSION}"
echo -e "${BOLD}${YELLOW}→ Manifest:${RESET} ${BOLD}${APP_SPEC}${RESET}"

# --- VTEX context ---
run vtex switch odpstage
run vtex use master

# Verify whoami only after switching workspace
verify_whoami_contains_all
ok "VTEX account and workspace verified"

# --- install ---
run vtex install "$APP_SPEC"

# --- post-install verification (spacing-insensitive) ---
# Matches lines like:
#   odp.io-headless-validation-service         1.0.6
#   odp.io-headless-validation-service   1.0.6
APP_LIST_REGEX="^[[:space:]]*${VENDOR}\.${APP_NAME}[[:space:]]+${VERSION}[[:space:]]*$"

if vtex list >/dev/null 2>&1; then
  if vtex list | grep -Eq "$APP_LIST_REGEX"; then
    ok "Installation verified"
  else
    if vtex apps list >/dev/null 2>&1 && vtex apps list | grep -Ekq "$APP_LIST_REGEX"; then
      ok "Installation verified"
    else
      fail "Could not confirm ${APP_SPEC} installation"
    fi
  fi
else
  if vtex apps list | grep -Eq "$APP_LIST_REGEX"; then
    ok "Installation verified"
  else
    fail "Could not confirm ${APP_SPEC} installation"
  fi
fi

# --- summary ---
echo -e "\n${BOLD}${YELLOW}===== SUMMARY =====${RESET}"
ACCOUNT=$(grep -ioE "logged into [^ ]+" <<<"$WHOAMI_OUTPUT" | cut -d' ' -f3)
WORKSPACE=$(grep -ioE "workspace [^ ]+" <<<"$WHOAMI_OUTPUT" | cut -d' ' -f2)
echo -e "${BOLD}Account:${RESET}   $ACCOUNT"
echo -e "${BOLD}Workspace:${RESET} $WORKSPACE"
echo -e "${BOLD}Installed:${RESET} $APP_SPEC"
echo -e "${BOLD}${YELLOW}====================${RESET}\n"

ok "All steps completed successfully."
