#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WITH_CUTOVER="false"

for arg in "$@"; do
  case "$arg" in
    --with-cutover)
      WITH_CUTOVER="true"
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

export BRIDGE_BACKUP_SOURCE_BEFORE_IMPORT="${BRIDGE_BACKUP_SOURCE_BEFORE_IMPORT:-true}"
export BRIDGE_BACKUP_TARGET_BEFORE_IMPORT="${BRIDGE_BACKUP_TARGET_BEFORE_IMPORT:-true}"
export BRIDGE_BACKUP_DIRECTORY="${BRIDGE_BACKUP_DIRECTORY:-./backups/bridge}"

cd "$ROOT_DIR"

echo "Running bridge preflight with backups in $BRIDGE_BACKUP_DIRECTORY"
npm run migrate:bridge:preflight --workspace=server

if [[ "$WITH_CUTOVER" == "true" ]]; then
  echo "Running bridge cutover"
  npm run migrate:bridge:cutover --workspace=server
fi