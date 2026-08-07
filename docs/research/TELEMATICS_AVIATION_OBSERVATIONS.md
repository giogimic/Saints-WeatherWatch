# Research Catalog: Transnational Telematics, Aviation & Ground-Truth Observational Networks

> **Category:** Ground-Truth Telematics & Aviation Observations  
> **Scope:** Maine (USA), Quebec (QC, Canada), New Brunswick (NB, Canada) Border Region  
> **Source Documents:** `.docs/AdvancedBroadWeatherAPIResearchforBorderRegio.html`, `.docs/StormAttributeMarkers.md`, `docs/research/CAMERA_TRAFFIC_APIS.md`

---

## 1. Executive Summary & Concept Overview

Radar and atmospheric numerical weather prediction models suffer from severe ground-level observational blind spots in remote border corridors due to Earth curvature and radar beam overshooting (e.g., KCBW radar in Caribou overshooting lower boundary layers in deep boreal forests).

To bridge this gap, modern meteorological platforms ingest ground-truth telematics, highway traffic cameras (511 systems), crowdsourced incident feeds (Waze), aviation surface observations (METARs/TAFs), and river gauge telematics as empirical sensors.

---

## 2. Telematics & Camera Data Sources

### 2.1 MaineDOT COMPASS & New England 511
- **Endpoints:** `https://newengland511.org/` & ArcGIS REST FeatureServers (`MaineDOT COMPASS ATMS`)
- **Waze Automated Ingestion:** MaineDOT ingests crowdsourced Waze incident data every 3 minutes into ATMS ArcGIS REST endpoints.
- **Meteorological Utility:** Cross-referencing high POSH (severe hail) radar cells with clusters of Waze alerts for "stopped traffic" or "hazard on road" provides real-time empirical verification of ground impact without waiting for NWS spotters.
- **Traffic Cameras:** Discovered via OpenCCTV tiled API or direct state DOT streams across I-95, US-1, and US-201 corridors.

### 2.2 Quebec 511 — Ministère des Transports et de la Mobilité Durable (MTMD)
- **Data Portal:** Données Québec (`Caméra de circulation`)
- **Formats:** GeoJSON, Shapefile, GeoPackage
- **Metadata Payload:** Spatial coordinates paired with hyperlinked JPEG/video stream URLs along the Route 73 / US 201 border corridor.
- **Meteorological Utility:** Visual monitoring of winter precipitation transitions (rain-to-snow line) as cold fronts approach the Maine-Quebec border.

### 2.3 New Brunswick Department of Transportation & Infrastructure (DTI)
- **Network:** 117 public highway & outdoor cameras (e.g., Waweig Hwy 1, Flume Ridge Hwy 3, Thomaston Corner).
- **Burst vs. Stream Protocol:** Operates on lightweight `.jpg` image bursts (updated periodically or during active weather events) rather than bandwidth-heavy HLS video feeds, optimizing backend polling costs and mobile app bandwidth.

---

## 3. Aviation & Alphanumeric Meteorological Networks (The Prairie Wx Paradigm)

### 3.1 METAR / SPECI / TAF Aggregation
- **Data Stream:** Real-time FAA / NWS / Nav Canada aviation weather feeds.
- **Decoding Engine:** Regular expressions decode cryptic strings (e.g., `METAR CYEG 030000Z 27017G24KT 13SM -RA BKN012 OVC023 10/09 A2989`) into wind speed/direction, gust vectors, ceiling heights, surface temperature/dewpoint, and altimeter settings.
- **Transnational Synchronization:** Harmonizes US METARs with Canadian SPECIs across border airports (e.g., KPQI Caribou, CYER Fort Kent/Edmundston).

---

## 4. Summary Matrix of Ground-Truth APIs & Tools

| Source / System | Domain / Format | Key Features | Access / Protocol |
|-----------------|-----------------|--------------|-------------------|
| **MaineDOT ATMS** | ArcGIS REST / Waze | 3-minute crowdsourced hazard clusters & traffic cams | Public ArcGIS Endpoint |
| **Quebec MTMD** | GeoJSON / JPEG | Geo-referenced camera coordinates for Route 73 / border | Open Data Portal |
| **New Brunswick DTI**| JPEG Bursts | 117 camera feeds along key Canadian transit corridors | Public HTTP `.jpg` |
| **OpenCCTV** | REST / JSON | Tiled camera discovery across border bounding boxes | Free API (`opencctv.org`) |
| **FAA Weathercams** | JSON / Image API | Aviation weather cameras across northeastern sites | `weathercams.faa.gov` |
