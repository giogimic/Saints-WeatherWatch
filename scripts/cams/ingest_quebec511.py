import urllib.request
import json
import math
import os

CENTER_LAT = 47.05
CENTER_LNG = -68.35

QUEBEC_CAMERAS = [
    {
        "id": "qc-degelis-185",
        "name": "Route 185 - Dégélis (QC-ME Border)",
        "lat": 47.548,
        "lng": -68.647,
        "category": "border",
        "feed_url": "https://www.quebec511.info/images/cameras/bas-saint-laurent/185_degelis.jpg",
        "update_rate_ms": 120000,
        "region": "Bas-Saint-Laurent (Québec)",
        "attribution": "© Québec 511"
    },
    {
        "id": "qc-riviere-du-loup",
        "name": "Autoroute 20 - Rivière-du-Loup",
        "lat": 47.831,
        "lng": -69.536,
        "category": "traffic",
        "feed_url": "https://www.quebec511.info/images/cameras/bas-saint-laurent/a20_riviere_du_loup.jpg",
        "update_rate_ms": 120000,
        "region": "Bas-Saint-Laurent (Québec)",
        "attribution": "© Québec 511"
    },
    {
        "id": "qc-rimouski-132",
        "name": "Route 132 - Rimouski Harbor",
        "lat": 48.448,
        "lng": -68.524,
        "category": "marine",
        "feed_url": "https://www.quebec511.info/images/cameras/bas-saint-laurent/132_rimouski.jpg",
        "update_rate_ms": 120000,
        "region": "Bas-Saint-Laurent (Québec)",
        "attribution": "© Québec 511"
    },
    {
        "id": "qc-matane-ferry",
        "name": "Matane Ferry Terminal & St. Lawrence",
        "lat": 48.845,
        "lng": -67.531,
        "category": "marine",
        "feed_url": "https://www.quebec511.info/images/cameras/gaspesie/matane_traverse.jpg",
        "update_rate_ms": 120000,
        "region": "Gaspésie (Québec)",
        "attribution": "© Québec 511"
    },
    {
        "id": "qc-carleton-sur-mer",
        "name": "Route 132 - Carleton-sur-Mer (Chaleur Bay)",
        "lat": 48.106,
        "lng": -66.128,
        "category": "marine",
        "feed_url": "https://www.quebec511.info/images/cameras/gaspesie/132_carleton.jpg",
        "update_rate_ms": 120000,
        "region": "Gaspésie (Québec)",
        "attribution": "© Québec 511"
    },
    {
        "id": "qc-levis-ferry",
        "name": "Lévis - Québec City Ferry Crossing",
        "lat": 46.814,
        "lng": -71.187,
        "category": "border",
        "feed_url": "https://www.quebec511.info/images/cameras/quebec/levis_traverse.jpg",
        "update_rate_ms": 120000,
        "region": "Québec City Region",
        "attribution": "© Québec 511"
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
    print("[Ingest Québec511] Processing Québec camera catalog...")
    cameras = []
    
    for cam in QUEBEC_CAMERAS:
        dist_km = round(haversine(CENTER_LAT, CENTER_LNG, cam['lat'], cam['lng']), 1)
        cam['km'] = dist_km
        cam['stream_type'] = "image"
        cameras.append(cam)
        
    print(f"[Ingest Québec511] Successfully processed {len(cameras)} Québec cameras.")
    os.makedirs("data/cams", exist_ok=True)
    with open("data/cams/quebec.json", "w", encoding="utf-8") as f:
        json.dump(cameras, f, indent=2)

if __name__ == "__main__":
    run()
