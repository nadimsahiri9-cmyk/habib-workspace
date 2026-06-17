#!/usr/bin/env python3
"""Génère health-data.json pour la page Habib Health."""
import json, os, sys
from collections import defaultdict

HISTORY = "/home/node/.n8n/health-data/history.jsonl"
OUTPUT = "/home/node/.openclaw/workspace/health-page/health-data.json"
DAYS = 7

def load_history():
    entries = []
    if not os.path.exists(HISTORY):
        return entries
    with open(HISTORY) as f:
        for line in f:
            try:
                entries.append(json.loads(line.strip()))
            except:
                pass
    return entries

def build(entries):
    if not entries:
        return {"latest": {}, "chart_labels": [], "chart_values": [], "coaching": None}

    latest = entries[-1]
    # Coaching message auto-generated
    coaching_parts = []

    # Heart rate
    if latest.get("heart_rate"):
        hr = latest["heart_rate"]
        if hr < 60:
            coaching_parts.append("Ton coeur est au repos, c'est bon signe.")
        elif hr > 80:
            coaching_parts.append("FC repos un peu elevee aujourd'hui. As-tu bien dormi ?")
        else:
            coaching_parts.append("FC repos dans la norme, bien.")

    # Sleep
    if latest.get("sleep"):
        s = latest["sleep"]
        if s < 6:
            coaching_parts.append("Sommeil court. Essaie de te coucher 30 min plus tot ce soir.")
        elif s < 7:
            coaching_parts.append("Sommeil correct, mais vise 7h pour une bonne recuperation.")
        else:
            coaching_parts.append("Bon sommeil, continue comme ca !")

    if latest.get("mood"):
        coaching_parts.append(f"Humeur : {latest['mood']}. Prends soin de toi.")

    coaching = "<br>".join(coaching_parts) if coaching_parts else "Bonne journee ! N'oublie pas de t'hydrater."
    coaching += '<br><br><em style="color:#94a3b8">Habib Coach · Consulte ton medecin pour tout avis medical.</em>'

    # Chart data (last 7 days heart_rate)
    recent = [e for e in entries if e.get("heart_rate")][-DAYS:]
    chart_labels = [e.get("timestamp", "")[:10] for e in recent]
    chart_values = [e["heart_rate"] for e in recent]

    return {
        "latest": latest,
        "chart_labels": chart_labels,
        "chart_values": chart_values,
        "coaching": coaching
    }

def main():
    entries = load_history()
    data = build(entries)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("OK: %d entrees -> %s" % (len(entries), OUTPUT))

if __name__ == "__main__":
    main()
