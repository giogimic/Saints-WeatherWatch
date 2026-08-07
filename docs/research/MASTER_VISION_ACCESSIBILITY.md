# Master Vision Document: Inclusive, Dual-Audience Weather Watch & Living World

> **Core Philosophy:** *Expert Power Meets Universal Simplicity.*  
> Every feature, visualization, data overlay, and gameplay element must display **professional meteorological precision (for experts and chasers)** while remaining **instantly intuitive, visually clear, and universally understandable at a glance for any user.**

---

## 1. Non-Negotiable Accessibility & Design Pillars

### 1.1 The Dual-Lens Presentation Framework
Every piece of data must exist in two synchronized states on screen:
1. **Expert Lens (Scientific Rigor):** Standard meteorological metrics, exact values, technical codes, and raw vector/raster overlay parameters.
2. **Visual-Intuitive Lens (Universal Comprehension):** High-contrast color scales, dynamic icons, plain-language translations, visual magnitude meters, and immediate context tooltips.

```
+-----------------------------------------------------------------------------------+
|  TORNADO VORTEX SIGNATURE (TVS) DETECTED                                          |
|  [EXPERT LENS]   Gate-to-Gate Shear: 48 kts | Alt: 2.1 kft | WFO: KCBW           |
|  [VISUAL LENS]   ⚠️ TORNADO ROTATION DETECTED! (Danger Level: VERY HIGH 🔴🔴🔴🔴⚪) |
|  [WHAT IT MEANS] Wind is spinning very fast inside the cloud like a giant top.    |
+-----------------------------------------------------------------------------------+
```

### 1.2 Multi-Sensory & Inclusive Visual Standards
- **Color Universal Accessibility:** Zero reliance on color alone. Every colored warning or radar reflectivity band MUST feature a distinct geometric icon pattern or numerical badge (e.g., Red Triangle for Tornado, Yellow Square for Severe Thunderstorm, Blue Circle for Flood).
- **High-Contrast Micro-Animations:** Dynamic SVG overlays utilize thick 2px+ black outlines (`stroke="#000000"`), subtle pulsing outer glows, and drop shadows to ensure markers pop against complex radar reflectivities.
- **Cognitive Load Management (Decluttering):** Progressive disclosure by default. Information is presented in clear visual layers, with "Tap for Deep Science" expanders rather than wall-of-text displays.

---

## 2. Advanced Meteorological Data Expansion (Expert Depth + Visual Translation)

### 2.1 Algorithmic Storm Attribute Vector Overlays
- **Tornado Vortex Signature (TVS):**
  - *Expert View:* Gate-to-gate azimuthal shear, tilt continuity across elevation scans.
  - *Visual View:* Pulsing red inverted triangle with an animated spinning tornado icon.
  - *Plain Language:* "Tornado Spin Detected: The radar sees fast spinning air."
- **Mesocyclone Detection (MDA / MESO):**
  - *Expert View:* Shear rank (0–25), rotational kinetic energy.
  - *Visual View:* Dynamic double-circle gauge filling up from 1 to 25.
  - *Plain Language:* "Storm Rotation: Shows how strong the storm is spinning."
- **Vertically Integrated Liquid (VIL) & POSH (Hail Probability):**
  - *Expert View:* VIL in \(\text{kg/m}^2\), Probability of Severe Hail \(\ge 1.00''\).
  - *Visual View:* Ice Cube size visual comparison badge (Golf ball 🟢, Baseball 🟠, Soft ball 🔴).
  - *Plain Language:* "Hail Threat: How big the falling ice could be."

### 2.2 Telematics, Cameras & Ground-Truth Verification
- **Crowdsourced Traffic Telematics (MaineDOT Waze Ingestion):**
  - *Expert View:* Spatial cluster density of hazard nodes via ArcGIS REST endpoints.
  - *Visual View:* Interactive road hazard icons (Stopped Traffic 🚗💥, Debris 🌲, High Water 🌊).
  - *Plain Language:* "Real Drivers Reporting Problems Here."
- **Transnational Traffic & Aviation Cameras (511 Networks):**
  - *Expert View:* Static JPEG burst interval header polling, camera lat/lon vectors.
  - *Visual View:* Live camera cards with automatic health badges (Live 🟢, Stale 🟡, Offline 🔴) and near-warning tags.
  - *Plain Language:* "Real-Eye View: Look at the roads right now."

---

## 3. "Living Weather World" Game Layer (Storm Chaser Integration)

### 3.1 Trust Boundary (Sacred Ops vs. Game Layer)
- **Real Weather (Sacred):** NWS warnings, NEXRAD radar, ECCC feeds, and live cameras are NEVER modified or altered for game drama.
- **Game Layer (Visual & Distinct):** Clear visual separation with neon/stylized game chrome labeled:
  `SIMULATED EVENT · Gameplay Only · Not Real Weather`

### 3.2 Real Weather as Game Biomes & Learning Quests
- **Weather Biome Drops:**
  - *Rain Storms:* Collect "Water Purity Samples" & "Moisture Data."
  - *Thunderstorms:* Collect "Static Energy Cores" & "Lightning Log Data."
  - *Snow & Ice:* Collect "Frost Crystals" & "Temperature Profiles."
- **Educational Crafting & Lab Progression:**
  - Craft basic barometers, anemometers, research probes, and mobile radar rigs using collected materials.
  - Unlock new educational vehicle chassis (Starter Car 🚗 -> Research SUV 🚙 -> Mobile Radar Truck 🚛 -> Tornado Interceptor 🛡️).

---

## 4. Architectural & System Expansion Blueprint

```mermaid
flowchart TD
    subgraph Data Sources [Multi-Stream Ingestion]
        NWS[NWS Alerts & VTEC]
        IEM[IEM NEXRAD WMS & Storm GeoJSON]
        ECCC[Environment Canada & TSO]
        DOT[MaineDOT Waze / QC 511 / NB Cams]
    end

    subgraph Backend Core [Go / Chi / Prisma Engine]
        Ingest[Real-time Polling & WS Hub]
        Spatial[PostGIS / Spatial Intersect Engine]
        Transform[Dual-Lens JSON Payload Formatter]
    end

    subgraph Dual-Lens Presentation Layer [Angular 18 Frontend]
        Expert[Expert Mode HUD: Raw Metrics & Charts]
        Visual[Visual Mode HUD: Icons, Badges & Plain Text]
        Game[Storm World Layer: Drops & Vehicle Quests]
    end

    Data Sources --> Backend Core
    Backend Core --> Dual-Lens Presentation Layer
```

---

## 5. Continuous Research & Expansion Categories

1. **WEATHER_ALERT_APIS.md:** Detailed REST & RSS warning pipelines (US & Canada).
2. **RADAR_SATELLITE_APIS.md:** NEXRAD WMS, RIDGE velocity, GOES-19 satellite imagery.
3. **ALGORITHMIC_STORM_ATTRIBUTES.md:** TVS, MDA, VIL, POSH, XWeather storm cell endpoints.
4. **TELEMATICS_AVIATION_OBSERVATIONS.md:** 511 traffic cameras, Waze ATMS, METAR/TAF decoders.
5. **OUTAGE_APIS.md:** ORNL ODIN county grid status & utility restoration links.
6. **MULTIHAZARD_APIS.md:** NOAA NWPS river flood gauges & USGS earthquake events.
7. **EDUCATIONAL_ACCESSIBILITY_GUIDE.md:** Visual design patterns, plain-language dictionaries, and cognitive accessibility standards.
8. **GAME_LAYER_SYSTEMS.md:** Storm World RPG mechanics, craft trees, trade, and research logs.
