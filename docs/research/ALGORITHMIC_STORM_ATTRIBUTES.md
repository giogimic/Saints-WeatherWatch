# Research Catalog: Algorithmic Storm Attributes & Interactive Vector Overlays

> **Category:** Radar Processing & Algorithmic Storm Tracking  
> **Scope:** United States (NEXRAD) & Canada (ECCC) Border Region  
> **Source Documents:** `.docs/StormAttributeMarkers.md`, `.docs/AdvancedBroadWeatherAPIResearchforBorderRegio.html`, `docs/research/RADAR_SATELLITE_APIS.md`

---

## 1. Executive Summary & Concept Overview

Raw radar reflectivity mosaics (raster WMS/WMS-T tiles) are visually noisy and do not explicitly highlight tornadic rotation, hail cores, or storm cell trajectories. By tapping into Level III Radar Product Generator (RPG) algorithms, meteorological systems extract high-precision point vector features (GeoJSON / JSON) for severe weather phenomena. 

Rendering vector SVG overlays (with heavy stroke contrast and drop shadows) over dynamic raster radar layers ensures high readability across all zoom levels without obscuring base reflectivity patterns.

---

## 2. Algorithmic Data Sources & APIs

### 2.1 Iowa Environmental Mesonet (IEM) GeoJSON Services
- **Base Endpoint:** `https://mesonet.agron.iastate.edu/geojson/`
- **NEXRAD Storm Attributes:** Real-time GeoJSON point features containing TVS, MDA, and VIL metrics parsed continuously from Level III RPG output feeds.
- **VTEC Watch/Warning Polygons (`vtec_event.py`):** Precise geospatial boundary geometries (polygons) for Tornado (TO.W), Severe Thunderstorm (SV.W), and Flash Flood (FF.W) warnings.
- **Local Storm Reports (`lsr.py`):** GeoJSON feed of verified human spotter reports (hail diameter, measured wind gusts, structural damage).

### 2.2 XWeather Stormcells API (Commercial Option)
- **Base Endpoint:** `https://data.api.xweather.com/stormcells/`
- **Update Frequency:** 2–3 minutes with projected 20-degree cone of error forecast tracks.
- **Key Attributes:**
  - `ob.tvs` — Tornado Vortex Signature (0 = None, 1 = Detected)
  - `ob.mda` — Mesocyclone rotation strength (Scale: 0 to 25)
  - `ob.dbzm` — Maximum reflectivity in dBZ
  - `ob.hail.probSevere` — Probability of severe hail (≥ 1.00 inch)
  - `traits.rotating` / `traits.tornado` — Structural classification flags

### 2.3 Environment & Climate Change Canada (ECCC) / MSC GeoMet
- **Endpoint:** `https://api.weather.gc.ca/`
- **DD-Alpha TSO Feed:** `https://hpfx.collab.science.gc.ca/~rum001/eccc/tso/`
- **Thunderstorm Outlooks (TSO):** Graphical convective threat area polygons covering the Maine-Canada border region (issued daily at ~9:30 AM and ~2:00 PM with dynamic amendments).

---

## 3. Core Algorithmic Attribute Definitions & Formulations

| Attribute | Code | Algorithmic Definition & Mathematical Basis | UI Marker Representation |
|-----------|------|---------------------------------------------|--------------------------|
| **Tornado Vortex Signature** | `TVS` | Detected via gate-to-gate azimuthal velocity shear across multiple consecutive elevation scans. | Red/Yellow inverted triangle with black outline |
| **Mesocyclone Detection** | `MDA` / `MESO` | Quantifies broad, rotating updrafts (ranked 0–25) using volumetric continuity algorithms. | Yellow/Red double circle or diamond |
| **Vertically Integrated Liquid** | `VIL` | Mass of liquid water suspended in a vertical column of air (\(\text{kg/m}^2\)). Derived via \(VIL = 3.44 \times 10^{-6} \int Z^{4/7} dz\). Extreme values correlate with hail cores. | Quantitative color-coded numerical badge |
| **Probability of Severe Hail** | `POSH` | Evaluates height of environmental freezing level relative to maximum reflectivity core (>50 dBZ). | Green/Red hail icon with diameter tag |
| **Enhanced Echo Tops** | `EET` | Height in thousands of feet (kft) of 18 dBZ reflectivity threshold, marking updraft tropopause penetration. | Altitude vector marker |

---

## 4. Frontend Rendering & UX Styling Standards

1. **Vector over Raster Layering:** Standard WMS/WMS-T tiles handle background reflectivity (e.g., IEM `n0r`/`n0q`), while dynamic GeoJSON features render crisp SVG markers on top.
2. **Stroke & Contrast Rules:** All SVG markers must incorporate a 2px+ dark stroke (`stroke="#000000"`) and SVG drop-shadow filters (`filter: drop-shadow(...)`) to prevent visual blending against bright red/purple reflectivity cores.
3. **Transparent Polygon Fills:** Warning polygons (VTEC / TSO) use transparent or high-transparency fills (\(\alpha \le 0.15\)) with heavy 3px stroke borders to maintain clear visibility of radar reflectivity underneath.
4. **Zoom-Dependent Decluttering:** Filter low-rank MDA (<5) and small hail markers when zoomed out; expand full attribute detail upon zooming into individual cell clusters.

---

## 5. Summary Matrix of APIs & Tools

| Source / Tool | Type | Key Features | Access / License |
|---------------|------|--------------|------------------|
| **IEM GeoJSON** | REST / GeoJSON | TVS, MDA, VIL points, VTEC polygons, LSRs | Free / Public Domain |
| **XWeather** | JSON API | Cell motion vectors, 20° forecast cones, nested `ob` traits | Commercial API Key |
| **MSC GeoMet** | OGC WMS / OGC-API | North American radar composite, Surface Precip Type | Free / Open Data |
| **DD-Alpha TSO** | GeoJSON | Canadian convective thunderstorm outlook polygons | Free / ECCC Open Data |
