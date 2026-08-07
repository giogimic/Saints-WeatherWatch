import urllib.request
import json
import gzip
import re
import math
import os

CENTER_LAT = 47.05
CENTER_LNG = -68.35

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def run():
    print("[Ingest Maine511] Fetching camera data...")
    url = "https://newengland511.org/map/mapIcons/Cameras"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': 'gzip'
    })
    
    cameras = []
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            if resp.info().get('Content-Encoding') == 'gzip':
                data = gzip.decompress(data)
            
            raw_text = data.decode('utf-8', errors='ignore')
            data_obj = json.loads(raw_text)
            items = data_obj if isinstance(data_obj, list) else data_obj.get('items', data_obj.get('cameras', []))
            if isinstance(data_obj, dict) and not items:
                items = list(data_obj.values())
            
            for item in items:
                if not isinstance(item, dict):
                    continue
                lat = float(item.get('lat') or item.get('latitude') or item.get('y') or 0)
                lng = float(item.get('lng') or item.get('longitude') or item.get('x') or 0)
                if not lat or not lng:
                    continue
                
                title = item.get('title') or item.get('name') or item.get('description') or 'MaineDOT Camera'
                img_url = item.get('imageUrl') or item.get('url') or item.get('videoUrl') or ''
                if not img_url:
                    continue
                
                cam_id = f"me-511-{item.get('id') or hash(title)}"
                dist_km = round(haversine(CENTER_LAT, CENTER_LNG, lat, lng), 1)
                
                stream_type = "image"
                lower_url = img_url.lower()
                if ".m3u8" in lower_url:
                    stream_type = "hls"
                elif ".mjpg" in lower_url or ".mjpeg" in lower_url:
                    stream_type = "mjpeg"
                
                cameras.append({
                    "id": cam_id,
                    "name": title,
                    "lat": lat,
                    "lng": lng,
                    "km": dist_km,
                    "category": "traffic",
                    "source": "maine-dot-511",
                    "feed_url": img_url,
                    "stream_type": stream_type,
                    "update_rate_ms": 60000,
                    "region": "Northern Maine / New England",
                    "attribution": "© MaineDOT / New England 511"
                })
        print(f"[Ingest Maine511] Successfully fetched {len(cameras)} cameras.")
    except Exception as e:
        print(f"[Ingest Maine511] Error fetching feed: {e}")
        
    os.makedirs("data/cams", exist_ok=True)
    with open("data/cams/maine.json", "w", encoding="utf-8") as f:
        json.dump(cameras, f, indent=2)

if __name__ == "__main__":
    run()
