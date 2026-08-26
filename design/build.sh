#!/usr/bin/env bash
# Rigenera e pubblica il canvas delle schermate.
#   uso:  bash design/build.sh            (rigenera spesa-schermate-fase-1.html)
# Poi pubblicare con lo strumento Artifact sullo stesso URL:
#   https://claude.ai/code/artifact/154c7e8b-23fb-4300-bd72-5d71733e4b30
set -euo pipefail
cd "$(dirname "$0")/.."

# base directory della skill "design" (cambia a ogni versione di Claude Code):
#   ls -d /private/tmp/claude-*/bundled-skills/*/*/design | head -1
BD="${DESIGN_SKILL_DIR:-$(ls -d /private/tmp/claude-*/bundled-skills/*/*/design 2>/dev/null | head -1)}"
[ -n "$BD" ] || { echo "skill design non trovata: esporta DESIGN_SKILL_DIR"; exit 1; }

ART=()
for f in design/*.dc.html; do ART+=(--artboard "$f"); done

node "$BD/seed-canvas.mjs" \
  --template "$BD/payload.template.html" \
  --out spesa-schermate-fase-1.html \
  --title "Spesa — Schermate Fase 1" \
  "${ART[@]}" \
  --canvas design/canvas.json

node "$BD/seed-canvas.mjs" --check spesa-schermate-fase-1.html
