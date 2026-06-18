#!/usr/bin/env python3
"""Monitoring : check que les services répondent, alerte Telegram si down."""
import json, urllib.request, sys, os

SECRETS_PATH = os.path.expanduser("~/.openclaw/secrets.json")
WORKSPACE = os.path.expanduser("~/.openclaw/workspace")
CHAT_ID = "7585507747"

def load_bot_token():
    try:
        with open(SECRETS_PATH) as f:
            cfg = json.load(f)
        return cfg.get("channels", {}).get("telegram", {}).get("botToken", "")
    except:
        return ""

def check_url(url, name, timeout=5):
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return True, None
            return False, f"HTTP {resp.status}"
    except Exception as e:
        return False, str(e)

def send_alert(bot_token, message):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    data = json.dumps({"chat_id": CHAT_ID, "text": message}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10):
            pass
    except:
        pass

def main():
    # Lire le fichier d'état précédent
    state_file = os.path.join(WORKSPACE, ".monitor_state.json")
    try:
        with open(state_file) as f:
            prev_state = json.load(f)
    except:
        prev_state = {}

    services = [
        ("health-page", "http://127.0.0.1:18790/"),
    ]

    new_state = {}
    alerts = []

    for name, url in services:
        ok, err = check_url(url, name)
        new_state[name] = {"ok": ok, "err": err}
        was_ok = prev_state.get(name, {}).get("ok", True)
        
        if not ok and was_ok:
            alerts.append(f"🔴 {name} ne répond plus : {err}")
        elif ok and not was_ok:
            alerts.append(f"🟢 {name} est de nouveau en ligne")
    
    # Sauvegarder l'état
    with open(state_file, "w") as f:
        json.dump(new_state, f)

    # Envoyer alertes si besoin
    if alerts:
        bot_token = load_bot_token()
        if bot_token:
            for msg in alerts:
                send_alert(bot_token, msg)
            print("Alertes envoyées")
    
    print(f"Services checkés : {len(services)}")
    for name, s in new_state.items():
        print(f"  {'✅' if s['ok'] else '❌'} {name}")
    
    return 0 if all(s['ok'] for s in new_state.values()) else 1

if __name__ == "__main__":
    sys.exit(main())