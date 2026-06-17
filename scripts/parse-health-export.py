#!/usr/bin/env python3
"""Parser Apple Health Export XML -> n8n health-coach data.

Usage:
  python3 parse-health-export.py export.zip [--dry]
  
Extracts HR, sleep, steps, HRV, VO2max from Apple Health XML export.
Output: JSON array of entries, piped for n8n webhook.
"""
import json, sys, os, zipfile, xml.etree.ElementTree as ET
from datetime import datetime, timedelta

def parse_export(zip_path, dry=False):
    entries = []
    with zipfile.ZipFile(zip_path) as z:
        xml_files = [n for n in z.namelist() if n.endswith(".xml")]
        if not xml_files:
            print("ERREUR: Pas de fichier XML trouve dans le zip", file=sys.stderr)
            sys.exit(1)
        with z.open(xml_files[0]) as f:
            # Streaming parse for memory efficiency
            for event, elem in ET.iterparse(f, events=("end",)):
                if elem.tag != "Record":
                    elem.clear()
                    continue
                rec_type = elem.get("type", "")
                value = elem.get("value")
                start = elem.get("startDate", "")
                if not value:
                    elem.clear()
                    continue
                try:
                    val = float(value)
                except ValueError:
                    elem.clear()
                    continue
                date = start[:10] if start else ""
                if not date:
                    elem.clear()
                    continue
                entry = {"date": date, "timestamp": start[:19]}
                if "HeartRate" in rec_type and "Resting" not in rec_type and "Walking" not in rec_type:
                    entry["heart_rate"] = int(val)
                elif "RestingHeartRate" in rec_type:
                    entry["heart_rate"] = int(val)
                elif "HeartRateVariability" in rec_type:
                    entry["hrv"] = round(val, 1)
                elif "StepCount" in rec_type:
                    entry["steps"] = int(val)
                elif "VO2Max" in rec_type:
                    entry["vo2max"] = round(val, 1)
                elif "AppleSleeping" in rec_type or "SleepAnalysis" in rec_type:
                    entry["sleep"] = round(val / 3600, 1)  # seconds -> hours
                elif "BodyMass" in rec_type:
                    entry["weight"] = round(val, 1)
                elif "BloodGlucose" in rec_type:
                    entry["glucose"] = round(val, 1)
                else:
                    elem.clear()
                    continue
                entries.append(entry)
                elem.clear()
    
    # Aggregate: one entry per day per metric
    daily = {}
    for e in entries:
        d = e["date"]
        if d not in daily:
            daily[d] = {}
        for k in ["heart_rate", "hrv", "steps", "vo2max", "sleep", "weight", "glucose"]:
            if k in e:
                if k not in daily[d]:
                    daily[d][k] = []
                daily[d][k].append(e[k])
    
    # Average daily values
    result = []
    for date in sorted(daily.keys()):
        day = {"date": date, "timestamp": date + "T00:00:00"}
        for k, vals in daily[date].items():
            if k == "heart_rate" or k == "steps":
                day[k + "_avg"] = int(sum(vals) / len(vals)) if k == "heart_rate" else int(sum(vals))
            else:
                day[k + "_avg"] = round(sum(vals) / len(vals), 1)
        result.append(day)
    
    if dry:
        print(json.dumps(result[-7:], indent=2, ensure_ascii=False))
        print("\nTotal jours: %d" % len(result), file=sys.stderr)
    else:
        # Send to n8n webhook
        for day in result[-14:]:  # Last 14 days
            send_to_n8n(day)
        print("Envoye: %d jours" % min(14, len(result)))

def send_to_n8n(day_data):
    import http.client
    body = json.dumps(day_data).encode()
    try:
        conn = http.client.HTTPConnection("host.docker.internal", 5678, timeout=10)
        conn.request("POST", "/webhook/health-coach", body=body, headers={"Content-Type": "application/json"})
        r = conn.getresponse()
        r.read()
    except:
        pass

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: %s export.zip [--dry]" % sys.argv[0], file=sys.stderr)
        sys.exit(1)
    dry = "--dry" in sys.argv
    parse_export(sys.argv[1], dry=dry)