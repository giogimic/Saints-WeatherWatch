import os
import json
import math

import ingest_faa
import ingest_maine511
import ingest_quebec511
import ingest_nb511

CENTER_LAT = 47.05
CENTER_LNG = -68.35

def main():
    print("==========================================")
    print("Executing Camera Ingestion Scraper Suite")
    print("==========================================")
    
    ingest_faa.run()
    ingest_maine511.run()
    ingest_quebec511.run()
    ingest_nb511.run()
    
    data_dir = "data/cams"
    manifest_files = [f for f in os.listdir(data_dir) if f.endswith(".json")]
    
    seen_ids = set()
    all_cams = []
    
    for mf in manifest_files:
        path = os.path.join(data_dir, mf)
        try:
            with open(path, "r", encoding="utf-8") as f:
                items = json.load(f)
                for item in items:
                    cid = item.get("id")
                    if not cid or cid in seen_ids:
                        continue
                    seen_ids.add(cid)
                    all_cams.append(item)
        except Exception as e:
            print(f"Error reading {mf}: {e}")
            
    # Sort cameras by distance from corridor center
    all_cams.sort(key=lambda c: c.get("km", 99999))
    
    db = {
        "center": {
            "lat": CENTER_LAT,
            "lng": CENTER_LNG,
            "label": "Northern Maine / St. John Valley"
        },
        "max_km": 2500,
        "max_page_cams": 500,
        "cameras": all_cams
    }
    
    target_file = "backend/internal/cams/fallback.json"
    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)
        
    print("==========================================")
    print(f"SUCCESS: Compiled {len(all_cams)} normalized cameras into {target_file}")
    print("==========================================")

if __name__ == "__main__":
    main()
