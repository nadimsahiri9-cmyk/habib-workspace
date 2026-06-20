#!/usr/bin/env python3
"""Monitoring : check que les services répondent."""
import json, urllib.request, sys, os

def check_url(url, name, timeout=5):
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return True, None
            return False, f"HTTP {resp.status}"
    except Exception as e:
        return False, str(e)

def main():
    services = []
    
    state = {}
    for name, url in services:
        ok, err = check_url(url, name)
        state[name] = {"ok": ok, "err": err}
    
    print(f"Services checkés : {len(services)}")
    for name, s in state.items():
        print(f"  {'✅' if s['ok'] else '❌'} {name}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
