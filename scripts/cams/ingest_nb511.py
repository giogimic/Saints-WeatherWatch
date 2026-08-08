import urllib.request
import json
import math
import os

CENTER_LAT = 47.05
CENTER_LNG = -68.35

ATLANTIC_CAMERAS = [
    {
        "id": "nb-edmundston-rt2",
        "name": "Route 2 - Edmundston (QC-NB Border)",
        "lat": 47.377,
        "lng": -68.326,
        "category": "border",
        "feed_url": "https://511.gnb.ca/map/Cctv/2-edmundston",
        "update_rate_ms": 60000,
        "region": "New Brunswick Corridor",
        "attribution": "© NB 511"
    },
    {
        "id": "nb-grand-falls-rt2",
        "name": "Route 2 - Grand Falls Gorge",
        "lat": 47.048,
        "lng": -67.738,
        "category": "traffic",
        "feed_url": "https://511.gnb.ca/map/Cctv/2-grand-falls",
        "update_rate_ms": 60000,
        "region": "New Brunswick Corridor",
        "attribution": "© NB 511"
    },
    {
        "id": "nb-woodstock-rt2",
        "name": "Route 2 - Woodstock (Houlton ME Border)",
        "lat": 46.152,
        "lng": -67.583,
        "category": "border",
        "feed_url": "https://511.gnb.ca/map/Cctv/2-woodstock",
        "update_rate_ms": 60000,
        "region": "New Brunswick Corridor",
        "attribution": "© NB 511"
    },
    {
        "id": "nb-fredericton-bridge",
        "name": "Princess Margaret Bridge - Fredericton",
        "lat": 45.957,
        "lng": -66.623,
        "category": "traffic",
        "feed_url": "https://511.gnb.ca/map/Cctv/fredericton-bridge",
        "update_rate_ms": 60000,
        "region": "New Brunswick Corridor",
        "attribution": "© NB 511"
    },
    {
        "id": "ns-halifax-harbor",
        "name": "Halifax Harbor & Coastal Marine",
        "lat": 44.648,
        "lng": -63.575,
        "category": "marine",
        "feed_url": "https://511.novascotia.ca/map/Cctv/halifax-harbor",
        "update_rate_ms": 60000,
        "region": "Nova Scotia Coastal Corridor",
        "attribution": "© NS 511"
    },
    {
        "id": "pei-confederation-bridge",
        "name": "Confederation Bridge (Borden-Carleton)",
        "lat": 46.25,
        "lng": -63.7,
        "category": "border",
        "feed_url": "https://511.pei.ca/map/Cctv/confederation-bridge",
        "update_rate_ms": 60000,
        "region": "Prince Edward Island Corridor",
        "attribution": "© PEI 511"
    },
    {
        "id": "nl-st-johns-harbor",
        "name": "St. John's Harbor & Signal Hill",
        "lat": 47.562,
        "lng": -52.709,
        "category": "marine",
        "feed_url": "https://511nl.ca/map/Cctv/st-johns-harbor",
        "update_rate_ms": 60000,
        "region": "Newfoundland & Labrador",
        "attribution": "© NL 511"
    }
]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def run():
    print("[Ingest Atlantic] Processing Atlantic Canada camera catalog...")
    cameras = []
    
    for cam in ATLANTIC_CAMERAS:
        dist_km = round(haversine(CENTER_LAT, CENTER_LNG, cam['lat'], cam['lng']), 1)
        cam['km'] = dist_km
        cam['stream_type'] = "image"
        cameras.append(cam)
        
    print(f"[Ingest Atlantic] Successfully processed {len(cameras)} Atlantic Canada cameras.")
    os.makedirs("data/cams", exist_ok=True)
    with open("data/cams/atlantic.json", "w", encoding="utf-8") as f:
        json.dump(cameras, f, indent=2)

if __name__ == "__main__":
    run()
