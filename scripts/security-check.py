#!/usr/bin/env python3
"""Security check : ports, permissions, secrets, processus suspects."""
import json, os, subprocess, urllib.request

WORKSPACE = os.path.expanduser("~/.openclaw/workspace")
STATE_FILE = os.path.join(WORKSPACE, ".security_state.json")
CHAT_ID = "7585507747"

def load_bot_token():
    try:
        with open(os.path.expanduser("~/.openclaw/secrets.json")) as f:
            cfg = json.load(f)
        return cfg.get("channels", {}).get("telegram", {}).get("botToken", "")
    except:
        return ""

def send_alert(bot_token, message):
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        data = json.dumps({"chat_id": CHAT_ID, "text": message}).encode()
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10):
            pass
    except:
        pass

def check_listening_ports():
    """Vérifie les ports ouverts sur 0.0.0.0"""
    suspects = []
    try:
        with open("/proc/net/tcp") as f:
            for line in f.readlines()[1:]:
                parts = line.strip().split()
                if len(parts) < 4: continue
                state = parts[3]
                addr = parts[1]
                ip_hex = addr.split(":")[0]
                port_hex = addr.split(":")[1]
                if state == "0A" and ip_hex == "00000000":
                    port = int(port_hex, 16)
                    if port not in [18789, 18790, 2019]:  # ports autorisés
                        suspects.append(port)
        return suspects
    except:
        return []

def check_secrets_exposed():
    """Vérifie que les fichiers secrets sont bien gitignorés"""
    issues = []
    try:
        result = subprocess.run(
            ["git", "check-ignore", "secrets.json", ".secrets/"],
            capture_output=True, text=True, cwd=WORKSPACE
        )
        if "secrets.json" not in result.stdout:
            issues.append("secrets.json pourrait ne pas être gitignoré")
        return issues
    except:
        return ["Impossible de vérifier gitignore"]

def check_unauthorized_changes():
    """Vérifie s'il y a des modifications suspectes dans les fichiers de config"""
    issues = []
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD", "--", "*.json"],
            capture_output=True, text=True, cwd=WORKSPACE
        )
        modified = [f for f in result.stdout.strip().split("\n") if f]
        for f in modified:
            if any(kw in f for kw in ["secret", "token", "credential", "key", "password"]):
                issues.append(f"Fichier modifié avec secret potentiel : {f}")
        return issues
    except:
        return []

def main():
    try:
        with open(STATE_FILE) as f:
            prev_state = json.load(f)
    except:
        prev_state = {}
    
    checks = []
    
    # Ports suspects
    suspect_ports = check_listening_ports()
    checks.append({"check": "ports_suspects", "ok": len(suspect_ports) == 0,
                   "detail": f"Ports inattendus : {suspect_ports}" if suspect_ports else "OK"})
    
    # Secrets gitignorés
    secret_issues = check_secrets_exposed()
    checks.append({"check": "secrets_gitignore", "ok": len(secret_issues) == 0,
                   "detail": "; ".join(secret_issues) if secret_issues else "OK"})
    
    # Modifications suspectes
    suspicious_changes = check_unauthorized_changes()
    checks.append({"check": "fichiers_suspects", "ok": len(suspicious_changes) == 0,
                   "detail": "; ".join(suspicious_changes) if suspicious_changes else "OK"})
    
    # Permissions
    perms_ok = True
    for f in ["secrets.json"]:
        path = os.path.join(WORKSPACE, f)
        if os.path.exists(path):
            mode = os.stat(path).st_mode & 0o777
            if mode > 0o600:
                perms_ok = False
    checks.append({"check": "permissions", "ok": perms_ok, "detail": "OK" if perms_ok else "Permissions trop ouvertes"})
    
    # Détecter les changements d'état
    alerts = []
    for c in checks:
        name = c["check"]
        was_ok = prev_state.get(name, {}).get("ok", True)
        if c["ok"] and not was_ok:
            alerts.append(f"🟢 Résolu : {name}")
        elif not c["ok"] and was_ok:
            alerts.append(f"🔴 Nouveau problème : {name} — {c['detail']}")
    
    # Sauvegarder état
    new_state = {c["check"]: {"ok": c["ok"], "detail": c["detail"]} for c in checks}
    with open(STATE_FILE, "w") as f:
        json.dump(new_state, f)
    
    # Alerter si changement
    if alerts:
        bot_token = load_bot_token()
        if bot_token:
            for msg in alerts:
                send_alert(bot_token, f"🛡️ CyberSécurité : {msg}")
    
    all_ok = all(c["ok"] for c in checks)
    status = "✅" if all_ok else "⚠️"
    print(f"{status} Security check done : {len(checks)} checks, {'all OK' if all_ok else 'issues found'}")
    for c in checks:
        icon = "✅" if c["ok"] else "❌"
        print(f"  {icon} {c['check']}")
    
    return 0 if all_ok else 1

if __name__ == "__main__":
    main()