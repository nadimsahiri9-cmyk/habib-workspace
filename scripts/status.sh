#!/bin/bash
# status.sh - Check tout le workspace en 1 commande
# Usage: bash scripts/status.sh

export PATH="$HOME/.local/bin:$PATH"
WORKSPACE="$HOME/.openclaw/workspace"

echo "╔══════════════════════════════════╗"
echo "║     Habib Workspace Status       ║"
echo "╚══════════════════════════════════╝"

# --- Système ---
echo ""
echo "📦 SYSTÈME"
echo "  OS   : $(uname -a | cut -d' ' -f1-3 2>/dev/null)"
echo "  Disk : $(df -h / 2>/dev/null | awk 'NR==2{print $3" used / "$2" total ("$5" full)"}')"
echo "  Uptime:$(uptime | sed 's/.*up //' | sed 's/,.*//' 2>/dev/null)"

# --- Fichiers health-page ---
echo ""
echo "📄 FICHIERS CLÉS"
# (health-page supprimé)
  [ -f "$WORKSPACE/$f" ] && echo "  ✅ $f" || echo "  ❌ $f manquant"
done

# --- Scripts ---
echo ""
echo "🔧 SCRIPTS"
for f in scripts/parse-health-export.py scripts/generate-health-page.py scripts/status.sh; do
  [ -f "$WORKSPACE/$f" ] && echo "  ✅ $f" || echo "  ❌ $f manquant"
done

# --- Outils ---
echo ""
echo "🛠 OUTILS"
for cmd in python3 pip3 git node curl sqlite3; do
  if which $cmd 2>/dev/null >/dev/null; then
    vers=$($cmd --version 2>/dev/null | head -1)
    echo "  ✅ $cmd : $vers"
  else
    echo "  ❌ $cmd : non installé"
  fi
done

# --- Git ---
echo ""
echo "📦 GIT"
if [ -d "$WORKSPACE/.git" ]; then
  echo "  ✅ Repo local initialisé"
  branch=$(git -C "$WORKSPACE" rev-parse --abbrev-ref HEAD 2>/dev/null)
  status=$(git -C "$WORKSPACE" status --short 2>/dev/null | wc -l)
  echo "  Branch : $branch"
  echo "  Fichiers modifiés : $status"
else
  echo "  ❌ Pas de repo git"
fi

# --- Secrets ---
echo ""
echo "🔐 SECRETS"
[ -f "$WORKSPACE/secrets.json" ] && echo "  ✅ secrets.json présent" || echo "  ❌ secrets.json manquant"

echo ""
echo "╔══════════════════════════════════╗"
echo "║     Status terminé $(date +%H:%M)               ║"
echo "╚══════════════════════════════════╝"