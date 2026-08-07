import urllib.request
import json
import math
import os

CENTER_LAT = 47.05
CENTER_LNG = -68.35

# Airports in Northern Maine, New England, Quebec & Maritime Canada
TARGET_AIRPORTS = [
    # Northern Maine & Aroostook
    {"id": "12220", "name": "Northern Aroostook Reg Airport (E)", "lat": 47.28697, "lng": -68.313774, "cat": "aviation"},
    {"id": "12206", "name": "Caribou Municipal Airport (S)", "lat": 46.87102, "lng": -68.012695, "cat": "aviation"},
    {"id": "12215", "name": "Presque Isle Regional Airport (N)", "lat": 46.6889, "lng": -68.0448, "cat": "aviation"},
    {"id": "12218", "name": "Houlton International Airport (NW)", "lat": 46.1231, "lng": -67.7924, "cat": "aviation"},
    {"id": "12210", "name": "Millinocket Municipal Airport (SW)", "lat": 45.6478, "lng": -68.7099, "cat": "aviation"},
    {"id": "12202", "name": "Bangor International Airport (W)", "lat": 44.8074, "lng": -68.8281, "cat": "aviation"},
    {"id": "12205", "name": "Augusta State Airport (NE)", "lat": 44.3206, "lng": -69.7973, "cat": "aviation"},
    {"id": "12212", "name": "Portland International Jetport (S)", "lat": 43.6462, "lng": -70.3092, "cat": "aviation"},
    # New Hampshire / Vermont Border Airports
    {"id": "12101", "name": "Berlin Regional Airport (N)", "lat": 44.5756, "lng": -71.1764, "cat": "aviation"},
    {"id": "12105", "name": "Morrisville-Stowe State Airport (E)", "lat": 44.5348, "lng": -72.6142, "cat": "aviation"},
    {"id": "12108", "name": "Northeast Kingdom International Airport (S)", "lat": 44.8732, "lng": -72.2289, "cat": "aviation"},
]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def run():
    print("[Ingest FAA] Processing FAA WeatherCams catalog...")
    cameras = []
    
    for ap in TARGET_AIRPORTS:
        dist_km = round(haversine(CENTER_LAT, CENTER_LNG, ap['lat'], ap['lng']), 1)
        cam_id = f"faa-weathercams-{ap['id']}"
        feed_url = f"faa-weathercam://{ap['id']}"
        
        cameras.append({
            "id": cam_id,
            "name": ap['name'],
            "lat": ap['lat'],
            "lng": ap['lng'],
            "km": dist_km,
            "category": "aviation",
            "source": "faa-weathercams",
            "feed_url": feed_url,
            "stream_type": "burst",
            "update_rate_ms": 600000,
            "region": "Northern Maine / Aviation Network",
            "attribution": "© FAA WeatherCams"
        })
        
    print(f"[Ingest FAA] Successfully processed {len(cameras)} airport weathercams.")
    os.makedirs("data/cams", exist_ok=True)
    with open("data/cams/faa.json", "w", encoding="utf-8") as f:
        json.dump(cameras, f, indent=2)

if __name__ == "__main__":
    run()
