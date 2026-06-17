#!/usr/bin/env python3
"""Usage: python3 set-github-token.py <token>"""
import json, sys, os

path = os.path.expanduser("~/.openclaw/workspace/secrets.json")

if len(sys.argv) < 2:
    print("Colle ça : python3 set-github-token.py TON_TOKEN")
    sys.exit(1)

token = sys.argv[1]

try:
    with open(path) as f:
        secrets = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    secrets = {}

secrets["github_token"] = token

with open(path, "w") as f:
    json.dump(secrets, f, indent=2)

print("✅ Token enregistré dans secrets.json")